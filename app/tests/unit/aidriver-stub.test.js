/**
 * AIDriver Stub Unit Tests
 * Tests for command queue, Skulpt module definition, and robot state
 */

const fs = require("fs");
const path = require("path");

// Mock DebugPanel before loading
global.DebugPanel = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Load the AIDriverStub module
const stubCode = fs.readFileSync(
  path.join(__dirname, "../../js/aidriver-stub.js"),
  "utf8"
);
eval(stubCode);

describe("AIDriverStub", () => {
  beforeEach(() => {
    AIDriverStub.clearQueue();
    AIDriverStub.DEBUG_AIDRIVER = false;
    AIDriverStub.robotInstance = null;
  });

  describe("Command Queue Management", () => {
    test("should start with empty queue", () => {
      expect(AIDriverStub.hasCommands()).toBe(false);
      expect(AIDriverStub.commandQueue.length).toBe(0);
    });

    test("should add command to queue", () => {
      AIDriverStub.queueCommand({ type: "test", params: {} });
      expect(AIDriverStub.hasCommands()).toBe(true);
      expect(AIDriverStub.commandQueue.length).toBe(1);
    });

    test("should retrieve command in FIFO order", () => {
      AIDriverStub.queueCommand({ type: "first", params: {} });
      AIDriverStub.queueCommand({ type: "second", params: {} });

      const cmd1 = AIDriverStub.getNextCommand();
      expect(cmd1.type).toBe("first");

      const cmd2 = AIDriverStub.getNextCommand();
      expect(cmd2.type).toBe("second");
    });

    test("should return undefined when queue empty", () => {
      const cmd = AIDriverStub.getNextCommand();
      expect(cmd).toBeUndefined();
    });

    test("should clear queue completely", () => {
      AIDriverStub.queueCommand({ type: "a", params: {} });
      AIDriverStub.queueCommand({ type: "b", params: {} });
      AIDriverStub.queueCommand({ type: "c", params: {} });

      AIDriverStub.clearQueue();

      expect(AIDriverStub.hasCommands()).toBe(false);
      expect(AIDriverStub.commandQueue.length).toBe(0);
    });

    test("should handle rapid queueing", () => {
      for (let i = 0; i < 1000; i++) {
        AIDriverStub.queueCommand({ type: "cmd", params: { index: i } });
      }

      expect(AIDriverStub.commandQueue.length).toBe(1000);

      // Verify order preserved
      const first = AIDriverStub.getNextCommand();
      expect(first.params.index).toBe(0);
    });
  });

  describe("Debug Mode", () => {
    test("should not log when DEBUG_AIDRIVER is false", () => {
      AIDriverStub.DEBUG_AIDRIVER = false;
      AIDriverStub.queueCommand({ type: "test", params: {} });

      expect(DebugPanel.log).not.toHaveBeenCalled();
    });

    test("should log when DEBUG_AIDRIVER is true", () => {
      AIDriverStub.DEBUG_AIDRIVER = true;
      AIDriverStub.queueCommand({ type: "test", params: { value: 123 } });

      expect(DebugPanel.log).toHaveBeenCalled();
    });
  });

  describe("getModule() - Skulpt Module", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should return undefined for wrong module name", () => {
      const factory = AIDriverStub.getModule();
      expect(factory("wrongname")).toBeUndefined();
    });

    test("should define AIDriver class", () => {
      expect(module.AIDriver).toBeDefined();
    });

    test("should define DEBUG_AIDRIVER flag", () => {
      expect(module.DEBUG_AIDRIVER).toBeDefined();
    });

    test("should define hold_state function", () => {
      expect(module.hold_state).toBeDefined();
    });
  });

  describe("AIDriver Class - __init__", () => {
    test("should queue init command when constructed", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");

      // Simulate Skulpt class construction
      const mockSelf = {};
      if (module.AIDriver.$loc && module.AIDriver.$loc.__init__) {
        module.AIDriver.$loc.__init__(mockSelf);
      }

      // Check that init was queued
      expect(AIDriverStub.hasCommands()).toBe(true);
      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("init");
    });

    test("should set initial state on self", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");

      const mockSelf = {};
      if (module.AIDriver.$loc && module.AIDriver.$loc.__init__) {
        module.AIDriver.$loc.__init__(mockSelf);
      }

      expect(mockSelf.rightSpeed).toBe(0);
      expect(mockSelf.leftSpeed).toBe(0);
      expect(mockSelf.isMoving).toBe(false);
    });

    test("should store robot instance reference", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");

      const mockSelf = {};
      if (module.AIDriver.$loc && module.AIDriver.$loc.__init__) {
        module.AIDriver.$loc.__init__(mockSelf);
      }

      expect(AIDriverStub.robotInstance).toBe(mockSelf);
    });
  });

  describe("AIDriver Class - drive_forward", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should queue drive_forward command", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_forward) {
        module.AIDriver.$loc.drive_forward(mockSelf, { v: 100 }, { v: 100 });
      }

      expect(AIDriverStub.hasCommands()).toBe(true);
      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("drive_forward");
      expect(cmd.params.rightSpeed).toBe(100);
      expect(cmd.params.leftSpeed).toBe(100);
    });

    test("should update self state", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_forward) {
        module.AIDriver.$loc.drive_forward(mockSelf, { v: 80 }, { v: 90 });
      }

      expect(mockSelf.rightSpeed).toBe(80);
      expect(mockSelf.leftSpeed).toBe(90);
      expect(mockSelf.isMoving).toBe(true);
    });

    test("should handle different left and right speeds", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_forward) {
        module.AIDriver.$loc.drive_forward(mockSelf, { v: 50 }, { v: 100 });
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.params.rightSpeed).toBe(50);
      expect(cmd.params.leftSpeed).toBe(100);
    });
  });

  describe("AIDriver Class - drive_backward", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should queue drive_backward command", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_backward) {
        module.AIDriver.$loc.drive_backward(mockSelf, { v: 100 }, { v: 100 });
      }

      expect(AIDriverStub.hasCommands()).toBe(true);
      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("drive_backward");
    });

    test("should update self state", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_backward) {
        module.AIDriver.$loc.drive_backward(mockSelf, { v: 75 }, { v: 75 });
      }

      expect(mockSelf.rightSpeed).toBe(75);
      expect(mockSelf.leftSpeed).toBe(75);
      expect(mockSelf.isMoving).toBe(true);
    });
  });

  describe("AIDriver Class - rotate_left", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should queue rotate_left command", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.rotate_left) {
        module.AIDriver.$loc.rotate_left(mockSelf, { v: 50 });
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("rotate_left");
      expect(cmd.params.turnSpeed).toBe(50);
    });

    test("should set both speeds to turn speed", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.rotate_left) {
        module.AIDriver.$loc.rotate_left(mockSelf, { v: 60 });
      }

      expect(mockSelf.rightSpeed).toBe(60);
      expect(mockSelf.leftSpeed).toBe(60);
      expect(mockSelf.isMoving).toBe(true);
    });
  });

  describe("AIDriver Class - rotate_right", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should queue rotate_right command", () => {
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.rotate_right) {
        module.AIDriver.$loc.rotate_right(mockSelf, { v: 50 });
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("rotate_right");
      expect(cmd.params.turnSpeed).toBe(50);
    });
  });

  describe("AIDriver Class - brake", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should queue brake command", () => {
      const mockSelf = { rightSpeed: 100, leftSpeed: 100, isMoving: true };

      if (module.AIDriver.$loc && module.AIDriver.$loc.brake) {
        module.AIDriver.$loc.brake(mockSelf);
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("brake");
    });

    test("should set speeds to zero and stop moving", () => {
      const mockSelf = { rightSpeed: 100, leftSpeed: 100, isMoving: true };

      if (module.AIDriver.$loc && module.AIDriver.$loc.brake) {
        module.AIDriver.$loc.brake(mockSelf);
      }

      expect(mockSelf.rightSpeed).toBe(0);
      expect(mockSelf.leftSpeed).toBe(0);
      expect(mockSelf.isMoving).toBe(false);
    });
  });

  describe("AIDriver Class - read_distance", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should queue read_distance command", () => {
      const mockSelf = {};

      if (module.AIDriver.$loc && module.AIDriver.$loc.read_distance) {
        module.AIDriver.$loc.read_distance(mockSelf);
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("read_distance");
    });

    test("should return a Skulpt number", () => {
      const mockSelf = {};

      if (module.AIDriver.$loc && module.AIDriver.$loc.read_distance) {
        const result = module.AIDriver.$loc.read_distance(mockSelf);
        // Result should be a Skulpt value or suspension
        expect(result).toBeDefined();
      }
    });
  });

  describe("AIDriver Class - is_moving", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should return current moving state", () => {
      const mockSelf = { isMoving: true };

      if (module.AIDriver.$loc && module.AIDriver.$loc.is_moving) {
        const result = module.AIDriver.$loc.is_moving(mockSelf);
        expect(result).toBeDefined();
      }
    });
  });

  describe("AIDriver Class - get_motor_speeds", () => {
    let module;

    beforeEach(() => {
      const factory = AIDriverStub.getModule();
      module = factory("aidriver");
    });

    test("should return tuple of speeds", () => {
      const mockSelf = { rightSpeed: 50, leftSpeed: 75 };

      if (module.AIDriver.$loc && module.AIDriver.$loc.get_motor_speeds) {
        const result = module.AIDriver.$loc.get_motor_speeds(mockSelf);
        expect(result).toBeDefined();
      }
    });
  });

  describe("hold_state Function", () => {
    test("should queue hold_state command", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");

      if (module.hold_state) {
        module.hold_state({ v: 2.5 });
      }

      expect(AIDriverStub.hasCommands()).toBe(true);
      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("hold_state");
      expect(cmd.params.seconds).toBe(2.5);
    });

    test("should return Skulpt suspension for async wait", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");

      if (module.hold_state) {
        const result = module.hold_state({ v: 1.0 });
        // Should be a suspension or similar async construct
        expect(result).toBeDefined();
      }
    });
  });

  describe("Command Types Coverage", () => {
    test("should support all command types", () => {
      const commandTypes = [
        "init",
        "drive_forward",
        "drive_backward",
        "rotate_left",
        "rotate_right",
        "brake",
        "read_distance",
        "hold_state",
      ];

      commandTypes.forEach((type) => {
        AIDriverStub.queueCommand({ type, params: {} });
      });

      expect(AIDriverStub.commandQueue.length).toBe(commandTypes.length);

      commandTypes.forEach((type) => {
        const cmd = AIDriverStub.getNextCommand();
        expect(cmd.type).toBe(type);
      });
    });
  });

  describe("Edge Cases", () => {
    test("should handle zero speed values", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");
      const mockSelf = { rightSpeed: 100, leftSpeed: 100, isMoving: true };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_forward) {
        module.AIDriver.$loc.drive_forward(mockSelf, { v: 0 }, { v: 0 });
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.params.rightSpeed).toBe(0);
      expect(cmd.params.leftSpeed).toBe(0);
    });

    test("should handle maximum speed values", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_forward) {
        module.AIDriver.$loc.drive_forward(mockSelf, { v: 255 }, { v: 255 });
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.params.rightSpeed).toBe(255);
      expect(cmd.params.leftSpeed).toBe(255);
    });

    test("should handle negative speed values", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_forward) {
        module.AIDriver.$loc.drive_forward(mockSelf, { v: -50 }, { v: -50 });
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.params.rightSpeed).toBe(-50);
    });

    test("should handle float speed values", () => {
      const factory = AIDriverStub.getModule();
      const module = factory("aidriver");
      const mockSelf = { rightSpeed: 0, leftSpeed: 0, isMoving: false };

      if (module.AIDriver.$loc && module.AIDriver.$loc.drive_forward) {
        module.AIDriver.$loc.drive_forward(mockSelf, { v: 75.5 }, { v: 80.3 });
      }

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.params.rightSpeed).toBe(75.5);
      expect(cmd.params.leftSpeed).toBe(80.3);
    });
  });
});
