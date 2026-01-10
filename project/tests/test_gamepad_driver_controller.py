import importlib
import sys


def load_controller_module():
    if "gamepad_driver_controller" not in sys.modules:
        importlib.import_module("gamepad_driver_controller")
    return sys.modules["gamepad_driver_controller"]


class FakeMotor:
    def __init__(self):
        self.last_speed = None
        self.direction = None
        self.stopped = True

    def set_speed(self, speed):
        self.last_speed = speed

    def forward(self):
        self.direction = "forward"
        self.stopped = False

    def backward(self):
        self.direction = "backward"
        self.stopped = False

    def stop(self):
        self.direction = "stop"
        self.stopped = True


class FakeDriver:
    def __init__(self):
        self.motor_left = FakeMotor()
        self.motor_right = FakeMotor()
        self.brake_calls = 0
        self.distance = 500

    def brake(self):
        self.brake_calls += 1
        self.motor_left.stop()
        self.motor_right.stop()

    def service(self):
        pass

    def read_distance(self):
        return self.distance


class FakeHM10:
    def __init__(self):
        self.flags = 0
        self.left_speed = 0
        self.right_speed = 0
        self.stale = False
        self.poll_calls = 0
        self.telemetry = []

    def poll(self):
        self.poll_calls += 1
        return True

    def is_stale(self):
        return self.stale

    def is_brake_requested(self):
        return bool(self.flags & 0x01)

    def send_ultrasonic(self, distance):
        self.telemetry.append(distance)


def make_controller():
    module = load_controller_module()
    hm10 = FakeHM10()
    driver = FakeDriver()
    controller = module.HM10AIDriverController(hm10, driver)
    return controller, hm10, driver


def test_forward_command_sets_motor_directions():
    controller, hm10, driver = make_controller()
    hm10.left_speed = 120
    hm10.right_speed = 110

    controller.update()

    assert driver.motor_left.direction == "forward"
    assert driver.motor_left.last_speed == 120
    assert driver.motor_right.direction == "backward"  # right motor reversed
    assert driver.motor_right.last_speed == 110
    assert driver.brake_calls == 0


def test_reverse_command_sets_motor_directions():
    controller, hm10, driver = make_controller()
    hm10.left_speed = -100
    hm10.right_speed = -90

    controller.update()

    assert driver.motor_left.direction == "backward"
    assert driver.motor_right.direction == "forward"


def test_spin_left():
    controller, hm10, driver = make_controller()
    hm10.left_speed = -200
    hm10.right_speed = 200

    controller.update()

    assert driver.motor_left.direction == "backward"
    assert driver.motor_right.direction == "backward"


def test_brake_flag_triggers_brake():
    controller, hm10, driver = make_controller()
    hm10.flags = 0x01
    hm10.left_speed = 80
    hm10.right_speed = 90

    controller.update()

    assert driver.brake_calls == 1
    assert driver.motor_left.stopped
    assert driver.motor_right.stopped


def test_stale_command_triggers_brake():
    controller, hm10, driver = make_controller()
    hm10.stale = True

    controller.update()

    assert driver.brake_calls == 1


def test_telemetry_sent_when_interval_elapsed():
    controller, hm10, driver = make_controller()
    controller.telemetry_enabled = True
    controller._last_telemetry_read_ms = (
        controller._last_telemetry_read_ms - controller.telemetry_period_ms
    )

    controller.update()

    assert hm10.telemetry[0] == driver.distance
