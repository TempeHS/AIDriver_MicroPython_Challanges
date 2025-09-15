#!/bin/bash

# common_functions.sh
# Shared functions for AIDriver MicroPython build scripts
# Source this file in other scripts: source "$(dirname "$0")/common_functions.sh"

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export NC='\033[0m' # No Color

# Configuration - centralized paths and settings
export PROJECT_BASE="/workspaces/AIDriver_MicroPython_Challanges"
export PROJECT_DIR="$PROJECT_BASE/project"
export PROJECT_LIB_DIR="$PROJECT_DIR/lib"
export PROJECT_MAIN="$PROJECT_DIR/main.py"
export MICROPYTHON_DIR="/micropython"
export MODULES_DIR="$MICROPYTHON_DIR/ports/rp2/modules"
export BUILD_DIR="$MICROPYTHON_DIR/ports/rp2"
export FIRMWARE_DEST="$PROJECT_BASE/_Firmware/AI_Driver_RP2040.uf2"

# Custom module files to copy to frozen modules (centralized list)
# Note: main.py is excluded from frozen modules - it goes to filesystem instead
export CUSTOM_FILES=(
    "$PROJECT_LIB_DIR/aidriver.py"
    "$PROJECT_LIB_DIR/gamepad_driver_controller.py"
    "$PROJECT_LIB_DIR/gamepad_pico.py"
)

# Files to copy to filesystem (not frozen)
export FILESYSTEM_FILES=(
    "$PROJECT_MAIN"
)

# Function to print colored messages
log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_warning() {
    echo -e "${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}"
}

log_section() {
    echo -e "${CYAN}=== $1 ===${NC}"
}

# Function to validate environment prerequisites
validate_environment() {
    log_section "Environment Validation"
    
    # Check if project directory exists
    if [ ! -d "$PROJECT_DIR" ]; then
        log_error "❌ Error: Project directory not found at $PROJECT_DIR"
        log_warning "💡 Make sure the AIDriver_MicroPython_Challanges folder is properly mounted"
        return 1
    fi
    
    # Check if MicroPython directory exists
    if [ ! -d "$MICROPYTHON_DIR" ]; then
        log_error "❌ Error: MicroPython directory not found at $MICROPYTHON_DIR"
        log_warning "💡 Make sure you're running this in the devcontainer environment"
        return 1
    fi
    
    # Check if modules directory exists
    if [ ! -d "$MODULES_DIR" ]; then
        log_error "❌ Error: MicroPython modules directory not found at $MODULES_DIR"
        log_warning "💡 Run 'cd $BUILD_DIR && make submodules' first"
        return 1
    fi
    
    # Check required tools
    local missing_tools=()
    command -v python3 >/dev/null || missing_tools+=("python3")
    command -v git >/dev/null || missing_tools+=("git")
    command -v make >/dev/null || missing_tools+=("make")
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "❌ Missing required tools: ${missing_tools[*]}"
        return 1
    fi
    
    log_success "✅ Environment validation passed"
    return 0
}

# Function to copy and validate a single file
copy_and_validate_file() {
    local src_file="$1"
    local filename="$(basename "$src_file")"
    local dest_file="$MODULES_DIR/$filename"
    
    if [ -f "$src_file" ]; then
        log_info "📄 Copying $filename..."
        cp "$src_file" "$dest_file" || return 1
        
        # Validate Python syntax
        if python3 -m py_compile "$dest_file" 2>/dev/null; then
            log_success "✅ $filename - copied and validated"
            return 0
        else
            log_error "❌ $filename - syntax error detected"
            rm -f "$dest_file"  # Remove invalid file
            return 1
        fi
    else
        log_warning "⚠️  $filename - not found at $src_file"
        return 1
    fi
}

# Function to clean existing custom modules
clean_custom_modules() {
    local frozen_target_dir="/micropython/ports/rp2/modules"
    local frozen_mpy_dir="/micropython/ports/rp2/build-RPI_PICO/frozen_mpy"
    
    log_info "🧹 Cleaning existing custom modules..."
    
    # Define module filenames to clean from frozen modules
    local frozen_modules=("aidriver.py" "gamepad_driver_controller.py" "gamepad_pico.py")
    local filesystem_modules=("main.py")
    
    # Clean frozen modules
    for module in "${frozen_modules[@]}"; do
        if [[ -f "$frozen_target_dir/$module" ]]; then
            log_info "Removing frozen module: $module"
            rm -f "$frozen_target_dir/$module"
        fi
    done
    
    # Clean main.py from frozen modules (it should be filesystem only)
    for module in "${filesystem_modules[@]}"; do
        if [[ -f "$frozen_target_dir/$module" ]]; then
            log_info "Removing $module from frozen modules (will be filesystem file)"
            rm -f "$frozen_target_dir/$module"
        fi
        
        # Also remove compiled .mpy files
        local mpy_name="${module%.py}.mpy"
        if [[ -f "$frozen_mpy_dir/$mpy_name" ]]; then
            log_info "Removing compiled $mpy_name from frozen modules"
            rm -f "$frozen_mpy_dir/$mpy_name"
        fi
    done
    
    log_success "✅ Custom modules cleaned"
}

# Function to copy all custom modules
copy_custom_modules() {
    local source_dir="${PROJECT_DIR}"
    local frozen_target_dir="/micropython/ports/rp2/modules"
    local filesystem_target_dir="/micropython/ports/rp2/build-RPI_PICO"
    local frozen_copy_count=0
    local filesystem_copy_count=0
    
    log_info "Copying custom modules to MicroPython directories..."
    
    # Clean existing modules first
    clean_custom_modules
    
    if [[ ! -d "$source_dir" ]]; then
        log_error "Source directory does not exist: $source_dir"
        return 1
    fi
    
    mkdir -p "$frozen_target_dir"
    mkdir -p "$filesystem_target_dir"
    
    # Copy .py files from project root
    if ls "$source_dir"/*.py >/dev/null 2>&1; then
        for file in "$source_dir"/*.py; do
            if [[ -f "$file" ]]; then
                local filename=$(basename "$file")
                
                # main.py goes to filesystem, others go to frozen modules
                if [[ "$filename" == "main.py" ]]; then
                    echo "Copying $filename to filesystem"
                    cp "$file" "$filesystem_target_dir/"
                    filesystem_copy_count=$((filesystem_copy_count + 1))
                else
                    echo "Copying $filename to frozen modules"
                    cp "$file" "$frozen_target_dir/"
                    frozen_copy_count=$((frozen_copy_count + 1))
                fi
            fi
        done
    fi
    
    # Copy .py files from project/lib directory (all go to frozen modules)
    local lib_dir="$source_dir/lib"
    if [[ -d "$lib_dir" ]] && ls "$lib_dir"/*.py >/dev/null 2>&1; then
        for file in "$lib_dir"/*.py; do
            if [[ -f "$file" ]]; then
                local filename=$(basename "$file")
                echo "Copying $filename to frozen modules"
                cp "$file" "$frozen_target_dir/"
                frozen_copy_count=$((frozen_copy_count + 1))
            fi
        done
    fi
    
    log_success "Copied $frozen_copy_count modules to frozen modules directory"
    log_success "Copied $filesystem_copy_count files to filesystem directory"
    return 0
}

# Function to check internet connectivity
check_internet() {
    if ping -c 1 -W 3 github.com &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to get MicroPython version info
get_micropython_version() {
    cd "$MICROPYTHON_DIR"
    local commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    local date=$(git log -1 --format=%cd --date=short 2>/dev/null || echo "unknown")
    local tag=$(git describe --tags --always 2>/dev/null || echo "unknown")
    echo "$tag ($commit, $date)"
}

# Function to show current status
show_status() {
    log_section "Current Status"
    log_info "📁 Project directory: $PROJECT_DIR"
    log_info "📁 MicroPython directory: $MICROPYTHON_DIR"
    log_info "📋 MicroPython version: $(get_micropython_version)"
}

# Function to create firmware destination directory
ensure_firmware_dir() {
    mkdir -p "$(dirname "$FIRMWARE_DEST")"
}

# Function to create _boot.py with embedded main.py content
create_boot_with_main() {
    local main_py_path="$PROJECT_DIR/main.py"
    local boot_py_path="/micropython/ports/rp2/modules/_boot.py"
    local boot_backup_path="/micropython/ports/rp2/modules/_boot_original.py"
    
    if [[ ! -f "$main_py_path" ]]; then
        log_error "main.py not found at $main_py_path"
        return 1
    fi
    
    log_info "📝 Creating _boot.py with embedded main.py content..."
    
    # Backup original _boot.py if not already backed up
    if [[ ! -f "$boot_backup_path" ]]; then
        cp "$boot_py_path" "$boot_backup_path"
        log_info "📄 Backed up original _boot.py"
    fi
    
    # Start with the original boot content
    cp "$boot_backup_path" "$boot_py_path"
    
    # Append our custom code header
    cat >> "$boot_py_path" << 'EOF'

# === AIDriver Custom Boot Code ===
# This section handles main.py creation on filesystem
# with optional recovery mode via GPIO pin 4

import os
import gc
from machine import Pin

# Embedded main.py content - this is created on first boot only
MAIN_PY_CONTENT = """EOF
    
    # Read and append the actual main.py content (properly escaped)
    python3 -c "
import sys
with open('$main_py_path', 'r') as f:
    content = f.read()
# Escape quotes and backslashes for Python string literal
content = content.replace('\\\\', '\\\\\\\\').replace('\"', '\\\"')
print(content, end='')
" >> "$boot_py_path"
    
    # Complete the _boot.py file
    cat >> "$boot_py_path" << 'EOF'
"""

def check_recovery_mode():
    """Check if recovery mode is enabled (pin 4 connected to ground)"""
    try:
        # Configure pin 4 as input with pull-up resistor
        recovery_pin = Pin(4, Pin.IN, Pin.PULL_UP)
        # If pin 4 is pulled to ground, recovery mode is active
        return recovery_pin.value() == 0
    except Exception:
        # If there's any error with pin configuration, assume no recovery
        return False

def create_main_py():
    """Create main.py on filesystem if it doesn't exist or if recovery mode is active"""
    try:
        recovery_mode = check_recovery_mode()
        
        # Check if main.py already exists and recovery mode is not active
        if 'main.py' in os.listdir('/') and not recovery_mode:
            # File exists and no recovery requested, don't overwrite user changes
            return
        
        if recovery_mode:
            print("RECOVERY MODE: Pin 4 detected grounded - overwriting main.py with default")
        
        # Create or overwrite main.py with default content
        with open('main.py', 'w') as f:
            f.write(MAIN_PY_CONTENT)
        
        if recovery_mode:
            print("Recovery complete: main.py restored to default content")
        else:
            print("Created main.py on filesystem (editable in IDE)")
        
    except Exception as e:
        print(f"Warning: Could not create main.py: {e}")

# Run the main.py creation
create_main_py()

# Clean up memory
gc.collect()
EOF
    
    log_success "✅ Created _boot.py with embedded main.py content"
    return 0
}

# Trap function for cleanup on script exit
cleanup_on_exit() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        log_warning "⚠️  Script exited with error code $exit_code"
        log_info "💡 Check the error messages above for troubleshooting guidance"
    fi
}

# Set up trap for cleanup
trap cleanup_on_exit EXIT