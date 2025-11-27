import sys
import types
from pathlib import Path
import time as _time

PROJECT_ROOT = Path(__file__).resolve().parents[1]
LIB_DIR = PROJECT_ROOT / "lib"

# Ensure the custom MicroPython-style libraries are importable as top-level modules.
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
if str(LIB_DIR) not in sys.path:
    sys.path.insert(0, str(LIB_DIR))


def _ensure_time_helpers():
    """Provide MicroPython-style helpers on CPython's time module for tests."""
    if not hasattr(_time, "sleep_ms"):

        def sleep_ms(value):
            _time.sleep(value / 1000.0)

        _time.sleep_ms = sleep_ms  # type: ignore[attr-defined]

    if not hasattr(_time, "sleep_us"):

        def sleep_us(value):
            _time.sleep(value / 1_000_000.0)

        _time.sleep_us = sleep_us  # type: ignore[attr-defined]

    if not hasattr(_time, "ticks_ms"):
        start = _time.monotonic()

        def ticks_ms():
            return int((_time.monotonic() - start) * 1000)

        def ticks_diff(current, previous):
            return current - previous

        _time.ticks_ms = ticks_ms  # type: ignore[attr-defined]
        _time.ticks_diff = ticks_diff  # type: ignore[attr-defined]


def _install_machine_stub():
    """Install a lightweight stub of the MicroPython `machine` module."""
    if "machine" in sys.modules:
        return

    module = types.ModuleType("machine")

    class Pin:
        IN = 0
        OUT = 1
        PULL_UP = 2

        def __init__(self, pin_id, mode=None):
            self.id = pin_id
            self.mode = mode
            self._value = 1

        def on(self):
            self._value = 1

        def off(self):
            self._value = 0

        def toggle(self):
            self._value ^= 1

        def value(self, val=None):
            if val is None:
                return self._value
            self._value = val
            return self._value

    class PWM:
        def __init__(self, pin):
            self.pin = pin
            self.frequency = 0
            self.duty = 0

        def freq(self, value):
            self.frequency = value

        def duty_u16(self, value):
            self.duty = value

    class UART:
        def __init__(self, *args, **kwargs):
            self.buffer = bytearray()

        def feed(self, data):
            self.buffer.extend(data)

        def any(self):
            return len(self.buffer)

        def read(self, size):
            if not self.buffer:
                return None
            byte = bytes([self.buffer[0]])
            self.buffer = self.buffer[1:]
            return byte

    def time_pulse_us(pin, level, timeout=0):
        # Return a fixed duration for deterministic tests.
        return 1000

    module.Pin = Pin
    module.PWM = PWM
    module.UART = UART
    module.time_pulse_us = time_pulse_us

    sys.modules["machine"] = module


_ensure_time_helpers()
_install_machine_stub()
