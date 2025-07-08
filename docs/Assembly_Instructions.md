## Test the Hardware

```python
from time import sleep
from aidriver import AIDriver
import sys

"""
Runs a sequence of tests for the AIDriver class.
The user must visually confirm the robot's behaviour.
"""

print("Initializing AIDriver for physical test...")
try:
  driver = AIDriver()
except Exception as e:
  print(f"Failed to initialize AIDriver: {e}")
  print("Please check the aidriver.py library is in the 'lib' folder.")
  sys.exit()

print("Initialization complete. Starting tests in 5 seconds...")
print("Ensure the robot has clear space to move.")
sleep(5)

# Test 1: Drive Forward
print("\n--- Test 1: Drive Forward ---")
print("Robot should move FORWARD for 2 seconds.")
driver.drive_forward(200, 200)
sleep(2)
driver.brake()
print("--> Test 1 Complete. Robot should be stopped.")
sleep(3)

# Test 2: Drive Backward
print("\n--- Test 2: Drive Backward ---")
print("Robot should move BACKWARD for 2 seconds.")
driver.drive_backward(200, 200)
sleep(2)
driver.brake()
print("--> Test 2 Complete. Robot should be stopped.")
sleep(3)

# Test 3: Rotate Right
print("\n--- Test 3: Rotate Right (Clockwise) ---")
print("Robot should rotate RIGHT for 2 seconds.")
driver.rotate_right(200)
sleep(2)
driver.brake()
print("--> Test 3 Complete. Robot should be stopped.")
sleep(3)

# Test 4: Rotate Left
print("\n--- Test 4: Rotate Left (Counter-Clockwise) ---")
print("Robot should rotate LEFT for 2 seconds.")
driver.rotate_left(200)
sleep(2)
driver.brake()
print("--> Test 4 Complete. Robot should be stopped.")
sleep(3)

# Test 5: Ultrasonic Sensor
print("\n--- Test 5: Read Distance ---")
print("Place an object 10-50cm in front of the sensor.")
print("Taking 5 readings...")
for i in range(5):
  distance = driver.read_distance()
  if distance != -1:
    print(f"Reading {i+1}: {distance} mm")
  else:
    print(f"Reading {i+1}: Out of range or timeout.")
    sleep(1)
print("--> Test 5 Complete.")
sleep(3)

print("\n\n--- ALL PHYSICAL TESTS ARE COMPLETE ---")
```
