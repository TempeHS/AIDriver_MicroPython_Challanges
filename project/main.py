from time import sleep
import aidriver
from aidriver import AIDriver

"""Hardware sanity test for the AIDriver robot.

Runs a short sequence of movements and distance readings.
Most details are reported via the AIDriver debug logger.
"""


def main():
    aidriver.DEBUG_AIDRIVER = True

    print("Initialising AIDriver hardware test...")

    try:
        robot = AIDriver()
    except Exception as exc:
        print("Failed to initialise AIDriver:", exc)
        print("Check that 'aidriver.py' is in the 'lib' folder on the device.")
        return

    print("Starting tests in 3 seconds. Ensure clear space around the robot.")
    sleep(3)

    # Test 1: Drive Forward
    print("Test 1: drive_forward")
    robot.drive_forward(200, 200)
    sleep(2)
    robot.brake()
    sleep(1)

    # Test 2: Drive Backward
    print("Test 2: drive_backward")
    robot.drive_backward(200, 200)
    sleep(2)
    robot.brake()
    sleep(1)

    # Test 3: Rotate Right
    print("Test 3: rotate_right")
    robot.rotate_right(200)
    sleep(2)
    robot.brake()
    sleep(1)

    # Test 4: Rotate Left
    print("Test 4: rotate_left")
    robot.rotate_left(200)
    sleep(2)
    robot.brake()
    sleep(1)

    # Test 5: Ultrasonic Sensor
    print("Test 5: ultrasonic distance readings")
    for i in range(5):
        distance = robot.read_distance()
        print("Reading", i + 1, ":", distance, "mm")
        sleep(0.5)

    print("All hardware tests completed.")


if __name__ == "__main__":
    main()
