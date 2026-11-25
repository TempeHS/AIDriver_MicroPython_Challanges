import importlib
import sys

import pytest


def load_aidriver():
    if "aidriver" not in sys.modules:
        importlib.import_module("aidriver")
    return sys.modules["aidriver"]


def _make_robot(monkeypatch):
    module = load_aidriver()
    messages = []

    class DummyEventLog:
        def log_event(self, message):
            messages.append(message)

    monkeypatch.setattr(module, "eventlog", DummyEventLog())
    return module, module.AIDriver(), messages


def test_drive_forward_low_speed_logs_warning(monkeypatch):
    _module, robot, messages = _make_robot(monkeypatch)
    robot.drive_forward(0, 0)

    assert messages
    assert any("stopped" in msg for msg in messages)


def test_drive_forward_arc_message(monkeypatch):
    _module, robot, messages = _make_robot(monkeypatch)
    robot.drive_forward(200, 150)

    assert any("arc toward the right" in msg for msg in messages)


def test_drive_forward_speed_band(monkeypatch):
    _module, robot, messages = _make_robot(monkeypatch)
    robot.drive_forward(230, 230)

    assert any("very fast" in msg for msg in messages)


def test_rotate_left_low_speed(monkeypatch):
    _module, robot, messages = _make_robot(monkeypatch)
    robot.rotate_left(50)

    assert any("may not turn" in msg for msg in messages)


def test_rotate_right_normal_speed(monkeypatch):
    _module, robot, messages = _make_robot(monkeypatch)
    robot.rotate_right(200)

    assert any("on the spot" in msg for msg in messages)


def test_negative_speed_raises_value_error(monkeypatch):
    _module, robot, _messages = _make_robot(monkeypatch)

    with pytest.raises(ValueError, match="between 0 and 255"):
        robot.drive_forward(-10, 100)


def test_get_motor_speeds_returns_requested_speeds(monkeypatch):
    _module, robot, _messages = _make_robot(monkeypatch)
    robot.drive_forward(200, 150)

    assert robot.get_motor_speeds() == (200, 150)
    assert robot.motor_right._pwm_val == 200 * 257

    robot.brake()
    assert robot.get_motor_speeds() == (0, 0)
