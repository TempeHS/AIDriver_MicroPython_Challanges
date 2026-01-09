/**
 * AIDriver Simulator - Gamepad Controller Module
 * Handles on-screen gamepad and keyboard controls for Challenge 7
 */

const Gamepad = (function () {
  "use strict";

  // Motor speed when buttons pressed
  const BASE_SPEED = 200;
  const TURN_SPEED = 150;

  // Current button states
  const buttonStates = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  // Key mappings
  const keyMappings = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    W: "up",
    s: "down",
    S: "down",
    a: "left",
    A: "left",
    d: "right",
    D: "right",
  };

  let isEnabled = false;
  let animationFrameId = null;

  /**
   * Initialize gamepad controls
   */
  function init() {
    // Set up on-screen button listeners
    setupButtonListeners();

    // Set up keyboard listeners
    setupKeyboardListeners();

    console.log("[Gamepad] Initialized");
  }

  /**
   * Enable gamepad control
   */
  function enable() {
    isEnabled = true;

    // Start the control loop
    if (!animationFrameId) {
      controlLoop();
    }

    if (typeof DebugPanel !== "undefined") {
      DebugPanel.info("Gamepad control enabled - use arrows or WASD");
    }
  }

  /**
   * Disable gamepad control
   */
  function disable() {
    isEnabled = false;

    // Cancel animation frame
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    // Stop robot
    if (typeof App !== "undefined") {
      App.robot.leftSpeed = 0;
      App.robot.rightSpeed = 0;
      App.robot.isMoving = false;
    }

    // Reset button states
    Object.keys(buttonStates).forEach((key) => (buttonStates[key] = false));
    updateButtonVisuals();
  }

  /**
   * Set up on-screen button listeners
   */
  function setupButtonListeners() {
    const buttons = {
      btnForward: "up",
      btnBackward: "down",
      btnLeft: "left",
      btnRight: "right",
    };

    for (const [id, direction] of Object.entries(buttons)) {
      const btn = document.getElementById(id);
      if (!btn) continue;

      // Mouse events
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        setButtonState(direction, true);
      });

      btn.addEventListener("mouseup", (e) => {
        e.preventDefault();
        setButtonState(direction, false);
      });

      btn.addEventListener("mouseleave", (e) => {
        setButtonState(direction, false);
      });

      // Touch events for mobile
      btn.addEventListener("touchstart", (e) => {
        e.preventDefault();
        setButtonState(direction, true);
      });

      btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        setButtonState(direction, false);
      });

      btn.addEventListener("touchcancel", (e) => {
        setButtonState(direction, false);
      });
    }
  }

  /**
   * Set up keyboard listeners
   */
  function setupKeyboardListeners() {
    document.addEventListener("keydown", (e) => {
      if (!isEnabled) return;

      const direction = keyMappings[e.key];
      if (direction) {
        e.preventDefault();
        setButtonState(direction, true);
      }
    });

    document.addEventListener("keyup", (e) => {
      if (!isEnabled) return;

      const direction = keyMappings[e.key];
      if (direction) {
        e.preventDefault();
        setButtonState(direction, false);
      }
    });

    // Handle focus loss
    window.addEventListener("blur", () => {
      Object.keys(buttonStates).forEach((key) => (buttonStates[key] = false));
      updateButtonVisuals();
    });
  }

  /**
   * Set button state and update visuals
   */
  function setButtonState(direction, pressed) {
    if (buttonStates[direction] !== pressed) {
      buttonStates[direction] = pressed;
      updateButtonVisuals();
    }
  }

  /**
   * Update button visual states
   */
  function updateButtonVisuals() {
    const buttonIds = {
      up: "btnForward",
      down: "btnBackward",
      left: "btnLeft",
      right: "btnRight",
    };

    for (const [direction, id] of Object.entries(buttonIds)) {
      const btn = document.getElementById(id);
      if (btn) {
        btn.classList.toggle("active", buttonStates[direction]);
      }
    }
  }

  /**
   * Control loop - updates robot based on button states
   */
  function controlLoop() {
    if (!isEnabled) return;

    // Calculate motor speeds based on button states
    let leftSpeed = 0;
    let rightSpeed = 0;

    if (buttonStates.up) {
      leftSpeed += BASE_SPEED;
      rightSpeed += BASE_SPEED;
    }

    if (buttonStates.down) {
      leftSpeed -= BASE_SPEED;
      rightSpeed -= BASE_SPEED;
    }

    if (buttonStates.left) {
      leftSpeed -= TURN_SPEED;
      rightSpeed += TURN_SPEED;
    }

    if (buttonStates.right) {
      leftSpeed += TURN_SPEED;
      rightSpeed -= TURN_SPEED;
    }

    // Clamp speeds
    leftSpeed = Math.max(-255, Math.min(255, leftSpeed));
    rightSpeed = Math.max(-255, Math.min(255, rightSpeed));

    // Update robot
    if (typeof App !== "undefined") {
      App.robot.leftSpeed = leftSpeed;
      App.robot.rightSpeed = rightSpeed;
      App.robot.isMoving = leftSpeed !== 0 || rightSpeed !== 0;
    }

    // Continue loop
    animationFrameId = requestAnimationFrame(controlLoop);
  }

  /**
   * Check if gamepad is enabled
   */
  function isActive() {
    return isEnabled;
  }

  /**
   * Get current button states
   */
  function getButtonStates() {
    return { ...buttonStates };
  }

  // Public API
  return {
    init,
    enable,
    disable,
    isActive,
    getButtonStates,
  };
})();
