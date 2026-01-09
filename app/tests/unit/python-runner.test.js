/**
 * Python Runner Unit Tests
 * Tests for Skulpt execution, command processing, and error handling
 */

const fs = require("fs");
const path = require("path");

// Set up mocks before loading
global.DebugPanel = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
};

global.Validator = {
  validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
};

global.Editor = {
  markError: jest.fn(),
  clearErrors: jest.fn(),
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
};

// Mock AIDriverStub
global.AIDriverStub = {
  clearQueue: jest.fn(),
  hasCommands: jest.fn().mockReturnValue(false),
  getNextCommand: jest.fn(),
  getModule: jest.fn().mockReturnValue(() => ({})),
  DEBUG_AIDRIVER: false,
};

// Load the PythonRunner module
const runnerCode = fs.readFileSync(
  path.join(__dirname, "../../js/python-runner.js"),
  "utf8"
);
eval(runnerCode);

describe("PythonRunner", () => {
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

    PythonRunner.isRunning = false;
    PythonRunner.shouldStop = false;
    PythonRunner.stepMode = false;
  });

  describe("Initialization", () => {
    test("should have required methods", () => {
      expect(typeof PythonRunner.init).toBe("function");
      expect(typeof PythonRunner.run).toBe("function");
      expect(typeof PythonRunner.stop).toBe("function");
    });

    test("should initialize without errors", () => {
      expect(() => PythonRunner.init()).not.toThrow();
    });

    test("should configure Skulpt on init", () => {
      PythonRunner.init();
      expect(Sk.configure).toHaveBeenCalled();
    });

    test("should register aidriver module", () => {
      PythonRunner.init();
      expect(Sk.builtinFiles.files["src/lib/aidriver.py"]).toBeDefined();
    });
  });

  describe("run() - Code Execution", () => {
    test("should validate code before running", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      await PythonRunner.run("from aidriver import AIDriver");

      expect(Validator.validate).toHaveBeenCalled();
    });

    test("should not run if validation fails", async () => {
      Validator.validate.mockReturnValue({
        valid: false,
        errors: [{ line: 1, message: "Invalid import" }],
      });

      await expect(PythonRunner.run("import os")).rejects.toThrow();
    });

    test("should set isRunning flag", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      const runPromise = PythonRunner.run("x = 1");

      expect(PythonRunner.isRunning).toBe(true);

      await runPromise;
    });

    test("should clear command queue before running", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      await PythonRunner.run("x = 1");

      expect(AIDriverStub.clearQueue).toHaveBeenCalled();
    });

    test("should log execution start", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      await PythonRunner.run("x = 1");

      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("Starting"),
        expect.any(String)
      );
    });

    test("should log execution completion", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      await PythonRunner.run("x = 1");

      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("completed"),
        expect.any(String)
      );
    });

    test("should not run if already running", async () => {
      PythonRunner.isRunning = true;

      await PythonRunner.run("x = 1");

      // Should return early without errors
    });
  });

  describe("stop() - Execution Control", () => {
    test("should set shouldStop flag", () => {
      PythonRunner.stop();
      expect(PythonRunner.shouldStop).toBe(true);
    });

    test("should set isRunning to false", () => {
      PythonRunner.isRunning = true;
      PythonRunner.stop();
      expect(PythonRunner.isRunning).toBe(false);
    });

    test("should clear command queue", () => {
      PythonRunner.stop();
      expect(AIDriverStub.clearQueue).toHaveBeenCalled();
    });

    test("should stop robot movement", () => {
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      PythonRunner.stop();

      expect(App.robot.leftSpeed).toBe(0);
      expect(App.robot.rightSpeed).toBe(0);
      expect(App.robot.isMoving).toBe(false);
    });

    test("should log stop message", () => {
      PythonRunner.stop();
      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("stopped"),
        expect.any(String)
      );
    });

    test("should reset step mode", () => {
      PythonRunner.stepMode = true;
      PythonRunner.stop();
      expect(PythonRunner.stepMode).toBe(false);
    });
  });

  describe("processCommandQueue()", () => {
    beforeEach(() => {
      AIDriverStub.hasCommands.mockReturnValue(false);
    });

    test("should process drive_forward command", () => {
      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      AIDriverStub.getNextCommand.mockReturnValue({
        type: "drive_forward",
        params: { leftSpeed: 100, rightSpeed: 100 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(100);
      expect(App.robot.rightSpeed).toBe(100);
      expect(App.robot.isMoving).toBe(true);
    });

    test("should process drive_backward command", () => {
      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      AIDriverStub.getNextCommand.mockReturnValue({
        type: "drive_backward",
        params: { leftSpeed: 80, rightSpeed: 80 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(-80);
      expect(App.robot.rightSpeed).toBe(-80);
      expect(App.robot.isMoving).toBe(true);
    });

    test("should process rotate_left command", () => {
      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      AIDriverStub.getNextCommand.mockReturnValue({
        type: "rotate_left",
        params: { turnSpeed: 50 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(-50);
      expect(App.robot.rightSpeed).toBe(50);
      expect(App.robot.isMoving).toBe(true);
    });

    test("should process rotate_right command", () => {
      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      AIDriverStub.getNextCommand.mockReturnValue({
        type: "rotate_right",
        params: { turnSpeed: 50 },
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(50);
      expect(App.robot.rightSpeed).toBe(-50);
      expect(App.robot.isMoving).toBe(true);
    });

    test("should process brake command", () => {
      App.robot.leftSpeed = 100;
      App.robot.rightSpeed = 100;
      App.robot.isMoving = true;

      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      AIDriverStub.getNextCommand.mockReturnValue({
        type: "brake",
        params: {},
      });

      PythonRunner.processCommandQueue();

      expect(App.robot.leftSpeed).toBe(0);
      expect(App.robot.rightSpeed).toBe(0);
      expect(App.robot.isMoving).toBe(false);
    });

    test("should process init command", () => {
      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      AIDriverStub.getNextCommand.mockReturnValue({
        type: "init",
        params: {},
      });

      PythonRunner.processCommandQueue();

      expect(DebugPanel.info).toHaveBeenCalled();
    });

    test("should process multiple commands in sequence", () => {
      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      AIDriverStub.getNextCommand
        .mockReturnValueOnce({
          type: "drive_forward",
          params: { leftSpeed: 100, rightSpeed: 100 },
        })
        .mockReturnValueOnce({
          type: "brake",
          params: {},
        });

      PythonRunner.processCommandQueue();

      // Final state should be braked
      expect(App.robot.leftSpeed).toBe(0);
      expect(App.robot.rightSpeed).toBe(0);
      expect(App.robot.isMoving).toBe(false);
    });

    test("should handle unknown command type", () => {
      AIDriverStub.hasCommands
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      AIDriverStub.getNextCommand.mockReturnValue({
        type: "unknown_command",
        params: {},
      });

      expect(() => PythonRunner.processCommandQueue()).not.toThrow();
    });
  });

  describe("handleOutput()", () => {
    test("should log Python output", () => {
      PythonRunner.handleOutput("Hello from Python");
      expect(DebugPanel.log).toHaveBeenCalledWith(
        "Hello from Python",
        "output"
      );
    });

    test("should trim trailing whitespace", () => {
      PythonRunner.handleOutput("Message with newline\n");
      expect(DebugPanel.log).toHaveBeenCalledWith(
        "Message with newline",
        "output"
      );
    });

    test("should handle empty output", () => {
      expect(() => PythonRunner.handleOutput("")).not.toThrow();
    });
  });

  describe("handleRead()", () => {
    test("should return aidriver module source", () => {
      const source = PythonRunner.handleRead("src/lib/aidriver.py");
      expect(source).toContain("AIDriver");
    });

    test("should return source for ./aidriver.py", () => {
      const source = PythonRunner.handleRead("./aidriver.py");
      expect(source).toContain("AIDriver");
    });

    test("should throw for unknown module", () => {
      expect(() => PythonRunner.handleRead("unknown_module.py")).toThrow();
    });

    test("should check builtin files", () => {
      Sk.builtinFiles.files["test.py"] = "test content";
      const source = PythonRunner.handleRead("test.py");
      expect(source).toBe("test content");
    });
  });

  describe("handleInput()", () => {
    test("should throw error", () => {
      expect(() => PythonRunner.handleInput("Enter value:")).toThrow();
    });

    test("should log error message", () => {
      try {
        PythonRunner.handleInput("prompt");
      } catch (e) {
        // Expected
      }
      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("not supported"),
        "error"
      );
    });
  });

  describe("handleError()", () => {
    test("should log error message", () => {
      const error = new Error("Test error");
      PythonRunner.handleError(error);

      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("Test error"),
        "error"
      );
    });

    test("should extract line number from traceback", () => {
      const error = {
        traceback: [{ lineno: 5 }],
        toString: () => "SyntaxError",
      };

      PythonRunner.handleError(error);

      expect(DebugPanel.log).toHaveBeenCalledWith(
        expect.stringContaining("Line 5"),
        "error"
      );
    });

    test("should mark error in editor", () => {
      const error = {
        traceback: [{ lineno: 10 }],
        toString: () => "NameError: x is not defined",
      };

      PythonRunner.handleError(error);

      expect(Editor.markError).toHaveBeenCalledWith(
        10,
        expect.stringContaining("NameError")
      );
    });

    test("should ignore KeyboardInterrupt", () => {
      const error = new Sk.builtin.KeyboardInterrupt("Stopped");

      PythonRunner.handleError(error);

      // Should not log error
      expect(DebugPanel.log).not.toHaveBeenCalledWith(
        expect.stringContaining("KeyboardInterrupt"),
        "error"
      );
    });
  });

  describe("validateSyntax()", () => {
    test("should return valid for correct syntax", () => {
      Sk.compile.mockImplementation(() => ({}));

      const result = PythonRunner.validateSyntax("x = 1");
      expect(result.valid).toBe(true);
    });

    test("should return invalid for syntax error", () => {
      Sk.compile.mockImplementation(() => {
        throw new Error("SyntaxError");
      });

      const result = PythonRunner.validateSyntax("x = ");
      expect(result.valid).toBe(false);
    });

    test("should extract line number from error", () => {
      const error = {
        traceback: [{ lineno: 3 }],
        toString: () => "SyntaxError",
      };
      Sk.compile.mockImplementation(() => {
        throw error;
      });

      const result = PythonRunner.validateSyntax("invalid");
      expect(result.line).toBe(3);
    });
  });

  describe("Step Mode", () => {
    test("should have runStep method", () => {
      expect(typeof PythonRunner.runStep).toBe("function");
    });

    test("should set stepMode flag", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      const promise = PythonRunner.runStep("x = 1");
      expect(PythonRunner.stepMode).toBe(true);

      await promise;
    });

    test("should have step method", () => {
      expect(typeof PythonRunner.step).toBe("function");
    });
  });

  describe("DEBUG_AIDRIVER Flag", () => {
    test("should detect DEBUG_AIDRIVER in code", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      await PythonRunner.run(
        "DEBUG_AIDRIVER = True\nfrom aidriver import AIDriver"
      );

      expect(AIDriverStub.DEBUG_AIDRIVER).toBe(true);
    });

    test("should not set DEBUG_AIDRIVER if not in code", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });
      AIDriverStub.DEBUG_AIDRIVER = false;

      await PythonRunner.run("from aidriver import AIDriver");

      expect(AIDriverStub.DEBUG_AIDRIVER).toBe(false);
    });
  });

  describe("Skulpt Configuration", () => {
    test("should set yieldLimit for async execution", async () => {
      Validator.validate.mockReturnValue({ valid: true, errors: [] });

      await PythonRunner.run("x = 1");

      expect(Sk.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          yieldLimit: expect.any(Number),
        })
      );
    });

    test("should enable Python 3 mode", () => {
      PythonRunner.init();

      expect(Sk.configure).toHaveBeenCalledWith(
        expect.objectContaining({
          __future__: Sk.python3,
        })
      );
    });
  });

  describe("Edge Cases", () => {
    test("should handle undefined App", () => {
      const originalApp = global.App;
      global.App = undefined;

      expect(() => PythonRunner.processCommandQueue()).not.toThrow();

      global.App = originalApp;
    });

    test("should handle null robot", () => {
      App.robot = null;

      expect(() => PythonRunner.processCommandQueue()).not.toThrow();

      App.robot = { leftSpeed: 0, rightSpeed: 0, isMoving: false };
    });

    test("should handle concurrent stop calls", () => {
      PythonRunner.stop();
      PythonRunner.stop();
      PythonRunner.stop();

      expect(PythonRunner.isRunning).toBe(false);
    });
  });
});
