# Challenge 7

In this extension challenge you will attach the HM-10 Bluetooth Low Energy module and drive the robot from the browser-based BLE Gamepad. The same control surface also works inside the Challenge 7 simulator so you can practise before connecting to hardware.

## Success Criteria

I can connect to my robot with the HM-10 module and control it from the BLE Gamepad in a Chrome-based browser.

## Step 1 – Install the HM-10 module

- VCC → 3.3 V (or 5 V if your HM-10 board supports it)
- GND → GND
- TXD → Pico RX on GP1
- RXD → Pico TX on GP0

Confirm the module LED is flashing rapidly to indicate advertising mode before moving on.

## Step 2 – Upload the HM-10 driver script

Create `main.py` (or update your existing script) with the example below. It continuously polls the HM-10, applies joystick speeds to the motors, and mirrors ultrasonic readings back to the browser.

```python
from time import sleep_ms

import aidriver
from aidriver import AIDriver
from hm10_controller import HM10Controller
from gamepad_driver_controller import HM10AIDriverController

aidriver.DEBUG_AIDRIVER = True  # Optional: prints helpful diagnostics

hm10 = HM10Controller()            # UART0 uses GP0 (TX) and GP1 (RX)
robot = AIDriver()
controller = HM10AIDriverController(hm10, robot)

print("HM-10 BLE Gamepad ready. Open the controller and press Connect.")

while True:
    controller.update()
    sleep_ms(40)  # ~25 Hz update rate keeps the motors responsive
```

Upload the script, then press **Run** or reset the Pico. The loop must keep running for the robot to respond to joystick input.

## Step 3 – Connect from the BLE Gamepad

1. Power on the robot and wait for the HM-10 LED to flash.
2. Open the Challenge 7 interface and choose **BLE Gamepad** (Chrome, Edge, or other Chromium-based browsers are required for Web Bluetooth).
3. Press **Connect**, select your HM-10 device, and grant the Bluetooth permission.
4. Use the on-screen joystick or keyboard bindings to drive. The brake indicator lights whenever the joystick releases to center.
5. If ultrasonic telemetry is enabled, the distance panel updates at 5 Hz. Move an object in front of the sensor to confirm readings.

## Step 4 – Practise in the simulator (optional)

Switch the controller to **Simulator** mode to rehearse the same joystick motions without hardware. The UI and differential drive math are shared between the simulator and physical robot, so behaviour matches what you will see on the bench.

## Troubleshooting

- **Controller connects but the robot does not move:** Ensure `main.py` is running the HM-10 loop above. A blank `while True: pass` script will never forward joystick commands.
- **HM-10 never appears in the device list:** Check wiring and power, then reset the module. Web Bluetooth only works over HTTPS or localhost in supported browsers.
- **Robot keeps braking during a drive:** The firmware times out if no packet arrives within 500 ms. Keep the browser tab active so the gamepad can continue sending updates.
- **No telemetry readings:** Verify the ultrasonic sensor is connected and unobstructed. The controller only transmits distances when valid values are detected.
