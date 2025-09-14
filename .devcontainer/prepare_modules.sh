#!/bin/bash

# prepare_modules.sh
# Helper script to prepare custom modules for MicroPython build
# This script only copies files without building - useful for development
# 
# Usage: ./prepare_modules.sh [OPTIONS]
#   --help: Show this help message

set -e  # Exit on any error

# Get script directory and source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common_functions.sh"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            echo "Usage: $0"
            echo "Prepares custom modules for MicroPython build (copy and validate only)"
            echo ""
            echo "This script:"
            echo "  - Validates the environment"
            echo "  - Copies custom Python files to MicroPython modules directory" 
            echo "  - Validates Python syntax"
            echo "  - Does NOT build firmware (use build_firmware.sh for that)"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            log_info "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Main script execution
main() {
    log_section "AIDriver Module Preparation"
    
    # Validate environment
    if ! validate_environment; then
        exit 1
    fi
    
    show_status
    
    # Copy custom modules
    copy_custom_modules
    
    # Summary
    if [ -f "$MODULES_DIR/aidriver.py" ] && [ -f "$MODULES_DIR/main.py" ]; then
        log_success "🎉 All custom modules prepared successfully!"
        log_info "📦 Files ready for firmware build"
        log_info "💡 Run './build_firmware.sh' to build complete firmware"
    else
        log_warning "⚠️  Some files were not copied. Check file paths and permissions."
        log_info "💡 Expected files:"
        for file_path in "${CUSTOM_FILES[@]}"; do
            local filename="$(basename "$file_path")"
            if [ -f "$MODULES_DIR/$filename" ]; then
                log_success "   ✅ $filename"
            else
                log_error "   ❌ $filename (missing)"
            fi
        done
    fi
}

# Run main function
main "$@"