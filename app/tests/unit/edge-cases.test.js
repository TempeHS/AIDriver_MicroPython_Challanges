/**
 * Edge cases for the real simulator modules: physics at the arena limits,
 * ultrasonic sensor limits, validator input extremes, the AIDriverStub command
 * queue, and unusual Python arguments run through the real Skulpt runtime.
 */

const {
  loadModules,
  loadSkulpt,
  captureDebugPanel,
  makeRobot,
} = require("../helpers/load-app");

const MIN = 75; // Simulator clamps the robot centre to its largest half-extent
const MAX = 2000 - MIN;

function moving(overrides) {
  return makeRobot({ isMoving: true, ...overrides });
}

function expectFinite(robot) {
  for (const key of ["x", "y", "heading"]) {
    expect(Number.isFinite(robot[key])).toBe(true);
  }
}

describe("Simulator physics edge cases", () => {
  beforeEach(() => {
    loadModules(["debug-panel.js", "simulator.js"]);
  });

  test.each([
    [0, "y", MIN],
    [90, "x", MAX],
    [180, "y", MAX],
    [270, "x", MIN],
  ])("driving at heading %i for a huge dt stops at the wall", (heading, axis, limit) => {
    const robot = Simulator.step(
      moving({ heading, leftSpeed: 255, rightSpeed: 255 }),
      1000,
    );
    expectFinite(robot);
    expect(robot[axis]).toBeCloseTo(limit);
  });

  test("robot driven into a corner stays wedged in the corner", () => {
    let robot = moving({ x: MIN, y: MIN, heading: 315, leftSpeed: 200, rightSpeed: 200 });
    for (let i = 0; i < 50; i++) robot = Simulator.step(robot, 0.1);
    expect(robot.x).toBeCloseTo(MIN);
    expect(robot.y).toBeCloseTo(MIN);
  });

  test("a robot placed outside the arena is pulled back inside", () => {
    const robot = Simulator.step(
      moving({ x: -500, y: 5000, leftSpeed: 1, rightSpeed: 1 }),
      0.01,
    );
    expect(robot.x).toBe(MIN);
    expect(robot.y).toBe(MAX);
  });

  test.each([
    ["right past 360", 350, -200, 200],
    ["left past 0", 10, 200, -200],
  ])("heading wraps when turning %s", (_, heading, leftSpeed, rightSpeed) => {
    const robot = Simulator.step(moving({ heading, leftSpeed, rightSpeed }), 0.2);
    expect(robot.heading).toBeGreaterThanOrEqual(0);
    expect(robot.heading).toBeLessThan(360);
    expect(Math.abs(robot.heading - heading)).toBeGreaterThan(180);
  });

  test("a negative heading is normalised into 0-360", () => {
    const robot = Simulator.step(moving({ heading: -90, leftSpeed: 1, rightSpeed: 1 }), 0);
    expect(robot.heading).toBeCloseTo(270);
  });

  test("spinning in place for a long time rotates without translating", () => {
    const robot = Simulator.step(moving({ leftSpeed: -255, rightSpeed: 255 }), 123.4);
    expect(robot.x).toBeCloseTo(1000);
    expect(robot.y).toBeCloseTo(1000);
    expect(robot.heading).toBeGreaterThanOrEqual(0);
    expect(robot.heading).toBeLessThan(360);
  });

  test("dt = 0 leaves the pose unchanged", () => {
    const start = moving({ heading: 30, leftSpeed: 100, rightSpeed: 200 });
    const robot = Simulator.step(start, 0);
    expect(robot.x).toBeCloseTo(start.x);
    expect(robot.y).toBeCloseTo(start.y);
    expect(robot.heading).toBeCloseTo(30);
  });

  test("a stopped robot is returned untouched (no trail growth)", () => {
    const start = makeRobot();
    expect(Simulator.step(start, 1)).toBe(start);
  });

  test("many small straight steps match one large step", () => {
    let small = moving({ heading: 45, leftSpeed: 180, rightSpeed: 180 });
    for (let i = 0; i < 1000; i++) small = Simulator.step(small, 0.001);
    const big = Simulator.step(moving({ heading: 45, leftSpeed: 180, rightSpeed: 180 }), 1);
    expect(small.x).toBeCloseTo(big.x, 6);
    expect(small.y).toBeCloseTo(big.y, 6);
  });

  test("a full circle of arc steps returns to the start pose", () => {
    // omega = (vR - vL) / wheel base, with speed 255 = 800 mm/s
    const omega = ((100 / 255) * 800) / 120;
    const dt = (2 * Math.PI) / omega / 1000;
    let robot = moving({ leftSpeed: 100, rightSpeed: 200 });
    for (let i = 0; i < 1000; i++) robot = Simulator.step(robot, dt);
    expect(robot.x).toBeCloseTo(1000, 6);
    expect(robot.y).toBeCloseTo(1000, 6);
    expect(Math.min(robot.heading, 360 - robot.heading)).toBeCloseTo(0, 6);
  });

  test("the trail is capped at the latest 1000 points", () => {
    let robot = moving({ leftSpeed: 50, rightSpeed: -50 });
    for (let i = 0; i < 1500; i++) robot = Simulator.step(robot, 0.01);
    expect(robot.trail).toHaveLength(1000);
    expect(robot.trail[999]).toEqual({ x: robot.x, y: robot.y });
  });

  test("driving into a maze wall stops the robot and warns", () => {
    const warn = jest.spyOn(DebugPanel, "warning").mockImplementation(() => {});
    Simulator.setMazeWalls([{ x: 900, y: 880, width: 200, height: 10 }]);
    const robot = Simulator.step(moving({ leftSpeed: 255, rightSpeed: 255 }), 0.1);
    expect(robot).toMatchObject({ leftSpeed: 0, rightSpeed: 0, isMoving: false });
    expect(warn).toHaveBeenCalledWith("Robot collision detected!");
  });
});

describe("Ultrasonic sensor edge cases", () => {
  beforeEach(() => {
    loadModules(["simulator.js"]);
    jest.spyOn(Math, "random").mockReturnValue(0.5); // zero noise
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("measures from the robot's nose to the wall it faces", () => {
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(925);
    expect(Simulator.simulateUltrasonic(makeRobot({ heading: 90 }))).toBe(925);
    expect(Simulator.simulateUltrasonic(makeRobot({ heading: 360 }))).toBe(925);
  });

  test("returns -1 when the wall is closer than 20 mm", () => {
    expect(Simulator.simulateUltrasonic(makeRobot({ y: MIN + 10 }))).toBe(-1);
  });

  test("returns -1 when looking diagonally across the arena beyond 2000 mm", () => {
    expect(Simulator.simulateUltrasonic(makeRobot({ x: MIN, y: MAX, heading: 45 }))).toBe(-1);
  });

  test("an obstacle in front is seen before the wall; one behind is ignored", () => {
    Simulator.setObstacles([{ x: 900, y: 400, width: 200, height: 50 }]);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(475);
    expect(Simulator.simulateUltrasonic(makeRobot({ heading: 180 }))).toBe(925);
  });

  test("noise stays within +/-2 mm", () => {
    Math.random.mockReturnValue(0);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(923);
    Math.random.mockReturnValue(0.9999);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(927);
  });
});

describe("Validator input edge cases", () => {
  const PROGRAM =
    "from aidriver import AIDriver, hold_state\nmy_robot = AIDriver()\n" +
    "while True:\n    if my_robot.read_distance() > 300:\n" +
    "        my_robot.drive_forward(200, 200)\n    else:\n        my_robot.brake()\n";

  beforeEach(() => {
    loadModules(["validator.js"]);
  });

  test.each([
    ["empty code", ""],
    ["whitespace only", "   \n\t\n"],
    ["comments only", "# just a comment\n# another one\n"],
  ])("%s is valid but warns that no robot is used", (_, code) => {
    const result = Validator.validate(code);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings.map((w) => w.type)).toEqual(["import", "usage"]);
  });

  test("tab indentation and Windows line endings validate like spaces and LF", () => {
    const tabbed = PROGRAM.replace(/ {4}/g, "\t").replace(/\n/g, "\r\n");
    expect(Validator.validate(tabbed)).toEqual(Validator.validate(PROGRAM));
    expect(Validator.validate(tabbed).valid).toBe(true);
  });

  test("unicode in strings and comments is accepted", () => {
    const code = PROGRAM + 'print("Distance → 🤖 ok, café")  # ünïcödé\n';
    expect(Validator.validate(code)).toEqual({ valid: true, errors: [], warnings: [] });
  });

  test("very long programs are validated with correct line numbers", () => {
    const body = "my_robot.drive_forward(200, 200)\nhold_state(0.1)\n".repeat(5000);
    const code = PROGRAM + body + "eval('1')\n";
    const result = Validator.validate(code);
    expect(result.errors).toEqual([
      { line: 7 + 10000 + 1, message: "eval() is not allowed", type: "forbidden" },
    ]);
  });
});

describe("AIDriverStub command queue", () => {
  let output;

  beforeAll(() => {
    loadSkulpt();
  });

  beforeEach(() => {
    loadModules(["aidriver-stub.js"]);
    output = captureDebugPanel().messages;
  });

  test("commands come out in the order they were queued", () => {
    const types = ["init", "drive_forward", "hold_state", "rotate_left", "brake"];
    types.forEach((type) => AIDriverStub.queueCommand({ type, params: {} }));
    const drained = [];
    while (AIDriverStub.hasCommands()) drained.push(AIDriverStub.getNextCommand().type);
    expect(drained).toEqual(types);
    expect(AIDriverStub.getNextCommand()).toBeUndefined();
  });

  test("clearQueue drops pending commands and re-arms speed warnings", () => {
    AIDriverStub.queueCommand({ type: "brake", params: {} });
    AIDriverStub.toMotorSpeed(Sk.ffi.remapToPy(50));
    AIDriverStub.toMotorSpeed(Sk.ffi.remapToPy(50));
    expect(output.filter((m) => m.includes("Speed 50"))).toHaveLength(1);

    AIDriverStub.clearQueue();
    expect(AIDriverStub.hasCommands()).toBe(false);
    AIDriverStub.toMotorSpeed(Sk.ffi.remapToPy(50));
    expect(output.filter((m) => m.includes("Speed 50"))).toHaveLength(2);
  });

  test("speed boundaries: 0 and 255 pass silently, 65535+ caps at full speed", () => {
    expect(AIDriverStub.toMotorSpeed(Sk.ffi.remapToPy(0)).effective).toBe(0);
    expect(AIDriverStub.toMotorSpeed(Sk.ffi.remapToPy(255)).effective).toBe(255);
    expect(output).toEqual([]);
    expect(AIDriverStub.toMotorSpeed(Sk.ffi.remapToPy(100000)).effective).toBe(255);
  });
});

describe("Python edge cases through the real runtime", () => {
  let output;

  beforeAll(() => {
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
    window.Editor = { highlightLine() {}, clearHighlight() {}, markError() {} };
    PythonRunner.init();
  });

  beforeEach(() => {
    output.length = 0;
    App.speedMultiplier = 1;
    Simulator.setSpeed(1);
    App.robot = makeRobot();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const ROBOT = "from aidriver import AIDriver, hold_state\nr = AIDriver()\n";

  test("float speeds reach the robot unchanged", async () => {
    await PythonRunner.run(
      ROBOT + "r.drive_forward(150.5, 100.25)\nprint(r.get_motor_speeds())\n",
    );
    PythonRunner.processCommandQueue();
    expect(output).toContain("(150.5, 100.25)");
    expect(App.robot).toMatchObject({ rightSpeed: 150.5, leftSpeed: 100.25 });
  });

  test("a non-numeric speed raises TypeError on the calling line", async () => {
    await PythonRunner.run(ROBOT + "r.rotate_left('fast')\n");
    expect(output).toContainEqual(
      expect.stringMatching(/Line 3: TypeError: Speed must be a number/),
    );
  });

  test("hold_state(0) returns immediately and the program continues", async () => {
    await PythonRunner.run(ROBOT + "hold_state(0)\nhold_state(0.0)\nprint('after')\n");
    expect(output).toContain("after");
  });

  test("commands are queued in program order", async () => {
    const queued = [];
    const original = AIDriverStub.queueCommand.bind(AIDriverStub);
    jest.spyOn(AIDriverStub, "queueCommand").mockImplementation((cmd) => {
      queued.push(cmd.type);
      original(cmd);
    });
    await PythonRunner.run(
      ROBOT + "r.drive_forward(200, 200)\nhold_state(0)\nr.rotate_right(200)\nr.brake()\n",
    );
    expect(queued).toEqual(["init", "drive_forward", "hold_state", "rotate_right", "brake"]);
  });

  test("rotate_left from heading 0 wraps the simulated heading below 360", async () => {
    await PythonRunner.run(ROBOT + "r.rotate_left(200)\n");
    PythonRunner.processCommandQueue();
    App.robot = Simulator.step(App.robot, 0.1);
    expect(App.robot.heading).toBeGreaterThan(270);
    expect(App.robot.heading).toBeLessThan(360);
  });

  test("a program with validation errors is never executed", async () => {
    await expect(
      PythonRunner.run(ROBOT + "print('ran')\nwhile True\n    pass\n"),
    ).rejects.toThrow("Validation failed");
    expect(output).not.toContain("ran");
    expect(output).toContainEqual(expect.stringMatching(/Line 4: Missing colon/));
  });
});
