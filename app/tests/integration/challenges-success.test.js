/**
 * End-to-end challenge runs through the real app flow: loadChallenge() places
 * the robot, runCode() executes learner Python in the real Skulpt interpreter
 * via PythonRunner/AIDriverStub, the real app.js animation loop moves the robot
 * (Simulator.step) and records session data (updateSessionTracking), and the
 * outcome is judged by the real Challenges.checkSuccess.
 *
 * Fake timers give every run a deterministic virtual clock: hold_state(1)
 * waits 1000 virtual ms and a physics frame runs every 16 virtual ms.
 */

const {
  loadSkulpt,
  loadModules,
  captureDebugPanel,
} = require("../helpers/load-app");

const FRAME_MS = 16;
const DOM_IDS = [
  "editor",
  "editorCard",
  "ultrasonicDisplay",
  "statusMessage",
  "challengeStatus",
  "statusBar",
  "gamepadPanel",
  "mazeSelector",
  "canvasContainer",
  "challengeDropdown",
  "btnRun",
  "btnStop",
  "btnStep",
];

let output;

beforeAll(() => {
  loadSkulpt();
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(Math, "random").mockReturnValue(0.5); // no ultrasonic noise
  jest.spyOn(console, "trace").mockImplementation(() => {});

  loadModules([
    "validator.js",
    "simulator.js",
    "challenges.js",
    "mazes.js",
    "aidriver-stub.js",
    "python-runner.js",
    "app.js",
  ]);
  output = captureDebugPanel().messages;
  window.render = () => {};
  window.Gamepad = undefined;
  window.Editor = {
    clearAllMarkers() {},
    loadSavedCode: () => null,
    setCode() {},
    getCode: () => "",
    resize() {},
    highlightLine() {},
    clearHighlight() {},
    markError() {},
  };
  // The browser passes the frame timestamp, which the animation loop needs
  window.requestAnimationFrame = (cb) =>
    setTimeout(() => cb(performance.now()), FRAME_MS);

  for (const id of DOM_IDS) {
    const el = document.createElement(id.startsWith("btn") ? "button" : "div");
    el.id = id;
    document.body.appendChild(el);
  }
  window.cacheElements();
  PythonRunner.init();

  App.speedMultiplier = 1;
  Simulator.setSpeed(1);
});

afterEach(() => {
  PythonRunner.stop();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

/**
 * Load a challenge (and optional maze) like the UI does, press Run, let the
 * program run for at most `maxSeconds` of virtual time, press Stop if it is
 * still running, and judge the final robot/session state.
 */
async function runChallenge(challengeId, code, { maxSeconds = 10, maze } = {}) {
  window.loadChallenge(challengeId);
  if (maze) window.loadMaze(maze);
  window.Editor.getCode = () => code;
  window.startAnimationLoop();

  window.runCode();
  for (let t = 0; t < maxSeconds * 1000 && App.isRunning; t += 100) {
    await jest.advanceTimersByTimeAsync(100);
  }
  if (App.isRunning) window.stopExecution();
  await jest.advanceTimersByTimeAsync(100);

  return Challenges.checkSuccess(challengeId, App.robot, App.session);
}

const HEADER =
  "from aidriver import AIDriver, hold_state\nmy_robot = AIDriver()\n";

/** Python helper: drive at `speed` until read_distance() < `distance`. */
const DRIVE_UNTIL = `
def drive_until(distance, speed=200):
    while my_robot.read_distance() > distance:
        my_robot.drive_forward(speed, speed)
        hold_state(0.05)
    my_robot.brake()
    hold_state(0.2)

def turn(rotate, seconds):
    rotate(100)
    hold_state(seconds)
    my_robot.brake()
    hold_state(0.2)

QUARTER_TURN = 0.3
`;

describe("Challenge 0: Fix the Code", () => {
  test("the shipped starter code is rejected and the robot never moves", async () => {
    const starter = window.getStarterCodes()[0];

    const result = await runChallenge(0, starter);

    expect(output).toContainEqual(
      expect.stringMatching(/ERROR +Line 12: Missing colon/),
    );
    expect(App.robot.y).toBe(1800);
    expect(result).toEqual({ success: false, message: "Move at least 100mm" });
  });

  test("fixing the colon and the my_robt typo makes it pass", async () => {
    const fixed = window
      .getStarterCodes()[0]
      .replace("read_distance() == -1\n", "read_distance() == -1:\n")
      .replace("my_robt.", "my_robot.");

    const result = await runChallenge(0, fixed);

    // hold_state(1) at speed 200 covers ~627 mm
    expect(1800 - App.robot.y).toBeCloseTo(627, -1);
    expect(result).toEqual({ success: true, message: "Code runs correctly!" });
  });
});

describe("Challenge 1: Drive in a Straight Line", () => {
  const program = (right, left) =>
    HEADER +
    `while True:\n    my_robot.drive_forward(${right}, ${left})\n    hold_state(0.1)\n`;

  test("balanced motors reach the target zone", async () => {
    const result = await runChallenge(1, program(200, 200), { maxSeconds: 4 });

    expect(App.robot.x).toBeCloseTo(1000);
    expect(result).toEqual({ success: true, message: "Target zone reached!" });
  });

  test("unbalanced motors veer off and miss the zone", async () => {
    const result = await runChallenge(1, program(200, 180), { maxSeconds: 4 });

    expect(Math.abs(App.robot.x - 1000)).toBeGreaterThan(100);
    expect(result.success).toBe(false);
  });
});

describe("Challenge 2: Drive a Circle", () => {
  // Starter: drive_backward(wheel_speed - speed_adjust, wheel_speed + speed_adjust)
  // with wheel_speed 180. speed_adjust -27 (left wheel slower, reversing)
  // gives a 400 mm radius curving up onto the drawn circle, and one lap takes
  // 2*pi / 1.4118 rad/s = 4.45 s.
  const starter = () => window.getStarterCodes()[2];

  test("the starter with a tuned speed_adjust and move_time completes the circle", async () => {
    const code = starter()
      .replace("speed_adjust = 0", "speed_adjust = -27")
      .replace("move_time = 0 ", "move_time = 4.45 ");

    const result = await runChallenge(2, code);

    expect(App.session.totalRotation).toBeGreaterThan(330);
    expect(App.robot.trail.some((p) => p.y < 650)).toBe(true); // went round the top
    expect(result).toEqual({ success: true, message: "Circle completed!" });
  });

  test("stopping half way round fails on rotation", async () => {
    const code = starter()
      .replace("speed_adjust = 0", "speed_adjust = -27")
      .replace("move_time = 0 ", "move_time = 2.2 ");

    const result = await runChallenge(2, code);

    expect(result.success).toBe(false);
    expect(result.message).toMatch(/^Complete more rotation \(1[78]\d° \/ 330°\)$/);
  });
});

describe("Challenge 3: Detect and Stop", () => {
  const starter = () => window.getStarterCodes()[3];

  test("stopping when read_distance() drops to 150 mm succeeds", async () => {
    const code = starter().replace("target_distance = 0 ", "target_distance = 150 ");

    const result = await runChallenge(3, code);

    expect(output).toContainEqual(expect.stringMatching(/^Stopped at distance: 1[1-4]\d$/));
    expect(result).toEqual({ success: true, message: "Perfect stop!" });
    expect(App.elements.challengeStatus.textContent).toBe("SUCCESS!");
  });

  test("the starter's target_distance of 0 drives into the wall", async () => {
    const result = await runChallenge(3, starter());

    expect(result).toEqual({ success: false, message: "Too close to wall!" });
  });
});

describe("Challenge 5: Obstacle Avoidance", () => {
  test("turning left at the first obstacle and right at the second reaches the zone", async () => {
    const code =
      HEADER +
      DRIVE_UNTIL +
      `
drive_until(125)
turn(my_robot.rotate_left, QUARTER_TURN)
drive_until(125)
turn(my_robot.rotate_right, QUARTER_TURN)
drive_until(125)
`;

    const result = await runChallenge(5, code);

    expect(output.join("\n")).not.toMatch(/collision/);
    expect(result).toEqual({ success: true, message: "Target zone reached!" });
  });

  test("driving straight ahead crashes into the first obstacle", async () => {
    const code = HEADER + "my_robot.drive_forward(200, 200)\nhold_state(3)\n";

    const result = await runChallenge(5, code);

    expect(output).toContain("WARN Robot collision detected!");
    expect(App.robot.y).toBeGreaterThan(700); // stopped below the obstacle
    expect(result).toEqual({ success: false, message: "Reach the green target zone" });
  });
});

describe("Challenge 6: Maze Navigation (simple maze)", () => {
  test("a sensor-guided route reaches the maze exit", async () => {
    const code =
      HEADER +
      DRIVE_UNTIL +
      `
drive_until(125)
turn(my_robot.rotate_right, QUARTER_TURN)
drive_until(125)
turn(my_robot.rotate_left, QUARTER_TURN)
drive_until(125)
turn(my_robot.rotate_left, QUARTER_TURN)
drive_until(125)
`;

    const result = await runChallenge(6, code, { maze: "simple", maxSeconds: 15 });

    expect(output.join("\n")).not.toMatch(/collision/);
    expect(result).toEqual({ success: true, message: "Target zone reached!" });
  });

  test("driving straight up is blocked by the maze wall", async () => {
    const code = HEADER + "my_robot.drive_forward(200, 200)\nhold_state(3)\n";

    const result = await runChallenge(6, code, { maze: "simple" });

    expect(output).toContain("WARN Robot collision detected!");
    expect(App.robot.y).toBeGreaterThan(1030);
    expect(result.success).toBe(false);
  });
});

describe("App success reporting", () => {
  test("the app announces SUCCESS! for a correct program", async () => {
    const fixed = window
      .getStarterCodes()[0]
      .replace("read_distance() == -1\n", "read_distance() == -1:\n")
      .replace("my_robt.", "my_robot.");

    const result = await runChallenge(0, fixed);

    expect(result.success).toBe(true);
    expect(App.elements.challengeStatus.textContent).toBe("SUCCESS!");
  });
});
