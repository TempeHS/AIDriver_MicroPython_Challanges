# Hardware Integration

## HM-10 Control Path

The simulator mirrors the real robot workflow by streaming joystick commands to an HM-10 BLE module. The Gamepad controller in app/js/gamepad.js establishes a Web Bluetooth connection with the UART-over-BLE service (FFE0/FFE1) exposed by the classroom firmware.

1. Call `Gamepad.init()` during app bootstrap to cache UI elements and register joystick handlers.
2. When learners press **Connect**, the browser prompts for an HM-10 device using `navigator.bluetooth.requestDevice` filtered by the FFE0 service.
3. The module opens the primary service and subscribes to characteristic notifications so telemetry packets stream back as soon as the robot publishes them.
4. A four-byte packet is sent every 40 ms (or when speeds change) via `characteristic.writeValueWithoutResponse`:
   - Byte 0: `0x01` when braking, `0x00` while driving
   - Byte 1: Left wheel speed (signed `-255…255` mapped to unsigned byte)
   - Byte 2: Right wheel speed (same encoding as left)
   - Byte 3: Monotonic sequence counter used for simple packet tracing

If Web Bluetooth is unavailable, the controller remains in simulator-only mode. Learners can still drag the on-screen joystick to drive the virtual robot and observe simulated telemetry updates.

## Telemetry and Sensor Feedback

When connected, the HM-10 pushes ultrasonic readings as two-byte big-endian distances preceded by a packet type byte (`0x01`). The Gamepad listener forwards values to both the telemetry widget and the global ultrasonic display so the UI remains consistent across hardware and simulator modes. Without BLE, the loop fetches simulated distances from `Simulator.simulateUltrasonic()` every 200 ms, yielding the same UI signals.

## Command Bridging

The simulator keeps a shared robot state on the `App` namespace. `Gamepad.applySimulatorSpeeds()` writes the latest joystick-derived speeds into `App.robot` so the renderer and physics engine react exactly as the firmware would command the motors. When BLE is active, these updates are mirrored to the HM-10, allowing live hardware driving while the canvas visualises robot motion.

Behind the scenes, the MicroPython firmware consumes the same packet structure on its UART RX line. This symmetry lets learners prototype strategies in the browser and deploy the identical control logic to the physical car with no further changes.

## Troubleshooting Checklist

- **Connection fails immediately:** Ensure Chrome-based browsers are used and the page served over HTTPS (required by Web Bluetooth).
- **No telemetry updates:** Verify the classroom firmware publishes the ultrasonic packet and that the HM-10 characteristic supports notifications.
- **Laggy joystick input:** The update loop clamps to 40 ms; excessive lag indicates the browser throttled timers—switch to an active tab or connect the physical device to prioritise updates.
