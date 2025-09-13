# Building Custom MicroPython Firmware for Raspberry Pi Pico

This guide explains how to build MicroPython firmware for the Raspberry Pi Pico with your custom libraries (`aidriver.py`, `gamepad_driver_controller.py`, `gamepad_pico.py`) and your main script (`main.py`) integrated into the firmware. This allows you to flash the Pico with a firmware that includes your code, so it runs immediately after boot.

---

## Prerequisites
- Codespaces or a local devcontainer (already set up in this repo)
- Internet connection
- Raspberry Pi Pico board

---

## Step 1: Open the Devcontainer
1. Open this repository in Codespaces or VS Code with devcontainer support.
2. The environment will automatically install all build dependencies and clone the MicroPython source code.

---

## Step 2: Prepare Your Custom Libraries and Main Script
1. Copy your custom Python files (`aidriver.py`, `gamepad_driver_controller.py`, `gamepad_pico.py`) from `project/lib/` into the MicroPython source tree:
   - Place them in: `/workspace/micropython/ports/rp2/modules/`
2. Copy your `main.py` from `project/` into:
   - `/workspace/micropython/ports/rp2/modules/`

---

## Step 3: Build the Firmware
1. Open a terminal in the devcontainer.
2. Run the following commands:
   ```bash
   cd /workspace/micropython/ports/rp2
   make submodules
   make
   ```
3. The build process will generate a firmware file:
   - `/workspace/micropython/ports/rp2/build/firmware.uf2`

---

## Step 4: Flash the Firmware to Your Pico
1. Connect your Raspberry Pi Pico to your computer while holding the BOOTSEL button.
2. It will mount as a USB drive.
3. Copy the `firmware.uf2` file to the Pico USB drive.
4. The Pico will reboot and run your integrated `main.py` and libraries automatically.

---

## Notes
- Any Python files in `modules/` are frozen into the firmware and available as built-in modules.
- You can update your code by repeating steps 2 and 3, then reflashing.
- For advanced integration (C modules, custom drivers), see the [MicroPython documentation](https://github.com/micropython/micropython/tree/master/ports/rp2).

---

## Troubleshooting
- If the build fails, check that all dependencies are installed and your Python files are error-free.
- If your code does not run, ensure `main.py` is correctly placed in `modules/` and named `main.py`.
- For hardware issues, verify wiring and connections.

---

## References
- [MicroPython RP2 Port](https://github.com/micropython/micropython/tree/master/ports/rp2)
- [Raspberry Pi Pico Documentation](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html)

---

If you need further help, ask your instructor or open an issue in this repository.
