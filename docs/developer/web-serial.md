# Web Serial Upload (Robot toolbar)

The **Robot** toolbar lets students connect to their robot's Pico over USB from `simulator.html`, upload the editor code to `/main.py`, run it, view the robot's event logs and stop it, all without leaving the simulator. It uses the browser's [Web Serial API](https://developer.mozilla.org/docs/Web/API/Web_Serial_API) and only standard MicroPython features, so no firmware support is needed beyond `aidriver.__version__` (used to show the library version).

The approach follows the [Learn Software Tools MicroPython page](https://tempehs.github.io/Learn-Software-Tools/micropython/) (queued raw REPL sessions, marker-framed JSON replies, base64 transfer checked with SHA-256). It adds an atomic write with a backup, AIDriver firmware checks and a log viewer tab.

## What students see

The toolbar sits in the **code editor card's header**, next to Copy and Reset Code. It is kept apart from the simulator's Run / Stop / Step / Reset controls because it works on the editor's code, not the simulated robot. It only appears on `simulator.html`.

| Control | Enabled when | Action |
| --- | --- | --- |
| Status pill | Always | `Not connected`, `Connecting…`, `Pico connected`, `Uploading 45%…`, `Program running`, `Reconnecting…` |
| **Connect robot** / **Disconnect** | Not busy | Opens the port picker (or reuses a granted port), then identifies the board |
| **Upload** | Connected and not busy | Writes the editor code to `/main.py` without running it |
| **Upload & Run** | Connected and not busy | Uploads, then soft-resets the robot so the new `main.py` runs straight away (no confirmation) |
| **Logs** | Connected and not busy | Opens `event_log.txt` and `event_log_prev.txt` in a new tab |
| **Stop robot** | Connected | Interrupts the robot's program, cancelling any upload or log read in progress |

- **Greyed out until connected:** every button except **Connect robot** is disabled and visibly faded (`#robotToolbar .btn:disabled` in `style.css`).
- **Tooltips:** the status pill and every button have Bootstrap hover tooltips, set from `data-bs-title` by `RobotConnection.initTooltips()`/`setTip()`, so the text follows the state. Disabled buttons keep `pointer-events` so their tooltip can say why ("Connect a robot first." or "Please wait until the robot has finished the current task."). Once connected, the status pill's tooltip shows the board, MicroPython and AIDriver versions.
- **Narrow screens:** below 1600px wide the buttons show icons only (`.robot-label` is hidden) and the tooltips name them. On phone widths the header wraps.
- **Unsupported browsers** (Firefox, Safari, anything without `navigator.serial`): the toolbar is hidden and "Upload needs Chrome or Edge" is shown instead.
- **Robot output:** while a program runs, its `print()` output appears in the existing debug panel as `[Robot]` lines (at most 50 lines per 100 ms). A `>>>` prompt means the program finished ("Program finished.").
- **No braking or safety prompts:** the motors run from a separate battery pack that is switched off while the robot is plugged into a computer. Stopping only needs a Ctrl-C, and Upload & Run doesn't need a warning.

Upload and Logs ask before stopping a program that is running ("Uploading stops the program running on the robot. Continue?").

## Modules

All are plain browser scripts loaded by `simulator.html` after `editor.js` and before `app.js` (with `?v=` cache busting), and exported through `module.exports` for Jest.

| File | Global | Responsibility |
| --- | --- | --- |
| `app/js/serial-link.js` | `SerialLink` | Web Serial transport: `request()` (reuses a single granted port, otherwise the picker filtered to USB vendor `0x2E8A` with an unfiltered fallback), `open()` at 115200 baud, `reopen()` after a disconnect, the read loop, `write()`, `close()`, `onData`/`onLost`, and `describeError()` for student messages. Knows nothing about MicroPython. |
| `app/js/micropython-board.js` | `MicroPythonBoard` | Raw REPL protocol (`Board`: queued `session()`, `exec()`, `stopProgram()`, `softReset()`, `abort()`), the Python helper scripts (`snippets`) and the operations `identify()`, `writeFileAtomic()`, `readFile()`. |
| `app/js/robot-connection.js` | `RobotConnection` | Toolbar controller and state machine, tooltips, upload checks, log viewer messaging, and `[Robot]` output in the debug panel. Initialised by `app.js` `init()`. |
| `app/js/log-viewer.js`, `app/log-viewer.html` | `LogViewer` | Renders the logs (text only) in the new tab, or in `#robotLogsModal` when pop-ups are blocked. |

It uses the existing modules as follows:

| Module | How it's used |
| --- | --- |
| `Editor` | `getCode()` gives the code to upload; `markError()` marks a syntax error |
| `PythonRunner.validateSyntax` | Syntax check before upload |
| `Validator.validate` | Simulator-rule findings, shown as warnings only |
| `DebugPanel` | Results, warnings and `[Robot]` output (`info`, `success`, `warning`, `error`, `output`) |
| `Logger` | `userAction(...)` and `info("ROBOT", ...)` |

The simulator and the robot share no state; the editor is the only source of code.

## Connection states

`RobotConnection.state` is one of:

| State | Meaning |
| --- | --- |
| `unsupported` | No `navigator.serial`; the toolbar is hidden |
| `idle` | Not connected |
| `connecting` | Opening the port and identifying the board |
| `ready` | Connected, nothing running |
| `running` | A program is producing output (seen outside a session, or after Upload & Run) |
| `busy` | A board session (upload, logs, stop) is in progress |
| `reconnecting` | The port was lost; `SerialLink.reopen()` polls `getPorts()` for up to 10 s |

On `pagehide` the port is closed so other apps can use it.

## Protocol

Every board operation is a **session** (`Board.session(fn)`), queued so only one runs at a time:

1. **Interrupt:** send `\r` + Ctrl-C Ctrl-C, wait 60 ms, then Ctrl-A and wait up to 2 s for `raw REPL; CTRL-B to exit\r\n>`. Up to three attempts, for programs that catch `KeyboardInterrupt` or are sleeping. On failure the error code is `no-reply` (nothing ever received on this connection) or `wont-stop`.
2. **`fn(exec)`:** `exec(code)` sends the code in 256-byte slices with 2 ms gaps, then Ctrl-D, and parses `OK<stdout>\x04<stderr>\x04>`. A non-empty stderr throws `BoardError` with code `python`. Timeouts throw code `timeout`.
3. **Exit:** Ctrl-B back to the friendly REPL, swallowing its banner up to `>>> `.

Helper scripts start with a `# aid:<op>` tag (`identify`, `write`, `commit`, `read`) and print JSON between `<<AID` and `AID>>` (`parseMarked()`). Only fixed paths are used; they are checked by `quotePath()` and JSON-quoted. Student code is only ever sent base64-encoded as file data, never executed during an upload.

### Connect and identify

`identify` reports `sys.implementation.name`, the MicroPython release and machine, whether `import aidriver` works (and its `__version__`), root-level copies of the built-in libraries (`aidriver`, `eventlog`, `hm10_controller`, `gamepad_driver_controller`, `gamepad_pico`), whether `boot.py` exists, and free space. `RobotConnection` then:

- refuses boards that aren't MicroPython;
- warns if the AIDriver library is missing (upload is still allowed);
- warns that root-level library copies replace the built-in versions (`sys.path` is `['', '.frozen', '/lib']`);
- notes that `boot.py` runs before `main.py`.

### Upload (`writeFileAtomic`)

1. **Checks** (in `prepareUpload()`): CRLF is normalised to LF and a trailing newline is added. Code over 64 KB is refused. A syntax error marks the line and asks the student to fix it first (they can still choose to upload). Validator findings are listed with "Upload anyway". They are simulator rules, so they never block an upload.
2. **Write:** 2 KB base64 chunks to `/main.py.part` (`wb`, then `ab`), with the status pill showing progress.
3. **Commit:** the robot computes the SHA-256 of `main.py.part` and compares it with the hash the browser computed with `crypto.subtle`. If they match it renames `main.py` → `main.py.bak` and `main.py.part` → `main.py`; if not, it deletes the part file. LittleFS only commits a file when it is closed, so there is always either the old or the new `main.py`, never a partial one. `main.py.bak` keeps one previous version as a silent safety net; it isn't shown in the UI.
4. **Upload & Run** then calls `softReset()` (Ctrl-C Ctrl-C, then Ctrl-D at the friendly prompt). A soft reset keeps USB connected and reruns `_boot.py` (rotating the logs) and the new `main.py`.

A typical 1–4 KB `main.py` uploads in under a second.

### Stop robot

Runs a session with an empty body, which is just the interrupt. If an upload or log read is in progress, it first calls `Board.abort()`, which fails whatever that session is sending or waiting for. A cancelled upload leaves the old `main.py` in place.

### Reading files

`readFile()` prints the file as base64 in 384-byte chunks between the markers (30 s timeout), or `null` if it doesn't exist ("No log yet"). The browser decodes it with `TextDecoder` (non-fatal).

## Log viewer

`openLogs()` calls `window.open("log-viewer.html", "aidriver-logs")` synchronously in the click handler so it isn't blocked as a pop-up, and reuses the same tab on later clicks. The viewer posts `{type: "aidriver-logs-ready"}` to its opener. The simulator replies with `{type: "aidriver-logs", robot, readAt, wasRunning, files: {current, previous}}` once both the read has finished and the viewer is ready, in either order. Refresh posts `{type: "aidriver-logs-refresh"}`. Both sides check `event.origin` and `event.source`. If `window.open` returns `null`, the same `LogViewer.render()` fills `#robotLogsModal` instead.

The viewer shows **This run** (`event_log.txt`) and **Previous run** (`event_log_prev.txt`) with line numbers, highlights run separators and warning lines, and has Copy, Download and Refresh buttons. All log text is set with `textContent`. Every soft reset rotates the logs, so after Upload & Run "This run" belongs to the new program. Reading the logs stops a running program, and the viewer adds `— program stopped by the simulator to read this log —` when it did.

## Student-facing errors

| Situation | Message |
| --- | --- |
| Picker closed | None |
| Port open elsewhere | "The robot is being used by another program or tab. Close MicroPython Lab / Thonny / other simulator tabs, then press Connect." |
| No MicroPython reply (`no-reply`) | "Connected, but the board didn't answer like MicroPython. Check the AIDriver firmware is installed…", also mentioning GP4 recovery, because a silent program that ignores Ctrl-C looks the same |
| Program won't stop (`wont-stop`) | GP4 recovery instructions (`RECOVERY_MESSAGE`) |
| Hash mismatch | "The upload didn't save correctly, so your old main.py was kept. Try again." |
| Storage full (`OSError: 28`) | "The robot's storage is full. Delete files with MicroPython Lab, or use GP4 recovery mode." |
| Python error in a helper | "The robot reported: …" |
| Timeout | "The robot stopped answering. Press Stop robot, then try again." |
| Cable unplugged | "Trying to reconnect…", then after 10 s "The robot was disconnected. Plug it back in and press Connect." |

## Platform notes

- **Browsers:** Web Serial works in desktop Chrome, Edge and Opera, and on ChromeOS (school Chromebooks). Not in Firefox or Safari.
- **Secure context:** HTTPS (GitHub Pages) or `localhost` only.
- **User gesture:** `requestPort()` and `window.open()` must run directly in a click handler.
- **One owner per port:** only one tab or app (MicroPython Lab, Thonny, MicroPico) can have the port open.
- **Permissions:** Chrome remembers granted ports per origin, so reconnecting after a reload or reboot doesn't show the picker.

## Testing

- `tests/helpers/fake-micropython-board.js`: a fake Pico (friendly/raw REPL, Ctrl-C, soft reset with log rotation, the `# aid:` scripts on an in-memory filesystem, failure injection) behind a fake `SerialPort` and `navigator.serial`. It also installs `TextEncoder`, `crypto.subtle` and Web Streams, which jsdom lacks.
- `tests/unit/serial-link.test.js`, `tests/unit/micropython-board.test.js`, `tests/unit/log-viewer.test.js`: the modules against the fake.
- `tests/unit/micropython-snippets.test.js`: the real Python helper scripts run under CPython through the real JS functions.
- `tests/integration/robot-connection.test.js`: the whole simulator page driving the toolbar, including button states and tooltips.
- Hardware: the "Simulator upload (Web Serial) checklist" in `real_world_test_plan.md`.

When adding an operation: add a tagged snippet to `MicroPythonBoard.snippets`, teach the fake board the tag, and add a CPython test for the snippet.

## Possible future work

- MicroPython's raw-paste mode (`\x05A\x01`) for flow-controlled, faster transfers instead of fixed 2 ms gaps.
- **Load from robot** (read `main.py` into the editor) and a file list.
