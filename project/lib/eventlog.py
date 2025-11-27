"""Simple always-on event logger for AIDriver RP2040.

Writes a human-readable log file next to main.py on the device
(e.g. /event_log.txt). This is intended for students to inspect
via the Arduino MicroPython Lab file browser.

- The log is always enabled (no debug flag).
- Each run starts with a clear separator and t=0 line.
- Times are shown as seconds since the current boot/run.
"""

import time

_LOG_PATH = "event_log.txt"
_start_ticks = time.ticks_ms()


def _elapsed_s():
    """Return elapsed seconds (float) since logger import."""
    dt_ms = time.ticks_diff(time.ticks_ms(), _start_ticks)
    return dt_ms / 1000.0


def clear_log():
    """Completely clear the log file.

    Used by GP4 self-heal to reset the log when main.py is restored.
    """
    try:
        with open(_LOG_PATH, "w") as f:
            f.write("")
    except Exception:
        # If the filesystem is not ready, fail silently.
        pass


def log_separator():
    """Write a separator and reset the logical t=0 for this run."""
    global _start_ticks
    _start_ticks = time.ticks_ms()
    try:
        with open(_LOG_PATH, "a") as f:
            f.write("\n===== NEW RUN =====\n")
            f.write("t+0.00s : robot start\n")
    except Exception:
        pass


def log_event(message):
    """Append a single-line, human-readable event to the log.

    Format: "t+X.XXs : message"
    """
    t = _elapsed_s()
    try:
        with open(_LOG_PATH, "a") as f:
            f.write("t+{:.2f}s : {}\n".format(t, message))
    except Exception:
        pass
