# Challenge 7

![HC-05 BT Module Wiring Diagram](images/HC-05.png "HC-05 BT Module Wiring Diagram")

- Vcc -------> 3.3V or 5V
- GND -------> GND
- RX --------> Pin 0
- TX --------> Pin 1

## Mobile GamePad App

- [Dabble for iPhone](https://apps.apple.com/us/app/dabble-bluetooth-controller/id1472734455)
- [Dabble for Android](https://play.google.com/store/apps/details?id=io.dabbleapp&hl=en_AU)

```python
from gamepad_pico import GamePad
import utime

gamepad = GamePad()

while True:
    gamepad.poll()
    if gamepad.is_start_pressed():
        print("START pressed")
    if gamepad.is_up_pressed():
        print("UP pressed")
    x = gamepad.get_x()
    y = gamepad.get_y()
    if x != 0 or y != 0:
        print("Joystick X:", x, "Y:", y)
    utime.sleep_ms(100)
```
