/**
 * Simulator unit tests: differential-drive kinematics, arena limits,
 * collisions and the ultrasonic sensor of the real js/simulator.js.
 */

const { loadModules, makeRobot } = require("../helpers/load-app");

// Motor speed 255 drives a wheel at 800 mm/s at 1x simulation speed
const wheelSpeed = (speed) => (speed / 255) * 800;
// The robot is 150 mm long; the ultrasonic sensor sits on its front edge
const HALF_LENGTH = 75;

const moving = (overrides) => makeRobot({ isMoving: true, ...overrides });

function stepFor(robot, seconds, dt = 0.05) {
  let state = robot;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    state = Simulator.step(state, dt);
  }
  return state;
}

beforeEach(() => {
  loadModules(["simulator.js"]);
  window.DebugPanel = { warning: jest.fn() };
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Simulator.step kinematics", () => {
  test("a stopped robot is returned unchanged", () => {
    const robot = Simulator.getInitialRobotState();
    expect(Simulator.step(robot, 1)).toBe(robot);
  });

  test("equal wheel speeds drive straight ahead (heading 0 is up, -y)", () => {
    const robot = moving({ leftSpeed: 255, rightSpeed: 255 });
    const next = Simulator.step(robot, 0.5);

    expect(next.y).toBeCloseTo(1000 - 400);
    expect(next.x).toBeCloseTo(1000);
    expect(next.heading).toBeCloseTo(0);
    expect(robot.y).toBe(1000);
  });

  test("heading 90 drives towards +x", () => {
    const next = Simulator.step(
      moving({ heading: 90, leftSpeed: 51, rightSpeed: 51 }),
      1,
    );
    expect(next.x).toBeCloseTo(1000 + wheelSpeed(51));
    expect(next.y).toBeCloseTo(1000);
  });

  test("negative speeds drive backwards", () => {
    const next = Simulator.step(
      moving({ leftSpeed: -200, rightSpeed: -200 }),
      0.5,
    );
    expect(next.y).toBeCloseTo(1000 + wheelSpeed(200) * 0.5);
    expect(next.heading).toBeCloseTo(0);
  });

  test("many small steps cover the same distance as one large step", () => {
    const robot = moving({ heading: 30, leftSpeed: 180, rightSpeed: 180 });
    const one = Simulator.step(robot, 0.5);
    const many = stepFor(robot, 0.5, 0.01);
    expect(many.x).toBeCloseTo(one.x, 6);
    expect(many.y).toBeCloseTo(one.y, 6);
  });

  test("opposite wheel speeds rotate in place", () => {
    const dt = 0.1;
    const omega = (2 * wheelSpeed(100)) / 120; // rad/s over the 120 mm wheel base
    const sweep = (omega * dt * 180) / Math.PI;

    const a = Simulator.step(moving({ leftSpeed: -100, rightSpeed: 100 }), dt);
    const b = Simulator.step(moving({ leftSpeed: 100, rightSpeed: -100 }), dt);

    for (const r of [a, b]) {
      expect(r.x).toBeCloseTo(1000);
      expect(r.y).toBeCloseTo(1000);
    }
    expect(Math.min(a.heading, 360 - a.heading)).toBeCloseTo(sweep);
    // Swapping the wheels rotates the other way; heading stays in [0, 360)
    expect((a.heading + b.heading) % 360).toBeCloseTo(0);
    expect(Math.max(a.heading, b.heading)).toBeLessThan(360);
  });

  test("unequal wheel speeds follow a circular arc", () => {
    const dt = 0.2;
    const vL = wheelSpeed(100);
    const vR = wheelSpeed(200);
    const omega = (vR - vL) / 120;
    const radius = (vL + vR) / 2 / omega;
    const turn = omega * dt;

    const a = Simulator.step(moving({ leftSpeed: 100, rightSpeed: 200 }), dt);
    const b = Simulator.step(moving({ leftSpeed: 200, rightSpeed: 100 }), dt);

    const turned = Math.min(a.heading, 360 - a.heading);
    expect(turned).toBeCloseTo((turn * 180) / Math.PI);
    const chord = Math.hypot(a.x - 1000, a.y - 1000);
    expect(chord).toBeCloseTo(2 * radius * Math.sin(turn / 2));
    // The robot moves along the arc it turns into: the chord bisects the turn
    const signedTurn = a.heading > 180 ? a.heading - 360 : a.heading;
    const chordHeading =
      (Math.atan2(a.x - 1000, -(a.y - 1000)) * 180) / Math.PI;
    expect(chordHeading).toBeCloseTo(signedTurn / 2);
    // Mirrored wheel speeds give a mirrored path
    expect(b.x - 1000).toBeCloseTo(-(a.x - 1000));
    expect(b.y).toBeCloseTo(a.y);
    // A faster right wheel turns the robot left (anticlockwise), as on the
    // real robot, and a faster left wheel turns it right
    expect(a.heading).toBeGreaterThan(180);
    expect(a.x).toBeLessThan(1000);
    expect(b.heading).toBeLessThan(180);
    expect(b.x).toBeGreaterThan(1000);
  });

  test("simulation speed scales distance travelled", () => {
    Simulator.setSpeed(2);
    expect(
      Simulator.step(moving({ leftSpeed: 255, rightSpeed: 255 }), 0.5).y,
    ).toBeCloseTo(1000 - 800);
  });

  test.each([
    [100, 5, 0.1],
    [0, 0.1, 1],
  ])("setSpeed(%p) is clamped to %p", (requested, clamped, dt) => {
    Simulator.setSpeed(requested);
    const next = Simulator.step(
      moving({ leftSpeed: 255, rightSpeed: 255 }),
      dt,
    );
    expect(1000 - next.y).toBeCloseTo(800 * clamped * dt);
  });

  test("each step appends to the trail, capped at 1000 points", () => {
    const trail = Array.from({ length: 1000 }, (_, i) => ({ x: i, y: i }));
    const next = Simulator.step(
      moving({ leftSpeed: 255, rightSpeed: 255, trail }),
      0.1,
    );
    expect(next.trail).toHaveLength(1000);
    expect(next.trail[0]).toEqual({ x: 1, y: 1 });
    expect(next.trail[999]).toEqual({ x: next.x, y: next.y });
    expect(trail).toHaveLength(1000);
  });
});

describe("Arena boundaries", () => {
  test("driving into the top wall stops at the robot's footprint radius", () => {
    const next = Simulator.step(
      moving({ y: 100, leftSpeed: 255, rightSpeed: 255 }),
      0.5,
    );
    expect(next.y).toBe(75);
    expect(next.x).toBeCloseTo(1000);
  });

  test("driving into the right wall is clamped", () => {
    const next = Simulator.step(
      moving({ x: 1900, heading: 90, leftSpeed: 255, rightSpeed: 255 }),
      1,
    );
    expect(next.x).toBe(2000 - 75);
  });

  test("applyBoundaryConstraints clamps both axes", () => {
    const clamped = Simulator.applyBoundaryConstraints(
      makeRobot({ x: -50, y: 5000 }),
    );
    expect(clamped).toMatchObject({ x: 75, y: 1925 });
  });
});

describe("Collisions", () => {
  const wall = { x: 900, y: 700, width: 200, height: 50 };

  test("driving into an obstacle stops the robot and warns", () => {
    Simulator.setObstacles([wall]);
    let robot = moving({ leftSpeed: 255, rightSpeed: 255 });
    for (let i = 0; i < 20 && robot.isMoving; i++) {
      robot = Simulator.step(robot, 0.1);
    }

    expect(robot).toMatchObject({
      isMoving: false,
      leftSpeed: 0,
      rightSpeed: 0,
    });
    expect(robot.y - HALF_LENGTH).toBeLessThanOrEqual(wall.y + wall.height);
    expect(robot.y).toBeGreaterThan(wall.y + wall.height);
    expect(DebugPanel.warning).toHaveBeenCalledWith(
      "Robot collision detected!",
    );
    expect(Simulator.step(robot, 0.1)).toBe(robot);
  });

  test("maze walls also stop the robot", () => {
    Simulator.setMazeWalls([wall]);
    expect(
      stepFor(moving({ leftSpeed: 255, rightSpeed: 255 }), 1).isMoving,
    ).toBe(false);
  });

  test("an obstacle beside the robot's path is not hit", () => {
    Simulator.setObstacles([{ x: 1065, y: 300, width: 100, height: 500 }]);
    const robot = stepFor(moving({ leftSpeed: 255, rightSpeed: 255 }), 1);
    expect(robot.isMoving).toBe(true);
    expect(robot.y).toBeCloseTo(200);
    expect(DebugPanel.warning).not.toHaveBeenCalled();
  });

  test("clearObstacles removes obstacles and maze walls", () => {
    Simulator.setObstacles([wall]);
    Simulator.setMazeWalls([{ ...wall, y: 600 }]);
    Simulator.clearObstacles();
    expect(
      stepFor(moving({ leftSpeed: 255, rightSpeed: 255 }), 1).isMoving,
    ).toBe(true);
  });

  test("the collision footprint rotates with the robot", () => {
    // 120 mm wide x 150 mm long: reaches 60 mm sideways facing up, 75 mm facing right
    const box = { x: 1070, y: 950, width: 50, height: 100 };
    expect(Simulator.checkCollision(makeRobot({ heading: 0 }), [box])).toBe(
      false,
    );
    expect(Simulator.checkCollision(makeRobot({ heading: 90 }), [box])).toBe(
      true,
    );
    expect(Simulator.checkCollision(makeRobot({ heading: 90 }), [])).toBe(
      false,
    );
  });

  test("getRobotCorners places the front edge in the direction of travel", () => {
    const front = Simulator.getRobotCorners(makeRobot({ heading: 90 })).slice(
      0,
      2,
    );
    for (const corner of front) {
      expect(corner.x).toBeCloseTo(1075);
    }
    expect(front.map((c) => c.y).sort((p, q) => p - q)).toEqual([
      expect.closeTo(940),
      expect.closeTo(1060),
    ]);
  });
});

describe("Simulator.simulateUltrasonic", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0.5); // zero noise
  });

  test.each([
    ["up", { heading: 0 }, 1000 - HALF_LENGTH],
    ["right", { heading: 90 }, 1000 - HALF_LENGTH],
    ["down", { y: 500, heading: 180 }, 1500 - HALF_LENGTH],
    ["left", { x: 300, heading: 270 }, 300 - HALF_LENGTH],
    [
      "diagonally",
      { heading: 45 },
      Math.round((1000 - HALF_LENGTH * Math.SQRT1_2) * Math.SQRT2),
    ],
  ])("measures the arena wall when facing %s", (_, pose, expected) => {
    expect(Simulator.simulateUltrasonic(makeRobot(pose))).toBe(expected);
  });

  test("adds up to ±2 mm of noise and rounds to whole millimetres", () => {
    Math.random.mockReturnValue(0);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(923);
    Math.random.mockReturnValue(0.99);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(927);
  });

  test("reports the nearest obstacle in front of the sensor", () => {
    Simulator.setObstacles([
      { x: 950, y: 200, width: 100, height: 100 },
      { x: 950, y: 400, width: 100, height: 100 },
      { x: 950, y: 1200, width: 100, height: 100 }, // behind
      { x: 1100, y: 600, width: 100, height: 100 }, // off to the side
    ]);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(925 - 500);
  });

  test("sees maze walls", () => {
    Simulator.setMazeWalls([{ x: 0, y: 600, width: 2000, height: 10 }]);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(925 - 610);
  });

  test("returns -1 when closer than 20 mm", () => {
    expect(Simulator.simulateUltrasonic(makeRobot({ y: 100 }))).toBe(25);
    expect(Simulator.simulateUltrasonic(makeRobot({ y: 90 }))).toBe(-1);

    Simulator.setObstacles([{ x: 950, y: 900, width: 100, height: 10 }]);
    expect(Simulator.simulateUltrasonic(makeRobot())).toBe(-1);
  });

  test("returns -1 when nothing is within 2000 mm", () => {
    // Facing the far corner diagonally: ~2612 mm to either wall
    expect(
      Simulator.simulateUltrasonic(makeRobot({ x: 100, y: 1900, heading: 45 })),
    ).toBe(-1);
  });
});
