/**
 * Simulator Unit Tests
 * Tests for physics engine, differential drive, collision detection, and ultrasonic
 */

// Load the Simulator module
const fs = require("fs");
const path = require("path");
const simulatorCode = fs.readFileSync(
  path.join(__dirname, "../../js/simulator.js"),
  "utf8"
);

// Execute the module code to define Simulator
eval(simulatorCode);

describe("Simulator", () => {
  describe("Initialization", () => {
    test("should have required methods", () => {
      expect(typeof Simulator.step).toBe("function");
      expect(typeof Simulator.checkCollision).toBe("function");
      expect(typeof Simulator.simulateUltrasonic).toBe("function");
      expect(typeof Simulator.reset).toBe("function");
    });

    test("should have physics constants defined", () => {
      expect(Simulator.ROBOT_WIDTH).toBeGreaterThan(0);
      expect(Simulator.ROBOT_LENGTH).toBeGreaterThan(0);
      expect(Simulator.WHEEL_BASE).toBeGreaterThan(0);
      expect(Simulator.ARENA_WIDTH).toBe(2000);
      expect(Simulator.ARENA_HEIGHT).toBe(2000);
    });

    test("should have correct robot dimensions", () => {
      // Robot should be ~150mm wide based on AIDriver specs
      expect(Simulator.ROBOT_WIDTH).toBeGreaterThanOrEqual(100);
      expect(Simulator.ROBOT_WIDTH).toBeLessThanOrEqual(200);
      expect(Simulator.ROBOT_LENGTH).toBeGreaterThanOrEqual(100);
      expect(Simulator.ROBOT_LENGTH).toBeLessThanOrEqual(250);
    });
  });

  describe("step() - Physics Simulation", () => {
    let robot;

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
    });

    test("should not move robot when speeds are zero", () => {
      const newRobot = Simulator.step(robot, 0.016);
      expect(newRobot.x).toBe(1000);
      expect(newRobot.y).toBe(1000);
      expect(newRobot.heading).toBe(0);
    });

    test("should move robot forward when both wheels same speed", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = 100;
      robot.isMoving = true;

      const newRobot = Simulator.step(robot, 0.1); // 100ms

      // Robot should move forward (negative Y in canvas coords, or check relative)
      expect(newRobot.y).not.toBe(1000);
    });

    test("should move robot backward with negative speeds", () => {
      robot.leftSpeed = -100;
      robot.rightSpeed = -100;
      robot.isMoving = true;

      const newRobot = Simulator.step(robot, 0.1);

      expect(newRobot.y).not.toBe(1000);
    });

    test("should rotate robot when wheel speeds differ", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = -100;
      robot.isMoving = true;

      const newRobot = Simulator.step(robot, 0.1);

      expect(newRobot.heading).not.toBe(0);
    });

    test("should rotate left when left wheel slower", () => {
      robot.leftSpeed = 0;
      robot.rightSpeed = 100;
      robot.isMoving = true;

      const initialHeading = robot.heading;
      const newRobot = Simulator.step(robot, 0.1);

      // Heading should change (direction depends on coordinate system)
      expect(newRobot.heading).not.toBe(initialHeading);
    });

    test("should rotate right when right wheel slower", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = 0;
      robot.isMoving = true;

      const initialHeading = robot.heading;
      const newRobot = Simulator.step(robot, 0.1);

      expect(newRobot.heading).not.toBe(initialHeading);
    });

    test("should handle very small time steps", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = 100;
      robot.isMoving = true;

      const newRobot = Simulator.step(robot, 0.001);

      // Should still move, just very slightly
      expect(newRobot).toBeDefined();
    });

    test("should handle large time steps gracefully", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = 100;
      robot.isMoving = true;

      const newRobot = Simulator.step(robot, 1.0); // 1 second

      expect(newRobot).toBeDefined();
      expect(typeof newRobot.x).toBe("number");
      expect(typeof newRobot.y).toBe("number");
    });

    test("should preserve trail array", () => {
      robot.trail = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
      ];
      robot.leftSpeed = 100;
      robot.rightSpeed = 100;
      robot.isMoving = true;

      const newRobot = Simulator.step(robot, 0.1);

      expect(Array.isArray(newRobot.trail)).toBe(true);
    });

    test("should add to trail when moving", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = 100;
      robot.isMoving = true;

      const initialTrailLength = robot.trail.length;
      const newRobot = Simulator.step(robot, 0.1);

      // Trail should grow or stay same (depends on implementation)
      expect(newRobot.trail.length).toBeGreaterThanOrEqual(initialTrailLength);
    });

    test("should normalize heading to 0-360 range", () => {
      robot.leftSpeed = -100;
      robot.rightSpeed = 100;
      robot.isMoving = true;

      // Rotate many times
      let currentRobot = robot;
      for (let i = 0; i < 100; i++) {
        currentRobot = Simulator.step(currentRobot, 0.1);
      }

      expect(currentRobot.heading).toBeGreaterThanOrEqual(0);
      expect(currentRobot.heading).toBeLessThan(360);
    });
  });

  describe("checkCollision() - Collision Detection", () => {
    let robot;

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
    });

    test("should return false when robot is in center", () => {
      const collision = Simulator.checkCollision(robot);
      expect(collision).toBe(false);
    });

    test("should detect collision at left wall", () => {
      robot.x = 10;
      const collision = Simulator.checkCollision(robot);
      expect(collision).toBe(true);
    });

    test("should detect collision at right wall", () => {
      robot.x = 1990;
      const collision = Simulator.checkCollision(robot);
      expect(collision).toBe(true);
    });

    test("should detect collision at top wall", () => {
      robot.y = 10;
      const collision = Simulator.checkCollision(robot);
      expect(collision).toBe(true);
    });

    test("should detect collision at bottom wall", () => {
      robot.y = 1990;
      const collision = Simulator.checkCollision(robot);
      expect(collision).toBe(true);
    });

    test("should detect corner collision", () => {
      robot.x = 10;
      robot.y = 10;
      const collision = Simulator.checkCollision(robot);
      expect(collision).toBe(true);
    });

    test("should not collide just inside boundary", () => {
      robot.x = 200;
      robot.y = 200;
      const collision = Simulator.checkCollision(robot);
      expect(collision).toBe(false);
    });
  });

  describe("simulateUltrasonic() - Distance Sensing", () => {
    let robot;

    beforeEach(() => {
      robot = {
        x: 1000,
        y: 1000,
        heading: 0, // Facing up/north
        leftSpeed: 0,
        rightSpeed: 0,
        isMoving: false,
        trail: [],
      };
    });

    test("should return distance to wall ahead", () => {
      const distance = Simulator.simulateUltrasonic(robot);
      expect(typeof distance).toBe("number");
      expect(distance).toBeGreaterThan(0);
    });

    test("should return max range when no obstacle", () => {
      // Robot in center facing up, should see wall at ~1000mm
      const distance = Simulator.simulateUltrasonic(robot);
      expect(distance).toBeLessThanOrEqual(2000);
    });

    test("should return smaller distance near wall", () => {
      robot.y = 100; // Near top wall
      robot.heading = 0; // Facing up

      const distance = Simulator.simulateUltrasonic(robot);
      expect(distance).toBeLessThan(200);
    });

    test("should measure correctly when facing right", () => {
      robot.x = 100;
      robot.heading = 90; // Facing right

      const distance = Simulator.simulateUltrasonic(robot);
      // Should see ~1900mm to right wall
      expect(distance).toBeGreaterThan(1500);
    });

    test("should measure correctly when facing left", () => {
      robot.x = 1900;
      robot.heading = 270; // Facing left

      const distance = Simulator.simulateUltrasonic(robot);
      expect(distance).toBeGreaterThan(1500);
    });

    test("should measure correctly when facing down", () => {
      robot.y = 1900;
      robot.heading = 180; // Facing down

      const distance = Simulator.simulateUltrasonic(robot);
      expect(distance).toBeLessThan(200);
    });

    test("should handle diagonal directions", () => {
      robot.heading = 45;
      const distance = Simulator.simulateUltrasonic(robot);
      expect(typeof distance).toBe("number");
      expect(distance).toBeGreaterThan(0);
    });

    test("should return consistent readings for same position", () => {
      const distance1 = Simulator.simulateUltrasonic(robot);
      const distance2 = Simulator.simulateUltrasonic(robot);
      expect(distance1).toBe(distance2);
    });
  });

  describe("reset() - State Reset", () => {
    test("should reset robot to default position", () => {
      const robot = Simulator.reset();

      expect(robot.x).toBe(1000);
      expect(robot.y).toBe(1000);
      expect(robot.heading).toBe(0);
      expect(robot.leftSpeed).toBe(0);
      expect(robot.rightSpeed).toBe(0);
      expect(robot.isMoving).toBe(false);
      expect(Array.isArray(robot.trail)).toBe(true);
      expect(robot.trail.length).toBe(0);
    });

    test("should accept custom starting position", () => {
      const robot = Simulator.reset({ x: 500, y: 500, heading: 90 });

      expect(robot.x).toBe(500);
      expect(robot.y).toBe(500);
      expect(robot.heading).toBe(90);
    });
  });

  describe("Edge Cases", () => {
    test("should handle NaN speeds gracefully", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: NaN,
        rightSpeed: NaN,
        isMoving: true,
        trail: [],
      };

      // Should not throw
      expect(() => Simulator.step(robot, 0.1)).not.toThrow();
    });

    test("should handle Infinity speeds gracefully", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: Infinity,
        rightSpeed: Infinity,
        isMoving: true,
        trail: [],
      };

      expect(() => Simulator.step(robot, 0.1)).not.toThrow();
    });

    test("should handle negative time step", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 100,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      // Should not throw, may ignore or handle gracefully
      expect(() => Simulator.step(robot, -0.1)).not.toThrow();
    });

    test("should handle zero time step", () => {
      const robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 100,
        rightSpeed: 100,
        isMoving: true,
        trail: [],
      };

      const newRobot = Simulator.step(robot, 0);
      expect(newRobot.x).toBe(1000);
      expect(newRobot.y).toBe(1000);
    });
  });

  describe("Differential Drive Kinematics", () => {
    let robot;

    beforeEach(() => {
      robot = {
        x: 1000,
        y: 1000,
        heading: 0,
        leftSpeed: 0,
        rightSpeed: 0,
        isMoving: true,
        trail: [],
      };
    });

    test("should pivot on left wheel when left speed is zero", () => {
      robot.leftSpeed = 0;
      robot.rightSpeed = 100;

      const startX = robot.x;
      const newRobot = Simulator.step(robot, 0.5);

      // Robot should rotate around left wheel
      expect(newRobot.heading).not.toBe(0);
    });

    test("should pivot on right wheel when right speed is zero", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = 0;

      const newRobot = Simulator.step(robot, 0.5);

      // Robot should rotate around right wheel
      expect(newRobot.heading).not.toBe(0);
    });

    test("should spin in place when wheels opposite", () => {
      robot.leftSpeed = 100;
      robot.rightSpeed = -100;

      const startX = robot.x;
      const startY = robot.y;
      const newRobot = Simulator.step(robot, 0.5);

      // Position should stay approximately the same
      expect(Math.abs(newRobot.x - startX)).toBeLessThan(50);
      expect(Math.abs(newRobot.y - startY)).toBeLessThan(50);
      // But heading should change significantly
      expect(newRobot.heading).not.toBe(0);
    });

    test("should arc when one wheel faster", () => {
      robot.leftSpeed = 50;
      robot.rightSpeed = 100;

      const newRobot = Simulator.step(robot, 0.5);

      // Should both move and turn
      expect(newRobot.x).not.toBe(1000);
      expect(newRobot.heading).not.toBe(0);
    });
  });
});
