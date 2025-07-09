# Challenge 6

In this final challenge students will design a maze navigation alorythm.

## Success Criteria

1. My Robot navigates the whole maze by moving over all tiles without colliding with any walls

## Before You Begin

1. Complete [Blockly Levels 10](https://blockly.games/maze?lang=en&level=7&&skin=0) to apply the algorithm visually.
2. Review all your solutions to challenges 1-5 as these code snippets are the building blocks for this challenge.

## How to Approach the Basic Obstacle Avoidance Challenge

### 1. **Understand the Goal**

The aim is to make your robot move forward, detect obstacles using the ultrasonic sensor, and automatically avoid them by stopping and turning before continuing forward. This is a key skill for building autonomous robots.

### 2. **Break Down the Problem**

Think about the steps your robot needs to take:

- Move forward.
- Continuously check the distance to any object in front.
- If an object is detected within a certain range (e.g., 300mm), stop.
- Turn away from the obstacle (left or right).
- Continue moving forward.

### 3. **Plan Your Algorithm**

Draw a flowchart or write out the steps in plain language. For example:

- Start the robot.
- While running:
  - Measure the distance ahead.
  - If the path is clear, keep moving forward.
  - If something is too close, stop and turn.
  - After turning, move forward again.

### 4. **Write the Code in Small Steps**

Start by making your robot move forward and print the distance readings. Once you’re comfortable with that, add the stopping and turning logic.

#### Example Steps:

- **Step 1:** Make the robot drive forward and print the distance.
- **Step 2:** Add an `if` statement to check if the distance is less than 300mm.
- **Step 3:** If it is, stop the robot and make it turn.
- **Step 4:** After turning, continue moving forward.

### 5. **Test and Adjust**

- Place obstacles in front of your robot and see how it reacts.
- Adjust the distance threshold (e.g., try 200mm or 400mm) to see what works best.
- Change the turning direction or how long the robot turns to improve its avoidance.

### 6. **Reflect and Extend**

- Try making the robot turn randomly left or right.
- Experiment with different speeds or add sounds/lights when an obstacle is detected.
- Think about how this logic could be used in real-world robots (like vacuum cleaners or delivery robots).

---

**Tip:** Take it one step at a time. Test your code after each change so you can quickly spot and fix any problems.

## Step 4 Save Your Code

1. Copy all your code from `main.py`.
2. Paste it in your portfolio under "Challenge 5".
