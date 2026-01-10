# HM-10 Web Gamepad Integration Design

## Objective

Enable students to control the AIDriver robot from any Chrome-based browser via Web Bluetooth using an HM-10 BLE module (the new standard interface), while keeping parity between the physical robot experience and the Challenge 7 simulator.

## User Workflow

1. Student powers the robot and the HM-10 module enters advertising mode.
2. Student opens the browser-based controller and chooses the new **BLE Gamepad** menu item.
3. The web app prompts for a Bluetooth device; the student selects the HM-10.
4. Once connected, the on-screen joystick drives the robot in real time.
5. If two-way telemetry is enabled, ultrasonic distance readings appear on the controller UI.
6. Students can switch to the Challenge 7 simulator and reuse the same UI controls for practice.

## System Components

- **HM-10 BLE Module** wired to the Pico’s UART (3.3 V, GND, RX, TX) using the existing diagrams (identical wiring to the retired HC-05 instructions).
- **MicroPython Firmware** running on the Pico to parse joystick packets, drive motors, and optionally publish sensor data back over BLE.
- **Web Bluetooth Controller** (new web app entry) hosting the joystick UI and BLE logic with a modern, mobile-optimised layout.
- **Challenge 7 Simulator Integration** extending the existing simulator to reuse the same control surface.
- **Documentation Updates** revising Challenge 7 instructions to reference the new controller and HM-10-specific setup.

## Communication Protocol

- **Transport:** BLE GATT over HM-10’s default UART service (Service UUID `0000FFE0-0000-1000-8000-00805F9B34FB`, Characteristic UUID `0000FFE1-0000-1000-8000-00805F9B34FB`).
- **Packet Format (Controller → Robot):**
  - Byte 0: control flags (bit0 brake, bit1 reserved).
  - Byte 1: signed int8 left motor speed (-255..255).
  - Byte 2: signed int8 right motor speed (-255..255).
  - Byte 3 (optional): watchdog counter to detect stale commands.
- **Packet Format (Robot → Controller, optional):**
  - Byte 0: telemetry type (0x01 = ultrasonic distance mm).
  - Byte 1-2: uint16 distance in millimetres (big-endian).
  - Telemetry updates throttled to 5 Hz to minimise BLE traffic while keeping readings fresh.

## Control Mapping Logic

- On-screen joystick yields `x` and `y` values in range [-1.0, 1.0].
- Compute base speed = `y * MAX_SPEED` (MAX_SPEED = 255).
- Differential steering:
  - `left = clamp(base + x * |y| * MAX_SPEED, -255, 255)`.
  - `right = clamp(base - x * |y| * MAX_SPEED, -255, 255)`.
- Hard left/right (`x` near ±1 with low |y|) results in spin turns by setting `left = -right = x * MAX_SPEED`.
- Joystick centre (|x|, |y| < deadzone) sets both speeds to 0 (brake command flagged for immediate stop).

## Web UI Requirements

- Add controller entry as a new menu item alongside existing simulator tools.
- Layout:
  - Main joystick (touch + mouse support) with responsive sizing and full-screen mobile presentation.
  - Brake indicator and connection status banner.
  - Telemetry panel showing latest ultrasonic reading with color-coded proximity.
  - Connect/Disconnect button using Web Bluetooth flow.
- Reuse styling and responsive behaviour from existing Challenge 7 simulator controls for student familiarity.
- Provide fallback messaging for browsers that lack Web Bluetooth.

## Firmware Updates

- Implement BLE UART handler to read joystick packets from HM-10.
- Integrate with existing AIDriver motor APIs, replacing Dabble-specific logic.
- Add optional telemetry publisher (periodic ultrasonic distance push if enabled through configuration flag).
- Remove legacy HC-05 code paths; HM-10 BLE is the sole supported transport.

## Simulator Updates

- Extend Challenge 7 simulator to expose the same joystick component, translating virtual movements into simulated motor speeds.
- Mirror telemetry display by sampling the simulator’s virtual ultrasonic sensor.
- Ensure keyboard bindings remain available for accessibility.

## Documentation Changes

- Update `docs/Challenge_7.md`:
  - Replace HC-05-centric instructions with HM-10 wiring and Web Bluetooth controller usage.
  - Document browser requirements and connection steps (including mobile Chrome guidance).
  - Add section describing optional telemetry feedback.
- Add troubleshooting entry for BLE pairing and browser permission issues.

## Implementation Plan

1. **Hardware Validation**

- Confirm HM-10 wiring and voltage levels on the robot platform (reuse existing VCC/GND/RX/TX instructions).
- Verify BLE advertising and connection from test browser.

2. **Firmware Development**
   - Create BLE UART reader/writer module (e.g., `hm10_controller.py`).
   - Implement joystick packet parser and motor control logic.

- Add telemetry publisher capped at 5 Hz and configuration switches.

3. **Web Application**

   - Build joystick UI component with pointer/touch support.
   - Implement Web Bluetooth connection flow (service/characteristic UUIDs, notifications, writes).
   - Encode joystick values into command packets and handle telemetry notifications.
   - Integrate controller into site navigation/menu.

4. **Simulator Alignment**
   - Reuse joystick component within Challenge 7 simulator page.
   - Ensure motor speed calculations match the physical firmware implementation.

- Display simulated ultrasonic readings in the same UI panel at the same 5 Hz cadence.

5. **Documentation & Testing**
   - Revise Challenge 7 documentation and associated assets.
   - Update sample code snippets in repository.
   - Conduct end-to-end tests on supported browsers and devices.

## Risks & Mitigations

- **Browser Support Variability:** Limit scope to Chrome-based browsers; provide guidance for unsupported platforms.
- **BLE Latency/Bandwidth:** Keep packet size minimal; apply 40 ms update interval to balance responsiveness.
- **Student Pairing Issues:** Include clear steps for re-pairing and resetting HM-10.
- **Simulator Divergence:** Share a single joystick calculation module between firmware, web app, and simulator to ensure consistency.

## Closed Decisions

- **Legacy Support:** HC-05 compatibility will be removed; HM-10 BLE is the only supported wireless path moving forward.
- **Telemetry Scope:** Ultrasonic telemetry only, sampled at 5 Hz.

## Open Questions

1. Should the existing Dabble/HC-05 workflow remain available alongside the HM-10 controller, or can it be fully replaced?
2. What Ultrasonic sensor sampling rate is acceptable for telemetry without impacting BLE throughput (e.g., 5 Hz vs. 10 Hz)?
3. Do we need support for additional feedback (battery voltage, errors) beyond ultrasonic distance in this release?
