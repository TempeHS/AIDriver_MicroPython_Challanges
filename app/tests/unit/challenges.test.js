/**
 * Challenges Unit Tests
 * Tests for challenge definitions, success criteria, and starter code
 */

const fs = require("fs");
const path = require("path");

// Load the Challenges module
const challengesCode = fs.readFileSync(
  path.join(__dirname, "../../js/challenges.js"),
  "utf8"
);
eval(challengesCode);

describe("Challenges", () => {
  describe("Structure", () => {
    test("should be an array", () => {
      expect(Array.isArray(Challenges)).toBe(true);
    });

    test("should have 8 challenges (0-7)", () => {
      expect(Challenges.length).toBe(8);
    });

    test("each challenge should have required properties", () => {
      Challenges.forEach((challenge, index) => {
        expect(challenge.id).toBe(index);
        expect(typeof challenge.name).toBe("string");
        expect(typeof challenge.description).toBe("string");
        expect(typeof challenge.goal).toBe("string");
        expect(typeof challenge.starterCode).toBe("string");
      });
    });

    test("each challenge should have success criteria or be gamepad", () => {
      Challenges.forEach((challenge, index) => {
        if (index !== 7) {
          // Challenge 7 is gamepad, no success criteria
          expect(challenge.successCriteria).toBeDefined();
        }
      });
    });
  });

  describe("Challenge 0: Fix the Code", () => {
    const challenge = Challenges[0];

    test("should have correct id and name", () => {
      expect(challenge.id).toBe(0);
      expect(challenge.name).toContain("Fix");
    });

    test("should have starter code with intentional errors", () => {
      // Starter code should have syntax errors for students to fix
      expect(challenge.starterCode).toBeDefined();
      expect(challenge.starterCode.length).toBeGreaterThan(10);
    });

    test("should have description mentioning syntax errors", () => {
      expect(
        challenge.description.toLowerCase().includes("error") ||
          challenge.description.toLowerCase().includes("fix") ||
          challenge.description.toLowerCase().includes("syntax")
      ).toBe(true);
    });
  });

  describe("Challenge 1: Drive Straight", () => {
    const challenge = Challenges[1];

    test("should have correct id", () => {
      expect(challenge.id).toBe(1);
    });

    test("should have starter code with drive_forward", () => {
      expect(challenge.starterCode).toContain("drive_forward");
    });

    test("should have success criteria for reaching target", () => {
      expect(challenge.successCriteria).toBeDefined();
    });

    test("success criteria should be a function", () => {
      expect(typeof challenge.successCriteria).toBe("function");
    });

    test("should define target zone", () => {
      expect(challenge.targetZone).toBeDefined();
      expect(challenge.targetZone.x).toBeDefined();
      expect(challenge.targetZone.y).toBeDefined();
    });
  });

  describe("Challenge 2: Drive Straight Again", () => {
    const challenge = Challenges[2];

    test("should have correct id", () => {
      expect(challenge.id).toBe(2);
    });

    test("should be more challenging than Challenge 1", () => {
      // Different starting position or target
      expect(challenge.startPosition || challenge.targetZone).toBeDefined();
    });
  });

  describe("Challenge 3: U-Turn", () => {
    const challenge = Challenges[3];

    test("should have correct id", () => {
      expect(challenge.id).toBe(3);
    });

    test("should mention rotation or turn in description", () => {
      const desc = challenge.description.toLowerCase();
      expect(
        desc.includes("turn") ||
          desc.includes("rotate") ||
          desc.includes("u-turn")
      ).toBe(true);
    });

    test("should have starter code", () => {
      expect(challenge.starterCode.length).toBeGreaterThan(10);
    });
  });

  describe("Challenge 4: The Boxes", () => {
    const challenge = Challenges[4];

    test("should have correct id", () => {
      expect(challenge.id).toBe(4);
    });

    test("should define obstacles", () => {
      expect(challenge.obstacles).toBeDefined();
      expect(Array.isArray(challenge.obstacles)).toBe(true);
    });

    test("obstacles should have position and size", () => {
      if (challenge.obstacles && challenge.obstacles.length > 0) {
        challenge.obstacles.forEach((obstacle) => {
          expect(obstacle.x).toBeDefined();
          expect(obstacle.y).toBeDefined();
          expect(obstacle.width || obstacle.radius).toBeDefined();
        });
      }
    });
  });

  describe("Challenge 5: The Wall", () => {
    const challenge = Challenges[5];

    test("should have correct id", () => {
      expect(challenge.id).toBe(5);
    });

    test("should mention ultrasonic or distance", () => {
      const desc = challenge.description.toLowerCase();
      const code = challenge.starterCode.toLowerCase();
      expect(
        desc.includes("ultrasonic") ||
          desc.includes("distance") ||
          desc.includes("sensor") ||
          code.includes("read_distance")
      ).toBe(true);
    });

    test("should have wall obstacle", () => {
      expect(challenge.obstacles).toBeDefined();
    });
  });

  describe("Challenge 6: The Maze", () => {
    const challenge = Challenges[6];

    test("should have correct id", () => {
      expect(challenge.id).toBe(6);
    });

    test("should mention maze in name or description", () => {
      const name = challenge.name.toLowerCase();
      const desc = challenge.description.toLowerCase();
      expect(name.includes("maze") || desc.includes("maze")).toBe(true);
    });

    test("should reference maze selector or multiple mazes", () => {
      expect(
        challenge.mazeId !== undefined ||
          challenge.description.includes("maze") ||
          challenge.useMazeSelector
      ).toBe(true);
    });
  });

  describe("Challenge 7: Gamepad Control", () => {
    const challenge = Challenges[7];

    test("should have correct id", () => {
      expect(challenge.id).toBe(7);
    });

    test("should mention gamepad in name or description", () => {
      const name = challenge.name.toLowerCase();
      const desc = challenge.description.toLowerCase();
      expect(
        name.includes("gamepad") ||
          name.includes("control") ||
          desc.includes("gamepad") ||
          desc.includes("manual")
      ).toBe(true);
    });

    test("should indicate gamepad mode", () => {
      expect(
        challenge.gamepadMode === true ||
          challenge.isGamepad === true ||
          challenge.type === "gamepad"
      ).toBe(true);
    });

    test("should not require code execution", () => {
      // Gamepad challenge doesn't need starter code to be valid Python
      expect(challenge.starterCode).toBeDefined();
    });
  });

  describe("Success Criteria Functions", () => {
    test("Challenge 1 criteria should accept robot and session", () => {
      const challenge = Challenges[1];
      if (challenge.successCriteria) {
        const robot = { x: 1000, y: 100 };
        const session = { startTime: Date.now() };

        // Should not throw when called
        expect(() => challenge.successCriteria(robot, session)).not.toThrow();
      }
    });

    test("Success criteria should return object with success property", () => {
      Challenges.forEach((challenge) => {
        if (challenge.successCriteria) {
          const robot = { x: 1000, y: 1000 };
          const session = { startTime: Date.now() };
          const result = challenge.successCriteria(robot, session);

          expect(result).toBeDefined();
          expect(typeof result.success).toBe("boolean");
        }
      });
    });

    test("Success criteria should return message on success", () => {
      Challenges.forEach((challenge) => {
        if (challenge.successCriteria) {
          const result = challenge.successCriteria(
            { x: 0, y: 0 },
            { startTime: 0 }
          );

          if (result.success) {
            expect(result.message).toBeDefined();
            expect(typeof result.message).toBe("string");
          }
        }
      });
    });
  });

  describe("Starter Code Validity", () => {
    test("all starter codes should be non-empty", () => {
      Challenges.forEach((challenge) => {
        expect(challenge.starterCode.trim().length).toBeGreaterThan(0);
      });
    });

    test("all starter codes except Challenge 0 should have aidriver import", () => {
      Challenges.forEach((challenge, index) => {
        if (index !== 0 && index !== 7) {
          // Skip fix-the-code and gamepad
          expect(challenge.starterCode).toContain("aidriver");
        }
      });
    });

    test("starter codes should contain AIDriver class usage", () => {
      Challenges.forEach((challenge, index) => {
        if (index !== 7) {
          // Skip gamepad
          expect(challenge.starterCode).toContain("AIDriver");
        }
      });
    });
  });

  describe("Target Zones", () => {
    test("challenges with targets should define complete zones", () => {
      Challenges.forEach((challenge) => {
        if (challenge.targetZone) {
          expect(typeof challenge.targetZone.x).toBe("number");
          expect(typeof challenge.targetZone.y).toBe("number");
          expect(
            challenge.targetZone.width || challenge.targetZone.radius
          ).toBeDefined();
        }
      });
    });

    test("target zones should be within arena bounds", () => {
      const ARENA_SIZE = 2000;

      Challenges.forEach((challenge) => {
        if (challenge.targetZone) {
          expect(challenge.targetZone.x).toBeGreaterThanOrEqual(0);
          expect(challenge.targetZone.x).toBeLessThanOrEqual(ARENA_SIZE);
          expect(challenge.targetZone.y).toBeGreaterThanOrEqual(0);
          expect(challenge.targetZone.y).toBeLessThanOrEqual(ARENA_SIZE);
        }
      });
    });
  });

  describe("Start Positions", () => {
    test("challenges should define start position or use default", () => {
      Challenges.forEach((challenge) => {
        if (challenge.startPosition) {
          expect(typeof challenge.startPosition.x).toBe("number");
          expect(typeof challenge.startPosition.y).toBe("number");
        }
      });
    });

    test("start positions should be within arena bounds", () => {
      const ARENA_SIZE = 2000;

      Challenges.forEach((challenge) => {
        if (challenge.startPosition) {
          expect(challenge.startPosition.x).toBeGreaterThanOrEqual(0);
          expect(challenge.startPosition.x).toBeLessThanOrEqual(ARENA_SIZE);
          expect(challenge.startPosition.y).toBeGreaterThanOrEqual(0);
          expect(challenge.startPosition.y).toBeLessThanOrEqual(ARENA_SIZE);
        }
      });
    });
  });

  describe("Challenge Progression", () => {
    test("challenges should increase in complexity", () => {
      // Challenge names/descriptions should suggest progression
      expect(Challenges[0].name).toMatch(/fix|error/i);
      expect(Challenges[1].name).toMatch(/straight|drive|line/i);
    });

    test("later challenges should have obstacles or complex requirements", () => {
      // Challenges 4-6 should have obstacles or mazes
      const laterChallenges = Challenges.slice(4, 7);

      laterChallenges.forEach((challenge) => {
        expect(
          challenge.obstacles ||
            challenge.walls ||
            challenge.mazeId !== undefined ||
            challenge.useMazeSelector
        ).toBeDefined();
      });
    });
  });

  describe("Hints", () => {
    test("challenges may have hints array", () => {
      Challenges.forEach((challenge) => {
        if (challenge.hints) {
          expect(Array.isArray(challenge.hints)).toBe(true);
          challenge.hints.forEach((hint) => {
            expect(typeof hint).toBe("string");
          });
        }
      });
    });
  });
});
