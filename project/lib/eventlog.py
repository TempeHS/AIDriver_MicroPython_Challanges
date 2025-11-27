"""Run-once event logger for AIDriver RP2040.

The first run after a fresh boot (or recovery) writes human-readable
events to ``event_log.txt`` next to ``main.py``. If the log file already
contains data, logging is disabled so that students can treat the log as a
single-run snapshot. Clearing the file re-enables logging.
"""

import time

try:
    import os
except ImportError:  # MicroPython naming
    import uos as os  # type: ignore


_LOG_PATH = "event_log.txt"
_start_ticks = time.ticks_ms()
_LOG_ENABLED = True


def _initialize_state():
    """Disable logging if the file already exists with content."""
    global _LOG_ENABLED
    try:
        # Use os.stat when available so we do not read the file into RAM.
        try:
            stat_result = os.stat(_LOG_PATH)
            if isinstance(stat_result, (tuple, list)) and len(stat_result) > 6:
                has_content = stat_result[6] > 0
            else:
                has_content = getattr(stat_result, "st_size", 0) > 0
        except (OSError, AttributeError):
            # Either the file does not exist or the stat call is unsupported.
            with open(_LOG_PATH, "r") as existing:
                has_content = existing.read(1) != ""
    except (OSError, Exception):
        has_content = False

    if has_content:
        _LOG_ENABLED = False


def _elapsed_s():
    """Return elapsed seconds (float) since logger import."""
    dt_ms = time.ticks_diff(time.ticks_ms(), _start_ticks)
    return dt_ms / 1000.0


def clear_log():
    """Completely clear the log file and re-enable logging."""
    global _LOG_ENABLED, _start_ticks
    try:
        with open(_LOG_PATH, "w") as f:
            f.write("")
        _LOG_ENABLED = True
        _start_ticks = time.ticks_ms()
    except Exception:
        # If the filesystem is not ready, fail silently.
        pass


def log_separator():
    """Write a separator and reset the logical t=0 for this run."""
    global _start_ticks
    if not _LOG_ENABLED:
        return
    _start_ticks = time.ticks_ms()
    try:
        with open(_LOG_PATH, "a") as f:
            f.write("\n===== NEW RUN =====\n")
            f.write("t+0.00s : robot start\n")
    except Exception:
        pass


def log_event(message):
    """Append a single-line, human-readable event to the log."""
    if not _LOG_ENABLED:
        return
    t = _elapsed_s()
    try:
        with open(_LOG_PATH, "a") as f:
            f.write("t+{:.2f}s : {}\n".format(t, message))
    except Exception:
        pass


_initialize_state()
