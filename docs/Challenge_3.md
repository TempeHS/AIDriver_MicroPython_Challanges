# Challenge 3

In this challenge students will use the distance sensors to control how far the robot moves backwards from an object before coming to a stop.

## Success Criteria

My Robot moves 1m away from an object then comes to a stop.

## Before You Begin

1. Complete [Module 3: Asking questions and making decisions!](https://groklearning.com/learn/python-for-beginners/2/0/) to learn about asking questions and making decisions in the Python language.
2. Complete [Blockly Level 3 to apply the run once algorythm algorithm visually](https://blockly.games/maze?lang=en&level=3&&skin=0).

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

    style A fill:#e1f5fe, color:#000000
    style B fill:#000000, color:#ffffff
    style C fill:#000000, color:#ffffff
    style D fill:#ffecb3, color:#000000
    style E fill:#000000, color:#ffffff
    style F fill:#000000, color:#ffffff
    style G fill:#fff3e0, color:#000000
    style I fill:#ffecb3, color:#000000
    style J fill:#ffecb3, color:#000000
    style K fill:#e8f5e8, color:#000000
    style M fill:#ffcdd2, color:#000000
    style N fill:#f3e5f5, color:#000000
```

## Step 1

1. Make sure your power switch is off.
2. Navigate to [https://lab-micropython.arduino.cc/](https://lab-micropython.arduino.cc/).
3. Sign in with Google (use your @education.nsw.gov.au account).
4. Follow these instructions to connect, code and save:

![Animated connection instructions](images/instructions.gif "Animated connection instructions")

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
