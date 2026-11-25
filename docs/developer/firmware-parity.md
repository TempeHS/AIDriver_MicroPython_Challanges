# Firmware Parity

## Purpose

Learner scripts written for the physical RP2040 firmware must behave the same way inside the browser simulator. `AIDriverStub.getModule()` (`app/js/aidriver-stub.js`) provides a Skulpt `aidriver` module that mirrors the public API of the hardware `aidriver` module while translating commands into JavaScript-friendly payloads. It is used for both normal runs and step mode.

## AIDriver API Support

| Method                                       | Hardware Behaviour                                    | Simulator Equivalent                                                         |
| -------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `AIDriver()`                                 | Initializes motor driver and telemetry queue          | Queues an `init` command so the simulator knows a session began              |
| `drive_forward(right, left)`                 | Sets forward PWM on each motor                        | Enqueues `drive_forward` with rounded integer speeds                         |
| `drive_backward(right, left)`                | Sets reverse PWM                                      | Enqueues `drive_backward` for the physics engine                             |
| `rotate_left(speed)` / `rotate_right(speed)` | Counter-rotates wheels for on-spot turns              | Issues `rotate_left` / `rotate_right` commands                               |
| `set_motor_speeds(right, left)`              | Stores speeds; they apply at the next drive/rotate    | Stores speeds; the simulator likewise applies them at the next drive/rotate  |
| `brake()`                                    | Applies motor brakes                                  | Issues `brake` and zeros cached speeds                                       |
| `read_distance()`                            | Returns ultrasonic reading (blocking until available) | Queues `read_distance`; JavaScript fills in actual distance before returning |
| `is_moving()` / `get_motor_speeds()`         | Reflect internal motor state                          | Reads cached state updated by previous commands                              |
| `service()`                                  | Handles background maintenance (LED heartbeat)        | No-op, kept for API parity                                                   |

The module also provides `hold_state(seconds)` so existing firmware exercises can wait while the simulator advances the command queue. The helper scales delays by the UI-selected speed multiplier and delegates to JavaScript for movement playback.

### Speed values

Speeds are handled the same way as `L298N.set_speed` on the robot:

- 0-255 is the normal range. Speeds of 80 or less produce a one-off warning that the real robot may not move.
- Values above 255 are raw 16-bit PWM on the robot (so `300` is almost stopped). The simulator scales them the same way and warns.
- Negative speeds raise `ValueError` in both.
- `get_motor_speeds()` returns the speeds that were requested, or `(0, 0)` while the robot is stopped.

## Machine Module Facade

The RP2040 firmware exposes MicroPython `machine` primitives. The simulator registers a lightweight factory through `PythonRunner.getMachineModule()` that supports the subset used in classroom lessons:

- `Pin`: Implements `on()`, `off()`, `value()`, and `toggle()` with cached state.
- `PWM`: Stores frequency and duty cycle but does not generate signals.
- `Timer`: Accepts `init()` calls, but callback scheduling is not emulated.

Note: this factory is not currently registered with Skulpt, and `Validator` only allows `aidriver` and `time` imports, so learner code cannot import `machine` in the simulator.

## Known Deviations

- **Real-time guarantees:** JavaScript timers are best-effort; long-running tabs may throttle `hold_state` sleeps compared to deterministic firmware delays.
- **Sensor latency:** The simulator returns instantaneous ultrasonic values. Physical hardware introduces sensor settling time, so guide learners to debounce readings when deploying.
- **Unsupported peripherals:** Only modules used by the curriculum are stubbed. Adding I²C, SPI, or NeoPixel support requires extending both the JavaScript module and the browser engine.
- **Step mode timing:** Each stepped line advances the robot by `stepLineTime` (default 0.02 s) rather than its real execution time.

## Extending Parity

When new capabilities ship in the MicroPython firmware, update both sides:

1. Expand the JavaScript `aidriver` module with methods that queue appropriately structured commands.
2. Teach `AIDriverStub` and the simulator to consume the new command type.
3. Augment the machine module facade if additional hardware primitives are required.
4. Add Jest coverage that executes learner-style code to confirm browser and firmware stay aligned.
