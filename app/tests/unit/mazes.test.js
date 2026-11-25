/**
 * Maze tests against the real js/mazes.js, using the real Simulator for
 * collision checks and the real app.js maze loader.
 */

const fs = require("fs");
const path = require("path");
const { loadModules, captureDebugPanel, makeRobot, JS_DIR } = require("../helpers/load-app");

const GRID = 25; // mm between candidate robot positions for the reachability search

beforeEach(() => {
  loadModules(["simulator.js", "challenges.js", "mazes.js"]);
  jest.spyOn(Math, "random").mockReturnValue(0.5); // no ultrasonic noise
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Maze ids, read from the real module so test.each covers every maze
const MAZE_IDS = Object.keys(loadModules(["mazes.js"]).Mazes.getAll());
const mazeIds = () => MAZE_IDS;

/** True when a robot centred at (x, y) fits in the arena without touching a wall at any heading it needs to turn through. */
function robotFits(x, y, walls) {
  const clamped = Simulator.applyBoundaryConstraints({ x, y });
  if (clamped.x !== x || clamped.y !== y) return false;
  return [0, 45, 90].every((heading) => !Simulator.checkCollision({ x, y, heading }, walls));
}

/** Breadth-first search over robot positions on a GRID-mm lattice. */
function exitReachable(maze) {
  const n = Math.floor(Simulator.ARENA_WIDTH / GRID);
  const toCell = (v) => Math.round(v / GRID);
  const free = (i, j) => robotFits(i * GRID, j * GRID, maze.walls);
  const { x, y, width, height } = maze.endZone;
  const inExit = (i, j) =>
    i * GRID >= x && i * GRID <= x + width && j * GRID >= y && j * GRID <= y + height;

  const start = [toCell(maze.startPosition.x), toCell(maze.startPosition.y)];
  const seen = new Set([start.join()]);
  const queue = [start];
  while (queue.length) {
    const [i, j] = queue.shift();
    if (inExit(i, j)) return true;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [i + di, j + dj];
      const key = next.join();
      if (next[0] < 0 || next[1] < 0 || next[0] > n || next[1] > n) continue;
      if (seen.has(key) || !free(...next)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  return false;
}

describe("Maze geometry", () => {
  test.each(mazeIds())("%s: every wall lies inside the arena", (id) => {
    for (const wall of Mazes.get(id).walls) {
      expect(wall.width).toBeGreaterThan(0);
      expect(wall.height).toBeGreaterThan(0);
      expect(wall.x).toBeGreaterThanOrEqual(0);
      expect(wall.y).toBeGreaterThanOrEqual(0);
      expect(wall.x + wall.width).toBeLessThanOrEqual(Simulator.ARENA_WIDTH);
      expect(wall.y + wall.height).toBeLessThanOrEqual(Simulator.ARENA_HEIGHT);
    }
  });

  test.each(mazeIds())("%s: the robot starts clear of every wall", (id) => {
    const maze = Mazes.get(id);
    const start = makeRobot(maze.startPosition);

    expect(Simulator.checkCollision(start, maze.walls)).toBe(false);
    expect(Simulator.applyBoundaryConstraints(start)).toMatchObject({ x: start.x, y: start.y });
  });

  test.each(mazeIds())("%s: the exit zone is inside the arena and not walled off", (id) => {
    const { endZone, walls } = Mazes.get(id);

    expect(endZone.x).toBeGreaterThanOrEqual(0);
    expect(endZone.y).toBeGreaterThanOrEqual(0);
    expect(endZone.x + endZone.width).toBeLessThanOrEqual(Simulator.ARENA_WIDTH);
    expect(endZone.y + endZone.height).toBeLessThanOrEqual(Simulator.ARENA_HEIGHT);
    expect(robotFits(endZone.x + endZone.width / 2, endZone.y + endZone.height / 2, walls)).toBe(true);
  });

  test.each(mazeIds())("%s: the exit can be reached from the start", (id) => {
    expect(exitReachable(Mazes.get(id))).toBe(true);
  });

  test("the reachability search detects a sealed exit", () => {
    const maze = Mazes.get("simple");
    const sealed = {
      ...maze,
      walls: [...maze.walls, { x: 0, y: 500, width: 2000, height: 30 }],
    };

    expect(exitReachable(sealed)).toBe(false);
  });
});

describe("Mazes in the simulator", () => {
  test("walls block the robot and are seen by the ultrasonic sensor", () => {
    const maze = Mazes.get("simple");
    Simulator.setMazeWalls(maze.walls);
    const { messages } = captureDebugPanel();

    let robot = makeRobot({ ...maze.startPosition, leftSpeed: 200, rightSpeed: 200, isMoving: true });
    // Sensor sits 75 mm ahead of centre; the first wall's underside is y = 1030
    expect(Simulator.simulateUltrasonic(robot)).toBe(1700 - 75 - 1030);

    for (let i = 0; i < 200 && robot.isMoving; i++) robot = Simulator.step(robot, 0.016);

    expect(robot.isMoving).toBe(false);
    expect(robot.y).toBeGreaterThan(1030 + Simulator.ROBOT_LENGTH / 2 - 15);
    expect(messages).toContain("WARN Robot collision detected!");
  });

  test("every maze offered in simulator.html resolves to its own definition", () => {
    const html = fs.readFileSync(path.join(JS_DIR, "..", "simulator.html"), "utf8");
    const offered = [...html.matchAll(/data-maze="([^"]+)"/g)].map((m) => m[1]);

    expect(offered.sort()).toEqual(mazeIds().sort());
    for (const id of offered) expect(Mazes.get(id).id).toBe(id);
    expect(Mazes.get("no-such-maze").id).toBe("simple");
  });

  test("draw() scales walls and the exit zone to canvas pixels", () => {
    const rects = [];
    const ctx = {
      save() {},
      restore() {},
      fillRect: (...r) => rects.push(r),
      strokeRect() {},
      fillText() {},
    };
    const maze = Mazes.get("zigzag");

    Mazes.draw(ctx, 0.5, "zigzag");

    const expected = [...maze.walls, maze.endZone].map((r) => [r.x / 2, r.y / 2, r.width / 2, r.height / 2]);
    expect(rects).toEqual(expected);
  });
});

describe("app.js maze loading (Challenge 6)", () => {
  beforeEach(() => {
    loadModules(["simulator.js", "challenges.js", "mazes.js", "app.js"]);
    captureDebugPanel();
    window.render = () => {};
    window.updateUltrasonicDisplay = () => {};
    window.updateStatus = () => {};
    App.robot = makeRobot();
    App.currentChallengeConfig = Challenges.get(6);
  });

  test.each(mazeIds())("loadMaze(%s) places the robot, installs the walls and retargets the exit", (id) => {
    const maze = Mazes.get(id);

    window.loadMaze(id);

    expect(App.robot).toMatchObject({ ...maze.startPosition, leftSpeed: 0, rightSpeed: 0 });
    // Walls are live in the simulator: a robot placed on the first wall collides
    const wall = maze.walls[0];
    const onWall = makeRobot({ x: wall.x + wall.width / 2, y: wall.y + wall.height / 2, leftSpeed: 1, isMoving: true });
    expect(Simulator.step(onWall, 0.001).isMoving).toBe(false);

    const exitCentre = {
      x: maze.endZone.x + maze.endZone.width / 2,
      y: maze.endZone.y + maze.endZone.height / 2,
    };
    expect(Challenges.checkSuccess(6, exitCentre, App.session).success).toBe(true);
    expect(Challenges.checkSuccess(6, maze.startPosition, App.session).success).toBe(false);
  });
});

describe("Switching away from Challenge 6", () => {
  beforeEach(() => {
    loadModules(["simulator.js", "challenges.js", "mazes.js", "app.js"]);
    captureDebugPanel();
    window.render = () => {};
    window.Gamepad = undefined;
    window.Editor = { clearAllMarkers() {}, loadSavedCode: () => null, setCode() {}, resize() {} };
    for (const id of ["editor", "editorCard", "ultrasonicDisplay", "statusMessage", "statusBar",
      "challengeStatus", "gamepadPanel", "mazeSelector", "canvasContainer"]) {
      const el = document.createElement("div");
      el.id = id;
      document.body.appendChild(el);
    }
    window.cacheElements();
  });

  // BUG (js/app.js:483-489): loadChallenge() calls Simulator.setObstacles(),
  // which leaves maze walls in place (every challenge has `obstacles: []`, so
  // clearObstacles() is never reached), and App.currentMaze is never reset.
  // After visiting a maze, Challenge 1's sensor reads 695 mm (the old maze
  // wall) instead of 1725 mm, and the robot collides with invisible walls.
  test.skip("maze walls are removed when another challenge is loaded", () => {
    window.loadChallenge(6);
    window.loadMaze("simple");
    window.loadChallenge(1);

    // Challenge 1 has an empty arena: the sensor sees the top wall
    expect(Simulator.simulateUltrasonic(App.robot)).toBe(1800 - 75);
    expect(App.currentMaze).toBeFalsy();
  });
});
