/**
 * Validator tests against the real app/js/validator.js, including the starter
 * programs shipped in app/js/app.js.
 */

const { loadModules } = require("../helpers/load-app");

const HEADER = "from aidriver import AIDriver, hold_state\nmy_robot = AIDriver()\n";

beforeEach(() => {
  loadModules(["validator.js"]);
});

describe("Validator.validate - imports", () => {
  test("a minimal robot program has no errors or warnings", () => {
    const result = Validator.validate(
      HEADER + "import time\nmy_robot.drive_forward(200, 200)\nhold_state(1)\n",
    );
    expect(result).toEqual({ valid: true, errors: [], warnings: [] });
  });

  test("aliased and module-style aidriver imports count as importing aidriver", () => {
    expect(Validator.validate("import aidriver as ad\nr = ad.AIDriver()\n").warnings).toEqual([]);
    expect(Validator.validate("import aidriver\nr = aidriver.AIDriver()\n").warnings).toEqual([]);
  });

  test("from time import sleep is allowed", () => {
    const result = Validator.validate(HEADER + "from time import sleep\n");
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  test.each([
    ["import math", "math"],
    ["import random as rnd", "random"],
    ["from machine import Pin", "machine"],
  ])("'%s' is rejected on its own line", (statement, module) => {
    const result = Validator.validate(HEADER + statement + "\n");
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      expect.objectContaining({
        line: 3,
        type: "import",
        message: expect.stringContaining(`Module '${module}' is not allowed`),
      }),
    ]);
  });

  test("unknown names imported from aidriver are warnings, not errors", () => {
    const result = Validator.validate(
      "from aidriver import AIDriver, Motor as M\nr = AIDriver()\n",
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        line: 1,
        type: "import",
        message: expect.stringContaining("'Motor' is not a known export"),
      }),
    ]);
  });

  test("wildcard import from aidriver is accepted", () => {
    expect(Validator.validate("from aidriver import *\nr = AIDriver()\n").warnings).toEqual([]);
  });

  test("missing import and missing AIDriver() are reported as warnings", () => {
    const result = Validator.validate("x = 1\nprint(x)\n");
    expect(result.valid).toBe(true);
    expect(result.warnings.map((w) => w.type)).toEqual(["import", "usage"]);
  });
});

describe("Validator.validate - forbidden code", () => {
  test.each([
    ["exec('x = 1')", "exec() is not allowed"],
    ["eval('1 + 1')", "eval() is not allowed"],
    ["f = open('data.txt')", "open() is not allowed (no file access)"],
    ["m = __import__('os')", "__import__() is not allowed"],
    ["c = compile('1', 'f', 'eval')", "compile() is not allowed"],
    ["g = globals()", "globals() is not allowed"],
    ["l = locals()", "locals() is not allowed"],
    ["v = getattr(my_robot, 'brake')", "getattr() is not allowed"],
    ["setattr(my_robot, 'x', 1)", "setattr() is not allowed"],
    ["delattr(my_robot, 'x')", "delattr() is not allowed"],
    ["import os", "os module is not allowed"],
    ["import sys", "sys module is not allowed"],
    ["import subprocess", "subprocess module is not allowed"],
    ["from os import path", "os module is not allowed"],
    ["from sys import argv", "sys module is not allowed"],
  ])("%s is a forbidden error on the line it appears", (statement, message) => {
    const result = Validator.validate(HEADER + "\n" + statement + "\n");
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({ line: 4, message, type: "forbidden" });
  });

  test("identifiers that merely contain forbidden words are allowed", () => {
    const code =
      HEADER +
      "def evaluate_distance(d):\n    return d\n" +
      "def reopen():\n    pass\n" +
      "x = evaluate_distance(5)\nreopen()\n";
    expect(Validator.validate(code).errors).toEqual([]);
  });
});

describe("Validator.validate - syntax heuristics", () => {
  test.each([
    "if x > 1",
    "elif x > 1",
    "while my_robot.read_distance() > 100",
    "for i in range(4)",
    "def turn_left()",
  ])("missing colon after '%s' is an error with its line number", (statement) => {
    const result = Validator.validate(HEADER + "x = 1\n" + statement + "\n    pass\n");
    expect(result.errors).toEqual([
      { line: 4, message: "Missing colon ':' at end of statement", type: "syntax" },
    ]);
  });

  test("common keyword typos are reported", () => {
    const result = Validator.validate(
      HEADER + "pritn('hi')\nwhlie x > 1:\n    pass\nstopped = Flase\n",
    );
    expect(result.errors).toEqual([
      { line: 3, message: "Did you mean 'print'?", type: "typo" },
      { line: 4, message: "Did you mean 'while'?", type: "typo" },
    ]);
    expect(result.warnings).toEqual([
      { line: 6, message: "Did you mean 'False'?", type: "typo" },
    ]);
  });

  test("clearly unbalanced parentheses warn, but a single open paren does not", () => {
    const result = Validator.validate(
      HEADER + "my_robot.drive_forward(int(abs(200)\nspeeds = max(1,\n    2)\n",
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([
      { line: 3, message: "Parentheses may be unbalanced", type: "syntax" },
    ]);
  });

  test("text inside triple-quoted strings is not syntax checked", () => {
    const code = HEADER + '"""\nif this were code\nwhile it is not\n"""\nx = 1\n';
    expect(Validator.validate(code).errors).toEqual([]);
  });
});

describe("Validator.validateMethodUsage", () => {
  test("supported methods on every AIDriver instance pass", () => {
    const code =
      HEADER +
      "other = AIDriver()\n" +
      "my_robot.drive_forward(200, 200)\nmy_robot.drive_backward(200, 200)\n" +
      "other.rotate_left(150)\nother.rotate_right(150)\nmy_robot.brake()\n" +
      "d = my_robot.read_distance()\nm = other.is_moving()\ns = other.get_motor_speeds()\n";
    expect(Validator.validateMethodUsage(code)).toEqual([]);
  });

  test("misspelled methods warn on the right line, for any instance name", () => {
    const code = HEADER + "bot = AIDriver()\nmy_robot.brake()\nbot.drive_foward(200, 200)\n";
    expect(Validator.validateMethodUsage(code)).toEqual([
      expect.objectContaining({
        line: 5,
        type: "method",
        message: expect.stringContaining("'drive_foward' is not a valid AIDriver method"),
      }),
    ]);
  });

  test("calls on non-AIDriver objects are ignored", () => {
    const code = "import time\nimport aidriver\nr = aidriver.AIDriver()\ntime.sleep(1)\n";
    expect(Validator.validateMethodUsage(code)).toEqual([]);
  });
});

describe("Validator.validateFunctionCalls", () => {
  test("builtins, hold_state, AIDriver and learner-defined functions are allowed", () => {
    const code =
      HEADER +
      "def turn_left():\n    my_robot.rotate_left(150)\n" +
      "turn_left()\nhold_state(0.5)\nprint(len([1, 2]), abs(-1), round(1.5))\n" +
      "# undefined_in_comment()\n";
    expect(Validator.validateFunctionCalls(code)).toEqual([]);
  });

  test("calls to undefined functions are errors on their line", () => {
    expect(Validator.validateFunctionCalls(HEADER + "x = 1\nforward(100)\n")).toEqual([
      {
        line: 4,
        message: "'forward' is not defined. Did you forget to import it or define it?",
        type: "undefined",
      },
    ]);
  });
});

describe("Validator.getSuggestion", () => {
  test("maps Python error names to hints and returns null otherwise", () => {
    expect(Validator.getSuggestion("NameError: name 'my_robt' is not defined")).toMatch(
      /import AIDriver/,
    );
    expect(Validator.getSuggestion("IndentationError: unexpected indent")).toMatch(/indent/);
    expect(Validator.getSuggestion("ZeroDivisionError: division by zero")).toBeNull();
  });
});

describe("Challenge starter code from app.js", () => {
  let starters;

  beforeEach(() => {
    loadModules(["validator.js", "app.js"]);
    starters = window.getStarterCodes();
  });

  test.each([1, 2, 3, 4, 5, 6, 7])(
    "challenge %i starter passes every editor check cleanly",
    (id) => {
      const code = starters[id];
      expect(Validator.validate(code)).toEqual({ valid: true, errors: [], warnings: [] });
      expect(Validator.validateMethodUsage(code)).toEqual([]);
      expect(Validator.validateFunctionCalls(code)).toEqual([]);
    },
  );

  test("challenge 0 starter is rejected for its missing colon", () => {
    const code = starters[0];
    const whileLine =
      code.split("\n").findIndex((l) => l.startsWith("while my_robot.read_distance()")) + 1;
    const result = Validator.validate(code);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      { line: whileLine, message: "Missing colon ':' at end of statement", type: "syntax" },
    ]);
  });
});
