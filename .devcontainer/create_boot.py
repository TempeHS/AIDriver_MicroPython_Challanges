#!/usr/bin/env python3
"""
Script to create _boot.py with embedded main.py content
Uses proper Python repr() for safe string embedding
"""

import sys
import os

def create_boot_with_main(main_py_path, boot_py_path, boot_backup_path):
    """Create _boot.py with embedded main.py content"""
    
    if not os.path.exists(main_py_path):
        print(f"Error: main.py not found at {main_py_path}")
        return False
    
    # Backup original _boot.py if not already backed up
    if not os.path.exists(boot_backup_path):
        with open(boot_py_path, 'r') as src, open(boot_backup_path, 'w') as dst:
            dst.write(src.read())
        print("Backed up original _boot.py")
    
    # Read main.py content
    with open(main_py_path, 'r') as f:
        main_content = f.read()
    
    # Read original boot content
    with open(boot_backup_path, 'r') as f:
        original_boot = f.read()
    
    # Use repr() to properly escape the content for Python string literal
    # This handles all special characters, quotes, newlines, etc. correctly
    escaped_content = repr(main_content)
    
    # Create new _boot.py content with properly escaped string
    boot_content = original_boot + f'''
# === AIDriver Custom Boot Code ===
# This section handles main.py creation on filesystem
# with optional recovery mode via GPIO pin 4

import os
import gc
from machine import Pin

# Embedded main.py content - properly escaped for Python
MAIN_PY_CONTENT = {escaped_content}

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
        print("Warning: Could not create main.py:", str(e))

# Run the main.py creation
create_main_py()

# Clean up memory
gc.collect()
'''
    
    # Write the new _boot.py
    with open(boot_py_path, 'w') as f:
        f.write(boot_content)
    
    print("Created _boot.py with embedded main.py content using repr() for safe escaping")
    return True

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: create_boot.py <main_py_path> <boot_py_path> <boot_backup_path>")
        sys.exit(1)
    
    main_py_path = sys.argv[1]
    boot_py_path = sys.argv[2]
    boot_backup_path = sys.argv[3]
    
    success = create_boot_with_main(main_py_path, boot_py_path, boot_backup_path)
    sys.exit(0 if success else 1)