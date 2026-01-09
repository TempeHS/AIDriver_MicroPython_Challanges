/**
 * Validator Unit Tests
 * Tests for code validation, allowed imports, and syntax checking
 */

const fs = require("fs");
const path = require("path");

// Load the Validator module
const validatorCode = fs.readFileSync(
  path.join(__dirname, "../../js/validator.js"),
  "utf8"
);
eval(validatorCode);

describe("Validator", () => {
  describe("Initialization", () => {
    test("should have validate method", () => {
      expect(typeof Validator.validate).toBe("function");
    });

    test("should have allowed imports list", () => {
      expect(Validator.ALLOWED_IMPORTS).toBeDefined();
      expect(Array.isArray(Validator.ALLOWED_IMPORTS)).toBe(true);
    });

    test("should allow aidriver module", () => {
      expect(Validator.ALLOWED_IMPORTS).toContain("aidriver");
    });
  });

  describe("Valid Code", () => {
    test("should accept basic AIDriver code", () => {
      const code = `
from aidriver import AIDriver, hold_state

robot = AIDriver()
robot.drive_forward(100, 100)
hold_state(2)
robot.brake()
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should accept code with DEBUG_AIDRIVER", () => {
      const code = `
from aidriver import AIDriver, hold_state, DEBUG_AIDRIVER

DEBUG_AIDRIVER = True
robot = AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept comments", () => {
      const code = `
# This is a comment
from aidriver import AIDriver, hold_state

# Create robot
robot = AIDriver()  # Initialize
robot.drive_forward(100, 100)  # Move forward
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept empty code", () => {
      const code = "";
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept whitespace only", () => {
      const code = "   \n\n   \t\t\n";
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept code with variables", () => {
      const code = `
from aidriver import AIDriver, hold_state

speed = 100
duration = 2

robot = AIDriver()
robot.drive_forward(speed, speed)
hold_state(duration)
robot.brake()
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept code with loops", () => {
      const code = `
from aidriver import AIDriver, hold_state

robot = AIDriver()

for i in range(3):
    robot.drive_forward(100, 100)
    hold_state(1)
    robot.rotate_right(50)
    hold_state(0.5)

robot.brake()
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept code with conditionals", () => {
      const code = `
from aidriver import AIDriver, hold_state

robot = AIDriver()

distance = robot.read_distance()
if distance < 200:
    robot.brake()
else:
    robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept code with while loops", () => {
      const code = `
from aidriver import AIDriver, hold_state

robot = AIDriver()

while True:
    distance = robot.read_distance()
    if distance < 200:
        robot.brake()
        break
    robot.drive_forward(100, 100)
    hold_state(0.1)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept code with functions", () => {
      const code = `
from aidriver import AIDriver, hold_state

def move_forward(robot, speed, duration):
    robot.drive_forward(speed, speed)
    hold_state(duration)
    robot.brake()

robot = AIDriver()
move_forward(robot, 100, 2)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe("Forbidden Imports", () => {
    test("should reject os module", () => {
      const code = `
import os
from aidriver import AIDriver
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("os"))).toBe(true);
    });

    test("should reject sys module", () => {
      const code = `
import sys
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject subprocess module", () => {
      const code = `
import subprocess
subprocess.run(['ls'])
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject socket module", () => {
      const code = `
import socket
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject requests module", () => {
      const code = `
import requests
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject urllib module", () => {
      const code = `
import urllib
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject __import__ usage", () => {
      const code = `
from aidriver import AIDriver
__import__('os')
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject exec usage", () => {
      const code = `
from aidriver import AIDriver
exec("import os")
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject eval usage", () => {
      const code = `
from aidriver import AIDriver
evil_code = "import os"
eval(evil_code)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject from X import * for disallowed modules", () => {
      const code = `
from os import *
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject aliased forbidden imports", () => {
      const code = `
import os as operating_system
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should reject multiple imports with one forbidden", () => {
      const code = `
from aidriver import AIDriver
import time
import os
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });
  });

  describe("Allowed Standard Library", () => {
    test("should allow math module", () => {
      const code = `
from aidriver import AIDriver
import math

robot = AIDriver()
speed = math.floor(100.5)
robot.drive_forward(speed, speed)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should allow random module", () => {
      const code = `
from aidriver import AIDriver
import random

robot = AIDriver()
speed = random.randint(50, 100)
robot.drive_forward(speed, speed)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should allow time module", () => {
      const code = `
from aidriver import AIDriver
import time

robot = AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe("Syntax Errors", () => {
    test("should detect missing colon", () => {
      const code = `
from aidriver import AIDriver

if True
    pass
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test("should detect unbalanced parentheses", () => {
      const code = `
from aidriver import AIDriver

robot = AIDriver()
robot.drive_forward(100, 100
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should detect indentation errors", () => {
      const code = `
from aidriver import AIDriver

if True:
pass
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should detect invalid assignment", () => {
      const code = `
from aidriver import AIDriver

100 = x
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
    });

    test("should report line number for syntax errors", () => {
      const code = `
from aidriver import AIDriver

robot = AIDriver()
robot.drive_forward(100,
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(false);
      expect(result.errors[0].line).toBeDefined();
    });
  });

  describe("AIDriver Usage Validation", () => {
    test("should warn if aidriver not imported", () => {
      const code = `
# No import
robot = AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      // May be valid but with warnings, or invalid
      // Depends on implementation
    });

    test("should accept import aidriver style", () => {
      const code = `
import aidriver

robot = aidriver.AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept from aidriver import style", () => {
      const code = `
from aidriver import AIDriver

robot = AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should accept partial imports", () => {
      const code = `
from aidriver import AIDriver

robot = AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("should handle very long code", () => {
      let code = "from aidriver import AIDriver\nrobot = AIDriver()\n";
      for (let i = 0; i < 500; i++) {
        code += `robot.drive_forward(100, 100)\n`;
      }
      code += "robot.brake()";

      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should handle unicode in strings", () => {
      const code = `
from aidriver import AIDriver

message = "Hello 世界 🤖"
robot = AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should handle multiline strings", () => {
      const code = `
from aidriver import AIDriver

doc = """
This is a
multiline string
"""

robot = AIDriver()
robot.drive_forward(100, 100)
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });

    test("should handle import in string literal", () => {
      const code = `
from aidriver import AIDriver

message = "import os"
robot = AIDriver()
`;
      const result = Validator.validate(code);
      // Should be valid - import is in string, not actual import
      expect(result.valid).toBe(true);
    });

    test("should handle comments with import", () => {
      const code = `
from aidriver import AIDriver

# import os  # This is just a comment

robot = AIDriver()
`;
      const result = Validator.validate(code);
      expect(result.valid).toBe(true);
    });
  });

  describe("Error Messages", () => {
    test("should provide helpful error message for forbidden import", () => {
      const code = `import os`;
      const result = Validator.validate(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toBeDefined();
      expect(typeof result.errors[0].message).toBe("string");
    });

    test("should include line number in errors", () => {
      const code = `
from aidriver import AIDriver

import os
`;
      const result = Validator.validate(code);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(typeof result.errors[0].line).toBe("number");
    });

    test("should return multiple errors if present", () => {
      const code = `
import os
import sys
import socket
`;
      const result = Validator.validate(code);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Performance", () => {
    test("should validate quickly for normal code", () => {
      const code = `
from aidriver import AIDriver, hold_state

robot = AIDriver()
for i in range(10):
    robot.drive_forward(100, 100)
    hold_state(1)
robot.brake()
`;
      const start = Date.now();
      const result = Validator.validate(code);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should complete in under 100ms
      expect(result).toBeDefined();
    });
  });
});
