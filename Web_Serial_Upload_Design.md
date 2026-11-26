# Web Serial Upload: Design

Status: **Implemented** (open questions resolved 2026-11-26, see §15). Code reference: [`docs/developer/web-serial.md`](docs/developer/web-serial.md).
Scope: AIDriver web simulator (`app/`), with small optional firmware additions.

## 1. Summary

Add a **Robot** toolbar to the simulator so a student can, from the same page where they write and test code:

1. **Connect** to their robot's Raspberry Pi Pico / RP2040 over USB (Web Serial API).
2. **Upload** the code in the ACE editor to the robot. It is written directly to `/main.py`, the file the AIDriver firmware runs on boot.
3. **View logs**: read `event_log.txt` and `event_log_prev.txt` from the robot and open them in a new browser tab.

This removes the need to copy code between the simulator and Arduino MicroPython Lab, and gives students one place to test, upload and debug.

## 2. Goals and non-goals

### Goals

- One-click upload of the editor contents to `/main.py`, with a clear success or failure message.
- The upload never leaves the robot without a working `main.py`. Writes are atomic, and the previous version is kept as a backup.
- One-click viewing of both event log files in a new tab, readable and downloadable.
- Stopping: **Stop robot** interrupts the running program (Ctrl-C).
- Student-friendly errors for the common problems: wrong browser, port busy, board not running MicroPython, program won't stop, cable unplugged.
- No new runtime dependencies and no build step, following the app's plain-script module pattern (`docs/developer/architecture.md`).
- Testable in Jest with no hardware, using the real app modules through `tests/helpers/load-app.js`.

### Non-goals (for this version)

- A full file manager (listing, renaming or deleting arbitrary files). MicroPython Lab remains available for that.
- Installing or updating firmware. The existing **Downloads → AIDriver Custom Firmware** link and the BOOTSEL drag-and-drop process are unchanged.
- An interactive REPL terminal. Phase 3 shows the robot's output, read-only, in the existing debug panel.
- The Robot toolbar on any page other than `simulator.html` (for example `docs.html`).
- A **Restore previous upload** option. `main.py.bak` is kept silently as a safety net only.
- Firefox and Safari support. Neither implements Web Serial (see §4).

## 3. Reference implementations reviewed

| | Arduino Lab for MicroPython (`lab-micropython.arduino.cc`, `micropython-webserial.js`) | Learn Software Tools MicroPython (`tempehs.github.io/Learn-Software-Tools/micropython/`) | **Proposed for AIDriver** |
|---|---|---|---|
| Port selection | `requestPort()` with no filter | `requestPort({filters})` with the vendor IDs of RP2040, ESP32 and others, falling back to no filter | Filter on `usbVendorId: 0x2E8A` (Raspberry Pi, used by our firmware), falling back to no filter |
| Baud rate / signals | 115200 | 115200, `setSignals({dataTerminalReady: true, requestToSend: false})` | Same as LST |
| Protocol | Raw REPL: `^C^B`, then `^A`, then code, then `^D`, waiting for `\x04>` | Raw REPL in a queued "session": `\r^C^C`, wait 60 ms, `^A`, wait for the raw REPL banner, then code and `^D`; results parsed as `OK…\x04…\x04>` | Same as LST |
| Code chunking | 128 bytes every 10 ms | 256 bytes every 2 ms | 256 bytes every 2 ms; raw-paste mode as a later enhancement (§7.6) |
| Structured replies | Ad-hoc text extraction | JSON between `<<LST` and `LST>>` markers | JSON between `<<AID` and `AID>>` markers |
| File write | `w(bytes([1,2,3,…]))` in 128-byte chunks, unverified | base64 in 2048-byte chunks; `wb` then `ab`; SHA-256 verified with `hashlib` | base64 in 2048-byte chunks to a **temporary file**, SHA-256 verified, then **atomic rename** to `main.py` |
| File read | `f.read(256)` printed as text | base64 in 384-byte chunks inside markers, decoded in JS | Same as LST, plus a "file missing" result |
| Concurrency | Single `readUntil` with a reject-if-busy guard | Promise queue: only one session at a time | Promise queue (same as LST) |
| Disconnect / reboot | Not handled | `onLost` handler; after a hard reset, `getPorts()` is polled for up to 10 s to reconnect | `onLost` handler plus automatic reconnect via `getPorts()` |
| Run after upload | n/a | Soft reset (`^C^C`, then `^D` at the friendly prompt) | Separate **Upload & Run** button using a soft reset (§7.5) |

What we keep from LST: the session queue, the marker-framed JSON replies, base64 chunked transfer with SHA-256 verification, the vendor-ID filter, and the reconnect logic. All of these are proven with Picos in the same school.

What we add for AIDriver:
- an atomic write with a backup;
- AIDriver firmware detection;
- detecting root-level library copies that override the built-in versions;
- a log viewer tab.

## 4. Platform constraints

- **Browser support:** Web Serial is available in Chromium-based browsers on desktop: Chrome, Edge, Opera, and Chrome on ChromeOS, which covers school Chromebooks. Firefox and Safari don't support it. Android support is limited and not targeted. Feature-detect with `"serial" in navigator`. If it's missing, hide the Robot toolbar and show a short notice in the editor header: "Upload needs Chrome or Edge" (its tooltip gives the full sentence: "Uploading to a robot needs Chrome or Edge on a computer.")
- **Secure context:** Web Serial requires HTTPS. GitHub Pages is fine; local development needs `localhost`.
- **User gesture:** `navigator.serial.requestPort()` must be called directly from a click handler.
- **Permissions:** Chrome remembers granted ports per origin. `navigator.serial.getPorts()` therefore lets us reconnect silently on later visits, and after a reboot, without showing the picker again.
- **One owner per port:** a port can only be opened by one tab or app at a time. If MicroPython Lab, Thonny, another simulator tab or MicroPico has it open, `port.open()` fails with `InvalidStateError` / `NetworkError`. We map this to: "The robot is being used by another program or tab. Close MicroPython Lab/Thonny and try again."
- **Pop-up blocking:** a new tab can only be opened while the click's user activation is still valid. Reading a log is asynchronous, so the log tab is opened **synchronously in the click handler** and filled in later (§8).

## 5. Device facts this design depends on

Verified against this repository's firmware and MicroPython v1.30-preview:

| Fact | Source | Consequence |
|---|---|---|
| USB VID is `0x2E8A` | `micropython/ports/rp2/mpconfigport.h:283` | Used as the port filter |
| `hashlib` (SHA-256) and `binascii` are built in (rp2 builds at the `EXTRA_FEATURES` level) | `mpconfigport.h:81`, `py/mpconfig.h:2042-2071` | Uploads can be verified; base64 is available |
| The filesystem is LittleFS v2 on internal flash (about 1.4 MB) | `ports/rp2/modules/_boot.py`, `boards/RPI_PICO/mpconfigboard.cmake` | Writes complete only when the file is closed, so a rename after closing makes the write atomic. Space is ample for `main.py` |
| A soft reset doesn't drop the USB connection (only a runtime `machine.USBDevice` would) | `ports/rp2/main.c:298-300` | **Upload & Run** keeps the port open |
| The boot order is `_boot.py` (frozen), then `boot.py`, then `main.py`, on every power-on **and soft reset** | `ports/rp2/main.c:231-251` | A soft reset runs the new `main.py` |
| Each new session rotates the logs: `event_log.txt` becomes `event_log_prev.txt`, through `eventlog.log_separator()` in `_boot.py` | `project/lib/eventlog.py`, `.devcontainer/create_boot.py` | After **Upload & Run**, `event_log.txt` belongs to the new run (§8.3) |
| The motors run from a separate battery pack whose switch is off while the robot is connected over USB | Hardware (`docs/Assembly_Instructions.md`) | The motors can't move while connected, so stopping only needs an interrupt (no brake) and Upload & Run needs no safety prompt |
| The GP4 recovery mode restores the default `main.py` and renames `boot.py` and root-level copies of the built-in libraries | `.devcontainer/create_boot.py` | This is the fallback if a student uploads a program that can't be interrupted (§10) |
| The AIDriver libraries are built into the firmware; root-level copies override them | `micropython/py/runtime.c:147-150` | Upload warns if `/aidriver.py` and similar files exist (§7.3) |

## 6. User experience

### 6.1 Toolbar

A new **Robot** button group sits in the **header of the code editor card** (the ACE editor's banner), next to the Copy and Reset Code buttons. It is kept separate from the simulator's Run / Stop / Step / Reset controls, because uploading works on the editor's code, not the simulated robot. It appears on `simulator.html` only. Labels are short, and every button has a tooltip and an `aria-label`. On narrow screens the header wraps onto a second line.

```
 </> Python Code    ● Pico connected  [🔌 Connect robot] [⬆ Upload | ⬆▶ Upload & Run | 📄 Logs | ■ Stop robot]   [📋][↺]
```

| Control | When enabled | Action |
|---|---|---|
| **Connect robot** (shows **Disconnect** when connected) | Web Serial supported | Opens the port picker (or reuses a granted port) and identifies the board (§7.3) |
| **Upload** | Connected and idle | Writes the editor code to `/main.py` without running it (§7.5) |
| **Upload & Run** | Connected and idle | Uploads as above, then soft-resets the robot so the new `main.py` runs straight away (§7.5 step 3) |
| **Logs** | Connected and idle | Opens the log viewer tab with both log files (§8) |
| **Stop robot** | Connected | Stops the running program (§7.4) |
| Status pill | Always, when supported | `Not connected` / `Connecting…` / `Pico connected` / `Uploading 45%…` / `Program running` / `Disconnected` |

Until a robot is connected, every Robot button except **Connect robot** is disabled and clearly greyed out. The simulator's Run/Stop/Step buttons and the Robot buttons are independent: a student can run the simulator while connected.

### 6.2 Upload flow (student's view)

1. The student clicks **Upload**.
2. The code is checked (§7.5, step 1).
   - **Syntax error:** the line is marked in the editor and the upload is blocked. The message reads: "Fix the error on line 12 before uploading. Your robot would stop with this error."
   - **Simulator-only findings** (for example a `machine` import or `open()`): shown as warnings with **Upload anyway**, because these are valid on the real robot. They are never blocking, and there is no teacher setting to make them blocking.
3. If a program is running on the robot, a confirmation explains that it will be stopped.
4. Progress appears in the status pill. On success the debug panel shows:
   > ✅ Uploaded to robot as main.py (1.2 KB, checked). Unplug the USB cable and switch the robot on to run it, or press **Upload & Run** next time.
5. **Upload & Run** soft-resets the board straight away (no confirmation), and the new `main.py` runs while still connected. The motors don't move because their battery is switched off while connected (§5).

### 6.3 Logs flow

1. The student clicks **Logs**. A new tab opens immediately showing "Reading logs from robot…".
2. If a program is running, the opener page first asks: "Viewing logs stops the program running on the robot. Continue?"
3. The tab shows **This run** (`event_log.txt`) and **Previous run** (`event_log_prev.txt`) side by side, or as tabs on narrow screens. Each has **Copy**, **Download .txt** and **Refresh** buttons.
4. If the browser blocks the pop-up, the same viewer opens in a Bootstrap modal on the simulator page instead.

## 7. Architecture

### 7.1 New and changed files

All new modules follow the existing pattern: a plain browser script that defines a global object and exports it through `module.exports` for Jest.

| File | Type | Responsibility |
|---|---|---|
| `app/js/serial-link.js` | new | `SerialLink`: Web Serial transport. Handles request/open/reopen, the read loop, write, close, and the `onData`/`onLost` callbacks. Knows nothing about MicroPython. |
| `app/js/micropython-board.js` | new | `MicroPythonBoard`: the raw REPL protocol (session queue, `exec`, interrupt, soft reset, marker parsing) and high-level operations: `identify()`, `writeFileAtomic()`, `readFile()`. |
| `app/js/robot-connection.js` | new | `RobotConnection`: the UI controller. Wires the toolbar to `MicroPythonBoard`, `Editor`, `Validator`, `PythonRunner.validateSyntax`, `DebugPanel` and `Logger`. Owns the connection state machine (§7.2). |
| `app/log-viewer.html`, `app/js/log-viewer.js` | new | Stand-alone viewer page for the new tab (§8). |
| `app/simulator.html` | changed | Robot toolbar markup and the new `<script>` tags (with `?v=` cache busting), placed after `editor.js` and before `app.js`. |
| `app/js/app.js` | changed | `init()` calls `RobotConnection.init()`, which looks up its own toolbar elements. |
| `app/css/style.css` | changed | Status pill and Robot toolbar styles. |
| `app/tests/helpers/fake-micropython-board.js` | new | Fake Web Serial port that emulates the raw REPL with an in-memory filesystem (§12). |
| `app/tests/helpers/simulator-page.js` | new | `simulator.html` body markup and the fake ACE editor, shared with `full-application.test.js` |
| `app/tests/unit/serial-link.test.js`, `micropython-board.test.js`, `micropython-snippets.test.js`, `log-viewer.test.js`; `app/tests/integration/robot-connection.test.js` | new | §12 |
| `docs/developer/web-serial.md` | new | Developer reference, written from this design once it's built |
| `docs/Challenge_1.md` (the first upload step) and `docs/Common_Errors.md` | changed | Student instructions for uploading from the simulator |
| `project/lib/aidriver.py` | optional | `__version__` for firmware detection (§7.3) |

### 7.2 Connection state machine (`RobotConnection`)

```
           ┌────────────── unsupported (no navigator.serial) ── toolbar hidden
           │
 [idle] ──Connect──▶ [connecting] ──identify ok──▶ [ready] ◀────────────┐
   ▲                     │ fail                     │  │                │
   │                     ▼                          │  └─Upload/Logs─▶ [busy] (session queue)
   │                 [error]                        │                    │ done/fail
   │                     │                          │                    ▼
   └──── Disconnect ◀────┴───── port lost ◀── [running] ◀─Upload&Run── [ready]
                              (auto-reopen up to 10 s, as in LST)
```

- **ready:** idle at the raw REPL or friendly REPL. No program is running.
- **running:** a program is producing output, detected from data arriving outside a session, or after Upload & Run. Upload and Logs then ask before interrupting.
- **busy:** a session is in progress. All buttons except Stop robot are disabled.
- On page unload (`pagehide`), call `SerialLink.close()` so the port is released for other apps.

### 7.3 Connect and identify

1. `SerialLink.request()`:
   - Try `navigator.serial.requestPort({ filters: [{ usbVendorId: 0x2E8A }] })`, and if that fails retry with no filter.
   - On later visits, try `getPorts()` first.
   - Then `port.open({ baudRate: 115200 })` and `setSignals({ dataTerminalReady: true, requestToSend: false })`.
2. Start the read loop. Bytes received outside a session are shown in the existing debug panel as `[Robot]` lines (Phase 3) and set `running` if a program is active.
3. Run an `identify` session. This interrupts any running program (§7.4):

   ```python
   # aid:identify
   import sys, os, json
   info = {'impl': sys.implementation.name, 'release': os.uname().release,
           'machine': os.uname().machine, 'aidriver': False, 'version': None,
           'shadowing': [], 'free': None}
   try:
       import aidriver
       info['aidriver'] = True
       info['version'] = getattr(aidriver, '__version__', None)
   except ImportError:
       pass
   names = os.listdir('/')
   info['shadowing'] = [n for n in names if n.split('.')[0] in
       ('aidriver', 'eventlog', 'hm10_controller', 'gamepad_driver_controller', 'gamepad_pico')]
   info['has_boot_py'] = 'boot.py' in names
   s = os.statvfs('/')
   info['free'] = s[0] * s[3]
   print('<<AID' + json.dumps(info) + 'AID>>')
   ```

4. Act on the result:
   - **`impl` isn't `micropython`:** "This board isn't running MicroPython. Install the AIDriver firmware (Downloads → AIDriver Custom Firmware)."
   - **`aidriver` is false:** a warning that stock MicroPython is installed and the robot library is missing, with the same link. Upload is still allowed.
   - **`shadowing` isn't empty:** a warning that `aidriver.py` on the robot replaces the built-in library and may be out of date, suggesting deletion through MicroPython Lab or GP4 recovery mode.
   - **`has_boot_py`:** an informational note that `boot.py` runs before `main.py`.
   - **Status pill:** shows `Pico connected · MicroPython 1.30 · AIDriver ✓`.

### 7.4 Stopping (interrupt)

**Every** session starts with an interrupt, because the raw REPL can only be entered at a prompt:

1. Send `\r\x03\x03`, wait 60 ms, then discard the pending input.
2. Send `\x01` and wait up to 2 s for `raw REPL; CTRL-B to exit\r\n>`.
3. If the banner doesn't arrive, repeat steps 1–2 up to **3 times**. This covers programs that catch the first `KeyboardInterrupt` or are in the middle of a sleep.
4. If it still doesn't arrive, fail. If the board has never sent anything on this connection, the error is "didn't answer like MicroPython" (code `no-reply`); otherwise "The robot's program won't stop" (code `wont-stop`) (§10). A silent program that ignores Ctrl-C looks the same as a board without MicroPython, so the `no-reply` message also mentions GP4 recovery.

No braking is needed: the motors have their own battery switch, which is off while the robot is plugged into a computer (§15). Interrupting the program is enough.

**Stop robot** runs only this interrupt sequence, then exits the raw REPL. If an upload or log read is in progress, Stop robot first cancels it (`Board.abort()` fails whatever that session is sending or waiting for). A cancelled upload leaves the old `main.py`, because of the atomic write (§7.5).

### 7.5 Upload algorithm

1. **Pre-checks**, in the UI and synchronously:
   - Get the code with `Editor.getCode()`, normalise CRLF to LF, ensure there is a trailing newline, and encode it as UTF-8.
   - `PythonRunner.validateSyntax(code)` (Skulpt compile): on failure, `Editor.markError(line)` and block. Skulpt's grammar is close to MicroPython's. For rare valid-MicroPython syntax that Skulpt rejects, the error dialog offers an **Upload anyway** link.
   - `Validator.validate(code)`: its errors and warnings are simulator rules (for example only `aidriver`/`time` imports). They are shown as **warnings** with **Upload anyway**, never as blockers.
   - Size guard: refuse anything over 64 KB ("That's too big for main.py").
2. **Session**, through the board queue:
   1. Interrupt and enter the raw REPL (§7.4).
   2. For each 2048-byte chunk `i`, send this (the first chunk uses `wb`, later ones `ab`), reporting progress to the status pill:

      ```python
      # aid:write
      import binascii
      with open('/main.py.part', 'wb' if i == 0 else 'ab') as f:
          f.write(binascii.a2b_base64('<base64 chunk>'))
      ```

   3. Finalise and verify on the robot. The expected hash is computed in the browser with `crypto.subtle.digest('SHA-256', bytes)`:

      ```python
      # aid:commit
      import os, json, hashlib, binascii
      h = hashlib.sha256()
      with open('/main.py.part', 'rb') as f:
          while True:
              b = f.read(512)
              if not b:
                  break
              h.update(b)
      ok = binascii.hexlify(h.digest()).decode() == '<expected sha256>'
      if ok:
          try:
              os.remove('/main.py.bak')
          except OSError:
              pass
          try:
              os.rename('/main.py', '/main.py.bak')
          except OSError:
              pass
          os.rename('/main.py.part', '/main.py')
      else:
          os.remove('/main.py.part')
      print('<<AID' + json.dumps({'ok': ok}) + 'AID>>')
      ```

      At every point there is either the old `main.py` or the new one, never a partial file. If the browser tab closes or the cable is pulled mid-upload, only a stray `main.py.part` remains, and the next upload overwrites it. `main.py.bak` keeps the previous version (one generation) as a silent safety net; it isn't shown in the UI (§15).
   4. Exit the raw REPL (`\x02`).
3. **Upload & Run** only: wait for the friendly `>>> ` prompt, send `\x04` (soft reset), and switch to `running`. The new `main.py` runs and its output streams to the existing debug panel as `[Robot]` lines. The logs rotate (§5).
4. **Report** to the debug panel and `Logger.info("ROBOT", …)` (size, duration and whether it was verified).

Expected duration: a typical `main.py` of 1–4 KB needs 1–2 write chunks, so the upload takes about 0.5–1 s including the interrupt.

### 7.6 `MicroPythonBoard` protocol details

Adapted from LST's session implementation:

- **`session(fn)`** queues `fn` on `this.queue` so that only one raw REPL conversation runs at a time. It sets `raw = true`, performs §7.4, calls `fn(exec)`, and in `finally` sends `\x02` and sets `raw = false`.
- **`exec(code, timeoutMs = 1500 + ceil(len/10.4) + ceil(chunkBytes*0.1))`**:
  - Write the code in 256-byte slices with 2 ms gaps, then send `\x04`.
  - `until('OK', max(2000, timeoutMs))`, then `until('\x04>', timeoutMs)`.
  - Split the reply into stdout and stderr at the first `\x04`. A non-empty stderr is thrown as `BoardError(lastLine, traceback)`.
- **`until(needle, timeoutMs, what)`** buffers incoming text and rejects with "The robot didn't answer (`what`)." on timeout.
- **Markers:** `<<AID` … `AID>>` wrap JSON; `parseMarked(stdout)` extracts it.
- **Paths** are passed through `JSON.stringify` when interpolated, and checked against `/^[\w.\/-]+$/` with no `..`. Only fixed paths are used in v1.
- **Output outside sessions** (`raw === false`) goes to the robot output callback, which writes `[Robot]` lines to the debug panel.
- **Enhancement (not v1):** MicroPython's raw-paste mode (`\x05A\x01`, answered by `R\x01` and a window size) adds flow control and is faster. It would replace the fixed 2 ms gaps once the basic version is stable.

### 7.7 Reading files

```python
# aid:read
import binascii, json
try:
    with open('<path>', 'rb') as f:
        print('<<AID"', end='')
        while True:
            b = f.read(384)
            if not b:
                break
            print(binascii.b2a_base64(b).decode().strip(), end='')
        print('"AID>>')
except OSError:
    print('<<AID' + json.dumps(None) + 'AID>>')
```

In JS, `atob`, then `TextDecoder('utf-8', {fatal: false})`. A `null` result means "No log yet". The timeout is 30 s, matching LST. Log files are small (one line per robot action) but can grow in long `while True` runs.

## 8. Log viewer tab

### 8.1 Opening the tab without being blocked

```js
// In the Logs click handler, synchronously:
const viewer = window.open("log-viewer.html", "aidriver-logs");
// ...then asynchronously:
const files = await board.session(async (exec) => ({
  current: await readFile(exec, "/event_log.txt"),
  previous: await readFile(exec, "/event_log_prev.txt"),
}));
LogChannel.send(viewer, { type: "aidriver-logs", robot: info, readAt: Date.now(), files });
```

- **Handshake:** `log-viewer.html` posts `{type: "aidriver-logs-ready"}` to `window.opener` when it loads. The opener replies only after both the read **and** the ready message, which avoids a race either way. Both sides check `event.origin === location.origin`, and the viewer ignores messages of any other type.
- **Refresh:** the viewer posts `{type: "aidriver-logs-refresh"}`, and the opener repeats the read.
- **Pop-up blocked:** if `window.open` returns `null`, the same rendering function (`LogViewer.render(container, payload)`) fills a Bootstrap modal on the simulator page.
- **Same window name:** using `"aidriver-logs"` reuses one viewer tab instead of opening a new one on every click.

### 8.2 Viewer content

- **Header:** robot, MicroPython version, read time, and a note that times are seconds since the robot started (`t+…s`).
- **Two panes:** **This run** (`event_log.txt`) and **Previous run** (`event_log_prev.txt`).
  - Text is set with `textContent` only, never `innerHTML`; log text comes from student programs.
  - Lines are numbered.
  - Run separators (`===== RUN START =====` / `SEPARATOR`) and warning lines are lightly highlighted: "stopped range", "may not move", "arc toward", "ultrasonic".
- **Buttons:** **Copy**, **Download** (`event_log_<date>.txt` through a Blob URL), and **Refresh**.
- **Standalone:** the page works without the opener's scripts, using Bootstrap from the CDN as the other pages do. Opened directly without an opener, it shows "Open this from the simulator's Logs button."

### 8.3 How the logs relate to Upload & Run

Every soft reset rotates the logs. After **Upload & Run**, "This run" therefore belongs to the new program and "Previous run" to whatever ran before. The viewer header states this so students compare the right files. Viewing logs interrupts the running program, so the log ends where the program was stopped. The viewer adds a line, `— program stopped by the simulator to read this log —`, when a program had been running.

## 9. Integration with existing modules

| Existing module | Use |
|---|---|
| `Editor` | `getCode()` gives the upload source. `markError(line, msg)` marks syntax errors. |
| `PythonRunner.validateSyntax` | Syntax gate before upload |
| `Validator.validate` | Advisory warnings only (simulator rules) |
| `DebugPanel` | Upload results, robot warnings and robot output (Phase 3, prefixed with `[Robot]` and rendered as text through `DebugPanel.output()`). Uses the real API: `info`, `success`, `warning`, `error`, `output`. |
| `Logger` | `Logger.userAction("Upload to robot")`, `Logger.info("ROBOT", …)` |
| `app.js` `init()` | Calls `RobotConnection.init()` |
| `Challenges` | None. Uploading is independent of challenge success checks. |

The simulator and the robot share no state; the editor is the single source of code.

## 10. Error handling (student-facing messages)

| Situation | Detection | Message and action |
|---|---|---|
| Browser without Web Serial | `!("serial" in navigator)` | Toolbar hidden, plus the notice from §4 |
| Student closes the picker | `NotFoundError` / "No port selected" | No message |
| Port busy | `open()` throws `InvalidStateError` / `NetworkError` | "The robot is being used by another program or tab. Close MicroPython Lab / Thonny / other simulator tabs, then press Connect." |
| Not MicroPython (bootloader drive, other firmware) | Identify times out | "Connected, but the board didn't answer like MicroPython. Check the AIDriver firmware is installed (Downloads → AIDriver Custom Firmware)." |
| Program won't stop | Raw REPL banner missing after 3 interrupts | "The robot's program won't stop (it may be ignoring Ctrl-C). Unplug the robot, connect GP4 to GND, plug it back in to restore the default main.py, remove the wire, then upload again." This links to the GP4 recovery section of `docs/Build_Custom_MicroPython_Firmware.md`. |
| Syntax error in the editor | `validateSyntax` | Line marked, upload blocked (§7.5) |
| Python error on the robot during a helper script | `BoardError` | "The robot reported: `<last line>`" (full traceback in the console) |
| Hash mismatch | `ok: false` | "The upload didn't save correctly, so your old main.py was kept. Try again." |
| Filesystem full | `OSError: 28` | "The robot's storage is full. Delete files with MicroPython Lab, or use GP4 recovery." |
| Cable unplugged / board reset | Read loop ends, `onLost` | Status set to `Disconnected`. Auto-reopen through `getPorts()` is tried for 10 s. If that fails: "The robot was disconnected. Plug it back in and press Connect." |
| Timeout mid-operation | `until` rejects | "The robot stopped answering. Press Stop robot, then try again." The session `finally` sends `\x02`. |

## 11. Security and privacy

- **Device access:** Web Serial access is per-port and granted only by the user through the browser picker. The page cannot see other devices.
- **What runs on the robot:** only fixed helper snippets (§7) and the student's own code, which is written to a file and never executed during upload.
- **No network:** no data leaves the browser. Logs go from the robot to the page to the viewer tab through `postMessage` with origin checks.
- **Rendering logs:** log text and robot output are always rendered as text (`textContent`), never as HTML, using the same escaping approach the debug panel tests already check.
- **Quoting values:** file names and hashes in snippets are generated from fixed values and JSON-quoted, so student text is never inserted into helper code; it is base64-encoded.

## 12. Testing strategy

Following `docs/developer/testing.md`: test the real modules loaded through `tests/helpers/load-app.js`.

1. **`tests/helpers/fake-micropython-board.js`:** a fake `SerialPort` with `readable`/`writable` streams that emulates the REPL:
   - Ctrl-C interrupts and returns a prompt; it can be configured to ignore N interrupts.
   - Ctrl-A replies with the raw REPL banner; Ctrl-B returns to the friendly REPL; Ctrl-D in the friendly REPL soft-resets and rotates the fake logs.
   - Raw REPL `exec` dispatches on the `# aid:<op>` tag to JS implementations over an in-memory filesystem (`identify`, `write`, `commit`, `read`). This is the same tagging LST uses (`# lst:mkdir`).
   - Failures can be injected: drop mid-chunk, a hash mismatch, a disk-full `OSError`, disconnect, and slow replies.
2. **Unit tests:**
   - `serial-link.test.js`: the request fallback without filters, open errors mapped to messages, the read loop and `onLost`, and reopen through `getPorts()`.
   - `micropython-board.test.js`: interrupt retries, raw REPL framing (`OK`, `\x04`, stderr into `BoardError`), the timeout formula, the queue serialising concurrent calls, chunking (sizes and `wb`/`ab`), and marker parsing.
   - `integration/robot-connection.test.js`, with the real `Editor`, `Validator`, `PythonRunner` and `DebugPanel` from `simulator.html`:
     - toolbar states;
     - a syntax error blocks the upload;
     - validator warnings allow **Upload anyway**;
     - CRLF is normalised;
     - a successful upload leaves the editor text in the fake `/main.py`, with `main.py.bak` holding the old file;
     - a hash mismatch or mid-upload disconnect leaves the old `main.py` intact;
     - Upload doesn't reset the robot, while Upload & Run soft-resets it;
     - Stop robot interrupts the running program.
   - `log-viewer.test.js`:
     - the handshake ordering, in both orders;
     - origin rejection;
     - HTML in logs is rendered as text;
     - missing files show "No log yet";
     - the modal fallback is used when `window.open` returns `null`.
3. **Testing the helper code itself:** the Python helper snippets are exported from `micropython-board.js`. `micropython-snippets.test.js` runs each one under CPython in a temporary directory, through the real `writeFileAtomic`, `readFile` and `identify` functions, with a stand-in `aidriver` module. This checks the actual snippets: the base64 round trip, SHA-256, the atomic rename, and the missing-file case.
4. **Hardware checklist**, added to `real_world_test_plan.md` and run on a real AIDriver robot in Chrome and on a Chromebook:
   - connect with a fresh picker, and auto-reconnect after a reload;
   - upload while the default `main.py` hardware test is running, and confirm the motors stop;
   - Upload & Run;
   - view logs after a run, and refresh;
   - unplug during upload, then reconnect: the old `main.py` still runs;
   - a program with `try/except: pass` around `while True`: interrupt retries, then the GP4 recovery message;
   - the port open in MicroPython Lab at the same time gives the busy message.

## 13. Delivery plan

| Phase | Contents | Done when |
|---|---|---|
| **1. Transport and upload** | `serial-link.js`, `micropython-board.js`, `robot-connection.js`; Connect / Upload / Upload & Run / Stop robot; identify and atomic write; the fake board and unit tests | A student can upload editor code to `/main.py` on a real robot, and every §10 error has a message |
| **2. Log viewer** | `log-viewer.html/js`; Logs button; handshake; modal fallback; tests | Both logs open in a new tab and can be downloaded |
| **3. Robot output** | Robot output streamed to the existing debug panel (`[Robot]` lines, rate-limited to keep the page responsive); `running` state detection | A student can upload, run and watch `print()` output without MicroPython Lab |
| **4. Docs and rollout** | Student docs (Challenge 1 upload step, Common Errors), developer doc `docs/developer/web-serial.md`, hardware checklist | The docs match the UI; hardware checklist passed |
| Later (optional) | Raw-paste mode; **Load from robot** (read `main.py` into the editor); a file list | Not committed |

## 14. Firmware changes (optional, small)

- Add `__version__ = "<build date or tag>"` to `project/lib/aidriver.py`, set by `build_firmware.sh` or kept manually, so the simulator can show "AIDriver firmware 2026-11-25" and warn about old firmware.
- No other firmware changes are needed. Uploading uses only standard MicroPython features.

## 15. Decisions

Resolved 2026-11-26:

| # | Question | Decision |
|---|---|---|
| 1 | Primary upload button | Two separate buttons: **Upload** (save only) and **Upload & Run** (save, then soft reset). No split button. |
| 2 | Can teachers make simulator validator findings block uploads? | No. They are always warnings with **Upload anyway**. Only Python syntax errors block an upload. |
| 3 | Custom motor pins / braking on stop | Not needed. The motors have a separate power supply that is switched off while connected, so Stop robot only interrupts the program and Upload & Run has no warning pop-up. |
| 4 | Show **Restore previous upload**? | No. `main.py.bak` is kept silently as a safety net. |
| 5 | Where the Robot toolbar appears | `simulator.html` only. |
| 6 | Where robot output appears | The existing debug panel, as `[Robot]` lines. |
