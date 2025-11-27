import importlib
import sys

import pytest


def load_gamepad_module():
    if "gamepad_pico" not in sys.modules:
        importlib.import_module("gamepad_pico")
    return sys.modules["gamepad_pico"]


def _make_recording_uart(monkeypatch):
    machine = sys.modules["machine"]
    base_uart = machine.UART
    instances = []

    class RecordingUART(base_uart):
        def __init__(self, *args, **kwargs):  # noqa: D401 - mimic base signature
            super().__init__(*args, **kwargs)
            instances.append(self)

    monkeypatch.setattr(machine, "UART", RecordingUART)
    return instances


def test_digital_frame_updates_buttons(monkeypatch):
    module = load_gamepad_module()
    instances = _make_recording_uart(monkeypatch)

    pad = module.GamePad()
    uart = instances[-1]

    frame = [
        module.START_OF_FRAME,
        0x01,  # Module ID (ignored)
        module.GAMEPAD_DIGITAL,
        0x02,  # Arg count
        0x01,  # Len0
        0b00000001,  # START button
        0x01,  # Len1
        0b00001000,  # RIGHT arrow
        module.END_OF_FRAME,
    ]

    uart.feed(frame)
    pad.poll()

    assert pad.is_start_pressed()
    assert pad.is_right_pressed()
    assert not pad.is_left_pressed()


def test_analog_frame_updates_mode(monkeypatch):
    module = load_gamepad_module()
    instances = _make_recording_uart(monkeypatch)

    pad = module.GamePad()
    uart = instances[-1]

    value = (3 << 3) | 5  # angle 45°, radius 5
    frame = [
        module.START_OF_FRAME,
        0x01,
        module.GAMEPAD_ANALOG,
        0x02,
        0x01,
        0x00,
        0x01,
        value,
        module.END_OF_FRAME,
    ]

    uart.feed(frame)
    pad.poll()

    assert pad.mode == 1
    assert pad.get_angle() == 45
    assert pad.get_radius() == 5
    assert pad.get_x() == pytest.approx(5 * 2**0.5 / 2, rel=1e-3)
    assert pad.get_y() == pytest.approx(5 * 2**0.5 / 2, rel=1e-3)
