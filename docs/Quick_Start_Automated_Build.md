# Quick Start: Automated Firmware Build

This document provides a quick overview of the new automated build process for AIDriver MicroPython firmware.

## 🚀 Quick Build (One Command)

```bash
cd /workspaces/AIDriver_MicroPython_Challanges/.devcontainer
./build_firmware.sh
```

That's it! The script will:
- ✅ Validate the build environment
- ✅ Update MicroPython to the latest version
- ✅ Copy your custom modules automatically
- ✅ Validate Python syntax
- ✅ Build the firmware with parallel compilation
- ✅ Save to `_Firmware/AI_Driver_RP2040.uf2`
- ✅ Create build metadata for tracking

## 📁 What Gets Included Automatically

The build script automatically includes these files in your firmware:
- `project/lib/aidriver.py` → Core robot control library
- `project/lib/gamepad_driver_controller.py` → Gamepad integration
- `project/lib/gamepad_pico.py` → Gamepad communication
- `project/main.py` → Your main application

## 🔧 Development Workflow

For iterative development:

1. **Edit your code** in the `project/` folder
2. **Test preparation** (optional):
   ```bash
   ./prepare_modules.sh  # Just copies files, no build
   ```
3. **Full build**:
   ```bash
   ./build_firmware.sh   # Complete automated build with latest MicroPython
   ```
4. **Quick rebuild** (skip MicroPython update):
   ```bash
   ./build_firmware.sh --skip-update  # Faster for repeated builds
   ```
5. **Force clean build** (if needed):
   ```bash
   ./build_firmware.sh --force-clean  # Fresh build, removes cache
   ```

## 🆘 If Something Goes Wrong

**Permission Error?**
```bash
chmod +x /workspaces/AIDriver_MicroPython_Challanges/.devcontainer/*.sh
```

**Files Not Found?**
- Check that your files are in `project/lib/` and `project/main.py`
- Verify file names match exactly: `aidriver.py`, `gamepad_driver_controller.py`, `gamepad_pico.py`

**No Internet Connection?**
- The script will automatically detect and skip the update if no internet is available
- Your existing MicroPython version will be used

**Want to Skip the Update?**
```bash
./build_firmware.sh --skip-update  # Use current MicroPython version
```

**Environment Issues?**
- The script automatically validates the environment and shows specific error messages
- Common fixes are suggested automatically

**Build Fails?**
- Try `./build_firmware.sh --force-clean` for a fresh build
- Check Python syntax in your files (script validates automatically)
- Look for specific error messages in the terminal output

**Need Help?**
```bash
./build_firmware.sh --help  # Show all available options
./prepare_modules.sh --help  # Show preparation script help
```

## 🎯 What Changed

**Before (Manual):**
1. Copy files manually
2. Run build commands
3. Copy firmware manually
4. Easy to forget steps ❌

**Now (Automated):**
1. Run one script
2. Everything handled automatically ✅

## 📖 Full Documentation

For complete details, see: [Build_Custom_MicroPython_Firmware.md](Build_Custom_MicroPython_Firmware.md)