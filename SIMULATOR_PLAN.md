# AIDriver Simulator - Development Plan

A browser-based robot simulator for the AIDriver MicroPython challenges, hosted on GitHub Pages.

---

## Project Overview

### Goals
- Provide students with a virtual environment to practice AIDriver challenges without physical hardware
- ACE Python editor with syntax validation restricted to AIDriver library methods
- Animated robot simulation responding to student code
- Success detection based on visible path following
- Debug output panel mimicking real device terminal

### Technology Stack
- **Editor**: ACE Editor (Python syntax highlighting)
- **Python Runtime**: Skulpt (browser-based Python interpreter)
- **Rendering**: HTML5 Canvas (2D robot animation)
- **Persistence**: localStorage (code saving per challenge)
- **Hosting**: GitHub Pages (static frontend only)

---

## Specifications Summary

| Feature | Specification |
|---------|---------------|
| Arena Size | 2000×2000mm (scaled to viewport) |
| Robot | Car-like appearance with direction indicator |
| Ultrasonic Display | Always visible, real-time distance readout |
| Time Control | Acceleration slider (1x - 20x) |
| Step Mode | Execute one command at a time |
| Code Validation | Strict Python + AIDriver methods only |
| Path Following | Visible track, failure if robot leaves path |
| Code Persistence | localStorage per challenge |

---

## Challenge Configurations

| Challenge | Arena | Starter Code | Success Criteria |
|-----------|-------|--------------|------------------|
| 0 | Blank | Broken code to fix | Code runs without errors |
| 1 | Straight line path | Basic setup | Robot follows straight line |
| 2 | Circle path | Circle variables | Robot completes circle on path |
| 3 | Start near wall | Distance-based | Robot stops 1000mm from wall |
| 4 | Square path | Square loop | Robot completes 4-sided square |
| 5 | Wall + obstacle | Avoidance code | Robot avoids obstacle, stays on path |
| 6 | Maze selection | Empty control loop | Robot navigates entire maze |
| 7 | Blank + gamepad | Gamepad code | Manual control demonstration |

---

## Phase 1: Project Scaffolding & Core UI

### Objective
Set up the project structure, HTML layout, and basic CSS styling.

### Files to Create

```
app/
├── index.html              # Main HTML structure
├── css/
│   └── style.css           # Core styling, layout grid
├── js/
│   └── app.js              # Entry point, module loader
└── assets/
    └── robot.svg           # Car sprite placeholder
```

### Tasks

1. **Create index.html**
   - Header with project title
   - Challenge selector dropdown
   - Main layout grid:
     - Left panel: ACE editor (60% width)
     - Right panel: Canvas arena + controls (40% width)
   - Control bar: Run, Stop, Step, Reset buttons
   - Speed slider (1x - 20x)
   - Debug output panel (collapsible)
   - Ultrasonic distance display (always visible)
   - Status bar (challenge info, success/fail indicator)

2. **Create style.css**
   - CSS Grid/Flexbox layout
   - Dark theme for editor area
   - Light theme for arena
   - Responsive scaling
   - Button styling
   - Panel styling with borders

3. **Create app.js**
   - DOM ready initialization
   - Panel resize handling
   - Placeholder functions for future modules

4. **Create robot.svg**
   - Simple car shape with front indicator
   - Approximately 80×50mm visual size

### Deliverables
- [ ] Functional HTML page with layout
- [ ] Styled panels and controls
- [ ] Placeholder canvas area
- [ ] Responsive viewport scaling

---

## Phase 2: ACE Editor Integration

### Objective
Integrate ACE editor with Python syntax highlighting and basic editing features.

### Files to Create/Modify

```
app/
├── js/
│   └── editor.js           # ACE editor configuration
└── index.html              # Add ACE CDN scripts
```

### Tasks

1. **Integrate ACE Editor**
   - Load ACE from CDN
   - Configure Python mode
   - Set dark theme (monokai or similar)
   - Enable line numbers
   - Configure tab size (4 spaces)

2. **Editor Features**
   - Get/set code content
   - Clear editor
   - Mark error lines (red gutter icon)
   - Highlight current executing line (for step mode)

3. **Code Persistence**
   - Save to localStorage on change (debounced)
   - Load from localStorage on challenge select
   - Key format: `aidriver_challenge_{n}_code`

4. **Starter Code Loading**
   - Load pre-written code when challenge selected
   - Prompt before overwriting saved code

### Deliverables
- [ ] Working Python editor with syntax highlighting
- [ ] Code saves/loads from localStorage
- [ ] Error line marking capability
- [ ] Current line highlighting for step mode

---

## Phase 3: Python Runtime (Skulpt)

### Objective
Set up Skulpt Python interpreter with AIDriver library stub.

### Files to Create/Modify

```
app/
├── js/
│   ├── python-runner.js    # Skulpt configuration & execution
│   └── aidriver-stub.js    # Browser mock of AIDriver API
└── index.html              # Add Skulpt CDN scripts
```

### Tasks

1. **Skulpt Setup**
   - Load Skulpt from CDN
   - Configure module loading
   - Set up output redirection to debug panel
   - Handle async execution for animations

2. **AIDriver Stub Module**
   - Implement as Skulpt external module
   - Mock all AIDriver methods:
     - `AIDriver()` constructor
     - `drive_forward(right_speed, left_speed)`
     - `drive_backward(right_speed, left_speed)`
     - `rotate_left(turn_speed)`
     - `rotate_right(turn_speed)`
     - `brake()`
     - `read_distance()` → returns simulated distance
     - `is_moving()`
     - `get_motor_speeds()`
   - `hold_state(seconds)` function
   - `DEBUG_AIDRIVER` flag support

3. **Execution Control**
   - Run code (full execution)
   - Stop execution (interrupt)
   - Step execution (pause after each command)
   - Reset state

4. **Command Queue**
   - Each AIDriver method call adds to command queue
   - Simulator consumes queue for animation
   - Support for time-based commands (`hold_state`)

### Deliverables
- [ ] Skulpt runs Python code in browser
- [ ] AIDriver methods callable from Python
- [ ] Commands queued for simulator
- [ ] Debug output appears in panel
- [ ] Execution can be stopped/stepped

---

## Phase 4: Code Validation

### Objective
Implement strict validation ensuring only AIDriver library methods are used.

### Files to Create/Modify

```
app/
├── js/
│   └── validator.js        # Code validation logic
```

### Tasks

1. **Syntax Validation**
   - Parse Python code before execution
   - Report syntax errors with line numbers
   - Display in debug panel and mark in editor

2. **Library Restriction**
   - Allowed imports: `aidriver`, `from aidriver import ...`
   - Allowed AIDriver methods (whitelist):
     - `AIDriver()`
     - `drive_forward`, `drive_backward`
     - `rotate_left`, `rotate_right`
     - `brake`
     - `read_distance`
     - `hold_state`
     - `is_moving`, `get_motor_speeds`
   - Allowed Python built-ins: `print`, `while`, `if`, `for`, `def`, `True`, `False`, `range`, basic math

3. **Forbidden Constructs**
   - Import of any module except `aidriver`
   - `exec`, `eval`, `open`, `input`
   - Class definitions (keep simple for students)

4. **Error Messages**
   - Student-friendly error messages
   - Suggest correct method names for typos
   - Link to challenge documentation

### Deliverables
- [ ] Syntax errors caught before execution
- [ ] Only AIDriver methods allowed
- [ ] Clear error messages for students
- [ ] Typo suggestions

---

## Phase 5: Robot Simulator Core

### Objective
Implement the robot physics and canvas rendering.

### Files to Create/Modify

```
app/
├── js/
│   ├── simulator.js        # Robot state & physics
│   └── renderer.js         # Canvas drawing
└── assets/
    └── robot.svg           # Final car design
```

### Tasks

1. **Robot State**
   - Position (x, y) in mm
   - Heading (angle in degrees)
   - Wheel speeds (left, right)
   - Moving state (boolean)
   - Trail history (for path visualization)

2. **Physics Simulation**
   - Differential drive model (approximated)
   - Speed → distance per tick
   - Different wheel speeds → turning
   - Collision detection with walls

3. **Canvas Rendering**
   - Auto-scale 2000×2000mm to viewport
   - Draw arena boundaries (walls)
   - Draw path/track for challenge
   - Draw obstacles
   - Draw robot (car sprite)
   - Draw robot trail (optional, faded)
   - Update at 60fps

4. **Ultrasonic Simulation**
   - Cast ray from robot front
   - Detect distance to nearest wall/obstacle
   - Return -1 if < 20mm or > 2000mm
   - Update display continuously

5. **Animation Loop**
   - Consume command queue
   - Apply physics per frame
   - Respect speed multiplier slider
   - Pause for step mode

### Deliverables
- [ ] Robot moves on canvas
- [ ] Differential drive approximation works
- [ ] Walls cause collision/stop
- [ ] Ultrasonic distance always displayed
- [ ] Speed slider affects animation

---

## Phase 6: Challenge System

### Objective
Implement challenge configurations, paths, and success detection.

### Files to Create/Modify

```
app/
├── js/
│   ├── challenges.js       # Challenge definitions
│   └── success-detector.js # Path following & criteria
```

### Tasks

1. **Challenge Definitions**
   Each challenge config includes:
   - ID and name
   - Starter code (with intentional errors for Ch0)
   - Arena layout (walls, obstacles)
   - Path definition (line segments/arcs)
   - Robot start position and heading
   - Success criteria

2. **Path System**
   - Define paths as series of waypoints
   - Render path as visible line on canvas
   - Track robot deviation from path
   - Tolerance: 50mm from center of path

3. **Success Detection**
   - Challenge 0: Code executes without error
   - Challenge 1: Robot follows straight path 2000mm
   - Challenge 2: Robot completes circle (returns near start)
   - Challenge 3: Robot stops at 1000mm ± 50mm from wall
   - Challenge 4: Robot completes square (4 corners hit)
   - Challenge 5: Robot avoids obstacle, reaches goal
   - Challenge 6: Robot reaches maze exit
   - Challenge 7: N/A (manual control)

4. **Failure Detection**
   - Robot leaves path by > tolerance
   - Robot collides with obstacle
   - Robot hits wall (where not intended)
   - Timeout exceeded

5. **Visual Feedback**
   - Green overlay on success
   - Red flash on failure
   - Status bar updates

### Deliverables
- [ ] All 8 challenges configured
- [ ] Paths rendered on canvas
- [ ] Success/failure detected and displayed
- [ ] Starter code loaded per challenge

---

## Phase 7: Challenge 6 Mazes

### Objective
Create the 6 maze layouts for Challenge 6.

### Files to Create/Modify

```
app/
├── js/
│   └── mazes.js            # Maze definitions
```

### Tasks

1. **Maze Data Structure**
   - Walls as line segments
   - Start position
   - Exit/goal position
   - Valid path through maze

2. **Maze Designs**
   - Easy 1: Simple L-shaped corridor
   - Easy 2: S-curve path
   - Medium 1: T-junction with one correct path
   - Medium 2: Multiple turns, narrow passages
   - Hard 1: Dead ends, backtracking required
   - Hard 2: Complex maze with multiple decision points

3. **Maze Selector UI**
   - Dropdown to select maze difficulty/number
   - Preview thumbnail (optional)

4. **Success Criteria**
   - Robot reaches exit zone
   - Without hitting walls

### Deliverables
- [ ] 6 maze layouts implemented
- [ ] Maze selector in UI
- [ ] Maze walls render correctly
- [ ] Exit detection works

---

## Phase 8: Virtual Gamepad (Challenge 7)

### Objective
Implement on-screen gamepad for manual robot control.

### Files to Create/Modify

```
app/
├── js/
│   └── gamepad.js          # Virtual gamepad logic
├── css/
│   └── gamepad.css         # Gamepad styling
```

### Tasks

1. **Gamepad UI**
   - D-pad (Up, Down, Left, Right)
   - Joystick (optional, touch drag)
   - Start/Select buttons
   - Positioned below arena for Challenge 7

2. **Touch/Mouse Support**
   - Click/tap to press
   - Hold for continuous input
   - Visual feedback on press

3. **Robot Control Mapping**
   - Up → `drive_forward(200, 200)`
   - Down → `drive_backward(200, 200)`
   - Left → `rotate_left(200)`
   - Right → `rotate_right(200)`
   - Release → `brake()`

4. **Integration**
   - Only visible for Challenge 7
   - Bypasses code execution
   - Still updates ultrasonic display

### Deliverables
- [ ] On-screen gamepad rendered
- [ ] Touch/mouse input works
- [ ] Robot responds to gamepad
- [ ] Only appears for Challenge 7

---

## Phase 9: Debug Panel & Terminal Output

### Objective
Implement the debug output panel showing terminal-like output.

### Files to Create/Modify

```
app/
├── js/
│   └── debug-panel.js      # Debug output handling
```

### Tasks

1. **Panel Features**
   - Scrollable text area
   - Monospace font
   - Auto-scroll to bottom
   - Clear button
   - Collapsible/expandable

2. **Output Types**
   - Python `print()` statements
   - `[AIDriver]` debug messages (when DEBUG_AIDRIVER=True)
   - Event log entries from `hold_state()`
   - Error messages (highlighted in red)
   - Success/failure messages

3. **Formatting**
   - Timestamps (optional)
   - Color coding by message type
   - Preserve formatting from code

### Deliverables
- [ ] Debug panel shows all output
- [ ] Auto-scrolls during execution
- [ ] Errors highlighted
- [ ] Collapsible panel

---

## Phase 10: UI Polish & Final Integration

### Objective
Complete the UI, add finishing touches, and ensure all features work together.

### Files to Modify
- All existing files for polish and integration

### Tasks

1. **Responsive Design**
   - Test on various screen sizes
   - Mobile-friendly (though primarily desktop)
   - Panel resize handles

2. **Accessibility**
   - Keyboard navigation
   - Focus indicators
   - Screen reader labels

3. **Loading States**
   - Show spinner during Skulpt initialization
   - Disable buttons until ready

4. **Help/Documentation**
   - Tooltip hints on controls
   - Link to challenge documentation
   - Quick reference for AIDriver methods

5. **Error Handling**
   - Graceful failures
   - Clear user feedback
   - Recovery options

6. **Testing**
   - Test all 8 challenges
   - Test success/failure detection
   - Test code persistence
   - Cross-browser testing

### Deliverables
- [ ] Polished, professional UI
- [ ] All features integrated
- [ ] Cross-browser compatible
- [ ] Ready for GitHub Pages deployment

---

## Phase 11: GitHub Pages Deployment

### Objective
Configure and deploy to GitHub Pages.

### Tasks

1. **Repository Configuration**
   - Ensure `app/` folder is deployment source
   - Or configure GitHub Actions for build

2. **Base Path**
   - Configure asset paths for GH Pages URL structure

3. **Testing**
   - Verify all features work when deployed
   - Test on multiple devices

4. **Documentation**
   - Update README with deployment info
   - Add usage instructions

### Deliverables
- [ ] Site live on GitHub Pages
- [ ] All features functional in production
- [ ] README updated

---

## File Structure (Final)

```
app/
├── index.html
├── css/
│   ├── style.css
│   └── gamepad.css
├── js/
│   ├── app.js
│   ├── editor.js
│   ├── python-runner.js
│   ├── aidriver-stub.js
│   ├── validator.js
│   ├── simulator.js
│   ├── renderer.js
│   ├── challenges.js
│   ├── success-detector.js
│   ├── mazes.js
│   ├── gamepad.js
│   ├── debug-panel.js
│   └── ui.js
└── assets/
    └── robot.svg
```

---

## Timeline Estimate

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Scaffolding & Core UI | 2-3 hours |
| 2 | ACE Editor Integration | 1-2 hours |
| 3 | Python Runtime (Skulpt) | 3-4 hours |
| 4 | Code Validation | 2-3 hours |
| 5 | Robot Simulator Core | 4-5 hours |
| 6 | Challenge System | 3-4 hours |
| 7 | Challenge 6 Mazes | 2-3 hours |
| 8 | Virtual Gamepad | 2-3 hours |
| 9 | Debug Panel | 1-2 hours |
| 10 | UI Polish & Integration | 3-4 hours |
| 11 | Deployment | 1 hour |

**Total: ~24-34 hours**

---

## Ready to Begin

Confirm to proceed with **Phase 1: Project Scaffolding & Core UI**.
