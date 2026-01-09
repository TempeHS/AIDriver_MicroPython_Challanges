/**
 * AIDriver Simulator - Main Application
 * Entry point and module orchestration
 */

// Global application state
const App = {
    // Current state
    currentChallenge: 0,
    isRunning: false,
    isPaused: false,
    speedMultiplier: 5,
    
    // ACE Editor instance
    editor: null,
    
    // Canvas and context
    canvas: null,
    ctx: null,
    
    // Robot state
    robot: {
        x: 1000,           // Center X (mm)
        y: 1000,           // Center Y (mm)
        heading: 0,        // Angle in degrees (0 = facing up/north)
        leftSpeed: 0,
        rightSpeed: 0,
        isMoving: false,
        trail: []          // Array of {x, y} positions
    },
    
    // Simulation
    animationFrameId: null,
    commandQueue: [],
    
    // DOM Elements (cached)
    elements: {}
};

/**
 * Initialize the application
 */
function init() {
    console.log('[App] Initializing AIDriver Simulator...');
    
    // Cache DOM elements
    cacheElements();
    
    // Initialize Bootstrap components
    initBootstrapComponents();
    
    // Initialize ACE Editor
    initEditor();
    
    // Initialize Canvas
    initCanvas();
    
    // Set up event listeners
    setupEventListeners();
    
    // Load saved state or default challenge
    loadChallenge(0);
    
    // Hide loading overlay
    hideLoading();
    
    console.log('[App] Initialization complete');
}

/**
 * Cache frequently accessed DOM elements
 */
function cacheElements() {
    App.elements = {
        // Buttons
        btnRun: document.getElementById('btnRun'),
        btnStop: document.getElementById('btnStop'),
        btnStep: document.getElementById('btnStep'),
        btnReset: document.getElementById('btnReset'),
        btnResetCode: document.getElementById('btnResetCode'),
        btnClearDebug: document.getElementById('btnClearDebug'),
        btnConfirmReset: document.getElementById('btnConfirmReset'),
        
        // Gamepad buttons
        btnUp: document.getElementById('btnUp'),
        btnDown: document.getElementById('btnDown'),
        btnLeft: document.getElementById('btnLeft'),
        btnRight: document.getElementById('btnRight'),
        
        // Displays
        ultrasonicDisplay: document.getElementById('ultrasonicDisplay'),
        speedValue: document.getElementById('speedValue'),
        debugConsole: document.getElementById('debugConsole'),
        statusMessage: document.getElementById('statusMessage'),
        challengeStatus: document.getElementById('challengeStatus'),
        statusBar: document.getElementById('statusBar'),
        
        // Controls
        speedSlider: document.getElementById('speedSlider'),
        challengeDropdown: document.getElementById('challengeDropdown'),
        
        // Panels
        gamepadPanel: document.getElementById('gamepadPanel'),
        mazeSelector: document.getElementById('mazeSelector'),
        canvasContainer: document.getElementById('canvasContainer'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        
        // Canvas
        arenaCanvas: document.getElementById('arenaCanvas')
    };
}

/**
 * Initialize Bootstrap components (tooltips, etc.)
 */
function initBootstrapComponents() {
    // Initialize all tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(el => new bootstrap.Tooltip(el));
    
    console.log('[App] Bootstrap components initialized');
}

/**
 * Initialize ACE Editor using the Editor module
 */
function initEditor() {
    // Use the Editor module for full functionality
    Editor.init();
    App.editor = Editor.instance;
    
    // Set placeholder content
    Editor.setCode('# Select a challenge to load starter code\n');
    
    console.log('[App] ACE Editor initialized via Editor module');
}

/**
 * Initialize Canvas for robot simulation
 */
function initCanvas() {
    App.canvas = App.elements.arenaCanvas;
    App.ctx = App.canvas.getContext('2d');
    
    // Set canvas size based on container
    resizeCanvas();
    
    // Initial render
    render();
    
    console.log('[App] Canvas initialized');
}

/**
 * Resize canvas to fit container while maintaining aspect ratio
 */
function resizeCanvas() {
    const container = App.elements.canvasContainer;
    const size = Math.min(container.clientWidth, container.clientHeight);
    
    App.canvas.width = size;
    App.canvas.height = size;
    
    // Re-render after resize
    render();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Control buttons
    App.elements.btnRun.addEventListener('click', runCode);
    App.elements.btnStop.addEventListener('click', stopExecution);
    App.elements.btnStep.addEventListener('click', stepCode);
    App.elements.btnReset.addEventListener('click', resetRobot);
    App.elements.btnClearDebug.addEventListener('click', clearDebug);
    
    // Reset code button - show modal
    App.elements.btnResetCode.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('resetCodeModal'));
        modal.show();
    });
    
    // Confirm reset code
    App.elements.btnConfirmReset.addEventListener('click', () => {
        resetToStarterCode();
        bootstrap.Modal.getInstance(document.getElementById('resetCodeModal')).hide();
    });
    
    // Speed slider
    App.elements.speedSlider.addEventListener('input', (e) => {
        App.speedMultiplier = parseInt(e.target.value);
        App.elements.speedValue.textContent = `${App.speedMultiplier}x`;
    });
    
    // Challenge selector
    document.querySelectorAll('[data-challenge]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const challengeId = parseInt(e.currentTarget.dataset.challenge);
            loadChallenge(challengeId);
        });
    });
    
    // Maze selector
    document.querySelectorAll('[data-maze]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const mazeId = e.currentTarget.dataset.maze;
            loadMaze(mazeId);
        });
    });
    
    // Gamepad buttons
    setupGamepadListeners();
    
    // Window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    console.log('[App] Event listeners set up');
}

/**
 * Set up gamepad button listeners
 */
function setupGamepadListeners() {
    const gamepadButtons = {
        btnUp: { action: 'forward' },
        btnDown: { action: 'backward' },
        btnLeft: { action: 'left' },
        btnRight: { action: 'right' }
    };
    
    Object.entries(gamepadButtons).forEach(([id, config]) => {
        const btn = App.elements[id];
        if (btn) {
            btn.addEventListener('mousedown', () => handleGamepadPress(config.action));
            btn.addEventListener('mouseup', () => handleGamepadRelease());
            btn.addEventListener('mouseleave', () => handleGamepadRelease());
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                handleGamepadPress(config.action);
            });
            btn.addEventListener('touchend', () => handleGamepadRelease());
        }
    });
}

/**
 * Handle keyboard shortcuts
 */
function handleKeyboardShortcuts(e) {
    // Ctrl+Enter - Run code
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        runCode();
    }
    // Ctrl+. - Stop execution
    if (e.ctrlKey && e.key === '.') {
        e.preventDefault();
        stopExecution();
    }
    // Ctrl+Shift+R - Reset robot
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        resetRobot();
    }
}

/**
 * Handle gamepad button press
 */
function handleGamepadPress(action) {
    const speed = 200;
    switch (action) {
        case 'forward':
            App.robot.leftSpeed = speed;
            App.robot.rightSpeed = speed;
            App.robot.isMoving = true;
            logDebug('[Gamepad] Driving forward');
            break;
        case 'backward':
            App.robot.leftSpeed = -speed;
            App.robot.rightSpeed = -speed;
            App.robot.isMoving = true;
            logDebug('[Gamepad] Driving backward');
            break;
        case 'left':
            App.robot.leftSpeed = -speed;
            App.robot.rightSpeed = speed;
            App.robot.isMoving = true;
            logDebug('[Gamepad] Rotating left');
            break;
        case 'right':
            App.robot.leftSpeed = speed;
            App.robot.rightSpeed = -speed;
            App.robot.isMoving = true;
            logDebug('[Gamepad] Rotating right');
            break;
    }
}

/**
 * Handle gamepad button release
 */
function handleGamepadRelease() {
    App.robot.leftSpeed = 0;
    App.robot.rightSpeed = 0;
    App.robot.isMoving = false;
}

/**
 * Load a challenge
 */
function loadChallenge(challengeId) {
    App.currentChallenge = challengeId;
    
    // Update dropdown text
    const dropdownItems = document.querySelectorAll('[data-challenge]');
    dropdownItems.forEach(item => {
        item.classList.toggle('active', parseInt(item.dataset.challenge) === challengeId);
        if (parseInt(item.dataset.challenge) === challengeId) {
            App.elements.challengeDropdown.innerHTML = item.innerHTML;
        }
    });
    
    // Show/hide maze selector for Challenge 6
    App.elements.mazeSelector.classList.toggle('d-none', challengeId !== 6);
    
    // Show/hide gamepad for Challenge 7
    App.elements.gamepadPanel.classList.toggle('d-none', challengeId !== 7);
    
    // Clear any existing error markers
    Editor.clearAllMarkers();
    
    // Try to load saved code, otherwise load starter code
    const savedCode = Editor.loadSavedCode(challengeId);
    if (savedCode) {
        Editor.setCode(savedCode);
        logDebug(`[App] Loaded saved code for Challenge ${challengeId}`);
    } else {
        loadStarterCode(challengeId);
    }
    
    // Reset robot for new challenge
    resetRobot();
    
    // Update status
    updateStatus(`Challenge ${challengeId} loaded`, 'info');
    App.elements.challengeStatus.textContent = 'Not Started';
    App.elements.challengeStatus.className = 'badge bg-secondary';
    
    console.log(`[App] Challenge ${challengeId} loaded`);
}

/**
 * Load starter code for a challenge
 */
function loadStarterCode(challengeId) {
    const starterCodes = getStarterCodes();
    const code = starterCodes[challengeId] || '# No starter code available\n';
    Editor.setCode(code);
    logDebug(`[App] Loaded starter code for Challenge ${challengeId}`);
}

/**
 * Reset to starter code (discard changes)
 */
function resetToStarterCode() {
    Editor.clearSavedCode(App.currentChallenge);
    loadStarterCode(App.currentChallenge);
    logDebug('[App] Code reset to starter code');
}

/**
 * Save code to localStorage (handled by Editor module now)
 */
function saveCode() {
    Editor.saveCode();
}

/**
 * Load a maze (for Challenge 6)
 */
function loadMaze(mazeId) {
    logDebug(`[App] Loading maze: ${mazeId}`);
    // TODO: Implement maze loading in Phase 7
    updateStatus(`Maze "${mazeId}" loaded`, 'info');
}

/**
 * Run the code
 */
function runCode() {
    if (App.isRunning) return;
    
    App.isRunning = true;
    App.isPaused = false;
    
    // Update UI
    App.elements.btnRun.disabled = true;
    App.elements.btnStop.disabled = false;
    App.elements.btnStep.disabled = true;
    
    logDebug('[App] Running code...');
    updateStatus('Running...', 'primary');
    App.elements.challengeStatus.textContent = 'Running';
    App.elements.challengeStatus.className = 'badge bg-primary';
    
    // TODO: Implement Skulpt execution in Phase 3
    // For now, just simulate running
    setTimeout(() => {
        logDebug('[App] Code execution placeholder - Skulpt integration pending');
    }, 100);
}

/**
 * Stop code execution
 */
function stopExecution() {
    App.isRunning = false;
    App.isPaused = false;
    
    // Update UI
    App.elements.btnRun.disabled = false;
    App.elements.btnStop.disabled = true;
    App.elements.btnStep.disabled = false;
    
    // Stop robot
    App.robot.leftSpeed = 0;
    App.robot.rightSpeed = 0;
    App.robot.isMoving = false;
    
    logDebug('[App] Execution stopped');
    updateStatus('Stopped', 'warning');
    App.elements.challengeStatus.textContent = 'Stopped';
    App.elements.challengeStatus.className = 'badge bg-warning';
}

/**
 * Step through code
 */
function stepCode() {
    logDebug('[App] Step mode - executing next command');
    // TODO: Implement step execution in Phase 3
}

/**
 * Reset robot to starting position
 */
function resetRobot() {
    // Reset robot state
    App.robot = {
        x: 1000,
        y: 1800,  // Start near bottom
        heading: 0,
        leftSpeed: 0,
        rightSpeed: 0,
        isMoving: false,
        trail: []
    };
    
    // Clear success/failure overlay
    App.elements.canvasContainer.classList.remove('success', 'failure');
    
    // Re-render
    render();
    
    // Update ultrasonic display
    updateUltrasonicDisplay(calculateDistance());
    
    logDebug('[App] Robot reset to starting position');
    updateStatus('Robot reset', 'info');
}

/**
 * Clear debug console
 */
function clearDebug() {
    App.elements.debugConsole.textContent = '';
}

/**
 * Log message to debug console
 */
function logDebug(message, type = 'info') {
    const console = App.elements.debugConsole;
    const timestamp = new Date().toLocaleTimeString();
    const line = document.createElement('span');
    line.className = type;
    line.textContent = `[${timestamp}] ${message}\n`;
    console.appendChild(line);
    console.scrollTop = console.scrollHeight;
}

/**
 * Update status bar
 */
function updateStatus(message, type = 'info') {
    App.elements.statusMessage.textContent = message;
    App.elements.statusBar.className = `alert alert-${type} mb-0 rounded-0 py-2 d-flex align-items-center`;
}

/**
 * Update ultrasonic distance display
 */
function updateUltrasonicDisplay(distance) {
    const display = App.elements.ultrasonicDisplay;
    
    if (distance === -1) {
        display.textContent = 'Distance: --- mm';
        display.className = 'badge bg-danger';
    } else {
        display.textContent = `Distance: ${Math.round(distance)} mm`;
        
        // Color code based on distance
        if (distance < 100) {
            display.className = 'badge bg-danger';
        } else if (distance < 300) {
            display.className = 'badge bg-warning text-dark';
        } else {
            display.className = 'badge bg-info';
        }
    }
}

/**
 * Calculate distance from robot to nearest wall/obstacle
 */
function calculateDistance() {
    // Simple calculation to top wall for now
    const distanceToTop = App.robot.y;
    
    if (distanceToTop < 20 || distanceToTop > 2000) {
        return -1;
    }
    return distanceToTop;
}

/**
 * Main render loop
 */
function render() {
    const ctx = App.ctx;
    const canvas = App.canvas;
    const scale = canvas.width / 2000; // Scale factor from mm to pixels
    
    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    drawGrid(ctx, scale);
    
    // Draw path (if any for current challenge)
    drawPath(ctx, scale);
    
    // Draw walls
    drawWalls(ctx, scale);
    
    // Draw robot trail
    drawTrail(ctx, scale);
    
    // Draw robot
    drawRobot(ctx, scale);
    
    // Continue animation if robot is moving
    if (App.robot.isMoving) {
        updateRobotPosition();
        updateUltrasonicDisplay(calculateDistance());
        App.animationFrameId = requestAnimationFrame(render);
    }
}

/**
 * Draw background grid
 */
function drawGrid(ctx, scale) {
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 1;
    
    // Draw grid every 200mm
    const gridSize = 200 * scale;
    
    for (let x = gridSize; x < ctx.canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ctx.canvas.height);
        ctx.stroke();
    }
    
    for (let y = gridSize; y < ctx.canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ctx.canvas.width, y);
        ctx.stroke();
    }
}

/**
 * Draw challenge path
 */
function drawPath(ctx, scale) {
    // TODO: Implement path drawing for each challenge in Phase 6
    // Placeholder: draw a simple line for Challenge 1
    if (App.currentChallenge === 1) {
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(1000 * scale, 1800 * scale);
        ctx.lineTo(1000 * scale, 200 * scale);
        ctx.stroke();
        ctx.setLineDash([]);
    }
}

/**
 * Draw arena walls
 */
function drawWalls(ctx, scale) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, ctx.canvas.width - 4, ctx.canvas.height - 4);
}

/**
 * Draw robot trail
 */
function drawTrail(ctx, scale) {
    if (App.robot.trail.length < 2) return;
    
    ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(App.robot.trail[0].x * scale, App.robot.trail[0].y * scale);
    
    for (let i = 1; i < App.robot.trail.length; i++) {
        ctx.lineTo(App.robot.trail[i].x * scale, App.robot.trail[i].y * scale);
    }
    ctx.stroke();
}

/**
 * Draw the robot
 */
function drawRobot(ctx, scale) {
    const x = App.robot.x * scale;
    const y = App.robot.y * scale;
    const heading = App.robot.heading * Math.PI / 180;
    
    // Robot dimensions (80mm x 50mm)
    const width = 80 * scale;
    const height = 50 * scale;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(heading);
    
    // Robot body
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(-width / 2, -height / 2, width, height);
    
    // Front indicator (direction arrow)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -height / 2 - 10 * scale);
    ctx.lineTo(-10 * scale, -height / 2 + 5 * scale);
    ctx.lineTo(10 * scale, -height / 2 + 5 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Wheels
    ctx.fillStyle = '#333333';
    ctx.fillRect(-width / 2 - 5 * scale, -height / 3, 5 * scale, height / 1.5);
    ctx.fillRect(width / 2, -height / 3, 5 * scale, height / 1.5);
    
    ctx.restore();
}

/**
 * Update robot position based on current speeds
 */
function updateRobotPosition() {
    const dt = (1 / 60) * App.speedMultiplier; // Time step in seconds, scaled
    
    // Simple differential drive approximation
    const leftSpeed = App.robot.leftSpeed;
    const rightSpeed = App.robot.rightSpeed;
    
    // Average speed and turning
    const avgSpeed = (leftSpeed + rightSpeed) / 2;
    const turnRate = (rightSpeed - leftSpeed) / 100; // Simplified turn rate
    
    // Update heading
    App.robot.heading += turnRate * dt * 50;
    
    // Update position
    const headingRad = App.robot.heading * Math.PI / 180;
    App.robot.x += Math.sin(headingRad) * avgSpeed * dt * 0.5;
    App.robot.y -= Math.cos(headingRad) * avgSpeed * dt * 0.5;
    
    // Clamp to arena bounds
    App.robot.x = Math.max(50, Math.min(1950, App.robot.x));
    App.robot.y = Math.max(50, Math.min(1950, App.robot.y));
    
    // Add to trail
    App.robot.trail.push({ x: App.robot.x, y: App.robot.y });
    if (App.robot.trail.length > 500) {
        App.robot.trail.shift();
    }
}

/**
 * Hide loading overlay
 */
function hideLoading() {
    App.elements.loadingOverlay.classList.add('hidden');
}

/**
 * Get starter codes for all challenges
 */
function getStarterCodes() {
    return {
        0: `# Challenge 0: Fix the Code
# This code has errors - can you find and fix them?

from aidriver import AIDriver, hold_state

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

# HINT: Check for missing colons and spelling errors
while my_robot.read_distance() == -1
   print("Robot too close, too far or sensor is in error state")

my_robt.drive_forward(200, 200)
hold_state(1)
my_robot.brake()
`,
        1: `# Challenge 1: Drive in a Straight Line
# Balance the motor speeds so your robot drives straight

from aidriver import AIDriver, hold_state

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

while True:
    my_robot.drive_forward(200, 200)
    hold_state(0.1)
`,
        2: `# Challenge 2: Drive a Circle
# Modify wheel_speed and speed_adjust to drive in a circle

from aidriver import AIDriver, hold_state

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

my_counter = 0
wheel_speed = 180
speed_adjust = 0  # Modify this to turn
move_time = 0     # Set the time to complete a circle

while my_counter < 1:
    my_robot.drive_backward(wheel_speed - speed_adjust, wheel_speed + speed_adjust)
    hold_state(move_time)
    my_robot.brake()
    hold_state(1)
    my_counter = my_counter + 1
`,
        3: `# Challenge 3: Distance Sensor
# Use the ultrasonic sensor to stop 1000mm from a wall

from aidriver import AIDriver, hold_state

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

while my_robot.read_distance() == -1:
    print("Robot too close, too far or sensor is in error state")

my_counter = 0
start_distance = my_robot.read_distance()
current_distance = start_distance
distance_remaining = current_distance - start_distance
wheel_speed = 120
speed_adjust = 0
target_distance = 0  # Set to 1000 for the challenge

while True:
    while distance_remaining < target_distance:
        my_robot.drive_backward(wheel_speed - speed_adjust, wheel_speed + speed_adjust)
        current_distance = my_robot.read_distance()
        hold_state(0.1)
        distance_remaining = current_distance - start_distance
    my_robot.brake()
    hold_state(1)
    print(my_robot.read_distance())
    hold_state(0.1)
`,
        4: `# Challenge 4: Drive a Square
# Make the robot drive in a square pattern

from aidriver import AIDriver, hold_state

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

while my_robot.read_distance() == -1:
    print("Robot too close, too far or sensor is in error state")

my_counter = 0
target_counter = 4
wheel_speed = 200
speed_adjust = 0
forward_time = 0    # Set time to drive 1m
turn_speed = 200
turn_time = 0       # Set time for 90 degree turn

while True:
    while my_counter < target_counter:
        my_robot.drive_forward(wheel_speed - speed_adjust, wheel_speed + speed_adjust)
        hold_state(forward_time)
        my_robot.brake()
        hold_state(3)
        my_robot.rotate_right(turn_speed)
        hold_state(turn_time)
        my_robot.brake()
        my_counter = my_counter + 1
    hold_state(1)
`,
        5: `# Challenge 5: Obstacle Avoidance
# Drive forward and turn when an obstacle is detected

from aidriver import AIDriver, hold_state

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

wheel_speed = 200
speed_adjust = 0
turn_speed = 200
turn_time = 0       # Set for 90 degree turn
safe_distance = 0   # Set to 300mm

def turn_left():
    # Implement 90 degree left turn here
    my_robot.rotate_left(turn_speed)
    hold_state(turn_time)
    my_robot.brake()

def drive_forward():
    # Implement drive forward here
    my_robot.drive_forward(wheel_speed - speed_adjust, wheel_speed + speed_adjust)
    hold_state(0.1)

def brake():
    my_robot.brake()
    hold_state(0.5)

while True:
    distance = my_robot.read_distance()
    if distance != -1 and distance < safe_distance:
        brake()
        turn_left()
    else:
        drive_forward()
`,
        6: `# Challenge 6: Maze Navigation
# Navigate through the maze to reach the exit

from aidriver import AIDriver, hold_state

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

wheel_speed = 150
turn_speed = 150
safe_distance = 200

# Your maze navigation algorithm here
while True:
    distance = my_robot.read_distance()
    
    # TODO: Implement your maze solving algorithm
    # Hint: Check distance, decide to go forward or turn
    
    hold_state(0.1)
`,
        7: `# Challenge 7: Gamepad Control
# Use the on-screen gamepad to control your robot
# This challenge uses manual control - no code needed!

from aidriver import AIDriver

import aidriver

aidriver.DEBUG_AIDRIVER = True
my_robot = AIDriver()

print("Use the gamepad controls below the arena")
print("Press the arrow buttons to drive the robot")

# The gamepad bypasses Python code
# This is just for demonstration
while True:
    pass
`
    };
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Start animation loop
function startAnimationLoop() {
    function animate() {
        if (App.robot.isMoving) {
            render();
        }
        requestAnimationFrame(animate);
    }
    animate();
}

// Also initialize render loop
document.addEventListener('DOMContentLoaded', () => {
    startAnimationLoop();
});
