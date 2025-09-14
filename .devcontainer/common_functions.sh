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

# Custom module files to copy (centralized list)
export CUSTOM_FILES=(
    "$PROJECT_LIB_DIR/aidriver.py"
    "$PROJECT_LIB_DIR/gamepad_driver_controller.py"
    "$PROJECT_LIB_DIR/gamepad_pico.py"
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
    log_info "🧹 Cleaning existing custom modules..."
    
    # Clean based on the custom files list
    for file_path in "${CUSTOM_FILES[@]}"; do
        local filename="$(basename "$file_path")"
        rm -f "$MODULES_DIR/$filename"
    done
    
    log_success "✅ Custom modules cleaned"
}

# Function to copy all custom modules
copy_custom_modules() {
    log_section "Custom Module Preparation"
    
    clean_custom_modules
    
    log_info "📚 Copying custom modules..."
    local copy_count=0
    local total_files=${#CUSTOM_FILES[@]}
    
    for file_path in "${CUSTOM_FILES[@]}"; do
        if copy_and_validate_file "$file_path"; then
            copy_count=$((copy_count + 1))
        fi
    done
    
    log_section "Module Preparation Summary"
    log_success "✅ Successfully prepared: $copy_count/$total_files files"
    
    if [ $copy_count -ne $total_files ]; then
        log_warning "⚠️  Some files were not copied. Check file paths and permissions."
        # List which files are missing
        for file_path in "${CUSTOM_FILES[@]}"; do
            if [ ! -f "$file_path" ]; then
                log_warning "   Missing: $(basename "$file_path")"
            fi
        done
    fi
    
    return 0  # Always return success, caller can check $copy_count if needed
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