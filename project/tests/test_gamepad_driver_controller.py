import importlib
import sys


def load_controller_module():
    if "gamepad_driver_controller" not in sys.modules:
        importlib.import_module("gamepad_driver_controller")
    return sys.modules["gamepad_driver_controller"]


class FakeDriver:
    def __init__(self):
        self.calls = []

    def brake(self):
        self.calls.append(("brake", ()))

    def drive_forward(self, right, left):
        self.calls.append(("drive_forward", (right, left)))

    def drive_backward(self, right, left):
        self.calls.append(("drive_backward", (right, left)))

    def rotate_left(self, speed):
        self.calls.append(("rotate_left", (speed,)))

    def rotate_right(self, speed):
        self.calls.append(("rotate_right", (speed,)))


class FakeGamePad:
    def __init__(self):
        self.mode = 0
        self.start = False
        self.up = False
        self.down = False
        self.left = False
        self.right = False
        self.angle = 0
        self.radius = 0

    def poll(self):
        pass

    def is_start_pressed(self):
        return self.start

    def is_select_pressed(self):  # unused but kept for completeness
        return False

    def is_triangle_pressed(self):
        return False

    def is_circle_pressed(self):
        return False

    def is_cross_pressed(self):
        return False

    def is_square_pressed(self):
        return False

    def is_up_pressed(self):
        return self.up

    def is_down_pressed(self):
        return self.down

    def is_left_pressed(self):
        return self.left

    def is_right_pressed(self):
        return self.right

    def get_angle(self):
        return self.angle

    def get_radius(self):
        return self.radius


def make_controller():
    module = load_controller_module()
    gamepad = FakeGamePad()
    driver = FakeDriver()
    controller = module.GamepadAIDriverController(gamepad, driver)
    return controller, gamepad, driver


def test_start_button_applies_brake():
    controller, gamepad, driver = make_controller()
    gamepad.start = True

    controller.update()

    assert driver.calls[0][0] == "brake"


def test_dpad_up_drives_forward():
    controller, gamepad, driver = make_controller()
    gamepad.up = True

    controller.update()

    assert driver.calls[0] == (
        "drive_forward",
        (controller.max_speed, controller.max_speed),
    )


def test_dpad_down_drives_backward():
    controller, gamepad, driver = make_controller()
    gamepad.down = True

    controller.update()

    assert driver.calls[0] == (
        "drive_backward",
        (controller.max_speed, controller.max_speed),
    )


def test_dpad_left_rotates_left():
    controller, gamepad, driver = make_controller()
    gamepad.left = True

    controller.update()

    assert driver.calls[0] == ("rotate_left", (controller.turn_speed,))


def test_dpad_right_rotates_right():
    controller, gamepad, driver = make_controller()
    gamepad.right = True

    controller.update()

    assert driver.calls[0] == ("rotate_right", (controller.turn_speed,))


def test_analog_radius_zero_brakes():
    controller, gamepad, driver = make_controller()
    gamepad.mode = 1
    gamepad.angle = 0
    gamepad.radius = 0

    controller.update()

    assert driver.calls[0][0] == "brake"


def test_analog_forward_drives_forward():
    controller, gamepad, driver = make_controller()
    gamepad.mode = 1
    gamepad.angle = 90
    gamepad.radius = 7

    controller.update()

    call = driver.calls[0]
    assert call[0] == "drive_forward"
    right, left = call[1]
    assert abs(right - left) <= 1
    assert abs(right - controller.max_speed) <= 1


def test_analog_backward_drives_backward():
    controller, gamepad, driver = make_controller()
    gamepad.mode = 1
    gamepad.angle = 270
    gamepad.radius = 7

    controller.update()

    call = driver.calls[0]
    assert call[0] == "drive_backward"


def test_analog_rotate_left():
    controller, gamepad, driver = make_controller()
    gamepad.mode = 1
    gamepad.angle = 180
    gamepad.radius = 7

    controller.update()

    assert driver.calls[0][0] == "rotate_left"


def test_analog_rotate_right():
    controller, gamepad, driver = make_controller()
    gamepad.mode = 1
    gamepad.angle = 0
    gamepad.radius = 7

    controller.update()

    assert driver.calls[0][0] == "rotate_right"


def test_no_input_brakes():
    controller, _gamepad, driver = make_controller()

    controller.update()

    assert driver.calls[0][0] == "brake"
