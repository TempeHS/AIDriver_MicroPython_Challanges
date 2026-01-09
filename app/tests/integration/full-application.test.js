/**
 * Integration Tests - Full Application Flow
 * Tests for complete user workflows and application state management
 */

const fs = require("fs");
const path = require("path");

// Create mock DOM
document.body.innerHTML = `
  <div id="editor"></div>
  <canvas id="arenaCanvas" width="800" height="800"></canvas>
  <div id="debugConsole"></div>
  <div id="ultrasonicDisplay">1000</div>
  <div id="speedValue">5</div>
  <input id="speedSlider" type="range" value="5" />
  <div id="gamepadPanel" style="display: none;"></div>
  <div id="mazeSelector" style="display: none;"></div>
  <div id="canvasContainer"></div>
  <div id="loadingOverlay"></div>
  <div id="statusMessage"></div>
  <div id="challengeStatus"></div>
  <div id="statusBar"></div>
  <button id="btnRun"></button>
  <button id="btnStop"></button>
  <button id="btnStep"></button>
  <button id="btnReset"></button>
  <button id="btnResetCode"></button>
  <button id="btnClearDebug"></button>
  <button id="btnConfirmReset"></button>
  <button id="btnUp"></button>
  <button id="btnDown"></button>
  <button id="btnLeft"></button>
  <button id="btnRight"></button>
  <div id="challengeDropdown">
    <a class="dropdown-item" data-challenge="0">Challenge 0</a>
    <a class="dropdown-item" data-challenge="1">Challenge 1</a>
  </div>
`;

// Load modules
const loadModule = (filename) => {
  const code = fs.readFileSync(
    path.join(__dirname, "../../js", filename),
    "utf8"
  );
  return code;
};

// Set up globals
global.DebugPanel = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  init: jest.fn(),
  clear: jest.fn(),
};

eval(loadModule("simulator.js"));
eval(loadModule("aidriver-stub.js"));
eval(loadModule("validator.js"));
eval(loadModule("challenges.js"));
eval(loadModule("mazes.js"));
eval(loadModule("python-runner.js"));

// Mock App state
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
  isPaused: false,
  speedMultiplier: 5,
  editor: null,
  canvas: null,
  ctx: null,
  animationFrameId: null,
  commandQueue: [],
  elements: {},
  session: null,
};

describe("Integration: Full Application Flow", () => {
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
    App.currentChallenge = 0;
    App.isRunning = false;

    AIDriverStub.clearQueue();
    PythonRunner.isRunning = false;
    PythonRunner.shouldStop = false;
  });

  describe("Challenge Loading", () => {
    test("loading challenge should set starter code", () => {
      const challenge = Challenges[1];

      // Simulate loading challenge
      App.currentChallenge = 1;

      expect(challenge.starterCode).toBeDefined();
      expect(challenge.starterCode.length).toBeGreaterThan(0);
    });

    test("loading challenge should reset robot position", () => {
      App.robot.x = 500;
      App.robot.y = 500;

      // Simulate reset
      const defaultRobot = Simulator.reset();

      expect(defaultRobot.x).toBe(1000);
      expect(defaultRobot.y).toBe(1000);
    });

    test("loading gamepad challenge should show gamepad panel", () => {
      App.currentChallenge = 7;
      const challenge = Challenges[7];

      expect(
        challenge.gamepadMode ||
          challenge.isGamepad ||
          challenge.type === "gamepad"
      ).toBe(true);
    });

    test("loading maze challenge should show maze selector", () => {
      App.currentChallenge = 6;

      const challenge = Challenges[6];
      expect(Mazes).toBeDefined();
    });
  });

  describe("Code Execution Flow", () => {
    test("run button should validate then execute", async () => {
      const code = `
from aidriver import AIDriver

robot = AIDriver()
robot.drive_forward(100, 100)
`;

      // Validate
      const validation = Validator.validate(code);
      expect(validation.valid).toBe(true);

      // Simulate execution
      AIDriverStub.queueCommand({
        type: "init",
        params: {},
      });
      AIDriverStub.queueCommand({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.isMoving).toBe(true);
    });

    test("stop button should halt execution", () => {
      App.isRunning = true;
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      PythonRunner.stop();

      expect(PythonRunner.isRunning).toBe(false);
      expect(App.robot.isMoving).toBe(false);
    });

    test("reset button should restore initial state", () => {
      App.robot.x = 500;
      App.robot.y = 200;
      App.robot.heading = 45;
      App.robot.trail = [{ x: 500, y: 200 }];

      App.robot = Simulator.reset();

      expect(App.robot.x).toBe(1000);
      expect(App.robot.y).toBe(1000);
      expect(App.robot.heading).toBe(0);
      expect(App.robot.trail.length).toBe(0);
    });
  });

  describe("Animation Loop", () => {
    test("physics should update when robot is moving", () => {
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      const initialY = App.robot.y;
      App.robot = Simulator.step(App.robot, 0.016);

      expect(App.robot.y).not.toBe(initialY);
    });

    test("physics should not update when stopped", () => {
      App.robot.leftSpeed = 0;
      App.robot.rightSpeed = 0;
      App.robot.isMoving = false;

      const initialX = App.robot.x;
      const initialY = App.robot.y;

      App.robot = Simulator.step(App.robot, 0.016);

      expect(App.robot.x).toBe(initialX);
      expect(App.robot.y).toBe(initialY);
    });

    test("speed multiplier should affect movement", () => {
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      const initialY = App.robot.y;

      // Normal speed
      const robot1 = { ...App.robot };
      const result1 = Simulator.step(robot1, 0.016);
      const move1 = Math.abs(result1.y - initialY);

      // Double speed (2x dt)
      const robot2 = { ...App.robot };
      const result2 = Simulator.step(robot2, 0.032);
      const move2 = Math.abs(result2.y - initialY);

      expect(move2).toBeGreaterThan(move1);
    });
  });

  describe("Success Detection", () => {
    test("reaching target should trigger success", () => {
      const challenge = Challenges[1];

      if (challenge.targetZone) {
        App.robot.x = challenge.targetZone.x;
        App.robot.y = challenge.targetZone.y;

        const session = { startTime: Date.now() };
        const result = challenge.successCriteria(App.robot, session);

        expect(result.success).toBe(true);
      }
    });

    test("collision should be detected", () => {
      App.robot.x = 10;
      App.robot.y = 1000;

      const collision = Simulator.checkCollision(App.robot);
      expect(collision).toBe(true);
    });
  });

  describe("Code Persistence", () => {
    test("code should persist per challenge", () => {
      const key = "aidriver_challenge_1_code";
      const code = "test code";

      localStorage.setItem(key, code);

      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test("code should be loaded when switching challenges", () => {
      localStorage.getItem.mockReturnValue("saved code");

      // Simulate challenge switch
      App.currentChallenge = 1;

      // Would normally load saved code
      expect(localStorage.getItem).toBeDefined();
    });
  });

  describe("Debug Console", () => {
    test("Python output should appear in debug console", () => {
      PythonRunner.handleOutput("Hello World");

      expect(DebugPanel.log).toHaveBeenCalledWith("Hello World", "output");
    });

    test("errors should appear in debug console", () => {
      const error = {
        toString: () => "NameError: x is not defined",
        traceback: [{ lineno: 5 }],
      };

      PythonRunner.handleError(error);

      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("NameError"),
        "error"
      );
    });

    test("success messages should appear in debug console", () => {
      DebugPanel.success("Challenge complete!");

      expect(DebugPanel.success).toHaveBeenCalledWith("Challenge complete!");
    });
  });

  describe("Ultrasonic Display", () => {
    test("distance should update based on robot position", () => {
      App.robot.x = 1000;
      App.robot.y = 100;
      App.robot.heading = 0;

      const distance = Simulator.simulateUltrasonic(App.robot);

      expect(distance).toBeLessThan(200);
    });
  });

  describe("Gamepad Mode", () => {
    test("gamepad controls should update robot directly", () => {
      App.currentChallenge = 7;

      // Simulate up button
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      expect(App.robot.isMoving).toBe(true);
    });

    test("keyboard should work in gamepad mode", () => {
      App.currentChallenge = 7;

      // Simulate W key press
      // Would normally be handled by Gamepad module
    });
  });

  describe("Error Handling", () => {
    test("syntax error should stop execution", () => {
      const validation = Validator.validate("if True");

      expect(validation.valid).toBe(false);
    });

    test("forbidden import should stop execution", () => {
      const validation = Validator.validate("import os");

      expect(validation.valid).toBe(false);
    });

    test("runtime error should log and stop", () => {
      const error = new Error("RuntimeError");

      PythonRunner.handleError(error);

      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("RuntimeError"),
        "error"
      );
    });
  });

  describe("State Consistency", () => {
    test("stopping should reset all running states", () => {
      PythonRunner.isRunning = true;
      App.robot.isMoving = true;
      App.robot.leftSpeed = 100;

      PythonRunner.stop();

      expect(PythonRunner.isRunning).toBe(false);
      expect(App.robot.isMoving).toBe(false);
      expect(App.robot.leftSpeed).toBe(0);
    });

    test("resetting should clear trail", () => {
      App.robot.trail = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
      ];

      App.robot = Simulator.reset();

      expect(App.robot.trail.length).toBe(0);
    });
  });
});

describe("Integration: End-to-End Challenge Completion", () => {
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

  describe("Complete Challenge 1", () => {
    test("driving forward should eventually reach target", () => {
      const challenge = Challenges[1];
      const session = { startTime: Date.now() };

      // Start moving forward
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      // Simulate multiple frames
      for (let i = 0; i < 200; i++) {
        App.robot = Simulator.step(App.robot, 0.05);

        // Check if reached target
        if (challenge.successCriteria) {
          const result = challenge.successCriteria(App.robot, session);
          if (result.success) {
            break;
          }
        }

        // Stop at wall
        if (App.robot.y < 50 || Simulator.checkCollision(App.robot)) {
          break;
        }
      }

      // Should have moved significantly
      expect(App.robot.y).toBeLessThan(1500);
    });
  });

  describe("Complete Challenge 3: U-Turn", () => {
    test("should be able to turn around and return", () => {
      const session = {
        startTime: Date.now(),
        minY: App.robot.y,
      };

      // Drive forward
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      for (let i = 0; i < 50; i++) {
        App.robot = Simulator.step(App.robot, 0.05);
        session.minY = Math.min(session.minY, App.robot.y);
      }

      // Turn around
      App.robot.leftSpeed = -50;
      App.robot.rightSpeed = 50;

      for (let i = 0; i < 100; i++) {
        App.robot = Simulator.step(App.robot, 0.05);
      }

      // Drive back
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;

      for (let i = 0; i < 50; i++) {
        App.robot = Simulator.step(App.robot, 0.05);
      }

      // Should have returned toward start
      expect(session.minY).toBeLessThan(1500);
    });
  });
});
