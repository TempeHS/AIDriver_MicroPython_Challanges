"""
Gamepad-to-AIDriver Control Library for RP2040 Robots

Maps GamePad input (via Dabble app or similar) to AIDriver robot movement.

- Requires: aidriver.py, gamepad_pico.py (see those for pin configs)
- Intended for MicroPython on Pico/RP2040

Author: (your name), adapted from Ben Jones' libraries
"""

from aidriver import AIDriver
from gamepad_pico import GamePad
from time import sleep_ms

class GamepadAIDriverController:
    """
    Connects a GamePad instance to an AIDriver robot, mapping buttons and analog input to movement.
    """

    def __init__(self, gamepad: GamePad, driver: AIDriver, 
                 max_speed=255, min_speed=60, turn_speed=180):
        """
        Args:
            gamepad: GamePad instance
            driver:  AIDriver instance
            max_speed: Max wheel speed (default 255)
            min_speed: Min speed for movement (deadzone below this: default 60)
            turn_speed: Speed for rotation (default 180)
        """
        self.gamepad = gamepad
        self.driver = driver
        self.max_speed = max_speed
        self.min_speed = min_speed
        self.turn_speed = turn_speed

    def _analog_to_speed(self, radius):
        # Convert joystick radius (0-7) to speed (min_speed-max_speed)
        if radius == 0:
            return 0
        return int(self.min_speed + (self.max_speed - self.min_speed) * (radius / 7))

    def update(self):
        """
        Polls the gamepad and sends commands to the robot.
        Call this repeatedly in your main loop.
        """
        self.gamepad.poll()

        # Emergency brake: START button
        if self.gamepad.is_start_pressed():
            self.driver.brake()
            return

        # D-pad priority (digital)
        if self.gamepad.is_up_pressed():
            self.driver.drive_forward(self.max_speed, self.max_speed)
            return
        if self.gamepad.is_down_pressed():
            self.driver.drive_backward(self.max_speed, self.max_speed)
            return
        if self.gamepad.is_left_pressed():
            self.driver.rotate_left(self.turn_speed)
            return
        if self.gamepad.is_right_pressed():
            self.driver.rotate_right(self.turn_speed)
            return

        # Analog stick (if supported by the app)
        if self.gamepad.mode:
            angle = self.gamepad.get_angle()  # 0-360°, 0 is right, 90 is up
            radius = self.gamepad.get_radius()  # 0-7

            speed = self._analog_to_speed(radius)
            if speed < self.min_speed:
                self.driver.brake()
                return

            # Map angle to wheel speeds (simple tank drive logic)
            # Forward: 90°, Backward: 270°, Left: 180°, Right: 0°
            # We'll compute left/right speeds using sin/cos
            import math
            angle_rad = math.radians(angle)
            y = math.sin(angle_rad)  # Forward/backward
            x = math.cos(angle_rad)  # Left/right

            # Tank drive math: left = y + x, right = y - x
            left_speed = y + x
            right_speed = y - x
            # Normalize
            max_mag = max(abs(left_speed), abs(right_speed), 1.0)
            left_speed = int(speed * left_speed / max_mag)
            right_speed = int(speed * right_speed / max_mag)

            # Reverse signs for backward
            if y < -0.5:
                self.driver.drive_backward(abs(right_speed), abs(left_speed))
            elif y > 0.5:
                self.driver.drive_forward(abs(right_speed), abs(left_speed))
            elif x < -0.5:
                self.driver.rotate_left(self.turn_speed)
            elif x > 0.5:
                self.driver.rotate_right(self.turn_speed)
            else:
                self.driver.brake()
            return

        # If no input, stop
        self.driver.brake()

if __name__ == "__main__":
    # Example usage: Run this on your Pico
    gamepad = GamePad()
    driver = AIDriver()
    controller = GamepadAIDriverController(gamepad, driver)

    print("Gamepad-AIDriver controller active.")
    while True:
        controller.update()
        sleep_ms(40)  # ~25Hz loop