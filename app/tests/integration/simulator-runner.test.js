/**
 * Simulator <-> runner integration: learner commands flow
 * AIDriverStub.queueCommand -> PythonRunner.processCommandQueue -> App.robot
 * wheel speeds -> Simulator.step, using the real js/ modules (and real Skulpt
 * for the Python tests).
 */

const {
  loadModules,
  loadSkulpt,
  captureDebugPanel,
  makeRobot,
} = require("../helpers/load-app");

const wheelSpeed = (speed) => (speed / 255) * 800; // mm/s at 1x
const WHEEL_BASE = 120;

let output;

function send(type, params = {}) {
  AIDriverStub.queueCommand({ type, params });
  PythonRunner.processCommandQueue();
}

function simulate(seconds, dt = 0.01) {
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    App.robot = Simulator.step(App.robot, dt);
  }
}

// Signed rotation in degrees, clockwise (towards +x from up) positive
const turnedBy = (heading) => (heading > 180 ? heading - 360 : heading);

beforeAll(() => {
  loadSkulpt();
});

beforeEach(() => {
  loadModules(["simulator.js", "aidriver-stub.js", "python-runner.js"]);
  output = captureDebugPanel().messages;
  window.render = () => {};
  window.App = { robot: makeRobot(), speedMultiplier: 1 };
  jest.spyOn(Math, "random").mockReturnValue(0.5); // noise-free ultrasonic
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Command queue drives the simulated robot", () => {
  test("drive_forward moves the robot straight ahead", () => {
    send("drive_forward", { rightSpeed: 200, leftSpeed: 200 });
    simulate(0.5);

    expect(App.robot.y).toBeCloseTo(1000 - wheelSpeed(200) * 0.5);
    expect(App.robot.x).toBeCloseTo(1000);
    expect(App.robot.heading).toBeCloseTo(0);
  });

  test("drive_backward reverses the robot", () => {
    send("drive_backward", { rightSpeed: 150, leftSpeed: 150 });
    simulate(0.5);

    expect(App.robot.y).toBeCloseTo(1000 + wheelSpeed(150) * 0.5);
    expect(App.robot.x).toBeCloseTo(1000);
  });

  test.each([
    ["rotate_left", "counter-clockwise", -1],
    ["rotate_right", "clockwise", 1],
  ])("%s spins %s in place", (type, _, direction) => {
    send(type, { turnSpeed: 120 });
    simulate(0.1);

    const expected =
      ((2 * wheelSpeed(120)) / WHEEL_BASE) * 0.1 * (180 / Math.PI);
    expect(turnedBy(App.robot.heading)).toBeCloseTo(direction * expected);
    expect(App.robot.x).toBeCloseTo(1000);
    expect(App.robot.y).toBeCloseTo(1000);
  });

  test("brake stops the robot where it is", () => {
    send("drive_forward", { rightSpeed: 255, leftSpeed: 255 });
    simulate(0.25);
    send("brake");
    const stoppedAt = App.robot.y;
    simulate(0.5);

    expect(stoppedAt).toBeCloseTo(800);
    expect(App.robot.y).toBe(stoppedAt);
    expect(App.robot.isMoving).toBe(false);
  });

  test("commands queued between frames are applied in order", () => {
    AIDriverStub.queueCommand({
      type: "drive_forward",
      params: { rightSpeed: 200, leftSpeed: 200 },
    });
    AIDriverStub.queueCommand({
      type: "rotate_right",
      params: { turnSpeed: 150 },
    });
    AIDriverStub.queueCommand({ type: "brake", params: {} });
    PythonRunner.processCommandQueue();
    simulate(0.5);

    expect(AIDriverStub.hasCommands()).toBe(false);
    expect(App.robot).toMatchObject({
      x: 1000,
      y: 1000,
      heading: 0,
      isMoving: false,
    });
  });

  test("non-motion commands keep the current motion", () => {
    send("drive_forward", { rightSpeed: 200, leftSpeed: 200 });
    send("init");
    send("hold_state", { seconds: 1 });
    send("read_distance", { result: 500 });
    send("set_motor_speeds", { rightSpeed: 90, leftSpeed: 90 });

    expect(App.robot).toMatchObject({
      leftSpeed: 200,
      rightSpeed: 200,
      isMoving: true,
    });
  });

  test("a queued drive into an obstacle is stopped by the simulator", () => {
    Simulator.setObstacles([{ x: 900, y: 600, width: 200, height: 20 }]);
    send("drive_forward", { rightSpeed: 255, leftSpeed: 255 });
    simulate(1);

    expect(App.robot.isMoving).toBe(false);
    expect(App.robot.y).toBeGreaterThan(620);
    expect(output).toContain("WARN Robot collision detected!");
  });
});

describe("Python programs drive the simulator", () => {
  const ROBOT = "from aidriver import AIDriver, hold_state\nr = AIDriver()\n";

  beforeEach(() => {
    PythonRunner.init();
  });

  test("drive_forward(right, left) maps arguments to the correct wheels", async () => {
    await PythonRunner.run(ROBOT + "r.drive_forward(200, 100)\n");
    PythonRunner.processCommandQueue();
    expect(App.robot).toMatchObject({
      rightSpeed: 200,
      leftSpeed: 100,
      isMoving: true,
    });

    await PythonRunner.run(ROBOT + "r.drive_backward(90, 180)\n");
    PythonRunner.processCommandQueue();
    expect(App.robot).toMatchObject({ rightSpeed: -90, leftSpeed: -180 });
  });

  test("read_distance reports the simulator's reading at the robot's pose", async () => {
    Simulator.setObstacles([{ x: 900, y: 400, width: 200, height: 100 }]);
    App.robot = makeRobot({ y: 900 });
    await PythonRunner.run(ROBOT + "print(r.read_distance())\n");
    expect(output).toContain(String(900 - 75 - 500));
  });

  test("a sensor loop drives forward and brakes before the wall", async () => {
    // Stand-in for the app's animation loop, which steps physics every frame
    const frame = setInterval(() => {
      App.robot = Simulator.step(App.robot, 0.02);
    }, 2);
    try {
      await PythonRunner.run(
        ROBOT +
          "r.drive_forward(200, 200)\n" +
          "d = r.read_distance()\n" +
          "while d > 300:\n" +
          "    hold_state(0.01)\n" +
          "    d = r.read_distance()\n" +
          "r.brake()\n" +
          "hold_state(0.05)\n" +
          "print('stopped', d)\n",
      );
    } finally {
      clearInterval(frame);
    }

    const stopped = output.find((m) => m.startsWith("stopped"));
    expect(stopped).toBeDefined();
    const reported = Number(stopped.split(" ")[1]);
    expect(reported).toBeLessThanOrEqual(300);
    expect(App.robot.isMoving).toBe(false);
    expect(App.robot.x).toBeCloseTo(1000);
    // Robot stayed where it braked: the sensor still reads what Python saw
    expect(Simulator.simulateUltrasonic(App.robot)).toBe(reported);
    expect(reported).toBeGreaterThan(200);
  }, 10000);
});
