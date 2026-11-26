# Web Serial Upload (Robot toolbar)

The **Robot** toolbar in the code editor's header on `simulator.html` (separate from the simulator's Run/Stop/Step controls) lets students connect to their robot's Pico over USB, upload the editor code to `/main.py`, view the robot's event logs and stop the robot. The full design and rationale are in [`Web_Serial_Upload_Design.md`](../../Web_Serial_Upload_Design.md). This page is the reference for the code.

## Modules

All are plain browser scripts loaded by `simulator.html` after `editor.js` and before `app.js`.

| File | Global | Responsibility |
| --- | --- | --- |
| `app/js/serial-link.js` | `SerialLink` | Web Serial transport: `request()` (reuses a single granted port, otherwise the picker filtered to USB vendor `0x2E8A` with an unfiltered fallback), `open()` at 115200 baud, `reopen()` after a disconnect, the read loop, `write()`, `close()`, `onData`/`onLost`, and `describeError()` for student messages. |
| `app/js/micropython-board.js` | `MicroPythonBoard` | Raw REPL protocol (`Board`: queued `session()`, `exec()`, `stopProgram()`, `softReset()`, `abort()`), the Python helper scripts (`snippets`) and the operations `identify()`, `writeFileAtomic()`, `readFile()`. |
| `app/js/robot-connection.js` | `RobotConnection` | Toolbar controller and state machine; upload checks; log viewer messaging; `[Robot]` output in the debug panel. Initialised by `app.js`. |
| `app/js/log-viewer.js`, `app/log-viewer.html` | `LogViewer` | Renders the logs (text only) in the new tab, or in `#robotLogsModal` when pop-ups are blocked. |

## Protocol

Every board operation is a **session** (`Board.session(fn)`), queued so only one runs at a time:

1. Interrupt: send `\r` + Ctrl-C Ctrl-C, wait 60 ms, then Ctrl-A and wait for `raw REPL; CTRL-B to exit\r\n>`. Up to three attempts for programs that catch `KeyboardInterrupt`. Error codes: `no-reply` (nothing ever received) or `wont-stop`.
2. Brake (default): `L298N(3, 12, 9)` and `L298N(11, 13, 8)` from the frozen `aidriver` module. Their constructors brake the motors without writing to the event log, which `AIDriver().brake()` would.
3. `fn(exec)`: `exec(code)` sends the code in 256-byte slices, then Ctrl-D, and parses `OK<stdout>\x04<stderr>\x04>`. A non-empty stderr throws `BoardError` with code `python`.
4. Ctrl-B back to the friendly REPL, swallowing its banner up to `>>> `.

Helper scripts start with a `# aid:<op>` tag and print JSON between `<<AID` and `AID>>`.

**Upload** (`writeFileAtomic`) writes base64 2 KB chunks to `main.py.part`, then the `commit` script checks its SHA-256 (computed in the browser with `crypto.subtle`) and renames `main.py` → `main.py.bak` and `main.py.part` → `main.py`. A failure at any point leaves the old `main.py`.

**Upload & Run** then calls `softReset()` (Ctrl-C Ctrl-C, then Ctrl-D at the friendly prompt). USB stays connected; the program's output arrives outside a session and is shown as `[Robot]` lines (at most 50 per 100 ms). A `>>> ` prompt in the output means the program finished.

**Stop robot** during an operation calls `Board.abort()`, which fails whatever the current session is sending or waiting for, then runs an empty session (interrupt + brake).

## Log viewer messaging

`openLogs()` calls `window.open("log-viewer.html", "aidriver-logs")` synchronously in the click handler so it isn't blocked. The viewer posts `{type: "aidriver-logs-ready"}` to its opener; the simulator replies with `{type: "aidriver-logs", robot, readAt, wasRunning, files: {current, previous}}` once both the read has finished and the viewer is ready (in either order). Refresh posts `{type: "aidriver-logs-refresh"}`. Both sides check `event.origin` and `event.source`.

## Testing

- `tests/helpers/fake-micropython-board.js`: a fake Pico (friendly/raw REPL, Ctrl-C, soft reset with log rotation, the `# aid:` scripts on an in-memory filesystem, failure injection) behind a fake `SerialPort` and `navigator.serial`. It also installs `TextEncoder`, `crypto.subtle` and Web Streams, which jsdom lacks.
- `tests/unit/serial-link.test.js`, `tests/unit/micropython-board.test.js`, `tests/unit/log-viewer.test.js`: the modules against the fake.
- `tests/unit/micropython-snippets.test.js`: the real Python helper scripts run under CPython through the real JS functions.
- `tests/integration/robot-connection.test.js`: the whole simulator page driving the toolbar.
- Hardware: the "Simulator upload (Web Serial) checklist" in `real_world_test_plan.md`.

When adding an operation: add a tagged snippet to `MicroPythonBoard.snippets`, teach the fake board the tag, and add a CPython test for the snippet.
