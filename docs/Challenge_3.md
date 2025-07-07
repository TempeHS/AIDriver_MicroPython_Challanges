# Challenge 3

In this challenge students will use the distance sensors to control how far the robot moves backwards from an object before coming to a stop.

## Success Criteria

My Robot moves 1m away from an object then comes to a stop.

## Flowchart Of The Algorithm

```mermaid
flowchart TD
    A[Start Program] --> B[Setup Robot]
    B --> C[Initialize my_counter = 0]
    C --> D{UltraSonic sensor returning -1}
    D -->|Yes| E[Print Error Message]
    E --> D
    D -->|No| F[Store start_distance]
    F --> G{Main Control Loop}
    G --> H[Set current_distance = start_distance]
    H --> I{distance > 0?}
    I -->|Yes| J{current_distance - start_distance < 1000?}
    J -->|Yes| K[Drive backward at 200,200]
    K --> L[Read current_distance]
    L --> J
    J -->|No| M[Apply brake]
    I -->|No| M
    M --> N[Increment counter]
    N --> G

    style A fill:#e1f5fe
    style D fill:#ffecb3
    style G fill:#fff3e0
    style I fill:#ffecb3
    style J fill:#ffecb3
    style K fill:#e8f5e8
    style M fill:#ffcdd2
    style N fill:#f3e5f5
```

## Step 1

1. Make sure your power switch is off
2. Plug in your robot
3. Navigate https://lab-micropython.arduino.cc/]

## Step 2

Extend

> [!important]
> The ultrasonic sensor will return `-1` if it is too close (less than 20mm) or too far (more that 2000mm) or in an error state.

```python
from time import sleep
from aidriver import AIDriver

my_robot = AIDriver()

my_counter = 0

while driver.read_distance() == -1
    print ("Robot too close, too far or Sensor in Error state")

start_distance = driver.read_distance()

while True:
    current_distance = start_distance
    if distance > 0:
        while current_distance - start_distance < 1000:
            my_robot.backward(200, 200)
            sleep(0.1)
            current_distance = driver.read_distance()
    my_robot.brake()
    sleep(1)
    my_counter = my_counter + 1
```

## Challenge 2 extension, I can…

1. Progressively accelerate my robot to full speed.
2. Progressively decelerate my robot to a stop.
3. Progressively accelerate my robot to full speed.
4. Progressively decelerate my robot to a stop.
