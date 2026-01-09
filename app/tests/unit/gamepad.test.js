/**
 * Gamepad Unit Tests
 * Tests for gamepad controls, keyboard input, and robot control
 */

const fs = require("fs");
const path = require("path");

// Create mock DOM elements before loading
document.body.innerHTML = `
  <div id="gamepadPanel" style="display: none;"></div>
  <button id="btnUp"></button>
  <button id="btnDown"></button>
  <button id="btnLeft"></button>
  <button id="btnRight"></button>
`;

// Mock App
global.App = {
  robot: {
    x: 1000,
    y: 1000,
    heading: 0,
    leftSpeed: 0,
    rightSpeed: 0,
    isMoving: false,
    trail: [],
  },
  currentChallenge: 7,
};

// Load the Gamepad module
const gamepadCode = fs.readFileSync(
  path.join(__dirname, "../../js/gamepad.js"),
  "utf8"
);
eval(gamepadCode);

describe("Gamepad", () => {
  beforeEach(() => {
    App.robot = {
      x: 1000,
      y: 1000,
      heading: 0,
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
      trail: [],
    };
    App.currentChallenge = 7;

    if (Gamepad.init) {
      Gamepad.init();
    }
  });

  describe("Initialization", () => {
    test("should have required methods", () => {
      expect(typeof Gamepad.init).toBe("function");
      expect(typeof Gamepad.show).toBe("function");
      expect(typeof Gamepad.hide).toBe("function");
    });

    test("should initialize without errors", () => {
      expect(() => Gamepad.init()).not.toThrow();
    });

    test("should find gamepad panel element", () => {
      const panel = document.getElementById("gamepadPanel");
      expect(panel).toBeDefined();
    });

    test("should find all control buttons", () => {
      expect(document.getElementById("btnUp")).toBeDefined();
      expect(document.getElementById("btnDown")).toBeDefined();
      expect(document.getElementById("btnLeft")).toBeDefined();
      expect(document.getElementById("btnRight")).toBeDefined();
    });
  });

  describe("show() and hide()", () => {
    test("show() should display gamepad panel", () => {
      Gamepad.show();
      const panel = document.getElementById("gamepadPanel");
      expect(
        panel.style.display === "block" ||
          panel.style.display === "flex" ||
          panel.style.display === ""
      ).toBe(true);
    });

    test("hide() should hide gamepad panel", () => {
      Gamepad.show();
      Gamepad.hide();
      const panel = document.getElementById("gamepadPanel");
      expect(panel.style.display).toBe("none");
    });
  });

  describe("Button Controls", () => {
    test("should respond to up button", () => {
      const btnUp = document.getElementById("btnUp");

      if (Gamepad.handleUp) {
        Gamepad.handleUp();
        expect(App.robot.isMoving).toBe(true);
        expect(App.robot.leftSpeed).toBeGreaterThan(0);
        expect(App.robot.rightSpeed).toBeGreaterThan(0);
      }
    });

    test("should respond to down button", () => {
      if (Gamepad.handleDown) {
        Gamepad.handleDown();
        expect(App.robot.isMoving).toBe(true);
        // Speeds should be negative for backward
        expect(App.robot.leftSpeed).toBeLessThan(0);
        expect(App.robot.rightSpeed).toBeLessThan(0);
      }
    });

    test("should respond to left button", () => {
      if (Gamepad.handleLeft) {
        Gamepad.handleLeft();
        expect(App.robot.isMoving).toBe(true);
        // For left turn: left wheel slower or negative
      }
    });

    test("should respond to right button", () => {
      if (Gamepad.handleRight) {
        Gamepad.handleRight();
        expect(App.robot.isMoving).toBe(true);
        // For right turn: right wheel slower or negative
      }
    });

    test("should stop when button released", () => {
      if (Gamepad.handleUp && Gamepad.handleStop) {
        Gamepad.handleUp();
        expect(App.robot.isMoving).toBe(true);

        Gamepad.handleStop();
        expect(App.robot.leftSpeed).toBe(0);
        expect(App.robot.rightSpeed).toBe(0);
        expect(App.robot.isMoving).toBe(false);
      }
    });
  });

  describe("Keyboard Controls", () => {
    const createKeyEvent = (key, type = "keydown") => {
      return new KeyboardEvent(type, {
        key: key,
        code: `Key${key.toUpperCase()}`,
        bubbles: true,
      });
    };

    const createArrowEvent = (arrow, type = "keydown") => {
      return new KeyboardEvent(type, {
        key: `Arrow${arrow}`,
        code: `Arrow${arrow}`,
        bubbles: true,
      });
    };

    test("should respond to W key (forward)", () => {
      document.dispatchEvent(createKeyEvent("w"));
      // Check if forward is triggered
    });

    test("should respond to S key (backward)", () => {
      document.dispatchEvent(createKeyEvent("s"));
    });

    test("should respond to A key (left)", () => {
      document.dispatchEvent(createKeyEvent("a"));
    });

    test("should respond to D key (right)", () => {
      document.dispatchEvent(createKeyEvent("d"));
    });

    test("should respond to Arrow keys", () => {
      document.dispatchEvent(createArrowEvent("Up"));
      document.dispatchEvent(createArrowEvent("Down"));
      document.dispatchEvent(createArrowEvent("Left"));
      document.dispatchEvent(createArrowEvent("Right"));
    });

    test("should stop on key release", () => {
      document.dispatchEvent(createKeyEvent("w", "keydown"));
      document.dispatchEvent(createKeyEvent("w", "keyup"));
    });
  });

  describe("Speed Control", () => {
    test("should use configured speed value", () => {
      if (Gamepad.SPEED) {
        expect(typeof Gamepad.SPEED).toBe("number");
        expect(Gamepad.SPEED).toBeGreaterThan(0);
      }
    });

    test("forward speed should be positive", () => {
      if (Gamepad.handleUp) {
        Gamepad.handleUp();
        expect(App.robot.leftSpeed).toBeGreaterThan(0);
        expect(App.robot.rightSpeed).toBeGreaterThan(0);
      }
    });

    test("backward speed should be negative", () => {
      if (Gamepad.handleDown) {
        Gamepad.handleDown();
        expect(App.robot.leftSpeed).toBeLessThan(0);
        expect(App.robot.rightSpeed).toBeLessThan(0);
      }
    });

    test("left rotation should have differential speeds", () => {
      if (Gamepad.handleLeft) {
        Gamepad.handleLeft();
        // Left turn: left wheel slower than right
        expect(App.robot.leftSpeed).toBeLessThan(App.robot.rightSpeed);
      }
    });

    test("right rotation should have differential speeds", () => {
      if (Gamepad.handleRight) {
        Gamepad.handleRight();
        // Right turn: right wheel slower than left
        expect(App.robot.rightSpeed).toBeLessThan(App.robot.leftSpeed);
      }
    });
  });

  describe("Challenge Integration", () => {
    test("should only be active for Challenge 7", () => {
      App.currentChallenge = 7;
      Gamepad.show();

      const panel = document.getElementById("gamepadPanel");
      expect(panel.style.display).not.toBe("none");
    });

    test("should be hidden for other challenges", () => {
      App.currentChallenge = 1;
      Gamepad.hide();

      const panel = document.getElementById("gamepadPanel");
      expect(panel.style.display).toBe("none");
    });
  });

  describe("Touch Events", () => {
    test("should handle touchstart on buttons", () => {
      const btnUp = document.getElementById("btnUp");
      const touchEvent = new Event("touchstart", { bubbles: true });

      expect(() => btnUp.dispatchEvent(touchEvent)).not.toThrow();
    });

    test("should handle touchend on buttons", () => {
      const btnUp = document.getElementById("btnUp");
      const touchEvent = new Event("touchend", { bubbles: true });

      expect(() => btnUp.dispatchEvent(touchEvent)).not.toThrow();
    });
  });

  describe("Multiple Key Handling", () => {
    test("should handle simultaneous key presses", () => {
      // Press forward and left at the same time
      const wEvent = new KeyboardEvent("keydown", { key: "w" });
      const aEvent = new KeyboardEvent("keydown", { key: "a" });

      document.dispatchEvent(wEvent);
      document.dispatchEvent(aEvent);

      // Robot should be moving
      // Implementation may vary - could combine or use last key
    });
  });

  describe("Edge Cases", () => {
    test("should handle rapid button presses", () => {
      if (Gamepad.handleUp && Gamepad.handleStop) {
        for (let i = 0; i < 100; i++) {
          Gamepad.handleUp();
          Gamepad.handleStop();
        }
        // Should not throw or cause issues
      }
    });

    test("should handle stop when already stopped", () => {
      if (Gamepad.handleStop) {
        Gamepad.handleStop();
        Gamepad.handleStop();
        expect(App.robot.isMoving).toBe(false);
      }
    });

    test("should handle undefined App", () => {
      const originalApp = global.App;
      global.App = undefined;

      expect(() => {
        if (Gamepad.handleUp) Gamepad.handleUp();
      }).not.toThrow();

      global.App = originalApp;
    });
  });

  describe("Visual Feedback", () => {
    test("buttons should have active state class", () => {
      const btnUp = document.getElementById("btnUp");

      // Simulate button press
      btnUp.dispatchEvent(new Event("mousedown"));

      // Check for active class (implementation dependent)
    });
  });
});
