# Python Execution Pipeline

## Purpose

`app/js/python-runner.js` embeds the Skulpt interpreter and orchestrates everything required to execute learner Python safely inside the browser. It wires simulator-specific IO hooks, enforces validation, and exposes both real-time and step-by-step execution modes.

## Lifecycle

1. **Initialisation**

   - `PythonRunner.init()` registers JavaScript-backed MicroPython modules (currently the AIDriver stub) and configures Skulpt defaults.
   - `registerMicroPythonModules()` ensures `aidriver` resolves during imports.

2. **Standard execution**

   - `run(code)` validates input with `Validator.validate(code)` and clears any residual command queues.
   - Skulpt is configured with custom `output`, `read`, and `setTimeout` hooks so `print()` output and `time.sleep()` calls integrate with the simulator environment.
   - Command processing occurs on every Skulpt suspension (`Sk.promise`) and yield tick (`*` handler) to keep the robot in sync with Python.

3. **Stopping**
   - `stop()` flips `shouldStop`, clears outstanding suspension promises, halts the simulator robot, and flushes command queues.
   - `handleError()` filters out expected stop scenarios and forwards actionable errors to `DebugPanel` and the editor highlights.

## Step Mode

`runStepMode(code)` runs the learner's program **live** through the normal `run()` pipeline, using the same JavaScript `aidriver` module, simulator physics and ultrasonic readings as a normal run. Skulpt is configured with `debugging: true`, so it raises an `Sk.debug` suspension before every line of the learner's code:

- `handleStepSuspension()` highlights the line (line numbers are the learner's own, because the code is not rewritten), waits `stepDelay` ms, and waits further while `stepPaused` is set by `pauseStep()`/`resumeStep()`.
- While waiting, `freezePhysics` stops the animation loop from moving the robot. After each line the robot is advanced by `stepLineTime` simulated seconds, so busy loops such as `while robot.read_distance() > 300:` still make progress at a realistic rate.
- `hold_state()` behaves exactly as in a normal run (real time, physics running).
- `stop()` releases any pending pause and the next suspension raises the stop error.

## Command Queue Processing

`processCommandQueue()` drains the `AIDriverStub` queue filled by the JavaScript `aidriver` module. Each command updates `App.robot` directly (wheel speeds, braking, etc.) and triggers a render if motion occurs.

## Error Handling Strategies

- **Validation failures**: Prevent execution and surface errors before Skulpt runs.
- **Runtime errors**: Routed through `handleError()` which extracts line numbers, annotates the editor, and logs formatted messages.
- **Infinite loops**: Skulpt's `killableWhile`/`killableFor` suspensions and yields let `stop()` interrupt any loop, in both normal and step mode.

## Extending the Pipeline

- To add new simulator operations, update the JavaScript `aidriver` module in `aidriver-stub.js` (command emission) and `processCommandQueue()` (execution).
- For custom learner libraries, register them alongside `aidriver` within `registerMicroPythonModules()` and handle import resolution in `handleRead()`.
- When adjusting sleep semantics, remember that Skulpt expects suspensions to resolve with `susp.resume()` as implemented in the `Sk.promise` handler.
