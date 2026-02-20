"""
Raw ultrasonic sensor diagnostic test
Upload this to your Pico and run it to diagnose the sensor readings.
"""

from machine import Pin, time_pulse_us
from time import sleep_us, sleep_ms

print("\n=== Ultrasonic Sensor Raw Test ===")
print("Testing with current pin configuration:")
print("  Trigger: GPIO 6")
print("  Echo:    GPIO 7")
print()

echo = Pin(7, Pin.IN)   # Echo on GPIO 7
trig = Pin(6, Pin.OUT)  # Trigger on GPIO 6

# Initial state check
print(f"Initial echo pin state: {echo.value()} (should be 0)")
print()

# Take 5 raw readings
print("Taking 5 readings...")
for i in range(5):
    trig.off()
    sleep_us(5)
    trig.on()
    sleep_us(10)
    trig.off()
    
    duration = time_pulse_us(echo, 1, 30000)
    
    if duration < 0:
        print(f"Reading {i+1}: TIMEOUT (duration={duration})")
    else:
        distance = duration * 100 // 582
        print(f"Reading {i+1}: duration={duration:5d} μs, distance={distance:4d} mm")
    
    sleep_ms(100)  # 100ms between readings

print()
print("=== Test Complete ===")
print("If all readings show same value, try moving obstacle closer/farther")
print("If all show TIMEOUT, check wiring")
