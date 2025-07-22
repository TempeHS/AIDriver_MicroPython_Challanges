# Assembly Instructions

> [!Important]
> Before students begin, they should know:
>
> 1. During assembly, no parts should be forced, excessive force will break the components.
> 2. The motors should not be manually turned as it will break the plastic gears (that means no pushing and pulling the robot on the ground like a Tonka truck).
> 3. The robots battery power should always be turned off when connecting to a computer.
> 4. Make sure your robot has room to move and won't be stepped on when testing.
> 5. Batteries should be always removed for storage

## Step 1

**Assemble to axel for the front wheel.**

![Step 1 Visual](images/step_1.png "Step 1 Visual")

## Step 2

**Slide the omni wheel onto the middle of the axel.**

![Animation of omni wheel sliding onto the axel](images/attach_motors.gif "Animation of omni wheel sliding onto the axel")

**Assemble the main chassis.**

![Step 2 Visual](images/step_2.png "Step 2 Visual")

## Step 3

**Attach the 3D Printed brackets for the battery holder and Microcontroller.**

![Step 3 Visual](images/step_3.png "Step 3 Visual")

## Step 4

**First insert the two motors into the 3D motor clip.**

![Animation of the motors being attached](images/attach_motors.gif "Animation of the motors being attached")

**Second attach the motor clip to the chassis.**

![Step 4 Visual](images/step_4.png "Step 5 Visual")

## Step 5

**Attach the wheels to the motors.**

![Animation of the wheels being attached to the motor](images/attach_wheels.gif "Animation of the wheels being attached to the motor")

## Step 6

**Connect the wires to the screw terminals.**

![Screw terminals visual](images/screw_terminals.png "Screw terminals visual")

## Step 7

**Attach the ultrasonic sensor to the robot and connect it to the processor.**

![Ultrasonic sensor visual](images/connect_ultrasonic.png "Ultrasonic sensor visual")

## Step 8 - Test the Hardware

1. Make sure your battery power switch is off.
2. Navigate to [https://lab-micropython.arduino.cc/](https://lab-micropython.arduino.cc/).
3. Sign in with Google (use your @education.nsw.gov.au account).
4. Follow these instructions to connect:

![Animated connection instructions](images/instructions.gif "Animated connection instructions")

5. Copy and paste this code into `main.py`
6. Click <kbd>SAVE</KDB>
7. Disconnect your robot from your computer

> [!Caution]
> To avoid damaging your computer or robot place it on the floor in an area with enough space for it to move safely before powering it on.

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
