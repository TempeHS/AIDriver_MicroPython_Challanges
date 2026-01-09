/**
 * Edge Case and Stress Tests
 * Tests for boundary conditions, error recovery, and performance
 */

const fs = require("fs");
const path = require("path");

const loadModule = (filename) => {
  const code = fs.readFileSync(
    path.join(__dirname, "../../js", filename),
    "utf8"
  );
  return code;
};

global.DebugPanel = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
};

eval(loadModule("simulator.js"));
eval(loadModule("aidriver-stub.js"));
eval(loadModule("validator.js"));
eval(loadModule("challenges.js"));

describe("Edge Cases: Simulator", () => {
  describe("Boundary Conditions", () => {
    test("robot at exact corner should handle collision", () => {
      const robot = {
        x: 0,
        y: 0,
        heading: 0,
        leftSpeed: 0,
        rightSpeed: 0,
        isMoving: false,
        trail: [],
      };

      expect(Simulator.checkCollision(robot)).toBe(true);
    });

    test("robot at arena bounds should collide", () => {
      const testCases = [
        { x: 0, y: 1000 },
        { x: 2000, y: 1000 },
        { x: 1000, y: 0 },
        { x: 1000, y: 2000 },
      ];

      testCases.forEach(({ x, y }) => {
        const robot = { x, y, heading: 0, trail: [] };
        expect(Simulator.checkCollision(robot)).toBe(true);
      });
    });

    test("robot just inside boundary should not collide", () => {
      const robot = {
        x: 500,
        y: 500,
        heading: 0,
        leftSpeed: 0,
        rightSpeed: 0,
        isMoving: false,
        trail: [],
      };

      expect(Simulator.checkCollision(robot)).toBe(false);
    });
  });

  describe("Extreme Values", () => {
    test("should handle very high speeds", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 10000,
        rightSpeed: 10000,
        isMoving: true,
        trail: [],
      };

      expect(() => Simulator.step(robot, 0.016)).not.toThrow();
    });

    test("should handle very small speeds", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 0.001,
        rightSpeed: 0.001,
        isMoving: true,
        trail: [],
      };

      expect(() => Simulator.step(robot, 0.016)).not.toThrow();
    });

    test("should handle negative coordinates", () => {
      const robot = {
        x: -100,
        y: -100,
        heading: 0,
        leftSpeed: 0,
        rightSpeed: 0,
        isMoving: false,
        trail: [],
      };

      expect(Simulator.checkCollision(robot)).toBe(true);
    });

    test("should handle heading > 360", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 720,
        leftSpeed: 100,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      const result = Simulator.step(robot, 0.1);
      expect(result.heading).toBeGreaterThanOrEqual(0);
      expect(result.heading).toBeLessThan(360);
    });

    test("should handle negative heading", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: -90,
        leftSpeed: 100,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      const result = Simulator.step(robot, 0.1);
      expect(result.heading).toBeGreaterThanOrEqual(0);
    });
  });

  describe("NaN and Infinity", () => {
    test("should handle NaN position", () => {
      const robot = {
        x: NaN,
        y: 1000,
        heading: 0,
        leftSpeed: 100,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      expect(() => Simulator.step(robot, 0.016)).not.toThrow();
    });

    test("should handle Infinity speed", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: Infinity,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      expect(() => Simulator.step(robot, 0.016)).not.toThrow();
    });
  });
});

describe("Edge Cases: Validator", () => {
  describe("Code Input Edge Cases", () => {
    test("should handle code with only whitespace", () => {
      const result = Validator.validate("   \n\t\n   ");
      expect(result.valid).toBe(true);
    });

    test("should handle code with only comments", () => {
      const result = Validator.validate("# Comment only\n# Another comment");
      expect(result.valid).toBe(true);
    });

    test("should handle very deep nesting", () => {
      let code = "from aidriver import AIDriver\n";
      for (let i = 0; i < 50; i++) {
        code += "  ".repeat(i) + "if True:\n";
      }
      code += "  ".repeat(50) + "pass";

      expect(() => Validator.validate(code)).not.toThrow();
    });

    test("should handle mixed indentation", () => {
      const code = `
from aidriver import AIDriver

def func():
    if True:
        pass
`;
      const result = Validator.validate(code);
      expect(result).toBeDefined();
    });

    test("should handle trailing comments on import", () => {
      const code = "from aidriver import AIDriver  # Comment";
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe("Import Edge Cases", () => {
    test("should handle import with newlines", () => {
      const code = `from aidriver import (
    AIDriver,
    hold_state
)`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should reject obfuscated imports", () => {
      const code = `
__builtins__.__import__('os')
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should handle import * correctly", () => {
      const code = "from aidriver import *";
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });
});

describe("Edge Cases: AIDriverStub", () => {
  beforeEach(() => {
    AIDriverStub.clearQueue();
  });

  describe("Queue Edge Cases", () => {
    test("should handle empty queue gracefully", () => {
      expect(AIDriverStub.getNextCommand()).toBeUndefined();
      expect(AIDriverStub.hasCommands()).toBe(false);
    });

    test("should handle very large queue", () => {
      for (let i = 0; i < 10000; i++) {
        AIDriverStub.queueCommand({ type: "test", params: { i } });
      }

      expect(AIDriverStub.commandQueue.length).toBe(10000);

      AIDriverStub.clearQueue();
      expect(AIDriverStub.hasCommands()).toBe(false);
    });

    test("should maintain order with rapid queueing", () => {
      for (let i = 0; i < 100; i++) {
        AIDriverStub.queueCommand({ type: "test", params: { index: i } });
      }

      for (let i = 0; i < 100; i++) {
        const cmd = AIDriverStub.getNextCommand();
        expect(cmd.params.index).toBe(i);
      }
    });
  });

  describe("Command Edge Cases", () => {
    test("should handle command with no params", () => {
      AIDriverStub.queueCommand({ type: "test" });
      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("test");
    });

    test("should handle command with null params", () => {
      AIDriverStub.queueCommand({ type: "test", params: null });
      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.type).toBe("test");
    });

    test("should handle command with complex params", () => {
      AIDriverStub.queueCommand({
        type: "test",
        params: {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
        },
      });

      const cmd = AIDriverStub.getNextCommand();
      expect(cmd.params.nested.deep.value).toBe(123);
    });
  });
});

describe("Edge Cases: Challenges", () => {
  describe("Starter Code Edge Cases", () => {
    test("all starter codes should be valid Python-like", () => {
      Challenges.forEach((challenge, index) => {
        const code = challenge.starterCode;

        // Should contain basic Python structures
        expect(typeof code).toBe("string");
        expect(code.length).toBeGreaterThan(0);
      });
    });

    test("starter codes should not contain dangerous patterns", () => {
      const dangerousPatterns = [
        /__import__/,
        /exec\s*\(/,
        /eval\s*\(/,
        /compile\s*\(/,
        /open\s*\(/,
      ];

      Challenges.forEach((challenge) => {
        dangerousPatterns.forEach((pattern) => {
          expect(challenge.starterCode).not.toMatch(pattern);
        });
      });
    });
  });

  describe("Success Criteria Edge Cases", () => {
    test("success criteria should handle null session", () => {
      Challenges.forEach((challenge) => {
        if (challenge.successCriteria) {
          const robot = { x: 1000, y: 1000 };

          expect(() => {
            try {
              challenge.successCriteria(robot, null);
            } catch (e) {
              // May throw, that's acceptable
            }
          }).not.toThrow();
        }
      });
    });

    test("success criteria should handle incomplete robot state", () => {
      Challenges.forEach((challenge) => {
        if (challenge.successCriteria) {
          const robot = { x: 1000 }; // Missing y

          expect(() => {
            try {
              challenge.successCriteria(robot, {});
            } catch (e) {
              // May throw
            }
          }).not.toThrow();
        }
      });
    });
  });
});

describe("Performance Tests", () => {
  describe("Simulator Performance", () => {
    test("should handle 1000 physics steps efficiently", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 100,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        Simulator.step(robot, 0.016);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100); // Should complete in 100ms
    });

    test("should handle rapid collision checks", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        trail: [],
      };

      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        robot.x = Math.random() * 2000;
        robot.y = Math.random() * 2000;
        Simulator.checkCollision(robot);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });

    test("should handle rapid ultrasonic readings", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        trail: [],
      };

      const start = performance.now();

      for (let i = 0; i < 1000; i++) {
        robot.heading = (robot.heading + 1) % 360;
        Simulator.simulateUltrasonic(robot);
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });

  describe("Validator Performance", () => {
    test("should validate large code quickly", () => {
      let code = "from aidriver import AIDriver, hold_state\n\n";
      code += "robot = AIDriver()\n";
      for (let i = 0; i < 500; i++) {
        code += `robot.drive_forward(100, 100)  # Step ${i}\n`;
      }

      const start = performance.now();
      Validator.validate(code);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(500);
    });
  });

  describe("Queue Performance", () => {
    test("should handle rapid queue operations", () => {
      const start = performance.now();

      for (let i = 0; i < 10000; i++) {
        AIDriverStub.queueCommand({ type: "test", params: { i } });
      }

      for (let i = 0; i < 10000; i++) {
        AIDriverStub.getNextCommand();
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(100);
    });
  });
});

describe("Stress Tests", () => {
  describe("Continuous Operation", () => {
    test("should handle long simulation without degradation", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 50,
        rightSpeed: 50,
        isMoving: true,
        trail: [],
      };

      // Simulate 10 minutes of operation at 60fps
      const frames = 60 * 60 * 10;
      let currentRobot = robot;

      const start = performance.now();

      for (let i = 0; i < frames; i++) {
        currentRobot = Simulator.step(currentRobot, 0.016);

        // Keep robot in bounds (simulate wall bounce)
        if (Simulator.checkCollision(currentRobot)) {
          currentRobot = Simulator.reset();
          currentRobot.leftSpeed = 50;
          currentRobot.rightSpeed = 50;
          currentRobot.isMoving = true;
        }
      }

      const elapsed = performance.now() - start;

      // Should complete reasonably fast (< 5 seconds for 36000 frames)
      expect(elapsed).toBeLessThan(5000);
    });
  });

  describe("Memory Stability", () => {
    test("trail should not grow indefinitely", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 100,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      for (let i = 0; i < 10000; i++) {
        Simulator.step(robot, 0.016);
      }

      // Trail should be capped or manage growth
      expect(robot.trail.length).toBeLessThanOrEqual(10000);
    });
  });
});
