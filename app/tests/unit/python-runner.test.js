/**
 * PythonRunner tests against the real js/python-runner.js, executing learner
 * code with the real Skulpt 1.2.0 interpreter, real Validator, AIDriverStub
 * and Simulator. Behaviour already covered by
 * tests/integration/real-runtime.test.js is not repeated here.
 */

const {
  loadSkulpt,
  loadModules,
  captureDebugPanel,
  makeRobot,
} = require("../helpers/load-app");

const ROBOT = "from aidriver import AIDriver, hold_state\nr = AIDriver()\n";

let output;
let highlighted;
let onHighlight;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(() => {
  jest.spyOn(console, "trace").mockImplementation(() => {});
  loadSkulpt();
  loadModules([
    "validator.js",
    "simulator.js",
    "aidriver-stub.js",
    "python-runner.js",
    "app.js",
  ]);
  window.render = () => {};
  output = captureDebugPanel().messages;
  window.Editor = {
    highlightLine: (line) => {
      highlighted.push(line);
      if (onHighlight) onHighlight(line);
    },
    clearHighlight: () => {},
    markError: jest.fn(),
  };
  PythonRunner.init();
});

beforeEach(() => {
  output.length = 0;
  highlighted = [];
  onHighlight = null;
  App.speedMultiplier = 1;
  Simulator.setSpeed(1);
  App.robot = makeRobot();
  PythonRunner.stepDelay = 1;
});

describe("run()", () => {
  test("code failing validation is reported and never executed", async () => {
    await expect(
      PythonRunner.run(ROBOT + "print('ran')\nx = eval('1')\n"),
    ).rejects.toThrow("Validation failed");

    expect(output).toContain(
      "ERROR Code has errors that must be fixed before running:",
    );
    expect(output).toContainEqual(
      expect.stringMatching(/Line 4: eval\(\) is not allowed/),
    );
    expect(output).not.toContain("ran");
    expect(PythonRunner.isRunning).toBe(false);
  });

  test("print output reaches the debug panel and completion is logged", async () => {
    await PythonRunner.run("print('hello')\nprint(1 + 2)\n");

    expect(output).toEqual([
      "[Python] Starting execution...",
      "hello",
      "3",
      "[Python] Execution completed",
    ]);
    expect(PythonRunner.isRunning).toBe(false);
  });

  test("runtime errors report the faulting line and mark it in the editor", async () => {
    await PythonRunner.run(
      "def f():\n    return missing_name\n\nprint('before')\nf()\nprint('after')\n",
    );

    expect(output).toContain("before");
    expect(output).not.toContain("after");
    expect(output).toContainEqual(
      expect.stringMatching(/^\[Error\] Line 2: NameError/),
    );
    expect(output).not.toContain("[Python] Execution completed");
    expect(Editor.markError).toHaveBeenCalledWith(
      2,
      expect.stringContaining("NameError"),
    );
    expect(PythonRunner.isRunning).toBe(false);
  });

  test("input() is rejected with an error on the calling line", async () => {
    await PythonRunner.run("name = input('Name? ')\nprint('got', name)\n");

    expect(output).toContain(
      "[Error] input() is not supported in the simulator",
    );
    expect(output).toContainEqual(expect.stringMatching(/Line 1: .*input\(\)/));
    expect(output.some((m) => m.startsWith("got"))).toBe(false);
  });

  test("a second run() while one is active is ignored", async () => {
    const first = PythonRunner.run(ROBOT + "hold_state(0.1)\nprint('first')\n");
    await wait(10);

    await expect(PythonRunner.run("print('second')\n")).resolves.toBeUndefined();
    await first;

    expect(output).toContain("first");
    expect(output).not.toContain("second");
  });

  test("DEBUG_AIDRIVER = True in the code logs each robot command", async () => {
    await PythonRunner.run(
      ROBOT + "DEBUG_AIDRIVER = True\nr.drive_forward(200, 150)\n",
    );
    expect(output).toContain(
      '[AIDriver] drive_forward: {"rightSpeed":200,"leftSpeed":150}',
    );

    output.length = 0;
    await PythonRunner.run(ROBOT + "r.drive_forward(200, 150)\n");
    expect(output.some((m) => m.includes("drive_forward:"))).toBe(false);
  });
});

describe("stop()", () => {
  test("ends a normal-mode infinite loop and stops the robot", async () => {
    const running = PythonRunner.run(
      ROBOT + "r.drive_forward(200, 200)\nwhile True:\n    pass\n",
    );
    await wait(100);
    expect(App.robot.isMoving).toBe(true);

    PythonRunner.stop();
    expect(App.robot).toMatchObject({ leftSpeed: 0, rightSpeed: 0, isMoving: false });
    await running;

    expect(PythonRunner.isRunning).toBe(false);
    expect(AIDriverStub.hasCommands()).toBe(false);
    expect(output).toContain("[Python] Execution stopped");
    expect(output).not.toContain("[Python] Execution completed");
    expect(output.some((m) => m.startsWith("[Error]"))).toBe(false);
  });

  test("during hold_state stops the robot and the run", async () => {
    const running = PythonRunner.run(
      ROBOT + "r.drive_forward(200, 200)\nhold_state(0.2)\n",
    );
    await wait(50);
    expect(App.robot.isMoving).toBe(true);

    PythonRunner.stop();
    expect(PythonRunner.isRunning).toBe(false);
    expect(App.robot).toMatchObject({ leftSpeed: 0, rightSpeed: 0, isMoving: false });
    await running;
    expect(App.robot.isMoving).toBe(false);
  });
});

describe("validateSyntax()", () => {
  test("accepts valid code", () => {
    expect(PythonRunner.validateSyntax(ROBOT + "r.brake()\n")).toEqual({
      valid: true,
      error: null,
      line: null,
    });
  });

  test("reports a SyntaxError with its line number", () => {
    const result = PythonRunner.validateSyntax("x = 1\nif x\n    pass\n");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/SyntaxError/);
    expect(result.line).toBe(2);
  });
});

describe("processCommandQueue() applies robot commands", () => {
  async function runAndApply(code) {
    await PythonRunner.run(ROBOT + code);
    PythonRunner.processCommandQueue();
    return App.robot;
  }

  test.each([
    ["r.drive_forward(200, 150)", 150, 200, true],
    ["r.drive_backward(200, 150)", -150, -200, true],
    ["r.rotate_left(120)", 120, -120, true],
    ["r.rotate_right(120)", -120, 120, true],
    ["r.drive_forward(200, 200); r.brake()", 0, 0, false],
  ])("%s", async (code, left, right, moving) => {
    const robot = await runAndApply(code.replace("; ", "\n") + "\n");
    expect(robot).toMatchObject({ leftSpeed: left, rightSpeed: right, isMoving: moving });
    expect(AIDriverStub.hasCommands()).toBe(false);
  });

  test("rotate_left turns counter-clockwise and rotate_right clockwise", async () => {
    const left = Simulator.step(await runAndApply("r.rotate_left(200)\n"), 0.1);
    App.robot = makeRobot();
    const right = Simulator.step(await runAndApply("r.rotate_right(200)\n"), 0.1);

    expect(left.heading).toBeGreaterThan(180); // wrapped below 0
    expect(right.heading).toBeGreaterThan(0);
    expect(right.heading).toBeLessThan(180);
  });

  test("set_motor_speeds does not change the current motion", async () => {
    let robot = await runAndApply(
      "r.drive_forward(200, 200)\nr.set_motor_speeds(100, 90)\n",
    );
    expect(robot).toMatchObject({ leftSpeed: 200, rightSpeed: 200, isMoving: true });

    App.robot = makeRobot();
    robot = await runAndApply("r.set_motor_speeds(100, 90)\n");
    expect(robot).toMatchObject({ leftSpeed: 0, rightSpeed: 0, isMoving: false });
  });
});

describe("step mode pause/resume", () => {
  test("pausing holds execution on the current line until resumed", async () => {
    onHighlight = (line) => {
      if (line === 2) PythonRunner.pauseStep();
    };
    const running = PythonRunner.runStepMode(
      "a = 1\nb = 2\nc = 3\nprint('done', a + b + c)\n",
    );

    await wait(150);
    expect(highlighted).toEqual([1, 2]);
    expect(PythonRunner.currentStepLine).toBe(2);
    expect(PythonRunner.freezePhysics).toBe(true);
    expect(PythonRunner.isStepping).toBe(true);
    expect(output).toContain("Paused at line 2");
    expect(output).not.toContain("done 6");

    PythonRunner.resumeStep();
    await running;

    expect(highlighted).toEqual([1, 2, 3, 4]);
    expect(output).toContain("done 6");
    expect(PythonRunner.isStepping).toBe(false);
  });

  test("stop() while paused ends the run without executing further lines", async () => {
    onHighlight = (line) => {
      if (line === 2) PythonRunner.pauseStep();
    };
    const running = PythonRunner.runStepMode("a = 1\nprint('not reached')\n");

    await wait(50);
    expect(highlighted).toEqual([1, 2]);
    PythonRunner.stop();
    await running;

    expect(output).not.toContain("not reached");
    expect(PythonRunner.isStepping).toBe(false);
    expect(PythonRunner.freezePhysics).toBe(false);
    expect(output.some((m) => m.startsWith("[Error]"))).toBe(false);
  });
});
