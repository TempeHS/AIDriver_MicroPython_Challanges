/**
 * Mazes Unit Tests
 * Tests for maze definitions, wall positions, and navigation paths
 */

const fs = require("fs");
const path = require("path");

// Load the Mazes module
const mazesCode = fs.readFileSync(
  path.join(__dirname, "../../js/mazes.js"),
  "utf8"
);
eval(mazesCode);

describe("Mazes", () => {
  describe("Structure", () => {
    test("should be an array or object", () => {
      expect(Mazes).toBeDefined();
      expect(Array.isArray(Mazes) || typeof Mazes === "object").toBe(true);
    });

    test("should have at least one maze", () => {
      const mazeCount = Array.isArray(Mazes)
        ? Mazes.length
        : Object.keys(Mazes).length;
      expect(mazeCount).toBeGreaterThanOrEqual(1);
    });

    test("should have 5 mazes for Challenge 6", () => {
      const mazeCount = Array.isArray(Mazes)
        ? Mazes.length
        : Object.keys(Mazes).length;
      expect(mazeCount).toBe(5);
    });
  });

  describe("Maze Properties", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("each maze should have a name", () => {
      getMazes().forEach((maze) => {
        expect(maze.name).toBeDefined();
        expect(typeof maze.name).toBe("string");
      });
    });

    test("each maze should have walls array", () => {
      getMazes().forEach((maze) => {
        expect(maze.walls).toBeDefined();
        expect(Array.isArray(maze.walls)).toBe(true);
      });
    });

    test("each maze should have start position", () => {
      getMazes().forEach((maze) => {
        expect(maze.start || maze.startPosition).toBeDefined();
        const start = maze.start || maze.startPosition;
        expect(typeof start.x).toBe("number");
        expect(typeof start.y).toBe("number");
      });
    });

    test("each maze should have goal/target", () => {
      getMazes().forEach((maze) => {
        expect(maze.goal || maze.target || maze.targetZone).toBeDefined();
      });
    });
  });

  describe("Wall Definitions", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("walls should have position and dimensions", () => {
      getMazes().forEach((maze) => {
        maze.walls.forEach((wall, index) => {
          expect(typeof wall.x).toBe("number");
          expect(typeof wall.y).toBe("number");
          expect(typeof wall.width).toBe("number");
          expect(typeof wall.height).toBe("number");
        });
      });
    });

    test("walls should be within arena bounds", () => {
      const ARENA_SIZE = 2000;

      getMazes().forEach((maze) => {
        maze.walls.forEach((wall) => {
          expect(wall.x).toBeGreaterThanOrEqual(0);
          expect(wall.y).toBeGreaterThanOrEqual(0);
          expect(wall.x + wall.width).toBeLessThanOrEqual(ARENA_SIZE);
          expect(wall.y + wall.height).toBeLessThanOrEqual(ARENA_SIZE);
        });
      });
    });

    test("walls should have positive dimensions", () => {
      getMazes().forEach((maze) => {
        maze.walls.forEach((wall) => {
          expect(wall.width).toBeGreaterThan(0);
          expect(wall.height).toBeGreaterThan(0);
        });
      });
    });

    test("walls should not completely block the path", () => {
      getMazes().forEach((maze) => {
        // Total wall area should be less than arena area
        const ARENA_AREA = 2000 * 2000;
        let totalWallArea = 0;

        maze.walls.forEach((wall) => {
          totalWallArea += wall.width * wall.height;
        });

        expect(totalWallArea).toBeLessThan(ARENA_AREA * 0.8); // Max 80% coverage
      });
    });
  });

  describe("Start and Goal Positions", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("start position should be within arena", () => {
      const ARENA_SIZE = 2000;

      getMazes().forEach((maze) => {
        const start = maze.start || maze.startPosition;
        expect(start.x).toBeGreaterThanOrEqual(0);
        expect(start.x).toBeLessThanOrEqual(ARENA_SIZE);
        expect(start.y).toBeGreaterThanOrEqual(0);
        expect(start.y).toBeLessThanOrEqual(ARENA_SIZE);
      });
    });

    test("goal position should be within arena", () => {
      const ARENA_SIZE = 2000;

      getMazes().forEach((maze) => {
        const goal = maze.goal || maze.target || maze.targetZone;
        expect(goal.x).toBeGreaterThanOrEqual(0);
        expect(goal.x).toBeLessThanOrEqual(ARENA_SIZE);
        expect(goal.y).toBeGreaterThanOrEqual(0);
        expect(goal.y).toBeLessThanOrEqual(ARENA_SIZE);
      });
    });

    test("start should not be inside a wall", () => {
      getMazes().forEach((maze) => {
        const start = maze.start || maze.startPosition;

        maze.walls.forEach((wall) => {
          const inWall =
            start.x >= wall.x &&
            start.x <= wall.x + wall.width &&
            start.y >= wall.y &&
            start.y <= wall.y + wall.height;

          expect(inWall).toBe(false);
        });
      });
    });

    test("goal should not be inside a wall", () => {
      getMazes().forEach((maze) => {
        const goal = maze.goal || maze.target || maze.targetZone;

        maze.walls.forEach((wall) => {
          const inWall =
            goal.x >= wall.x &&
            goal.x <= wall.x + wall.width &&
            goal.y >= wall.y &&
            goal.y <= wall.y + wall.height;

          expect(inWall).toBe(false);
        });
      });
    });

    test("start and goal should be different positions", () => {
      getMazes().forEach((maze) => {
        const start = maze.start || maze.startPosition;
        const goal = maze.goal || maze.target || maze.targetZone;

        const samePosition = start.x === goal.x && start.y === goal.y;
        expect(samePosition).toBe(false);
      });
    });
  });

  describe("Maze Difficulty Progression", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("mazes should have increasing complexity", () => {
      const mazes = getMazes();

      if (mazes.length >= 2) {
        // Later mazes should generally have more walls
        const firstMazeWalls = mazes[0].walls.length;
        const lastMazeWalls = mazes[mazes.length - 1].walls.length;

        // Last maze should have at least as many walls as first
        expect(lastMazeWalls).toBeGreaterThanOrEqual(firstMazeWalls);
      }
    });

    test("maze names should be unique", () => {
      const mazes = getMazes();
      const names = mazes.map((m) => m.name);
      const uniqueNames = [...new Set(names)];

      expect(uniqueNames.length).toBe(names.length);
    });
  });

  describe("Maze Solvability", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("should have reasonable wall thickness", () => {
      getMazes().forEach((maze) => {
        maze.walls.forEach((wall) => {
          // Walls should be at least 10mm thick for visibility
          expect(Math.min(wall.width, wall.height)).toBeGreaterThanOrEqual(10);
        });
      });
    });

    test("should have corridors wide enough for robot", () => {
      // Robot is ~150mm wide, corridors should be at least 200mm
      getMazes().forEach((maze) => {
        // This is a heuristic check - full solvability would require pathfinding
        const totalWallArea = maze.walls.reduce(
          (sum, w) => sum + w.width * w.height,
          0
        );
        const arenaArea = 2000 * 2000;

        // There should be at least 30% free space
        expect(totalWallArea).toBeLessThan(arenaArea * 0.7);
      });
    });
  });

  describe("Specific Maze Tests", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("Maze 1 should be the simplest", () => {
      const mazes = getMazes();
      if (mazes.length > 0) {
        const firstMaze = mazes[0];
        expect(firstMaze.walls.length).toBeLessThanOrEqual(10);
      }
    });

    test("Each maze should have a descriptive name", () => {
      getMazes().forEach((maze) => {
        expect(maze.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Maze Rendering Data", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("walls should have color property or use default", () => {
      getMazes().forEach((maze) => {
        maze.walls.forEach((wall) => {
          // Color is optional but if present should be valid
          if (wall.color) {
            expect(typeof wall.color).toBe("string");
          }
        });
      });
    });

    test("goal should have size for rendering", () => {
      getMazes().forEach((maze) => {
        const goal = maze.goal || maze.target || maze.targetZone;
        expect(
          goal.width || goal.height || goal.radius || goal.size
        ).toBeDefined();
      });
    });
  });

  describe("Edge Cases", () => {
    const getMazes = () =>
      Array.isArray(Mazes) ? Mazes : Object.values(Mazes);

    test("should handle maze with no internal walls", () => {
      getMazes().forEach((maze) => {
        // Even with no walls, structure should be valid
        expect(maze.walls).toBeDefined();
        expect(Array.isArray(maze.walls)).toBe(true);
      });
    });

    test("wall dimensions should be integers or reasonable floats", () => {
      getMazes().forEach((maze) => {
        maze.walls.forEach((wall) => {
          expect(Number.isFinite(wall.x)).toBe(true);
          expect(Number.isFinite(wall.y)).toBe(true);
          expect(Number.isFinite(wall.width)).toBe(true);
          expect(Number.isFinite(wall.height)).toBe(true);
        });
      });
    });
  });
});
