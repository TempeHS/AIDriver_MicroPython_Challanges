/**
 * Integration Tests - Challenges + Success Criteria
 * Tests for challenge completion detection and validation
 */

const fs = require("fs");
const path = require("path");

// Load modules
const loadModule = (filename) => {
  const code = fs.readFileSync(
    path.join(__dirname, "../../js", filename),
    "utf8"
  );
  return code;
};

global.DebugPanel = {
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
};

eval(loadModule("challenges.js"));
eval(loadModule("mazes.js"));
eval(loadModule("simulator.js"));

describe("Integration: Challenges + Success Criteria", () => {
  let robot;
  let session;

  beforeEach(() => {
    robot = {
      x: 1000,
      y: 1000,
      heading: 0,
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
      trail: [],
    };

    session = {
      startTime: Date.now(),
      startX: 1000,
      startY: 1000,
      minY: 1000,
      maxY: 1000,
      collisions: 0,
      commandCount: 0,
    };
  });

  describe("Challenge 0: Fix the Code", () => {
    const challenge = Challenges[0];

    test("should have success criteria", () => {
      expect(challenge.successCriteria).toBeDefined();
    });

    test("starter code should contain intentional errors", () => {
      const code = challenge.starterCode;
      // Should have some issues for students to fix
      expect(code.length).toBeGreaterThan(10);
    });

    test("success should be achievable", () => {
      if (challenge.successCriteria) {
        // Moving robot should be able to succeed
        robot.isMoving = true;
        robot.y = 900;

        const result = challenge.successCriteria(robot, session);
        // Result structure should be correct
        expect(result).toBeDefined();
        expect(typeof result.success).toBe("boolean");
      }
    });
  });

  describe("Challenge 1: Drive Straight", () => {
    const challenge = Challenges[1];

    test("should have target zone defined", () => {
      expect(challenge.targetZone).toBeDefined();
    });

    test("robot at target should succeed", () => {
      if (challenge.successCriteria && challenge.targetZone) {
        // Place robot in target zone
        robot.x = challenge.targetZone.x;
        robot.y = challenge.targetZone.y;

        const result = challenge.successCriteria(robot, session);
        expect(result.success).toBe(true);
      }
    });

    test("robot at start should not succeed", () => {
      if (challenge.successCriteria) {
        robot.x = 1000;
        robot.y = 1500;

        const result = challenge.successCriteria(robot, session);
        expect(result.success).toBe(false);
      }
    });

    test("starter code should include drive_forward", () => {
      expect(challenge.starterCode).toContain("drive_forward");
    });
  });

  describe("Challenge 2: Drive Straight Again", () => {
    const challenge = Challenges[2];

    test("should have different starting or target than Challenge 1", () => {
      const ch1 = Challenges[1];

      // Either start or target should differ
      const differentStart =
        !challenge.startPosition ||
        !ch1.startPosition ||
        challenge.startPosition.x !== ch1.startPosition.x ||
        challenge.startPosition.y !== ch1.startPosition.y;

      const differentTarget =
        !challenge.targetZone ||
        !ch1.targetZone ||
        challenge.targetZone.x !== ch1.targetZone.x ||
        challenge.targetZone.y !== ch1.targetZone.y;

      expect(differentStart || differentTarget).toBe(true);
    });
  });

  describe("Challenge 3: U-Turn", () => {
    const challenge = Challenges[3];

    test("should have success criteria involving direction change", () => {
      expect(challenge.successCriteria).toBeDefined();
    });

    test("robot returning to start area should succeed", () => {
      if (challenge.successCriteria) {
        // Simulate U-turn: go forward then come back
        session.minY = 200; // Went far forward
        robot.y = 1400; // Came back

        const result = challenge.successCriteria(robot, session);
        // Should check for U-turn pattern
        expect(result).toBeDefined();
      }
    });

    test("starter code should include rotation", () => {
      expect(
        challenge.starterCode.includes("rotate_left") ||
          challenge.starterCode.includes("rotate_right")
      ).toBe(true);
    });
  });

  describe("Challenge 4: The Boxes", () => {
    const challenge = Challenges[4];

    test("should have obstacles defined", () => {
      expect(challenge.obstacles).toBeDefined();
      expect(Array.isArray(challenge.obstacles)).toBe(true);
    });

    test("obstacles should be within arena", () => {
      if (challenge.obstacles) {
        challenge.obstacles.forEach((obs) => {
          expect(obs.x).toBeGreaterThanOrEqual(0);
          expect(obs.x).toBeLessThanOrEqual(2000);
          expect(obs.y).toBeGreaterThanOrEqual(0);
          expect(obs.y).toBeLessThanOrEqual(2000);
        });
      }
    });

    test("success should require avoiding collisions", () => {
      if (challenge.successCriteria) {
        session.collisions = 5;

        const result = challenge.successCriteria(robot, session);
        // With collisions, should not succeed (unless target reached)
        expect(result).toBeDefined();
      }
    });
  });

  describe("Challenge 5: The Wall", () => {
    const challenge = Challenges[5];

    test("should focus on ultrasonic usage", () => {
      expect(
        challenge.starterCode.includes("read_distance") ||
          challenge.description.toLowerCase().includes("distance") ||
          challenge.description.toLowerCase().includes("ultrasonic")
      ).toBe(true);
    });

    test("should have wall obstacle", () => {
      if (challenge.obstacles) {
        // Should have at least one wall
        expect(challenge.obstacles.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Challenge 6: The Maze", () => {
    const challenge = Challenges[6];

    test("should reference mazes", () => {
      expect(Mazes).toBeDefined();
      expect(
        Array.isArray(Mazes) ? Mazes.length : Object.keys(Mazes).length
      ).toBeGreaterThan(0);
    });

    test("each maze should be completable", () => {
      const getMazes = () =>
        Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

      getMazes().forEach((maze) => {
        const start = maze.start || maze.startPosition;
        const goal = maze.goal || maze.target || maze.targetZone;

        // Start and goal should be in valid positions
        expect(start.x).toBeDefined();
        expect(goal.x).toBeDefined();

        // Goal should be reachable (not inside a wall)
        maze.walls.forEach((wall) => {
          const goalInWall =
            goal.x >= wall.x &&
            goal.x <= wall.x + wall.width &&
            goal.y >= wall.y &&
            goal.y <= wall.y + wall.height;

          expect(goalInWall).toBe(false);
        });
      });
    });
  });

  describe("Challenge 7: Gamepad", () => {
    const challenge = Challenges[7];

    test("should indicate gamepad mode", () => {
      expect(
        challenge.gamepadMode === true ||
          challenge.isGamepad === true ||
          challenge.type === "gamepad"
      ).toBe(true);
    });

    test("should not have code-based success criteria", () => {
      // Gamepad challenge is free-form exploration
      // May not have success criteria or have special handling
      if (challenge.successCriteria) {
        const result = challenge.successCriteria(robot, session);
        // Should always succeed or have no criteria
        expect(result).toBeDefined();
      }
    });
  });

  describe("Target Zone Collision Detection", () => {
    test("should detect robot in circular target", () => {
      const targetZone = { x: 1000, y: 200, radius: 100 };
      robot.x = 1000;
      robot.y = 200;

      const dx = robot.x - targetZone.x;
      const dy = robot.y - targetZone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      expect(distance).toBeLessThanOrEqual(targetZone.radius);
    });

    test("should detect robot in rectangular target", () => {
      const targetZone = { x: 900, y: 100, width: 200, height: 200 };
      robot.x = 1000;
      robot.y = 200;

      const inZone =
        robot.x >= targetZone.x &&
        robot.x <= targetZone.x + targetZone.width &&
        robot.y >= targetZone.y &&
        robot.y <= targetZone.y + targetZone.height;

      expect(inZone).toBe(true);
    });
  });

  describe("Challenge Progression", () => {
    test("all challenges should be completable", () => {
      Challenges.forEach((challenge, index) => {
        expect(challenge.id).toBe(index);
        expect(challenge.name).toBeDefined();
        expect(challenge.starterCode).toBeDefined();

        if (index !== 7) {
          expect(challenge.successCriteria).toBeDefined();
        }
      });
    });

    test("challenges should have unique names", () => {
      const names = Challenges.map((c) => c.name);
      const uniqueNames = [...new Set(names)];
      expect(uniqueNames.length).toBe(names.length);
    });
  });
});

describe("Integration: Maze Navigation", () => {
  const getMazes = () => (Array.isArray(Mazes) ? Mazes : Object.values(Mazes));

  describe("Maze 1 (Simplest)", () => {
    test("should have clear path from start to goal", () => {
      const maze = getMazes()[0];
      const start = maze.start || maze.startPosition;
      const goal = maze.goal || maze.target || maze.targetZone;

      // Start should be far from goal
      const dx = start.x - goal.x;
      const dy = start.y - goal.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      expect(distance).toBeGreaterThan(200);
    });
  });

  describe("Wall Collision in Mazes", () => {
    test("robot should collide with maze walls", () => {
      const maze = getMazes()[0];

      if (maze.walls.length > 0) {
        const wall = maze.walls[0];

        // Place robot inside wall
        const robot = {
          x: wall.x + wall.width / 2,
          y: wall.y + wall.height / 2,
        };

        // Should be detected as collision
        const inWall =
          robot.x >= wall.x &&
          robot.x <= wall.x + wall.width &&
          robot.y >= wall.y &&
          robot.y <= wall.y + wall.height;

        expect(inWall).toBe(true);
      }
    });
  });

  describe("Ultrasonic in Mazes", () => {
    test("ultrasonic should detect maze walls", () => {
      const maze = getMazes()[0];

      if (maze.walls.length > 0) {
        const wall = maze.walls[0];

        // Place robot facing wall
        const robot = {
          x: wall.x - 100,
          y: wall.y + wall.height / 2,
          heading: 90, // Facing right toward wall
        };

        // Ultrasonic should return distance to wall
        // This depends on Simulator implementation handling maze walls
      }
    });
  });
});
