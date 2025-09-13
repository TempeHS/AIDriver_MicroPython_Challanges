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
   - Place them in: `/micropython/ports/rp2/modules/`
   - Command: `cp /workspaces/AIDriver_MicroPython_Challanges/project/lib/*.py /micropython/ports/rp2/modules/`
2. Copy your `main.py` from `project/` into:
   - `/micropython/ports/rp2/modules/`
   - Command: `cp /workspaces/AIDriver_MicroPython_Challanges/project/main.py /micropython/ports/rp2/modules/`

---

## Step 3: Build the Firmware
1. Open a terminal in the devcontainer.
2. Run the following commands:
   ```bash
   cd /micropython/ports/rp2
   make submodules
   make
   ```
   **Note:** The build process may take 10-20 minutes depending on your system.
3. Verify the build completed successfully:
   ```bash
   echo "Build exit code: $?"
   ls -la build-RPI_PICO/firmware.uf2
   ```
   You should see:
   - Exit code: 0 (indicating success)
   - A firmware.uf2 file with size around 600KB
4. Copy the built firmware to the `_Firmware` folder:
   ```bash
   cp build-RPI_PICO/firmware.uf2 /workspaces/AIDriver_MicroPython_Challanges/_Firmware/AI_Driver_RP2040.uf2 && echo "✅ Firmware copied successfully to _Firmware/AI_Driver_RP2040.uf2"
   ```
5. The firmware file is now available at:
   - `/workspaces/AIDriver_MicroPython_Challanges/_Firmware/AI_Driver_RP2040.uf2`

---

## Step 4: Flash the Firmware to Your Pico
1. Connect your Raspberry Pi Pico to your computer while holding the BOOTSEL button.
2. It will mount as a USB drive.
3. Copy the `AI_Driver_RP2040.uf2` file from the `_Firmware` folder to the Pico USB drive:
   - Source: `/workspaces/AIDriver_MicroPython_Challanges/_Firmware/AI_Driver_RP2040.uf2`
4. The Pico will reboot and run your integrated `main.py` and libraries automatically.

---

## Notes
- Any Python files in `modules/` are frozen into the firmware and available as built-in modules.
- You can update your code by repeating steps 2 and 3, then reflashing.
- The default build is for Raspberry Pi Pico. For other boards (Pico W, Pico 2), use `make BOARD=PICO_W` or `make BOARD=PICO2` respectively.
- For advanced integration (C modules, custom drivers), see the [MicroPython documentation](https://github.com/micropython/micropython/tree/master/ports/rp2).

---

## Troubleshooting
- **Build Success Indicators:**
  - Terminal shows `[100%] Built target firmware`
  - Exit code is 0 when checked with `echo $?`
  - `firmware.uf2` file exists and is ~600KB in size
  - No error messages in terminal output

- **Common Issues:**
  - If the build fails, check that all dependencies are installed and your Python files are error-free.
  - If your code does not run, ensure `main.py` is correctly placed in `modules/` and named `main.py`.
  - For hardware issues, verify wiring and connections.
  - If submodules fail to update, try: `git submodule update --init --recursive` from `/micropython/`

---

## References
- [MicroPython RP2 Port](https://github.com/micropython/micropython/tree/master/ports/rp2)
- [Raspberry Pi Pico Documentation](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html)

---

If you need further help, ask your instructor or open an issue in this repository.
