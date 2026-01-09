/**
 * Challenge Success Integration Tests
 * Tests for challenge completion criteria across all 8 challenges
 */

describe("Challenge Success Criteria", () => {
  let robot;
  let startPos;

  beforeEach(() => {
    robot = {
      x: 1000,
      y: 1000,
      angle: 0,
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
      crashed: false,
    };
    startPos = { x: 1000, y: 1000, angle: 0 };
  });

  describe("Challenge 0: Hello World", () => {
    function successCriteria(robot, start) {
      // Just needs to run without errors
      return true;
    }

    test("should always succeed", () => {
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should succeed regardless of robot position", () => {
      robot.x = 500;
      robot.y = 500;
      expect(successCriteria(robot, startPos)).toBe(true);
    });
  });

  describe("Challenge 1: Move Forward", () => {
    function successCriteria(robot, start) {
      return robot.x > start.x + 100;
    }

    test("should fail if robot hasn't moved", () => {
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should succeed if robot moved forward enough", () => {
      robot.x = 1200;
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should fail if robot moved but not enough", () => {
      robot.x = 1050;
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should fail if robot moved backward", () => {
      robot.x = 800;
      expect(successCriteria(robot, startPos)).toBe(false);
    });
  });

  describe("Challenge 2: Square Dance", () => {
    function successCriteria(robot, start) {
      const dx = robot.x - start.x;
      const dy = robot.y - start.y;
      return Math.sqrt(dx * dx + dy * dy) < 200;
    }

    test("should succeed if robot returns to start", () => {
      robot.x = 1020;
      robot.y = 1020;
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should fail if robot is far from start", () => {
      robot.x = 1500;
      robot.y = 1500;
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should succeed if robot is exactly at start", () => {
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should succeed within tolerance", () => {
      robot.x = 1100;
      robot.y = 1100;
      // Distance is ~141mm, should pass 200mm threshold
      expect(successCriteria(robot, startPos)).toBe(true);
    });
  });

  describe("Challenge 3: Wall Follower", () => {
    function successCriteria(robot, start) {
      return !robot.crashed;
    }

    test("should succeed if robot hasn't crashed", () => {
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should fail if robot crashed", () => {
      robot.crashed = true;
      expect(successCriteria(robot, startPos)).toBe(false);
    });
  });

  describe("Challenge 4: Navigate Maze", () => {
    function successCriteria(robot, start) {
      return robot.x > 1800 && robot.y > 1800;
    }

    test("should fail if robot at start", () => {
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should succeed if robot reached goal area", () => {
      robot.x = 1850;
      robot.y = 1850;
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should fail if only x is in goal", () => {
      robot.x = 1850;
      robot.y = 1000;
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should fail if only y is in goal", () => {
      robot.x = 1000;
      robot.y = 1850;
      expect(successCriteria(robot, startPos)).toBe(false);
    });
  });

  describe("Challenge 5: Line Follower", () => {
    function successCriteria(robot, start) {
      return robot.x > 1500;
    }

    test("should fail if robot at start", () => {
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should succeed if robot passed threshold", () => {
      robot.x = 1600;
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should fail if robot just under threshold", () => {
      robot.x = 1450;
      expect(successCriteria(robot, startPos)).toBe(false);
    });
  });

  describe("Challenge 6: Obstacle Course", () => {
    function successCriteria(robot, start) {
      return robot.x > 1800 && !robot.crashed;
    }

    test("should fail if robot at start", () => {
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should succeed if robot reached goal without crash", () => {
      robot.x = 1850;
      robot.crashed = false;
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should fail if robot reached goal but crashed", () => {
      robot.x = 1850;
      robot.crashed = true;
      expect(successCriteria(robot, startPos)).toBe(false);
    });

    test("should fail if robot didn't crash but didn't reach goal", () => {
      robot.x = 1500;
      robot.crashed = false;
      expect(successCriteria(robot, startPos)).toBe(false);
    });
  });

  describe("Challenge 7: Free Drive (Gamepad)", () => {
    function successCriteria(robot, start) {
      return true;
    }

    test("should always succeed", () => {
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should succeed regardless of position", () => {
      robot.x = 100;
      robot.y = 100;
      expect(successCriteria(robot, startPos)).toBe(true);
    });

    test("should succeed even if crashed", () => {
      robot.crashed = true;
      expect(successCriteria(robot, startPos)).toBe(true);
    });
  });

  describe("Success Detection Timing", () => {
    test("should detect success immediately after criteria met", () => {
      function checkSuccess(robot) {
        return robot.x > 1100;
      }

      robot.x = 1000;
      expect(checkSuccess(robot)).toBe(false);

      robot.x = 1101;
      expect(checkSuccess(robot)).toBe(true);
    });

    test("should track multiple success conditions", () => {
      function checkAllConditions(robot) {
        return {
          moved: robot.x > 1100,
          notCrashed: !robot.crashed,
          inBounds: robot.x > 0 && robot.x < 2000,
        };
      }

      robot.x = 1200;
      robot.crashed = false;

      const result = checkAllConditions(robot);
      expect(result.moved).toBe(true);
      expect(result.notCrashed).toBe(true);
      expect(result.inBounds).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("should handle exactly at boundary values", () => {
      function successCriteria(robot) {
        return robot.x > 1800;
      }

      robot.x = 1800;
      expect(successCriteria(robot)).toBe(false);

      robot.x = 1800.001;
      expect(successCriteria(robot)).toBe(true);
    });

    test("should handle negative coordinates", () => {
      function isInBounds(robot) {
        return (
          robot.x >= 0 && robot.x <= 2000 && robot.y >= 0 && robot.y <= 2000
        );
      }

      robot.x = -10;
      expect(isInBounds(robot)).toBe(false);
    });

    test("should handle floating point positions", () => {
      function distanceFromStart(robot, start) {
        const dx = robot.x - start.x;
        const dy = robot.y - start.y;
        return Math.sqrt(dx * dx + dy * dy);
      }

      robot.x = 1000.5;
      robot.y = 1000.5;

      const distance = distanceFromStart(robot, startPos);
      expect(distance).toBeCloseTo(0.707, 2);
    });
  });

  describe("Progress Tracking", () => {
    test("should track progress towards goal", () => {
      function calculateProgress(robot, goal) {
        const dx = goal.x - robot.x;
        const dy = goal.y - robot.y;
        const distToGoal = Math.sqrt(dx * dx + dy * dy);
        const maxDist = Math.sqrt(
          Math.pow(goal.x - 1000, 2) + Math.pow(goal.y - 1000, 2)
        );
        return Math.max(0, Math.min(100, (1 - distToGoal / maxDist) * 100));
      }

      const goal = { x: 1800, y: 1800 };

      // At start
      expect(calculateProgress(robot, goal)).toBeCloseTo(0, 0);

      // Halfway
      robot.x = 1400;
      robot.y = 1400;
      expect(calculateProgress(robot, goal)).toBeCloseTo(50, 0);

      // At goal
      robot.x = 1800;
      robot.y = 1800;
      expect(calculateProgress(robot, goal)).toBeCloseTo(100, 0);
    });
  });
});
