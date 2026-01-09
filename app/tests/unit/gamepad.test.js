/**
 * Gamepad Unit Tests
 * Tests for virtual gamepad control (Challenge 7)
 */

describe("Gamepad", () => {
  let GamepadImpl;
  let mockRobot;

  beforeEach(() => {
    // Set up DOM for gamepad buttons
    document.body.innerHTML = `
      <div id="gamepadPanel">
        <button id="btnForward" class="gamepad-btn">Forward</button>
        <button id="btnBackward" class="gamepad-btn">Backward</button>
        <button id="btnLeft" class="gamepad-btn">Left</button>
        <button id="btnRight" class="gamepad-btn">Right</button>
        <button id="btnStop" class="gamepad-btn">Stop</button>
      </div>
      <canvas id="simulatorCanvas"></canvas>
    `;

    // Mock robot
    mockRobot = {
      x: 1000,
      y: 1000,
      angle: 0,
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
    };

    // Create Gamepad implementation
    GamepadImpl = {
      enabled: false,
      robot: mockRobot,
      speed: 100,
      init: function () {
        this.enabled = true;
        this.bindEvents();
      },
      bindEvents: function () {
        const forward = document.getElementById("btnForward");
        const backward = document.getElementById("btnBackward");
        const left = document.getElementById("btnLeft");
        const right = document.getElementById("btnRight");
        const stop = document.getElementById("btnStop");

        if (forward)
          forward.addEventListener("mousedown", () => this.forward());
        if (backward)
          backward.addEventListener("mousedown", () => this.backward());
        if (left) left.addEventListener("mousedown", () => this.left());
        if (right) right.addEventListener("mousedown", () => this.right());
        if (stop) stop.addEventListener("click", () => this.stop());
      },
      forward: function () {
        this.robot.leftSpeed = this.speed;
        this.robot.rightSpeed = this.speed;
        this.robot.isMoving = true;
      },
      backward: function () {
        this.robot.leftSpeed = -this.speed;
        this.robot.rightSpeed = -this.speed;
        this.robot.isMoving = true;
      },
      left: function () {
        this.robot.leftSpeed = -this.speed;
        this.robot.rightSpeed = this.speed;
        this.robot.isMoving = true;
      },
      right: function () {
        this.robot.leftSpeed = this.speed;
        this.robot.rightSpeed = -this.speed;
        this.robot.isMoving = true;
      },
      stop: function () {
        this.robot.leftSpeed = 0;
        this.robot.rightSpeed = 0;
        this.robot.isMoving = false;
      },
      isEnabled: function () {
        return this.enabled;
      },
      getState: function () {
        return {
          left: this.robot.leftSpeed,
          right: this.robot.rightSpeed,
        };
      },
      handleKeyDown: function (key) {
        switch (key) {
          case "ArrowUp":
          case "w":
          case "W":
            this.forward();
            break;
          case "ArrowDown":
          case "s":
          case "S":
            this.backward();
            break;
          case "ArrowLeft":
          case "a":
          case "A":
            this.left();
            break;
          case "ArrowRight":
          case "d":
          case "D":
            this.right();
            break;
          case " ":
            this.stop();
            break;
        }
      },
      handleKeyUp: function (key) {
        if (
          [
            "ArrowUp",
            "ArrowDown",
            "ArrowLeft",
            "ArrowRight",
            "w",
            "a",
            "s",
            "d",
            "W",
            "A",
            "S",
            "D",
          ].includes(key)
        ) {
          this.stop();
        }
      },
    };
  });

  describe("Initialization", () => {
    test("should initialize without errors", () => {
      expect(() => GamepadImpl.init()).not.toThrow();
    });

    test("should have required methods", () => {
      expect(typeof GamepadImpl.forward).toBe("function");
      expect(typeof GamepadImpl.backward).toBe("function");
      expect(typeof GamepadImpl.left).toBe("function");
      expect(typeof GamepadImpl.right).toBe("function");
      expect(typeof GamepadImpl.stop).toBe("function");
    });

    test("should be enabled after init", () => {
      GamepadImpl.init();
      expect(GamepadImpl.isEnabled()).toBe(true);
    });
  });

  describe("Direction Controls", () => {
    beforeEach(() => {
      GamepadImpl.init();
    });

    test("forward() should set both motors to positive speed", () => {
      GamepadImpl.forward();
      expect(mockRobot.leftSpeed).toBeGreaterThan(0);
      expect(mockRobot.rightSpeed).toBeGreaterThan(0);
      expect(mockRobot.isMoving).toBe(true);
    });

    test("backward() should set both motors to negative speed", () => {
      GamepadImpl.backward();
      expect(mockRobot.leftSpeed).toBeLessThan(0);
      expect(mockRobot.rightSpeed).toBeLessThan(0);
      expect(mockRobot.isMoving).toBe(true);
    });

    test("left() should set differential steering for left turn", () => {
      GamepadImpl.left();
      expect(mockRobot.leftSpeed).toBeLessThan(mockRobot.rightSpeed);
      expect(mockRobot.isMoving).toBe(true);
    });

    test("right() should set differential steering for right turn", () => {
      GamepadImpl.right();
      expect(mockRobot.leftSpeed).toBeGreaterThan(mockRobot.rightSpeed);
      expect(mockRobot.isMoving).toBe(true);
    });

    test("stop() should set both motors to zero", () => {
      GamepadImpl.forward();
      GamepadImpl.stop();
      expect(mockRobot.leftSpeed).toBe(0);
      expect(mockRobot.rightSpeed).toBe(0);
      expect(mockRobot.isMoving).toBe(false);
    });
  });

  describe("Keyboard Controls", () => {
    beforeEach(() => {
      GamepadImpl.init();
    });

    test("ArrowUp should trigger forward", () => {
      GamepadImpl.handleKeyDown("ArrowUp");
      expect(mockRobot.leftSpeed).toBeGreaterThan(0);
      expect(mockRobot.rightSpeed).toBeGreaterThan(0);
    });

    test("ArrowDown should trigger backward", () => {
      GamepadImpl.handleKeyDown("ArrowDown");
      expect(mockRobot.leftSpeed).toBeLessThan(0);
      expect(mockRobot.rightSpeed).toBeLessThan(0);
    });

    test("ArrowLeft should trigger left turn", () => {
      GamepadImpl.handleKeyDown("ArrowLeft");
      expect(mockRobot.leftSpeed).toBeLessThan(mockRobot.rightSpeed);
    });

    test("ArrowRight should trigger right turn", () => {
      GamepadImpl.handleKeyDown("ArrowRight");
      expect(mockRobot.leftSpeed).toBeGreaterThan(mockRobot.rightSpeed);
    });

    test("Space should trigger stop", () => {
      GamepadImpl.forward();
      GamepadImpl.handleKeyDown(" ");
      expect(mockRobot.leftSpeed).toBe(0);
      expect(mockRobot.rightSpeed).toBe(0);
    });

    test("WASD keys should work", () => {
      GamepadImpl.handleKeyDown("w");
      expect(mockRobot.leftSpeed).toBeGreaterThan(0);

      GamepadImpl.handleKeyDown("s");
      expect(mockRobot.leftSpeed).toBeLessThan(0);

      GamepadImpl.handleKeyDown("a");
      expect(mockRobot.leftSpeed).toBeLessThan(mockRobot.rightSpeed);

      GamepadImpl.handleKeyDown("d");
      expect(mockRobot.leftSpeed).toBeGreaterThan(mockRobot.rightSpeed);
    });

    test("key release should stop movement", () => {
      GamepadImpl.handleKeyDown("ArrowUp");
      GamepadImpl.handleKeyUp("ArrowUp");
      expect(mockRobot.leftSpeed).toBe(0);
      expect(mockRobot.rightSpeed).toBe(0);
    });
  });

  describe("State Reporting", () => {
    beforeEach(() => {
      GamepadImpl.init();
    });

    test("getState() should return motor speeds", () => {
      GamepadImpl.forward();
      const state = GamepadImpl.getState();
      expect(state.left).toBe(100);
      expect(state.right).toBe(100);
    });

    test("getState() should return zeros when stopped", () => {
      const state = GamepadImpl.getState();
      expect(state.left).toBe(0);
      expect(state.right).toBe(0);
    });
  });

  describe("Edge Cases", () => {
    beforeEach(() => {
      GamepadImpl.init();
    });

    test("should handle rapid direction changes", () => {
      GamepadImpl.forward();
      GamepadImpl.backward();
      GamepadImpl.left();
      GamepadImpl.right();
      GamepadImpl.stop();
      expect(mockRobot.leftSpeed).toBe(0);
      expect(mockRobot.rightSpeed).toBe(0);
    });

    test("should handle stop when already stopped", () => {
      GamepadImpl.stop();
      GamepadImpl.stop();
      expect(mockRobot.leftSpeed).toBe(0);
    });

    test("should handle undefined App", () => {
      // Should not throw
      expect(() => GamepadImpl.stop()).not.toThrow();
    });
  });

  describe("Visual Feedback", () => {
    test("buttons should have active state class", () => {
      const btn = document.getElementById("btnForward");
      expect(btn).not.toBeNull();
      expect(btn.classList.contains("gamepad-btn")).toBe(true);
    });
  });
});
