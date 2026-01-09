/**
 * Challenges Unit Tests
 * Tests for challenge definitions and success criteria
 */

describe("Challenges", () => {
  let ChallengesImpl;

  beforeEach(() => {
    // Create Challenges implementation
    ChallengesImpl = {
      list: [
        {
          id: 0,
          name: "Challenge 0: Hello World",
          description: "Get your first program running",
          startCode: `from aidriver import AIDriver

robot = AIDriver()

# Your code here
print("Hello AIDriver!")`,
          successCriteria: function (robot, startPos) {
            // Just needs to run without errors
            return true;
          },
          mazeId: null,
        },
        {
          id: 1,
          name: "Challenge 1: Move Forward",
          description: "Move the robot forward",
          startCode: `from aidriver import AIDriver
import time

robot = AIDriver()

# Move forward
robot.drive_forward()
time.sleep(2)
robot.brake()`,
          successCriteria: function (robot, startPos) {
            // Robot should have moved forward (positive X direction when angle = 0)
            return robot.x > startPos.x + 100;
          },
          mazeId: null,
        },
        {
          id: 2,
          name: "Challenge 2: Square Dance",
          description: "Drive in a square pattern",
          startCode: `from aidriver import AIDriver
import time

robot = AIDriver()

# Drive in a square
for i in range(4):
    robot.drive_forward()
    time.sleep(1)
    robot.brake()
    robot.rotate_right()
    time.sleep(0.5)
    robot.brake()`,
          successCriteria: function (robot, startPos) {
            // Robot should return close to start position
            const dx = robot.x - startPos.x;
            const dy = robot.y - startPos.y;
            return Math.sqrt(dx * dx + dy * dy) < 200;
          },
          mazeId: null,
        },
        {
          id: 3,
          name: "Challenge 3: Wall Follower",
          description: "Use ultrasonic to follow walls",
          startCode: `from aidriver import AIDriver
import time

robot = AIDriver()

while True:
    distance = robot.get_ultrasonic()
    if distance < 300:
        robot.rotate_right()
        time.sleep(0.3)
    else:
        robot.drive_forward()
    time.sleep(0.1)`,
          successCriteria: function (robot, startPos) {
            // Robot should navigate without crashing
            return !robot.crashed;
          },
          mazeId: 1,
        },
        {
          id: 4,
          name: "Challenge 4: Navigate Maze",
          description: "Navigate through a simple maze",
          startCode: `from aidriver import AIDriver
import time

robot = AIDriver()

# Navigate the maze`,
          successCriteria: function (robot, startPos) {
            // Robot should reach the goal area
            return robot.x > 1800 && robot.y > 1800;
          },
          mazeId: 2,
        },
        {
          id: 5,
          name: "Challenge 5: Line Follower",
          description: "Follow a line pattern",
          startCode: `from aidriver import AIDriver
import time

robot = AIDriver()

# Line following logic`,
          successCriteria: function (robot, startPos) {
            return robot.x > 1500;
          },
          mazeId: 3,
        },
        {
          id: 6,
          name: "Challenge 6: Obstacle Course",
          description: "Navigate through obstacles",
          startCode: `from aidriver import AIDriver
import time

robot = AIDriver()

# Obstacle avoidance`,
          successCriteria: function (robot, startPos) {
            return robot.x > 1800 && !robot.crashed;
          },
          mazeId: 4,
        },
        {
          id: 7,
          name: "Challenge 7: Free Drive",
          description: "Control robot with gamepad (no code needed)",
          startCode: `# Challenge 7: Gamepad Control
# Use the virtual gamepad or keyboard (WASD/Arrows) to drive!`,
          successCriteria: function (robot, startPos) {
            // Just explore
            return true;
          },
          mazeId: null,
          isGamepad: true,
        },
      ],

      get: function (id) {
        return this.list.find((c) => c.id === id) || null;
      },

      getAll: function () {
        return this.list;
      },

      getCount: function () {
        return this.list.length;
      },

      getCurrent: function (currentId) {
        return this.get(currentId);
      },

      getNext: function (currentId) {
        const next = currentId + 1;
        return next < this.list.length ? this.get(next) : null;
      },

      getPrevious: function (currentId) {
        const prev = currentId - 1;
        return prev >= 0 ? this.get(prev) : null;
      },

      isGamepadChallenge: function (id) {
        const challenge = this.get(id);
        return challenge ? challenge.isGamepad === true : false;
      },
    };
  });

  describe("Challenge List", () => {
    test("should have 8 challenges", () => {
      expect(ChallengesImpl.getCount()).toBe(8);
    });

    test("challenges should have sequential IDs 0-7", () => {
      for (let i = 0; i < 8; i++) {
        expect(ChallengesImpl.get(i)).not.toBeNull();
        expect(ChallengesImpl.get(i).id).toBe(i);
      }
    });

    test("each challenge should have required properties", () => {
      ChallengesImpl.getAll().forEach((challenge) => {
        expect(challenge.id).toBeDefined();
        expect(challenge.name).toBeDefined();
        expect(challenge.description).toBeDefined();
        expect(challenge.startCode).toBeDefined();
        expect(typeof challenge.successCriteria).toBe("function");
      });
    });
  });

  describe("get()", () => {
    test("should return challenge by ID", () => {
      const challenge = ChallengesImpl.get(0);
      expect(challenge).not.toBeNull();
      expect(challenge.id).toBe(0);
    });

    test("should return null for invalid ID", () => {
      expect(ChallengesImpl.get(-1)).toBeNull();
      expect(ChallengesImpl.get(100)).toBeNull();
    });

    test("should return correct challenge data", () => {
      const challenge = ChallengesImpl.get(1);
      expect(challenge.name).toContain("Move Forward");
    });
  });

  describe("getNext() and getPrevious()", () => {
    test("getNext() should return next challenge", () => {
      const next = ChallengesImpl.getNext(0);
      expect(next).not.toBeNull();
      expect(next.id).toBe(1);
    });

    test("getNext() should return null for last challenge", () => {
      expect(ChallengesImpl.getNext(7)).toBeNull();
    });

    test("getPrevious() should return previous challenge", () => {
      const prev = ChallengesImpl.getPrevious(3);
      expect(prev).not.toBeNull();
      expect(prev.id).toBe(2);
    });

    test("getPrevious() should return null for first challenge", () => {
      expect(ChallengesImpl.getPrevious(0)).toBeNull();
    });
  });

  describe("Success Criteria", () => {
    test("Challenge 0 should always succeed", () => {
      const challenge = ChallengesImpl.get(0);
      const robot = { x: 1000, y: 1000, angle: 0 };
      expect(challenge.successCriteria(robot, robot)).toBe(true);
    });

    test("Challenge 1 should check forward movement", () => {
      const challenge = ChallengesImpl.get(1);
      const startPos = { x: 1000, y: 1000 };
      const robot = { x: 1200, y: 1000 };
      expect(challenge.successCriteria(robot, startPos)).toBe(true);
    });

    test("Challenge 1 should fail if not moved enough", () => {
      const challenge = ChallengesImpl.get(1);
      const startPos = { x: 1000, y: 1000 };
      const robot = { x: 1050, y: 1000 };
      expect(challenge.successCriteria(robot, startPos)).toBe(false);
    });

    test("Challenge 2 should check return to start", () => {
      const challenge = ChallengesImpl.get(2);
      const startPos = { x: 1000, y: 1000 };
      const robot = { x: 1050, y: 1050 };
      expect(challenge.successCriteria(robot, startPos)).toBe(true);
    });

    test("Challenge 7 should always succeed", () => {
      const challenge = ChallengesImpl.get(7);
      const robot = { x: 500, y: 500 };
      expect(challenge.successCriteria(robot, robot)).toBe(true);
    });
  });

  describe("Gamepad Challenge", () => {
    test("Challenge 7 should be gamepad challenge", () => {
      expect(ChallengesImpl.isGamepadChallenge(7)).toBe(true);
    });

    test("Other challenges should not be gamepad challenges", () => {
      for (let i = 0; i < 7; i++) {
        expect(ChallengesImpl.isGamepadChallenge(i)).toBe(false);
      }
    });
  });

  describe("Maze Assignments", () => {
    test("early challenges should have no maze", () => {
      expect(ChallengesImpl.get(0).mazeId).toBeNull();
      expect(ChallengesImpl.get(1).mazeId).toBeNull();
      expect(ChallengesImpl.get(2).mazeId).toBeNull();
    });

    test("maze challenges should have mazeId", () => {
      expect(ChallengesImpl.get(3).mazeId).not.toBeNull();
      expect(ChallengesImpl.get(4).mazeId).not.toBeNull();
    });
  });

  describe("Start Code", () => {
    test("all challenges should have start code", () => {
      ChallengesImpl.getAll().forEach((challenge) => {
        expect(challenge.startCode.length).toBeGreaterThan(0);
      });
    });

    test("start code should include AIDriver import", () => {
      for (let i = 0; i < 7; i++) {
        const challenge = ChallengesImpl.get(i);
        expect(challenge.startCode).toContain("aidriver");
      }
    });

    test("Challenge 7 should have gamepad instructions", () => {
      const challenge = ChallengesImpl.get(7);
      expect(challenge.startCode).toContain("Gamepad");
    });
  });
});
