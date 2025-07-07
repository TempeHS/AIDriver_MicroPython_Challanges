"""
AIDriver MicroPython Library for RP2040
A unified 2-wheel robot library with ultrasonic sensor

Converted from Arduino C++ library by Ben Jones @ Tempe High School
Original licenses maintained: GNU GPL for code, Creative Commons for content

Dependencies: machine, time modules (built into MicroPython)
"""

from machine import Pin, PWM, time_pulse_us
from time import sleep_us, sleep_ms


class UltrasonicSensor:
    """
    HC-SR04 Ultrasonic Sensor class for distance measurement.
    """

    def __init__(self, trig_pin, echo_pin):
        """
        Initialize ultrasonic sensor.

        Args:
            trig_pin: GPIO pin for trigger signal.
            echo_pin: GPIO pin for echo signal.
        """
        self.trig_pin = Pin(trig_pin, Pin.OUT)
        self.echo_pin = Pin(echo_pin, Pin.IN)
        self.trig_pin.off()

        # Sensor configuration
        self.sound_speed_mm_us = 0.343  # Speed of sound in mm/μs
        self.max_distance_mm = 2000  # Max sensor range in mm
        # Calculate timeout based on max distance
        self.timeout_us = int(self.max_distance_mm * 2.5 / self.sound_speed_mm_us)

    def read_distance_mm(self):
        """
        Read distance from the sensor and return it in millimeters.

        Returns:
            int: Distance in millimeters, or -1 if the reading is out of range or fails.
        """
        # Add a delay to allow the sensor to settle between readings.
        sleep_ms(30)

        # Send a 10μs trigger pulse
        self.trig_pin.off()
        sleep_us(2)
        self.trig_pin.on()
        sleep_us(10)
        self.trig_pin.off()

        try:
            # Measure the duration of the echo pulse
            duration = time_pulse_us(self.echo_pin, 1, self.timeout_us)

            if duration < 0:  # time_pulse_us returns -1 on timeout
                return -1

            # Calculate distance in mm: (duration * speed_of_sound) / 2
            distance_mm = (duration * self.sound_speed_mm_us) / 2

            # Check if the reading is within the valid range (20mm to 2000mm)
            if 20 <= distance_mm <= self.max_distance_mm:
                return int(distance_mm)
            else:
                return -1  # Out of range
        except OSError:
            # This can occur if there's an issue with time_pulse_us
            return -1


class L298N:
    """
    L298N Motor Driver class for controlling a single motor
    """

    # Direction constants
    FORWARD = 0
    BACKWARD = 1
    STOP = -1

    def __init__(self, pin_enable, pin_direction, pin_brake):
        """
        Initialize L298N motor controller

        Args:
            pin_enable: PWM pin for speed control (0-65535)
            pin_direction: Digital pin for direction control
            pin_brake: Digital pin for brake control
        """
        self._pin_enable = PWM(Pin(pin_enable))
        self._pin_enable.freq(1000)  # 1kHz PWM frequency
        self._pin_direction = Pin(pin_direction, Pin.OUT)
        self._pin_brake = Pin(pin_brake, Pin.OUT)

        self._pwm_val = 65535  # Max speed (16-bit PWM)
        self._is_moving = False
        self._can_move = True
        self._direction = self.STOP

        # Initialize pins to stopped state
        self.stop()

    def set_speed(self, speed):
        """
        Set motor speed

        Args:
            speed: Speed value 0-255 (Arduino compatible) or 0-65535 (full RP2040 range)
        """
        # Convert Arduino 0-255 range to RP2040 0-65535 range if needed
        if speed <= 255:
            self._pwm_val = int(speed * 257)  # 257 = 65535/255
        else:
            self._pwm_val = min(speed, 65535)

    def get_speed(self):
        """
        Get current motor speed

        Returns:
            Current speed (0 if stopped, otherwise the set PWM value)
        """
        return self._pwm_val if self._is_moving else 0

    def forward(self):
        """Move motor forward"""
        self._pin_brake.off()
        self._pin_direction.on()
        self._pin_enable.duty_u16(self._pwm_val)
        self._direction = self.FORWARD
        self._is_moving = True

    def backward(self):
        """Move motor backward"""
        self._pin_brake.off()
        self._pin_direction.off()
        self._pin_enable.duty_u16(self._pwm_val)
        self._direction = self.BACKWARD
        self._is_moving = True

    def stop(self):
        """Stop motor with brake"""
        self._pin_direction.on()
        self._pin_brake.on()
        self._pin_enable.duty_u16(65535)  # Short motor terminals for brake
        self._direction = self.STOP
        self._is_moving = False

    def is_moving(self):
        """Check if motor is currently moving"""
        return self._is_moving

    def get_direction(self):
        """Get current direction"""
        return self._direction


class AIDriver:
    """
    Unified robot driver class with L298NH motor control and SR-HC04 ultrasonic sensor
    The L298NH requires L298N channels to be called simultaneously.
    """

    def __init__(
        self,
        right_speed_pin=2,  # GP2 (PWM capable)
        left_speed_pin=3,  # GP3 (PWM capable)
        right_dir_pin=5,  # GP4
        right_brake_pin=6,  # GP5
        left_dir_pin=7,  # GP6
        left_brake_pin=8,  # GP7
        trig_pin=10,  # GP8
        echo_pin=9,  # GP9
    ):
        """
        Initialize RP2040 based AIDriver differential drive robot.


        Args:
            right_speed_pin: PWM pin for right motor speed (default GP2)
            left_speed_pin: PWM pin for left motor speed (default GP3)
            right_dir_pin: Digital pin for right motor direction (default GP4)
            right_brake_pin: Digital pin for right motor brake (default GP5)
            left_dir_pin: Digital pin for left motor direction (default GP6)
            left_brake_pin: Digital pin for left motor brake (default GP7)
            trig_pin: Ultrasonic sensor trigger pin (default GP8)
            echo_pin: Ultrasonic sensor echo pin (default GP9)
        """

        # Initialize motor controllers
        self.motor_right = L298N(right_speed_pin, right_dir_pin, right_brake_pin)
        self.motor_left = L298N(left_speed_pin, left_dir_pin, left_brake_pin)

        # Initialize ultrasonic sensor
        self.ultrasonic = UltrasonicSensor(trig_pin, echo_pin)

        print("AIDriver initialized - Debug mode active")

    def read_distance(self):
        """
        Read distance from ultrasonic sensor.

        Returns:
            Distance in millimeters, or -1 if invalid reading.
        """
        distance_mm = self.ultrasonic.read_distance_mm()
        if distance_mm == -1:
            return -1
        return int(distance_mm)

    def brake(self):
        """Stop both motors"""
        self.motor_right.stop()
        self.motor_left.stop()

    def drive_forward(self, right_wheel_speed, left_wheel_speed):
        """
        Drive robot forward

        Args:
            right_wheel_speed: Speed for right wheel (0-255)
            left_wheel_speed: Speed for left wheel (0-255)
        """
        self.motor_right.set_speed(right_wheel_speed)
        self.motor_left.set_speed(left_wheel_speed)
        self.motor_right.backward()
        self.motor_left.forward()

    def drive_backward(self, right_wheel_speed, left_wheel_speed):
        """
        Drive robot backward

        Args:
            right_wheel_speed: Speed for right wheel (0-255)
            left_wheel_speed: Speed for left wheel (0-255)
        """
        self.motor_right.set_speed(right_wheel_speed)
        self.motor_left.set_speed(left_wheel_speed)
        self.motor_right.forward()
        self.motor_left.backward()

    def rotate_right(self, turn_speed):
        """
        Rotate robot right (clockwise)

        Args:
            turn_speed: Speed for rotation (0-255)
        """
        self.motor_right.set_speed(turn_speed)
        self.motor_left.set_speed(turn_speed)
        self.motor_right.forward()
        self.motor_left.forward()

    def rotate_left(self, turn_speed):
        """
        Rotate robot left (counter-clockwise)

        Args:
            turn_speed: Speed for rotation (0-255)
        """
        self.motor_right.set_speed(turn_speed)
        self.motor_left.set_speed(turn_speed)
        self.motor_right.backward()
        self.motor_left.backward()

    def set_motor_speeds(self, right_speed, left_speed):
        """
        Set individual motor speeds without changing direction

        Args:
            right_speed: Speed for right motor (0-255)
            left_speed: Speed for left motor (0-255)
        """
        self.motor_right.set_speed(right_speed)
        self.motor_left.set_speed(left_speed)

    def get_motor_speeds(self):
        """
        Get current motor speeds

        Returns:
            Tuple of (right_speed, left_speed)
        """
        return (self.motor_right.get_speed(), self.motor_left.get_speed())

    def is_moving(self):
        """
        Check if robot is moving

        Returns:
            True if either motor is moving
        """
        return self.motor_right.is_moving() or self.motor_left.is_moving()
