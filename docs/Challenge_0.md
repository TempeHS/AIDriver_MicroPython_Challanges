# Challenge 0: Fix the Syntax and Make the Robot Talk

In this challenge you will **fix broken Python code** so that:

- Your program runs without syntax errors, and
- The AIDriver library starts returning **debug messages** about motors and sensors.

You **do not** write a new program from scratch. Instead, you repair an existing one.

---

## 1. What is a Syntax Error?

Python has strict rules about how code must be written. If you break one of these rules, you get a **syntax error**.

Common messages you will see:

- `SyntaxError: invalid syntax`
- `IndentationError: unexpected indent`
- `NameError: name 'driver' is not defined` _(this one happens at runtime, but is usually a typo in your code)_

When this happens, Python shows you:

- The **file name** (usually `main.py`)
- The **line number** (e.g. `line 12`)
- A short **message** about what went wrong

Your job is to use this information to find and fix the mistake.

---

## 2. Typical Student Mistakes

These are all real mistakes taken from the AIDriver challenges.

### 2.1 Missing colon after `while` or `if`

```python
# WRONG (no colon)
while driver.read_distance() == -1
    print("Robot too close")

# RIGHT
while driver.read_distance() == -1:
    print("Robot too close")
```

**Rule:** every `if`, `while`, `for`, and `def` line must end with a **colon** (`:`).

---

### 2.2 Mis-typed names vs the example code

```python
# WRONG - variable name is mis-typed
my_robt = AIDriver()        # typo here
my_robot.drive_forward(200, 200)  # different name here

# RIGHT - use the same name everywhere
my_robot = AIDriver()
my_robot.drive_forward(200, 200)
```

If you see:

```text
NameError: name 'driver' is not defined
```

it usually means you:

- Spelt a variable name differently from where you created it, or
- Used a name that does not exist at all.

---

### 2.3 Missing or extra indentation

Indentation means **how far a line is indented from the left** using spaces.

```python
my_robot = AIDriver()
# WRONG - body of while is not indented
while True:
my_robot.drive_forward(200, 200)

# RIGHT - body is indented under while
while True:
    my_robot.drive_forward(200, 200)
```

**Rule:**

- The code inside a `while`, `if`, `for`, or `def` **must be indented**.
- All lines inside the same block should be indented the **same amount**.

---

### 2.4 Using the wrong function names

The AIDriver library gives you **specific** function names:

- `drive_forward(right_speed, left_speed)`
- `drive_backward(right_speed, left_speed)`
- `rotate_left(turn_speed)`
- `rotate_right(turn_speed)`
- `brake()`
- `read_distance()`

Common mistakes:

```python
my_robot = AIDriver()
# WRONG
my_robot.backward(200, 200)        # should be drive_backward
robot.rotate_right(200)            # should be my_robot.rotate_right
my_robot.read_sensor()             # should be read_distance

# RIGHT
my_robot.drive_backward(200, 200)
my_robot.rotate_right(200)
my_robot.read_distance()
```

If you see:

```text
AttributeError: 'AIDriver' object has no attribute 'backward'
```

it means you called a function that **does not exist** in the library. Check the spelling against the challenge notes.

---

## 3. Strategies for Fixing Syntax Errors

When you see an error message, do this step by step.

### 3.1 Read the line number aloud

Example:

```text
  File "main.py", line 12
    while my_robot.read_distance() == -1
                                      ^
SyntaxError: invalid syntax
```

Say it out loud:

> "Main dot py, **line 12**, invalid syntax."

Then look directly at **line 12** in `main.py`.

### 3.2 Compare to the example code

For each challenge, you are given a **scaffold** (starting code) in the instructions.

Strategy:

1. Put your code next to the example.
2. Compare **line by line**.
3. Check:
   - Do you have all the colons (`:`)?
   - Are the names (`my_robot`, `AIDriver`) spelt the same?
   - Are your indents (spaces at the start of the line) the same as the example?

### 3.3 Learn the "colon rule"

Remember:

- Every `if`, `while`, `for`, and `def` **must** end with a colon `:`.
- The code under it must be indented.

Example pattern:

```python
while condition:
    # indented code here
    do_something()
```

### 3.4 Run your code often

Do **not** write 50 lines and then run.

Instead:

1. Write 3–5 lines.
2. Run the code.
3. Fix any errors.
4. Repeat.

This makes it much easier to see **which change** caused the error.

---

## 4. Practice Exercises

Work through these short exercises to practise fixing the **exact** mistakes you will see later in the challenges.

### 4.1 Missing colon after `while` or `if`

Broken code:

```python
my_robot = AIDriver()
while my_robot.read_distance() == -1
   print("Robot too close")
```

Tasks:

1. Add the missing colon.
2. Make sure the `print` line is correctly indented.
3. Predict: what error would you get if the colon is missing? What line number would it mention?

If you get stuck fixing these, see `Common_Errors.md` for more examples.

---

### 4.2 Mis-typed names vs the example code

Broken code:

```python
my_robt = AIDriver()
my_robot.drive_forward(200, 200)
```

Tasks:

1. Fix the variable name so it is **spelt the same** in both lines.
2. Write down what error you see **before** you fix it (it should be a `NameError`).
3. Explain in one sentence why Python cannot find the name.

If you’re unsure what the error means, glance at `Common_Errors.md`.

---

### 4.3 Missing or extra indentation

Broken code:

```python
my_robot = AIDriver()
while True:
my_robot.drive_forward(200, 200)
```

Tasks:

1. Fix the indentation so the `drive_forward` line belongs to the `while` block.
2. Try adding an extra indented blank line and see what happens.
3. Describe in your own words what “indentation” means in Python.

See `Common_Errors.md` if the error message is confusing.

---

### 4.4 Wrong function names from the library

Broken code:

```python
my_robot = AIDriver()
my_robot.backward(200, 200)
robot.rotate_right(200)
my_robot.read_sensor()
```

Tasks:

1. Use the AIDriver function list in the docs to correct all three calls.
2. Run the broken code first and copy the full error message for at least one of them (likely an `AttributeError`).
3. After fixing, check that no `AttributeError` appears.

If you see an error you don’t recognise, check `Common_Errors.md`.

---

## 5. The Actual Challenge: Fix the Broken Code

In Challenge 0, you will be given a **broken program** that tries to use the AIDriver library, but contains syntax and naming mistakes.

Your goal is to **fix the code** so that:

- It runs without syntax errors.
- It enables AIDriver debug output.
- You see meaningful debug messages in the console.

You must **not change what the robot is supposed to do**, only fix the mistakes.

---

### 5.1 Broken starter code

Copy this code into `main.py` in the Arduino MicroPython Lab:

```python
from time import sleep
from aidriver import AIDriver

import aidriver

aidriver.DEBUG_AIDRIVER == True    # turn on debug (broken)

my_robt = AIDriver(                # typo in variable name

while True                         # missing colon
    my_robot.driveforward(200, 200)    # wrong function name
    sleep(0.5)
```

This code is **broken on purpose**. Do not change what it is trying to do:

- Turn on debug logging.
- Create a robot.
- Drive forward in a loop.

Your job is to make sure you fix the errors so that the loop runs and AIDriver prints debug messages.

---

### 5.2 Steps to complete Challenge 0

1. **Run the broken code.**

   - Read the error message.
   - Note the **line number** and **error type**.

2. **Fix one error at a time.**

   - Start with the first error Python shows.
   - Compare your line to the examples in this challenge.
   - Fix colons, indentation, or spelling.

3. **Run again after each fix.**

   - Don’t try to fix everything at once.
   - Let Python tell you where the next problem is.

4. **Use the AIDriver debug output.**

   - When the program finally runs, you should see messages like:  
     ` [AIDriver] AIDriver initialised - debug logging active`  
     ` [AIDriver] AIDriver.drive_forward: R= 200 L= 200`
   - If you see these, **you have completed Challenge 0**.

5. **Do not change the behaviour.**
   - The robot should still just try to drive forward in a loop.
   - Later challenges will change what the robot does.

---

### 5.3 Extension (optional)

If you finish early:

- Intentionally break the code again (remove a colon, misspell a name) and see what error appears.
- Try writing your own **tiny bug** and then fixing it.
- Explain to a partner how you used the error message and line number to find the problem.

Finishing Challenge 0 means you are ready for **Challenge 1**, with a solid understanding of how to read and fix the most common syntax errors you will see while programming your robot.

---

## 6. Activity: Inspect the Run-Once Event Log

Your robot automatically creates a file called `event_log.txt` the first time a program runs after a fresh boot or recovery.

**Important:** the log is _run once_. If `event_log.txt` already contains text, new runs do not add anything until the file is cleared.

Activity steps:

1. After you finish Challenge 0 and the code runs, open `event_log.txt` (it sits next to `main.py`).
2. Read the entries. Each line shows when an event happened, for example `t+0.00s : robot start` or a distance reading.
3. Explain to a partner what those messages tell you about the code you just fixed.
4. To capture another run, delete the contents of `event_log.txt` (or remove the file) and run your program again. The log will reappear with fresh data.

Later challenges will ask you to use this log to compare _what you expected_ with _what the robot actually did_.
