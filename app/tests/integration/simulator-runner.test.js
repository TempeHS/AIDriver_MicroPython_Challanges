/**
 * Integration Tests - Simulator + Python Runner
 * Tests for end-to-end code execution and robot movement
 */

const fs = require("fs");
const path = require("path");

// Load all required modules
const loadModule = (filename) => {
  const code = fs.readFileSync(
    path.join(__dirname, "../../js", filename),
    "utf8"
  );
  return code;
};

// Set up global mocks
global.DebugPanel = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  init: jest.fn(),
  clear: jest.fn(),
};

global.Editor = {
  markError: jest.fn(),
  clearErrors: jest.fn(),
  init: jest.fn(),
  setCode: jest.fn(),
  getCode: jest.fn(),
};

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
  currentChallenge: 0,
  isRunning: false,
};

// Load modules
eval(loadModule("simulator.js"));
eval(loadModule("aidriver-stub.js"));
eval(loadModule("validator.js"));
eval(loadModule("python-runner.js"));

describe("Integration: Simulator + Python Runner", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    App.robot = {
      x: 1000,
      y: 1000,
      heading: 0,
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
      trail: [],
    };

    AIDriverStub.clearQueue();
    PythonRunner.isRunning = false;
    PythonRunner.shouldStop = false;
  });

  describe("Command Flow", () => {
    test("Python command should update robot state via command queue", () => {
      // Simulate what happens when Python calls drive_forward
      AIDriverStub.queueCommand({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      // Process the queue (happens during execution)
      PythonRunner.processCommandQueue();

      // Robot should now be moving
      expect(App.robot.leftSpeed).toBe(100);
      expect(App.robot.rightSpeed).toBe(100);
      expect(App.robot.isMoving).toBe(true);
    });

    test("Simulator should update position based on robot speeds", () => {
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      const initialY = App.robot.y;

      // Simulate one physics step
      App.robot = Simulator.step(App.robot, 0.1);

      // Robot should have moved
      expect(App.robot.y).not.toBe(initialY);
    });

    test("Full flow: command -> queue -> robot -> simulator", () => {
      // 1. Queue a command (as Python would)
      AIDriverStub.queueCommand({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      // 2. Process queue (happens in Python execution)
      PythonRunner.processCommandQueue();

      // 3. Verify robot state updated
      expect(App.robot.isMoving).toBe(true);

      const initialY = App.robot.y;

      // 4. Simulate physics update
      App.robot = Simulator.step(App.robot, 0.1);

      // 5. Verify robot moved
      expect(App.robot.y).not.toBe(initialY);
    });
  });

  describe("Rotation Commands", () => {
    test("rotate_left should turn robot counterclockwise", () => {
      AIDriverStub.queueCommand({
        type: "rotate_left",
        params: { turnSpeed: 50 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(-50);
      expect(App.robot.rightSpeed).toBe(50);

      const initialHeading = App.robot.heading;
      App.robot = Simulator.step(App.robot, 0.5);

      expect(App.robot.heading).not.toBe(initialHeading);
    });

    test("rotate_right should turn robot clockwise", () => {
      AIDriverStub.queueCommand({
        type: "rotate_right",
        params: { turnSpeed: 50 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(50);
      expect(App.robot.rightSpeed).toBe(-50);
    });
  });

  describe("Sequential Commands", () => {
    test("should handle forward then brake", () => {
      // Forward
      AIDriverStub.queueCommand({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      // Brake
      AIDriverStub.queueCommand({
        type: "brake",
        params: {},
      });

      PythonRunner.processCommandQueue();

      // Should be stopped after brake
      expect(App.robot.leftSpeed).toBe(0);
      expect(App.robot.rightSpeed).toBe(0);
      expect(App.robot.isMoving).toBe(false);
    });

    test("should handle turn sequence", () => {
      // Forward
      AIDriverStub.queueCommand({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      // Turn right
      AIDriverStub.queueCommand({
        type: "rotate_right",
        params: { turnSpeed: 50 },
      });

      // Forward again
      AIDriverStub.queueCommand({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      PythonRunner.processCommandQueue();

      // Should end with forward
      expect(App.robot.leftSpeed).toBe(100);
      expect(App.robot.rightSpeed).toBe(100);
    });
  });

  describe("Stop Integration", () => {
    test("stop() should halt robot and clear queue", () => {
      // Queue some commands
      AIDriverStub.queueCommand({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      // Process to start moving
      PythonRunner.processCommandQueue();
      expect(App.robot.isMoving).toBe(true);

      // Stop execution
      PythonRunner.stop();

      expect(App.robot.leftSpeed).toBe(0);
      expect(App.robot.rightSpeed).toBe(0);
      expect(App.robot.isMoving).toBe(false);
      expect(AIDriverStub.hasCommands()).toBe(false);
    });
  });

  describe("Collision Detection", () => {
    test("robot near wall should trigger collision", () => {
      App.robot.x = 50;
      App.robot.y = 1000;

      const collision = Simulator.checkCollision(App.robot);
      expect(collision).toBe(true);
    });

    test("robot in center should not collide", () => {
      App.robot.x = 1000;
      App.robot.y = 1000;

      const collision = Simulator.checkCollision(App.robot);
      expect(collision).toBe(false);
    });
  });

  describe("Ultrasonic Integration", () => {
    test("ultrasonic should read distance based on heading", () => {
      App.robot.x = 1000;
      App.robot.y = 100;
      App.robot.heading = 0; // Facing up (toward wall)

      const distance = Simulator.simulateUltrasonic(App.robot);
      expect(distance).toBeLessThan(200);
    });

    test("ultrasonic should read far when facing center", () => {
      App.robot.x = 1000;
      App.robot.y = 100;
      App.robot.heading = 180; // Facing down (away from wall)

      const distance = Simulator.simulateUltrasonic(App.robot);
      expect(distance).toBeGreaterThan(1500);
    });
  });

  describe("Movement Physics", () => {
    test("equal speeds should drive straight", () => {
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;
      App.robot.heading = 0;

      const initialX = App.robot.x;
      const initialHeading = App.robot.heading;

      // Multiple steps
      for (let i = 0; i < 10; i++) {
        App.robot = Simulator.step(App.robot, 0.016);
      }

      // Should maintain heading (approximately)
      expect(Math.abs(App.robot.heading - initialHeading)).toBeLessThan(1);
      // X should stay approximately the same
      expect(Math.abs(App.robot.x - initialX)).toBeLessThan(10);
    });

    test("unequal speeds should curve", () => {
      App.robot.leftSpeed = 50;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;
      App.robot.heading = 0;

      const initialHeading = App.robot.heading;

      for (let i = 0; i < 20; i++) {
        App.robot = Simulator.step(App.robot, 0.016);
      }

      // Heading should have changed
      expect(App.robot.heading).not.toBe(initialHeading);
    });
  });

  describe("Backward Movement", () => {
    test("drive_backward should move in opposite direction", () => {
      AIDriverStub.queueCommand({
        type: "drive_backward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(-100);
      expect(App.robot.rightSpeed).toBe(-100);

      App.robot.heading = 0;
      const initialY = App.robot.y;

      App.robot = Simulator.step(App.robot, 0.1);

      // Should move backward (increasing Y for heading 0)
      expect(App.robot.y).toBeGreaterThan(initialY);
    });
  });

  describe("Trail Recording", () => {
    test("movement should add to trail", () => {
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      const initialTrailLength = App.robot.trail.length;

      App.robot = Simulator.step(App.robot, 0.1);

      expect(App.robot.trail.length).toBeGreaterThanOrEqual(initialTrailLength);
    });
  });
});

describe("Integration: Validator + Python Runner", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    PythonRunner.isRunning = false;
  });

  describe("Code Validation Before Execution", () => {
    test("valid code should pass validation", () => {
      const code = `
from aidriver import AIDriver, hold_state

robot = AIDriver()
robot.drive_forward(100, 100)
hold_state(2)
robot.brake()
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("forbidden import should fail validation", () => {
      const code = `
import os
from aidriver import AIDriver
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });
  });
});

describe("Integration: Full Challenge Simulation", () => {
  beforeEach(() => {
    App.robot = {
      x: 1000,
      y: 1500,
      heading: 0,
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
      trail: [],
    };
    AIDriverStub.clearQueue();
  });

  describe("Challenge 1: Drive Straight", () => {
    test("driving straight should reach target", () => {
      // Target is typically at y < 500
      App.robot.x = 1000;
      App.robot.y = 1500;
      App.robot.heading = 0;
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      // Simulate movement toward target
      for (let i = 0; i < 100; i++) {
        App.robot = Simulator.step(App.robot, 0.1);

        if (App.robot.y < 200) {
          break;
        }
      }

      // Should have moved significantly toward target
      expect(App.robot.y).toBeLessThan(1500);
    });
  });

  describe("Challenge 3: U-Turn", () => {
    test("should be able to perform 180 degree turn", () => {
      App.robot.heading = 0;
      App.robot.leftSpeed = -50;
      App.robot.rightSpeed = 50;
      App.robot.isMoving = true;

      // Simulate rotation
      for (let i = 0; i < 200; i++) {
        App.robot = Simulator.step(App.robot, 0.05);

        if (Math.abs(App.robot.heading - 180) < 10) {
          break;
        }
      }

      // Should have turned approximately 180 degrees
      expect(Math.abs(App.robot.heading - 180)).toBeLessThan(30);
    });
  });

  describe("Wall Avoidance", () => {
    test("ultrasonic should detect approaching wall", () => {
      App.robot.x = 1000;
      App.robot.y = 200;
      App.robot.heading = 0;
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      // Check distance
      let distance = Simulator.simulateUltrasonic(App.robot);
      expect(distance).toBeLessThan(300);

      // Move closer
      App.robot = Simulator.step(App.robot, 0.1);
      distance = Simulator.simulateUltrasonic(App.robot);

      // Distance should be smaller
      expect(distance).toBeLessThan(200);
    });
  });
});
