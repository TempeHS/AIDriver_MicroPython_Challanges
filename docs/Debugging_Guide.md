# AIDriver RP2040 – Debugging Implementation Notes

This document tracks **engineering work** needed (or already completed) to support a robust debugging experience for students using the AIDriver RP2040 robot. It is **not** a student-facing guide.

Use it as a checklist of implementation tasks across:

- `project/lib/aidriver.py`
- `project/lib/gamepad_pico.py`
- `project/lib/gamepad_driver_controller.py`
- `docs/Challenge_0.md` – `docs/Challenge_7.md`
- Supporting build/firmware tooling

---

## 1. Implemented Features (No Further Action Needed)

These items are already present in the codebase and aligned with the current docs:

- **`aidriver.DEBUG_AIDRIVER` and `_d()` logger** in `aidriver.py`.
- **Ultrasonic sensor sanity logging** and `-1` error signalling.
- **Runtime error explanation helper** `_explain_error(exc)` in `aidriver.py`, wired into key AIDriver methods.
- **Standard header pattern** in challenge docs using:
  - `import aidriver` / `from aidriver import AIDriver`
  - `aidriver.DEBUG_AIDRIVER = True`
  - `my_robot = AIDriver()`
- **Common error reference** in `docs/Common_Errors.md` with entries for:
  - `NameError: name 'driver' is not defined`
  - `AttributeError: 'AIDriver' object has no attribute 'backward'`
  - Syntax / indentation errors
  - `ImportError: no module named 'aidriver'`
  - Robot “does nothing”, freezes, ultrasonic always `-1`.
- **Mini test scripts** (motor + ultrasonic) in this repo that match the current library API.

These should only be revisited if APIs change.

---

## 2. GamePad / Bluetooth Debugging (Not Yet Implemented)

Target files:

- `project/lib/gamepad_pico.py`
- `project/lib/gamepad_driver_controller.py`
- `docs/Challenge_7.md`

### 2.1 Add `DEBUG_GAMEPAD` flag and internal logger

**Status:** Not implemented.

**Plan:**

- In `gamepad_pico.py`:

  - Add a module-level flag and helper:

    ```python
    DEBUG_GAMEPAD = False

    def _g(*args):
          if DEBUG_GAMEPAD:
                print("[GamePad]", *args)
    ```

  - Call `_g()` inside `poll()` / `_process_frame()` to log:
    - Mode (`digital` vs `analog`),
    - `value0` button bitfield,
    - `value` arrows/joystick, angle, radius.

**Outcome:** Teachers can ask students to set `gamepad_pico.DEBUG_GAMEPAD = True` in `main.py` to see structured GamePad events in the console.

### 2.2 Optional controller-level debug hooks

**Status:** Not implemented.

**Plan:**

- In `gamepad_driver_controller.py`:
  - Optionally add a `debug` flag to `GamepadAIDriverController.__init__`.
  - When `debug` is `True`, print high-level actions, e.g. `"forward max"`, `"rotate_left"`, derived from GamePad input.

**Outcome:** Easier to reason about mapping from GamePad inputs to robot movement during Challenge 7.

### 2.3 Documentation alignment

**Status:** Partially implemented.

**Plan:**

- Update `docs/Challenge_7.md` and this file once `DEBUG_GAMEPAD` exists to show:

  ```python
  import gamepad_pico
  from gamepad_pico import GamePad

  gamepad_pico.DEBUG_GAMEPAD = True
  pad = GamePad()
  ```

---

## 3. Documentation / Curriculum Gaps

These are doc-structure tasks rather than code changes, but they affect how debugging features are used.

### 3.1 Per-challenge "Debugging Tips" sections (check coverage)

**Status:** Many challenges already include short “Debugging Tips – Test Small, Test Often” sections, but coverage/consistency should be re-audited.

**Plan:**

- For each of `docs/Challenge_0.md`–`docs/Challenge_7.md`:
  - Confirm a clearly labelled “Debugging Tips” or equivalent exists.
  - Ensure it explicitly encourages:
    - Running code after small changes.
    - Using simple `print()` markers like `print("HERE 1")`.
    - Starting from the last known working version.

### 3.2 Cross-linking to `Common_Errors.md`

**Status:** Present in some docs, not guaranteed in all.

**Plan:**

- Ensure each challenge document:
  - Mentions `Common_Errors.md` when talking about syntax/runtime errors.

---

## 4. Nice-to-Have Enhancements

These are optional but could further improve the debugging experience.

### 4.1 Tiny `log()` helper (if desired later)

**Status:** Not implemented; current docs use `print()` directly.

**Idea:**

- Provide an optional helper (either in a shared module or at the top of `main.py`) if we decide a named `log()` improves readability for senior classes:

  ```python
  def log(*args):
        print(*args)
  ```

If adopted, all student-facing docs would need a one-time update to show the definition before using `log()`.

---

## 5. How to Use This Document

- Treat each subsection above as a **work item**.
- Before changing code, verify current behaviour in:
  - `project/lib/*.py`
  - `docs/Challenge_*.md`
  - `docs/Common_Errors.md`
- After implementing any task, update this file to move it from “Not implemented” to “Implemented Features” or mark as intentionally skipped.

This keeps the debugging tooling and curriculum aligned as the project evolves.
