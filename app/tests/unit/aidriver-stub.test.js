/**
 * AIDriverStub tests against the real js/aidriver-stub.js. The `aidriver`
 * module is imported by learner code running in the real Skulpt 1.2.0
 * interpreter, registered the same way PythonRunner does. Python is run
 * directly (not via PythonRunner.run) so queued commands stay inspectable.
 */

const {
  loadSkulpt,
  loadModules,
  captureDebugPanel,
  makeRobot,
} = require("../helpers/load-app");

const ROBOT = "from aidriver import AIDriver, hold_state\nr = AIDriver()\n";

let messages;
let printed;

beforeAll(() => {
  loadSkulpt();
  loadModules(["simulator.js", "aidriver-stub.js", "python-runner.js", "app.js"]);
  messages = captureDebugPanel().messages;
});

beforeEach(() => {
  messages.length = 0;
  printed = [];
  AIDriverStub.clearQueue();
  AIDriverStub.DEBUG_AIDRIVER = false;
  App.speedMultiplier = 1;
  App.robot = makeRobot();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function runPy(code) {
  Sk.configure({
    output: (text) => printed.push(text.trimEnd()),
    read: PythonRunner.handleRead.bind(PythonRunner),
    __future__: Sk.python3,
  });
  PythonRunner.registerMicroPythonModules();
  return Sk.misceval.asyncToPromise(() =>
    Sk.importMainWithBody("<stdin>", false, code, true),
  );
}

const queued = () => AIDriverStub.commandQueue.filter((c) => c.type !== "init");
const warnings = () => messages.filter((m) => m.startsWith("WARN"));

describe("command queue", () => {
  test("is first-in first-out and empties cleanly", () => {
    AIDriverStub.queueCommand({ type: "drive_forward", params: { rightSpeed: 1 } });
    AIDriverStub.queueCommand({ type: "brake", params: {} });

    expect(AIDriverStub.hasCommands()).toBe(true);
    expect(AIDriverStub.getNextCommand().type).toBe("drive_forward");
    expect(AIDriverStub.getNextCommand().type).toBe("brake");
    expect(AIDriverStub.getNextCommand()).toBeUndefined();
    expect(AIDriverStub.hasCommands()).toBe(false);
  });

  test("clearQueue drops pending commands and re-arms once-per-run speed warnings", async () => {
    await runPy(ROBOT + "r.drive_forward(50, 50)\nr.drive_forward(50, 50)\n");
    expect(warnings()).toHaveLength(1);

    AIDriverStub.clearQueue();
    expect(AIDriverStub.hasCommands()).toBe(false);

    await runPy(ROBOT + "r.drive_forward(50, 50)\n");
    expect(warnings()).toHaveLength(2);
  });
});

describe("speed arguments match the robot's L298N.set_speed", () => {
  test.each([
    [0, 0, null],
    [80, 80, /Speed 80 is in the stopped range/],
    [81, 81, null],
    [255, 255, null],
    [256, 256 / 257, /Speed 256 is above 255/],
    [65535, 255, /Speed 65535 is above 255/],
    [70000, 255, /Speed 70000 is above 255/],
  ])("speed %p drives at %p", async (speed, effective, warning) => {
    await runPy(ROBOT + `r.drive_forward(${speed}, ${speed})\nprint(r.get_motor_speeds())\n`);

    const [cmd] = queued();
    expect(cmd.params.rightSpeed).toBeCloseTo(effective);
    expect(cmd.params.leftSpeed).toBeCloseTo(effective);
    expect(printed).toEqual([`(${speed}, ${speed})`]);
    if (warning) {
      expect(warnings()).toEqual([expect.stringMatching(warning)]);
    } else {
      expect(warnings()).toEqual([]);
    }
  });

  test.each([
    ["-1", "ValueError", "Speed must be between 0 and 255, got -1"],
    ["'fast'", "TypeError", "Speed must be a number"],
    ["'200'", "TypeError", "Speed must be a number, got str"],
    ["None", "TypeError", "Speed must be a number"],
    ["[120]", "TypeError", "Speed must be a number, got list"],
  ])("speed %s raises %s and queues nothing", async (arg, type, message) => {
    const err = await runPy(ROBOT + `r.rotate_left(${arg})\n`).catch((e) => e);

    expect(err.tp$name).toBe(type);
    expect(err.toString()).toContain(message);
    expect(queued()).toEqual([]);
  });
});

describe("AIDriver methods", () => {
  test("queue the matching simulator commands with (right, left) argument order", async () => {
    await runPy(
      ROBOT +
        "r.drive_forward(200, 150)\nr.drive_backward(120, 130)\n" +
        "r.rotate_left(100)\nr.rotate_right(90)\nr.brake()\n" +
        "r.set_motor_speeds(140, 160)\nhold_state(0)\n",
    );

    expect(AIDriverStub.commandQueue).toEqual([
      { type: "init", params: {} },
      { type: "drive_forward", params: { rightSpeed: 200, leftSpeed: 150 } },
      { type: "drive_backward", params: { rightSpeed: 120, leftSpeed: 130 } },
      { type: "rotate_left", params: { turnSpeed: 100 } },
      { type: "rotate_right", params: { turnSpeed: 90 } },
      { type: "brake", params: {} },
      { type: "set_motor_speeds", params: { rightSpeed: 140, leftSpeed: 160 } },
      { type: "hold_state", params: { seconds: 0 } },
    ]);
  });

  test("is_moving follows drive, rotate and brake but not set_motor_speeds", async () => {
    await runPy(
      ROBOT +
        "print(r.is_moving())\n" +
        "r.set_motor_speeds(150, 150)\nprint(r.is_moving())\n" +
        "r.drive_forward(150, 150)\nprint(r.is_moving())\n" +
        "r.brake()\nprint(r.is_moving())\n" +
        "r.rotate_right(150)\nr.set_motor_speeds(100, 100)\nprint(r.is_moving())\n",
    );
    expect(printed).toEqual(["False", "False", "True", "False", "True"]);
  });
});

describe("read_distance()", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0.5); // no sensor noise
  });

  test("returns the simulated ultrasonic reading for the current App.robot", async () => {
    const half = Simulator.ROBOT_LENGTH / 2;
    App.robot = makeRobot({ x: 1000, y: 1000, heading: 0 });
    await runPy(ROBOT + "print(r.read_distance())\n");
    App.robot = makeRobot({ x: 1500, y: 1000, heading: 90 });
    await runPy(ROBOT + "d = r.read_distance()\nprint(d, type(d).__name__)\n");

    expect(printed).toEqual([`${1000 - half}`, `${500 - half} int`]);
    expect(queued()).toContainEqual({
      type: "read_distance",
      params: { result: 500 - half },
    });
  });

  test("returns -1 when the wall is closer than the sensor minimum", async () => {
    App.robot = makeRobot({ y: Simulator.ROBOT_LENGTH / 2 + 10, heading: 0 });
    await runPy(ROBOT + "print(r.read_distance())\n");
    expect(printed).toEqual(["-1"]);
  });
});

describe("hold_state()", () => {
  async function holdDuration(seconds, multiplier) {
    jest.useFakeTimers();
    App.speedMultiplier = multiplier;
    let done = false;
    const run = runPy(ROBOT + `hold_state(${seconds})\n`).then(() => {
      done = true;
    });
    let elapsed = 0;
    while (!done && elapsed < 10000) {
      await jest.advanceTimersByTimeAsync(10);
      elapsed += 10;
    }
    await run;
    return elapsed;
  }

  test.each([
    [0.5, 1, 500],
    [2, 4, 500],
    [1, 0.5, 2000],
  ])("hold_state(%p) at %px speed takes %pms", async (seconds, multiplier, ms) => {
    const elapsed = await holdDuration(seconds, multiplier);
    expect(elapsed).toBeGreaterThanOrEqual(ms);
    expect(elapsed).toBeLessThanOrEqual(ms + 20);
  });
});
