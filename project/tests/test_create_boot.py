"""Tests for the generated _boot.py recovery code (.devcontainer/create_boot.py)."""

import importlib.util
import os as real_os
import sys
import types
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
CREATE_BOOT = REPO_ROOT / ".devcontainer" / "create_boot.py"
DEFAULT_MAIN = "print('default main')\n"


def _load_create_boot():
    spec = importlib.util.spec_from_file_location("create_boot", CREATE_BOOT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture
def boot_runner(tmp_path, monkeypatch):
    """Build a _boot.py and return a function that executes it on a fake device."""
    project = tmp_path / "project"
    (project / "lib").mkdir(parents=True)
    (project / "main.py").write_text(DEFAULT_MAIN)
    for name in ("aidriver.py", "eventlog.py"):
        (project / "lib" / name).write_text("")
    stock_boot = tmp_path / "_boot_original.py"
    stock_boot.write_text("stock_boot_ran = True\n")
    boot_py = tmp_path / "_boot.py"
    assert _load_create_boot().create_boot_with_main(
        str(project / "main.py"), str(boot_py), str(stock_boot)
    )

    device = tmp_path / "device"
    device.mkdir()
    monkeypatch.chdir(device)

    fake_os = types.ModuleType("os")
    fake_os.listdir = lambda path="/": real_os.listdir(device)
    fake_os.remove = real_os.remove
    fake_os.rename = real_os.rename
    fake_eventlog = types.SimpleNamespace(
        clear_log=lambda: None, log_separator=lambda: None
    )

    def run(recovery):
        class Pin:
            IN = PULL_UP = 0

            def __init__(self, *args):
                pass

            def value(self):
                return 0 if recovery else 1

        monkeypatch.setitem(sys.modules, "os", fake_os)
        monkeypatch.setitem(sys.modules, "machine", types.SimpleNamespace(Pin=Pin))
        monkeypatch.setitem(sys.modules, "eventlog", fake_eventlog)
        namespace = {}
        exec(compile(boot_py.read_text(), "_boot.py", "exec"), namespace)
        monkeypatch.setitem(sys.modules, "os", real_os)
        return namespace

    return device, run


def test_recovery_moves_boot_py_and_shadowing_modules_aside(boot_runner):
    device, run = boot_runner
    (device / "main.py").write_text("student main")
    (device / "boot.py").write_text("while True: pass")
    (device / "aidriver.py").write_text("broken copy")
    (device / "aidriver.py.bak").write_text("older backup")
    (device / "eventlog.mpy").write_text("compiled copy")
    (device / "my_helpers.py").write_text("student module")

    namespace = run(recovery=True)

    assert (device / "main.py").read_text() == DEFAULT_MAIN
    assert not (device / "boot.py").exists()
    assert (device / "boot.py.bak").read_text() == "while True: pass"
    assert not (device / "aidriver.py").exists()
    assert (device / "aidriver.py.bak").read_text() == "broken copy"
    assert (device / "eventlog.mpy.bak").read_text() == "compiled copy"
    assert (device / "my_helpers.py").read_text() == "student module"
    assert namespace["stock_boot_ran"] is True
    for leaked in ("MAIN_PY_CONTENT", "RECOVERY_BLOCKERS", "create_main_py", "os"):
        assert leaked not in namespace


def test_normal_boot_leaves_student_files_alone(boot_runner):
    device, run = boot_runner
    (device / "main.py").write_text("student main")
    (device / "boot.py").write_text("student boot")
    (device / "aidriver.py").write_text("student copy")

    run(recovery=False)

    assert (device / "main.py").read_text() == "student main"
    assert (device / "boot.py").read_text() == "student boot"
    assert (device / "aidriver.py").read_text() == "student copy"
    assert not list(device.glob("*.bak"))


def test_normal_boot_creates_missing_main_py(boot_runner):
    device, run = boot_runner

    run(recovery=False)

    assert (device / "main.py").read_text() == DEFAULT_MAIN
