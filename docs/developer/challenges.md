# Challenge Data

## Overview

Challenge metadata lives in `app/js/challenges.js`. Each entry describes how the UI presents the activity, where the robot spawns, and how completion is evaluated. The exported helper functions (`get`, `getAll`, `count`, `checkSuccess`) treat the definitions as immutable runtime configuration.

## Challenge Definition Shape

| Field             | Type                                                             | Purpose                                                            |
| ----------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `id`              | `number \| string`                                               | Unique identifier used in menus and persistence.                   |
| `title`           | `string`                                                         | Display name rendered in the challenge picker.                     |
| `subtitle`        | `string`                                                         | Short descriptor shown under the title.                            |
| `icon`            | `string`                                                         | Bootstrap icon (without `bi-` prefix trimming) for the menu badge. |
| `menuGroup`       | `"basic" \| "advanced" \| "special"`                             | Controls which section the picker groups the challenge into.       |
| `difficulty`      | `"success" \| "info" \| "warning" \| "danger"`                   | Colour token used to render the difficulty pill.                   |
| `description`     | `string`                                                         | Learner-facing overview displayed beside the editor.               |
| `goal`            | `string`                                                         | One-line success statement shown in the UI.                        |
| `hints`           | `Array<string>`                                                  | Ordered guidance rendered in the hint list.                        |
| `startPosition`   | `{ x: number, y: number, heading: number }`                      | Robot spawn location in millimetres plus heading (degrees).        |
| `successCriteria` | `object`                                                         | Type-specific configuration consumed by `checkSuccess`.            |
| `path`            | `null \| object`                                                 | Optional visual guide for the simulator overlay.                   |
| `obstacles`       | `Array<{ x: number, y: number, width: number, height: number }>` | Static rectangular obstacles injected into the simulator.          |
| `maze`            | `string`                                                         | Default maze loaded with the challenge (Challenge 6 only); other challenges clear maze walls. |
| `gamepadEnabled`  | `boolean`                                                        | Enables gamepad telemetry panel (Challenge 7).                     |

### Success Criteria Variants

`successCriteria.type` defines which evaluator runs inside `checkSuccess`:

- `run_without_error`: Requires the code to finish without raising errors and travel at least `minDistance` millimetres. With `requireDebug: true` (Challenge 0) the program must also turn on AIDriver debug messages (`aidriver.DEBUG_AIDRIVER = True`, detected by `AIDriverStub.debugEnabledIn()`).
- `reach_zone`: Passes when the robot is inside `zone` (axis-aligned rectangle). Optional `maxDeviation` restricts lateral drift.
- `complete_circle`: The robot must stay within `maxPathDeviation` mm of the drawn circle (`path.center`, `path.radius`), go at least `minRotation` degrees round the circle's centre and turn at least `minRotation` degrees itself, then finish within `centerTolerance` mm of the start. `updateSessionTracking()` records `maxPathDeviation` and `pathAngle` (unwrapped angle round the centre) for circle paths, so small loops, loops off the track and spinning on the spot fail even if they pass back through the finish box.
- `stop_at_distance`: Ensures the robot stops within `[min, max]` millimetres of the wall at `wallPosition`, measured from the front of the robot (where the ultrasonic sensor is), so it matches `read_distance()`.
- `complete_square`: Requires roughly `corners` × 90° of turning, a covered area of at least `minSideLength` in both directions, and finishing in `startZone`.
- `figure_eight`, `return_to_start`: Use geometric heuristics baked into their respective helpers.
- `manual`: Marks gamepad activities as unscored (`noAutoCheck`).

### When success is checked

`app.js` checks success every animation frame while a program runs, so programs that never end (`while True:`) can still pass; the program keeps running after "SUCCESS!" is shown. When a program finishes, `finishRun()` checks the final robot state once more. `run_without_error` is only judged at the end, and a run that raised an error never passes.

### Path Helpers

When present, `path` hints at the intended trajectory for render overlays:

- `line`: Straight path with `start`, `end`, and `width`.
- `circle`: Circular track defined by `center`, `radius`, and `width`.
- `square`: Axis-aligned square with `corner`, `size`, and `width`.
- `obstacle_course`: Waypoint series with `waypoints` array and `width` corridor.

The simulator uses these shapes purely for visual feedback; they do not affect physics directly.

## Maze Integration

Challenge 6 references the maze catalog in `app/js/mazes.js`. Each maze definition exposes:

- `id`, `name`, `difficulty`, and `description` for UI presentation.
- `startPosition` to override the challenge default when a specific maze loads.
- `endZone` to highlight the exit area.
- `walls`: array of millimetre rectangles matching the simulator coordinate system.

The maze module supplies helper methods:

- `get(mazeId)`: Returns a single definition, defaulting to `simple`.
- `getAll()`: Provides the full record for configuration panels.
- `getList()`: Produces lightweight summaries for drop-down menus.
- `draw(ctx, scale, mazeId)`: Renders walls and exit zones on the simulator canvas.

Any additional mazes should follow the documented shape so Challenge 6 can swap layouts without further code changes.

## Challenge 0 bugs (teacher answer key)

The Challenge 0 starter code in `app.js` (`getStarterCodes()[0]`) has 9 deliberate bugs, also shown in `docs/Challenge_0.md`. Students meet them in this order. `challenges-success.test.js` (`CHALLENGE_0_BUGS`) checks that each one is reported on its own.

| # | Line | Bug | Fix | How it shows up |
| --- | --- | --- | --- | --- |
| 1 | 17 | Unclosed string `"Checking the sensor...)` | `"Checking the sensor...")` | Editor marks it on load: "String is missing its closing quote" |
| 2 | 19 | `while ... == -1` has no colon | add `:` | Editor marks it on load: "Missing colon" |
| 3 | 9 | `form aidriver import ...` | `from` | `SyntaxError` on line 9 |
| 4 | 20 | `print(...)` in the loop isn't indented | indent it | `SyntaxError` on line 20 |
| 5 | 25 | `hold_state(1` has no `)` | `hold_state(1)` | `SyntaxError` on line 26 (the next line) |
| 6 | 15 | `my_robt = AIDriver()` | `my_robot` | `NameError: name 'my_robot'` on line 19 |
| 7 | 24 | `driveforward` | `drive_forward` | `AttributeError` on line 24 |
| 8 | 26 | `My_robot.brake()` | `my_robot` | `NameError: name 'My_robot'` on line 26 |
| 9 | 13 | `aidriver.DEBUG_AIDRIVER == True` compares instead of assigning | `=` | No error; no `[AIDriver]` messages, and the simulator says the debug messages are still off |

On the real robot the syntax errors are reported by MicroPython, so the wording differs (for example `SyntaxError: invalid syntax`) and bugs 1 and 2 aren't marked in advance.
