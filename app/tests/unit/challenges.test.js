/**
 * Challenge tests against the real js/challenges.js, using the real Simulator
 * (and mazes for Challenge 6) to check that layouts are physically sensible.
 */

const { loadModules, makeRobot } = require("../helpers/load-app");

// Challenge ids, read from the real module so test.each covers every challenge
const IDS = Object.keys(loadModules(["challenges.js"]).Challenges.getAll());

beforeEach(() => {
  loadModules(["simulator.js", "challenges.js", "mazes.js"]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

/** Obstacles and (for Challenge 6) default maze walls the robot must avoid. */
function blockers(challenge) {
  const walls = challenge.maze ? Mazes.get(challenge.maze).walls : [];
  return [...challenge.obstacles, ...walls];
}

/** True when a robot at this pose is fully inside the arena and touches nothing. */
function fits(pose, obstacles) {
  const clamped = Simulator.applyBoundaryConstraints(pose);
  return (
    clamped.x === pose.x &&
    clamped.y === pose.y &&
    !Simulator.checkCollision(makeRobot(pose), obstacles)
  );
}

/** Points every `step` mm along a polyline, with the heading of travel. */
function samplePolyline(points, step = 25) {
  const samples = [];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const heading = (Math.atan2(b.x - a.x, a.y - b.y) * 180) / Math.PI;
    for (let d = 0; d <= length; d += step) {
      samples.push({
        x: a.x + ((b.x - a.x) * d) / length,
        y: a.y + ((b.y - a.y) * d) / length,
        heading,
      });
    }
  }
  return samples;
}

describe("Challenge layouts", () => {
  test.each(IDS)("challenge %s: the robot starts inside the arena, clear of obstacles", (id) => {
    const challenge = Challenges.get(id);

    expect(fits(challenge.startPosition, blockers(challenge))).toBe(true);
  });

  test.each(IDS.filter((id) => Challenges.get(id).successCriteria.zone))(
    "challenge %s: the target zone is inside the arena and the robot fits in it",
    (id) => {
      const challenge = Challenges.get(id);
      const { x, y, width, height } = challenge.successCriteria.zone;

      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(Simulator.ARENA_WIDTH);
      expect(y + height).toBeLessThanOrEqual(Simulator.ARENA_HEIGHT);
      const centre = { x: x + width / 2, y: y + height / 2, heading: 0 };
      expect(fits(centre, challenge.obstacles)).toBe(true);
    },
  );

  test("Challenge 1's guide line ends inside its target zone", () => {
    const { path } = Challenges.get(1);
    const end = { ...path.end, heading: 0 };

    expect(fits(end, [])).toBe(true);
    expect(Challenges.checkSuccess(1, end, {}).success).toBe(true);
  });

  test("Challenge 2 starts on its drawn circle, heading along it, and the circle fits the arena", () => {
    const { startPosition: start, path } = Challenges.get(2);

    expect(Math.hypot(start.x - path.center.x, start.y - path.center.y)).toBe(path.radius);
    expect(start.heading % 180).toBe(90); // tangent at the bottom of the circle
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const edge = { x: path.center.x + dx * path.radius, y: path.center.y + dy * path.radius, heading: 0 };
      expect(fits(edge, [])).toBe(true);
    }
  });

  test("Challenge 5's intended route is collision-free and ends in the target zone", () => {
    const { path, obstacles } = Challenges.get(5);
    const route = samplePolyline(path.waypoints);

    expect(route.filter((pose) => !fits(pose, obstacles))).toEqual([]);
    const end = route[route.length - 1];
    expect(Challenges.checkSuccess(5, end, {}).success).toBe(true);
  });

  test("Challenge 5's obstacles are what the sensor sees at each turning point", () => {
    jest.spyOn(Math, "random").mockReturnValue(0.5); // no sensor noise
    const { path, obstacles } = Challenges.get(5);
    Simulator.setObstacles(obstacles);
    const [, firstTurn, secondTurn] = path.waypoints;

    // Facing north at the first turn: obstacle 1's underside (y = 700)
    expect(Simulator.simulateUltrasonic({ ...firstTurn, heading: 0 })).toBe(900 - 75 - 700);
    // Facing west at the second turn: obstacle 2's right side (x = 300)
    expect(Simulator.simulateUltrasonic({ ...secondTurn, heading: 270 })).toBe(500 - 75 - 300);
  });

  test.each(IDS.filter((id) => id !== "4"))(
    "challenge %s: its success criteria type is evaluated by checkSuccess",
    (id) => {
      const start = Challenges.get(id).startPosition;
      const result = Challenges.checkSuccess(id, makeRobot(start), { startPosition: start });

      expect(result.message).not.toBe("Unknown criteria type");
    },
  );

});

describe("checkSuccess", () => {
  describe("complete_square (challenge 4)", () => {
    const start = Challenges.get(4).startPosition;
    // Session after driving 800 mm sides from the start corner
    const square = (extra) => ({
      startPosition: start,
      totalRotation: 360,
      minX: start.x,
      maxX: start.x + 800,
      minY: start.y - 800,
      maxY: start.y,
      ...extra,
    });

    test("four turns, long sides and back at the start corner passes", () => {
      expect(Challenges.checkSuccess(4, makeRobot(start), square())).toEqual({
        success: true,
        message: "Square complete!",
      });
    });

    test("turning left round the square also passes", () => {
      expect(
        Challenges.checkSuccess(4, makeRobot(start), square({ totalRotation: -350 })).success,
      ).toBe(true);
    });

    test("only three turns fails", () => {
      expect(
        Challenges.checkSuccess(4, makeRobot(start), square({ totalRotation: 270 })).message,
      ).toBe("Make all 4 turns (270° / 360°)");
    });

    test("sides shorter than the minimum fail", () => {
      const small = square({ maxX: start.x + 500, minY: start.y - 500 });
      expect(Challenges.checkSuccess(4, makeRobot(start), small).message).toBe(
        "Make the sides longer (at least 600mm)",
      );
    });

    test("finishing away from the start corner fails", () => {
      const away = makeRobot({ x: start.x + 300, y: start.y });
      expect(Challenges.checkSuccess(4, away, square()).message).toBe(
        "Finish back at the starting corner",
      );
    });
  });

  describe.each(["debug", 0])("run_without_error (challenge %s)", (id) => {
    const startPosition = { x: 1000, y: 1800 };
    const session = (extra) => ({ startPosition, hasError: false, ...extra });

    test("moving exactly the minimum 100 mm passes", () => {
      const robot = makeRobot({ x: 1060, y: 1720 }); // 3-4-5 triangle: 100 mm

      expect(Challenges.checkSuccess(id, robot, session({ debugEnabled: true }))).toEqual({
        success: true,
        message: "Code runs correctly!",
      });
    });

    test("moving less than 100 mm fails", () => {
      const robot = makeRobot({ x: 1000, y: 1701 });

      expect(Challenges.checkSuccess(id, robot, session())).toEqual({
        success: false,
        message: "Move at least 100mm",
      });
    });

    test("an errored run fails however far the robot went", () => {
      const robot = makeRobot({ x: 1000, y: 200 });

      expect(Challenges.checkSuccess(id, robot, session({ hasError: true }))).toEqual({
        success: false,
        message: "Code has errors",
      });
    });
  });

  test("challenge 0 also needs AIDriver debug messages turned on", () => {
    const robot = makeRobot({ y: 1000 });
    const session = { startPosition: { x: 1000, y: 1800 }, hasError: false };

    expect(Challenges.checkSuccess(0, robot, session)).toEqual({
      success: false,
      message:
        "It runs, but the AIDriver debug messages are still off. One bug doesn't cause an error message - can you find it?",
    });
    expect(Challenges.checkSuccess("debug", robot, session).success).toBe(true);
  });

  test("unknown challenge ids are judged by Challenge 0's rules", () => {
    const session = { startPosition: { x: 1000, y: 1800 }, debugEnabled: true };

    expect(Challenges.get(99)).toBe(Challenges.get(0));
    expect(Challenges.checkSuccess(99, makeRobot({ y: 1000 }), session).success).toBe(true);
    expect(Challenges.checkSuccess(99, makeRobot({ y: 1750 }), session).success).toBe(false);
  });

  describe("reach_zone (challenge 1: x 900-1100, y 0-150)", () => {
    test.each([
      [900, 0],
      [1100, 150],
      [1000, 75],
    ])("(%d, %d) is inside the zone (edges included)", (x, y) => {
      expect(Challenges.checkSuccess(1, makeRobot({ x, y }), {})).toEqual({
        success: true,
        message: "Target zone reached!",
      });
    });

    test.each([
      [899, 75],
      [1101, 75],
      [1000, 151],
    ])("(%d, %d) is outside the zone", (x, y) => {
      expect(Challenges.checkSuccess(1, makeRobot({ x, y }), {})).toEqual({
        success: false,
        message: "Reach the green target zone",
      });
    });
  });

  describe("complete_circle (challenge 2: >= 330 deg, finish within 100 mm)", () => {
    const startPosition = { x: 1000, y: 1400 };
    const atStart = makeRobot(startPosition);

    test.each([330, -330, 365])("rotation of %d deg ending at the start passes", (totalRotation) => {
      expect(Challenges.checkSuccess(2, atStart, { startPosition, totalRotation })).toEqual({
        success: true,
        message: "Circle completed!",
      });
    });

    test("329 deg of rotation is not enough", () => {
      expect(Challenges.checkSuccess(2, atStart, { startPosition, totalRotation: -329 })).toEqual({
        success: false,
        message: "Complete more rotation (329° / 330°)",
      });
    });

    test("a run with no recorded rotation fails", () => {
      expect(Challenges.checkSuccess(2, atStart, { startPosition }).success).toBe(false);
    });

    test("a run that wanders off the drawn circle fails", () => {
      const session = { startPosition, totalRotation: 360, maxPathDeviation: 101, pathAngle: 360 };

      expect(Challenges.checkSuccess(2, atStart, session)).toEqual({
        success: false,
        message:
          "Stay on the green circle (went 101mm off it). Change speed_adjust to change the size of your circle.",
      });
      expect(
        Challenges.checkSuccess(2, atStart, { ...session, maxPathDeviation: 100 }).success,
      ).toBe(true);
    });

    test("turning without going round the circle's centre fails", () => {
      const session = { startPosition, totalRotation: 360, maxPathDeviation: 20, pathAngle: -40 };

      expect(Challenges.checkSuccess(2, atStart, session)).toEqual({
        success: false,
        message: "Drive all the way round the green circle (40° / 330°)",
      });
    });

    test("finishing exactly 100 mm from the start passes, 101 mm fails", () => {
      const session = { startPosition, totalRotation: 360 };

      expect(Challenges.checkSuccess(2, makeRobot({ x: 1100, y: 1400 }), session).success).toBe(true);
      expect(Challenges.checkSuccess(2, makeRobot({ x: 1000, y: 1501 }), session)).toEqual({
        success: false,
        message: "Return closer to start (101mm away)",
      });
    });
  });

  describe("stop_at_distance (challenge 3: 100-200 mm from the front of the robot to the wall)", () => {
    const { wallPosition } = Challenges.get(3).successCriteria;
    // Measured from the robot's front edge, where the ultrasonic sensor is
    const stoppedAt = (gap) =>
      makeRobot({ y: wallPosition + Simulator.ROBOT_LENGTH / 2 + gap });

    test.each([100, 150, 200])("stopped %d mm from the wall passes", (gap) => {
      expect(Challenges.checkSuccess(3, stoppedAt(gap), {})).toEqual({
        success: true,
        message: "Perfect stop!",
      });
    });

    test("stopping 99 mm away is too close", () => {
      expect(Challenges.checkSuccess(3, stoppedAt(99), {})).toEqual({
        success: false,
        message: "Too close to wall!",
      });
    });

    test("stopping 201 mm away is too far", () => {
      expect(Challenges.checkSuccess(3, stoppedAt(201), {})).toEqual({
        success: false,
        message: "Get closer to wall (201mm)",
      });
    });

    test("the robot must have stopped, even in the window", () => {
      const rolling = makeRobot({ y: wallPosition + 150, leftSpeed: 0, rightSpeed: 1 });

      expect(Challenges.checkSuccess(3, rolling, {})).toEqual({
        success: false,
        message: "Robot must stop",
      });
    });
  });

  test("manual (challenge 7) is never auto-completed", () => {
    const session = { startPosition: { x: 1000, y: 1000 }, totalRotation: 720 };

    expect(Challenges.checkSuccess(7, makeRobot({ y: 100 }), session)).toEqual({
      success: false,
      message: "Manual mode - no auto-check",
    });
  });
});

describe("Challenge menu", () => {
  function renderMenu(menuType) {
    document.body.innerHTML = '<ul id="menu"></ul>';
    Challenges.populateMenu("#menu", menuType);
    return document.getElementById("menu");
  }

  test("lists debug, then 0-5, then 6-7, separated by dividers, each linking to its challenge", () => {
    const menu = renderMenu();

    const items = [...menu.children].map((li) =>
      li.querySelector("hr") ? "---" : li.querySelector("a").dataset.challenge,
    );
    expect(items).toEqual(["debug", "---", "0", "1", "2", "3", "4", "5", "---", "6", "7"]);
    for (const link of menu.querySelectorAll("a")) {
      const id = link.dataset.challenge;
      // app.js loadChallenge() looks challenges up by these data attributes
      expect(String(Challenges.get(id).id)).toBe(id);
      expect(link.getAttribute("href")).toBe(`simulator.html?challenge=${id}`);
      expect(link.textContent).toContain(Challenges.get(id).title);
    }
  });

  test("docs menus link to each challenge's documentation page", () => {
    const hrefs = [...renderMenu("docs").querySelectorAll("a")].map((a) => a.getAttribute("href"));

    expect(hrefs.sort()).toEqual(IDS.map((id) => `docs.html?doc=Challenge_${id}`).sort());
  });
});
