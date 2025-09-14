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

## Step 2: Build the Firmware with Automated Script
1. Open a terminal in the devcontainer.
2. Run the automated build script:
   ```bash
   cd /workspaces/AIDriver_MicroPython_Challanges/.devcontainer
   ./build_firmware.sh
   ```
   **Note:** This script automatically:
   - Validates the build environment
   - Updates MicroPython to the latest version
   - Copies your custom Python files to the MicroPython modules directory
   - Validates Python syntax
   - Updates submodules
   - Builds the firmware with parallel compilation
   - Copies the result to the `_Firmware` folder
   - Creates build metadata for tracking
3. The build process may take 10-20 minutes depending on your system.
4. Upon successful completion, you'll see:
   ```
   ✅ AIDriver firmware build complete!
   📦 Firmware copied to: /workspaces/AIDriver_MicroPython_Challanges/_Firmware/AI_Driver_RP2040.uf2
   ```

### Alternative: Manual Process (Advanced Users)
If you prefer to handle the process manually or need to customize the build:
1. Copy your custom Python files to the MicroPython modules directory:
   ```bash
   # Option 1: Use the preparation script
   cd /workspaces/AIDriver_MicroPython_Challanges/.devcontainer
   ./prepare_modules.sh
   
   # Option 2: Manual copy
   cp /workspaces/AIDriver_MicroPython_Challanges/project/lib/*.py /micropython/ports/rp2/modules/
   cp /workspaces/AIDriver_MicroPython_Challanges/project/main.py /micropython/ports/rp2/modules/
   ```
2. Build manually:
   ```bash
   cd /micropython/ports/rp2
   make submodules
   make clean
   make
   ```
3. Copy the firmware:
   ```bash
   cp build-RPI_PICO/firmware.uf2 /workspaces/AIDriver_MicroPython_Challanges/_Firmware/AI_Driver_RP2040.uf2
   ```

---

## Step 3: Flash the Firmware to Your Pico
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
  - Terminal shows `✅ AIDriver firmware build complete!`
  - The automated script reports successful file copying and validation
  - `AI_Driver_RP2040.uf2` file exists in `_Firmware/` folder and is ~600KB in size
  - No error messages in terminal output

- **Common Issues:**
  - **Script Permission Error**: Run `chmod +x /workspaces/AIDriver_MicroPython_Challanges/.devcontainer/*.sh`
  - **Environment Issues**: The script will validate environment and show specific errors
  - **File Not Found**: Ensure your Python files are in the correct project structure
  - **Build Fails**: Try `./build_firmware.sh --force-clean` for a fresh build
  - **Syntax Errors**: The script validates Python syntax and shows which files have errors
  - **Network Issues**: Use `--skip-update` if MicroPython update fails
  - **Hardware Issues**: Check wiring and connections on your Pico
  - **Submodule Issues**: Script handles this automatically, or manually run: `cd /micropython/ports/rp2 && make submodules`

## Quick Reference Commands
```bash
# Full automated build (with latest MicroPython)
cd /workspaces/AIDriver_MicroPython_Challanges/.devcontainer
./build_firmware.sh

# Build with current MicroPython version (skip update)
./build_firmware.sh --skip-update

# Force clean build (removes build cache)
./build_firmware.sh --force-clean

# Just prepare modules (for development)
./prepare_modules.sh

# Get help for any script
./build_firmware.sh --help
./prepare_modules.sh --help

# Manual build after preparing modules
cd /micropython/ports/rp2
make clean && make
```

---

## References
- [MicroPython RP2 Port](https://github.com/micropython/micropython/tree/master/ports/rp2)
- [Raspberry Pi Pico Documentation](https://www.raspberrypi.com/documentation/microcontrollers/raspberry-pi-pico.html)

---

If you need further help, ask your instructor or open an issue in this repository.
