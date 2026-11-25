/**
 * Runtime tests that load the real simulator modules (js/*.js) and execute
 * learner code with the real Skulpt interpreter (same version as the CDN).
 */

const {
  loadSkulpt,
  loadModules,
  captureDebugPanel,
  makeRobot,
} = require("../helpers/load-app");

let output;
let highlighted;

function loadRuntime() {
  loadSkulpt();
  loadModules(["simulator.js", "aidriver-stub.js", "python-runner.js", "app.js"]);
  window.render = () => {};
  output = captureDebugPanel().messages;
  window.Editor = {
    highlightLine: (line) => highlighted.push(line),
    clearHighlight: () => {},
    markError: () => {},
  };
  PythonRunner.init();
}

function resetRobot() {
  App.speedMultiplier = 1;
  Simulator.setSpeed(1);
  App.robot = makeRobot();
}

beforeAll(loadRuntime);

beforeEach(() => {
  output.length = 0;
  highlighted = [];
  resetRobot();
  PythonRunner.stepDelay = 1;
});

const ROBOT = "from aidriver import AIDriver, hold_state\nr = AIDriver()\n";

describe("Speed handling matches the robot library", () => {
  test("negative speed raises ValueError on the calling line", async () => {
    await PythonRunner.run(ROBOT + "r.drive_forward(-10, 100)\n");
    expect(output).toContainEqual(
      expect.stringMatching(/Line 3: ValueError: Speed must be between 0 and 255/),
    );
  });

  test("speeds above 255 are raw PWM and barely move the robot", async () => {
    await PythonRunner.run(ROBOT + "r.drive_forward(300, 300)\n");
    PythonRunner.processCommandQueue();
    expect(App.robot.rightSpeed).toBeCloseTo(300 / 257);
    expect(output.some((m) => m.startsWith("WARN") && m.includes("300"))).toBe(true);
  });

  test("low speeds warn once per run", async () => {
    await PythonRunner.run(
      ROBOT + "for i in range(3):\n    r.rotate_left(50)\n",
    );
    expect(output.filter((m) => m.includes("Speed 50 is in the stopped range"))).toHaveLength(1);
  });

  test("get_motor_speeds reports (0, 0) while stopped, even after set_motor_speeds", async () => {
    await PythonRunner.run(
      ROBOT +
        "r.drive_forward(200, 150)\nprint(r.get_motor_speeds())\n" +
        "r.brake()\nr.set_motor_speeds(120, 120)\nprint(r.get_motor_speeds())\n",
    );
    expect(output).toContain("(200, 150)");
    expect(output).toContain("(0, 0)");
  });
});

describe("Robot API parity", () => {
  test("service() exists as on the robot", async () => {
    await PythonRunner.run(ROBOT + "r.service()\nprint('serviced')\n");
    expect(output).toContain("serviced");
  });
});

describe("Step mode runs live", () => {
  test("sensor loop uses real readings and stops near the wall", async () => {
    await PythonRunner.runStepMode(
      ROBOT +
        "r.drive_forward(200, 200)\nd = r.read_distance()\n" +
        "while d > 300:\n    d = r.read_distance()\nr.brake()\nprint('stopped', d)\n",
    );
    const stopped = output.find((m) => m.startsWith("stopped"));
    expect(stopped).toBeDefined();
    expect(Number(stopped.split(" ")[1])).toBeLessThanOrEqual(300);
    expect(App.robot.y).toBeLessThan(1000);
    expect(highlighted.slice(0, 4)).toEqual([1, 2, 3, 4]);
    expect(PythonRunner.isStepping).toBe(false);
    expect(PythonRunner.freezePhysics).toBe(false);
  }, 20000);

  test("errors report the learner's line number", async () => {
    await PythonRunner.runStepMode("a = 1\nb = a / 0\n");
    expect(output).toContainEqual(expect.stringMatching(/Line 2: ZeroDivisionError/));
  });

  test("stop ends an infinite loop", async () => {
    PythonRunner.stepDelay = 20;
    const running = PythonRunner.runStepMode("while True:\n    pass\n");
    await new Promise((resolve) => setTimeout(resolve, 150));
    PythonRunner.stop();
    await running;
    expect(PythonRunner.isStepping).toBe(false);
    expect(highlighted.length).toBeGreaterThan(1);
  });
});

describe("Simulation speed", () => {
  test("slider value drives both hold_state timing and robot velocity", () => {
    const slider = document.createElement("input");
    slider.value = "3";
    App.elements.speedSlider = slider;
    App.elements.speedValue = document.createElement("span");

    window.syncSimulationSpeed();

    expect(App.speedMultiplier).toBe(3);
    App.robot.leftSpeed = 255;
    App.robot.rightSpeed = 255;
    App.robot.isMoving = true;
    const moved = 1000 - Simulator.step(App.robot, 0.25).y;
    // 255 speed = 800 mm/s at 1x, so 3x covers 600 mm in 0.25 s
    expect(moved).toBeCloseTo(600);
    expect(App.elements.speedValue.textContent).toBe("3x");
  });
});
