/**
 * AIDriver Simulator - Physics and Robot Simulation Module
 * Handles differential drive kinematics, collision detection, and sensor simulation
 */

const Simulator = (function () {
  "use strict";

  // Physical constants (mm and ms units)
  const WHEEL_DIAMETER = 65; // mm
  const WHEEL_CIRCUMFERENCE = Math.PI * WHEEL_DIAMETER; // ~204.2mm
  const WHEEL_BASE = 120; // Distance between wheels (mm)
  const MAX_MOTOR_SPEED = 255; // Maximum motor speed value
  const MM_PER_SPEED_UNIT = 0.8; // mm per frame at speed=1

  // Arena dimensions
  const ARENA_WIDTH = 2000; // mm
  const ARENA_HEIGHT = 2000; // mm
  const ROBOT_WIDTH = 120; // mm
  const ROBOT_LENGTH = 150; // mm

  // Ultrasonic sensor
  const ULTRASONIC_MIN = 20; // mm minimum detection
  const ULTRASONIC_MAX = 2000; // mm maximum detection
  const ULTRASONIC_CONE_ANGLE = 15; // degrees half-angle

  // Simulation state
  let lastUpdateTime = 0;
  let simulationSpeed = 1.0;
  let obstacles = [];
  let mazeWalls = [];

  /**
   * Update robot position based on differential drive kinematics
   * @param {object} robot - Robot state { x, y, heading, leftSpeed, rightSpeed }
   * @param {number} dt - Time delta in seconds
   * @returns {object} Updated robot state
   */
  function updateKinematics(robot, dt) {
    const leftSpeed = robot.leftSpeed;
    const rightSpeed = robot.rightSpeed;

    // Convert motor speed to wheel velocity (mm/s)
    const leftVelocity = (leftSpeed / MAX_MOTOR_SPEED) * MM_PER_SPEED_UNIT * 1000 * simulationSpeed;
    const rightVelocity = (rightSpeed / MAX_MOTOR_SPEED) * MM_PER_SPEED_UNIT * 1000 * simulationSpeed;

    // Differential drive kinematics
    // v = (vR + vL) / 2  - linear velocity
    // ω = (vR - vL) / L  - angular velocity

    const linearVelocity = (leftVelocity + rightVelocity) / 2;
    const angularVelocity = (rightVelocity - leftVelocity) / WHEEL_BASE;

    // Update heading (in radians for calculation)
    const headingRad = (robot.heading * Math.PI) / 180;
    const newHeadingRad = headingRad + angularVelocity * dt;

    // Calculate new position
    let newX, newY;

    if (Math.abs(angularVelocity) < 0.001) {
      // Straight line motion
      newX = robot.x + linearVelocity * Math.sin(headingRad) * dt;
      newY = robot.y - linearVelocity * Math.cos(headingRad) * dt;
    } else {
      // Arc motion
      const R = linearVelocity / angularVelocity;
      newX = robot.x + R * (Math.cos(headingRad) - Math.cos(newHeadingRad));
      newY = robot.y - R * (Math.sin(newHeadingRad) - Math.sin(headingRad));
    }

    // Convert heading back to degrees
    let newHeading = (newHeadingRad * 180) / Math.PI;

    // Normalize heading to 0-360
    newHeading = ((newHeading % 360) + 360) % 360;

    return {
      ...robot,
      x: newX,
      y: newY,
      heading: newHeading,
    };
  }

  /**
   * Apply boundary constraints to robot position
   * @param {object} robot - Robot state
   * @returns {object} Constrained robot state
   */
  function applyBoundaryConstraints(robot) {
    const halfWidth = ROBOT_WIDTH / 2;
    const halfLength = ROBOT_LENGTH / 2;
    const maxRadius = Math.max(halfWidth, halfLength);

    return {
      ...robot,
      x: Math.max(maxRadius, Math.min(ARENA_WIDTH - maxRadius, robot.x)),
      y: Math.max(maxRadius, Math.min(ARENA_HEIGHT - maxRadius, robot.y)),
    };
  }

  /**
   * Check collision with obstacles
   * @param {object} robot - Robot state
   * @param {Array} obstacles - List of obstacle rectangles
   * @returns {boolean} True if collision
   */
  function checkCollision(robot, obstacles) {
    const robotCorners = getRobotCorners(robot);

    for (const obstacle of obstacles) {
      if (rectanglesOverlap(robotCorners, obstacle)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get robot corner points
   * @param {object} robot - Robot state
   * @returns {Array} Corner points [{ x, y }, ...]
   */
  function getRobotCorners(robot) {
    const halfWidth = ROBOT_WIDTH / 2;
    const halfLength = ROBOT_LENGTH / 2;
    const headingRad = (robot.heading * Math.PI) / 180;

    const cos = Math.cos(headingRad);
    const sin = Math.sin(headingRad);

    // Local corners (relative to center)
    const localCorners = [
      { x: -halfWidth, y: -halfLength },
      { x: halfWidth, y: -halfLength },
      { x: halfWidth, y: halfLength },
      { x: -halfWidth, y: halfLength },
    ];

    // Transform to world coordinates
    return localCorners.map((c) => ({
      x: robot.x + c.x * cos - c.y * sin,
      y: robot.y + c.x * sin + c.y * cos,
    }));
  }

  /**
   * Check if two rectangles overlap (simplified AABB check)
   * @param {Array} corners1 - First rectangle corners
   * @param {object} rect2 - Second rectangle { x, y, width, height }
   * @returns {boolean} True if overlapping
   */
  function rectanglesOverlap(corners1, rect2) {
    // Get AABB of rotated robot
    const xs = corners1.map((c) => c.x);
    const ys = corners1.map((c) => c.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Check against obstacle AABB
    const rect2MinX = rect2.x;
    const rect2MaxX = rect2.x + rect2.width;
    const rect2MinY = rect2.y;
    const rect2MaxY = rect2.y + rect2.height;

    return !(maxX < rect2MinX || minX > rect2MaxX || maxY < rect2MinY || minY > rect2MaxY);
  }

  /**
   * Simulate ultrasonic sensor reading
   * @param {object} robot - Robot state
   * @returns {number} Distance in mm (-1 for out of range/error)
   */
  function simulateUltrasonic(robot) {
    const headingRad = (robot.heading * Math.PI) / 180;

    // Sensor position (front center of robot)
    const sensorX = robot.x + Math.sin(headingRad) * (ROBOT_LENGTH / 2);
    const sensorY = robot.y - Math.cos(headingRad) * (ROBOT_LENGTH / 2);

    // Ray direction
    const rayDirX = Math.sin(headingRad);
    const rayDirY = -Math.cos(headingRad);

    // Check distance to walls
    let minDistance = ULTRASONIC_MAX + 1;

    // Top wall (y = 0)
    if (rayDirY < 0) {
      const t = -sensorY / rayDirY;
      if (t > 0 && t < minDistance) {
        minDistance = t;
      }
    }

    // Bottom wall (y = ARENA_HEIGHT)
    if (rayDirY > 0) {
      const t = (ARENA_HEIGHT - sensorY) / rayDirY;
      if (t > 0 && t < minDistance) {
        minDistance = t;
      }
    }

    // Left wall (x = 0)
    if (rayDirX < 0) {
      const t = -sensorX / rayDirX;
      if (t > 0 && t < minDistance) {
        minDistance = t;
      }
    }

    // Right wall (x = ARENA_WIDTH)
    if (rayDirX > 0) {
      const t = (ARENA_WIDTH - sensorX) / rayDirX;
      if (t > 0 && t < minDistance) {
        minDistance = t;
      }
    }

    // Check distance to obstacles
    for (const obstacle of obstacles) {
      const obstDist = rayBoxIntersection(
        sensorX,
        sensorY,
        rayDirX,
        rayDirY,
        obstacle.x,
        obstacle.y,
        obstacle.width,
        obstacle.height
      );
      if (obstDist !== null && obstDist < minDistance) {
        minDistance = obstDist;
      }
    }

    // Check distance to maze walls
    for (const wall of mazeWalls) {
      const wallDist = rayBoxIntersection(
        sensorX,
        sensorY,
        rayDirX,
        rayDirY,
        wall.x,
        wall.y,
        wall.width,
        wall.height
      );
      if (wallDist !== null && wallDist < minDistance) {
        minDistance = wallDist;
      }
    }

    // Apply sensor limits
    if (minDistance < ULTRASONIC_MIN) {
      return -1; // Too close
    }
    if (minDistance > ULTRASONIC_MAX) {
      return -1; // Too far / no reading
    }

    // Add some noise (±2mm)
    const noise = (Math.random() - 0.5) * 4;
    return Math.round(minDistance + noise);
  }

  /**
   * Ray-box intersection test
   * @returns {number|null} Distance to intersection or null
   */
  function rayBoxIntersection(rayX, rayY, dirX, dirY, boxX, boxY, boxW, boxH) {
    let tmin = 0;
    let tmax = Infinity;

    // X slab
    if (Math.abs(dirX) > 0.0001) {
      const t1 = (boxX - rayX) / dirX;
      const t2 = (boxX + boxW - rayX) / dirX;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (rayX < boxX || rayX > boxX + boxW) {
      return null;
    }

    // Y slab
    if (Math.abs(dirY) > 0.0001) {
      const t1 = (boxY - rayY) / dirY;
      const t2 = (boxY + boxH - rayY) / dirY;
      tmin = Math.max(tmin, Math.min(t1, t2));
      tmax = Math.min(tmax, Math.max(t1, t2));
    } else if (rayY < boxY || rayY > boxY + boxH) {
      return null;
    }

    if (tmin > tmax || tmax < 0) {
      return null;
    }

    return tmin > 0 ? tmin : tmax;
  }

  /**
   * Run one simulation step
   * @param {object} robot - Current robot state
   * @param {number} dt - Time delta in seconds
   * @returns {object} Updated robot state
   */
  function step(robot, dt) {
    if (!robot.isMoving && robot.leftSpeed === 0 && robot.rightSpeed === 0) {
      return robot;
    }

    // Update kinematics
    let newState = updateKinematics(robot, dt);

    // Apply boundary constraints
    newState = applyBoundaryConstraints(newState);

    // Check collisions
    if (checkCollision(newState, obstacles.concat(mazeWalls))) {
      // Stop on collision
      newState.leftSpeed = 0;
      newState.rightSpeed = 0;
      newState.isMoving = false;

      if (typeof DebugPanel !== "undefined") {
        DebugPanel.warning("Robot collision detected!");
      }
    }

    // Update trail
    newState.trail = [...(robot.trail || []), { x: newState.x, y: newState.y }];
    if (newState.trail.length > 1000) {
      newState.trail = newState.trail.slice(-1000);
    }

    return newState;
  }

  /**
   * Set simulation speed multiplier
   * @param {number} speed - Speed multiplier (1.0 = normal)
   */
  function setSpeed(speed) {
    simulationSpeed = Math.max(0.1, Math.min(5.0, speed));
  }

  /**
   * Set obstacles for collision detection
   * @param {Array} obstacleList - List of { x, y, width, height }
   */
  function setObstacles(obstacleList) {
    obstacles = obstacleList || [];
  }

  /**
   * Set maze walls for collision detection
   * @param {Array} walls - List of { x, y, width, height }
   */
  function setMazeWalls(walls) {
    mazeWalls = walls || [];
  }

  /**
   * Clear all obstacles and walls
   */
  function clearObstacles() {
    obstacles = [];
    mazeWalls = [];
  }

  /**
   * Get initial robot state
   * @returns {object} Default robot state
   */
  function getInitialRobotState() {
    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT - 200, // Near bottom
      heading: 0, // Facing up
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
      trail: [],
    };
  }

  // Public API
  return {
    // Constants
    ARENA_WIDTH,
    ARENA_HEIGHT,
    ROBOT_WIDTH,
    ROBOT_LENGTH,
    ULTRASONIC_MIN,
    ULTRASONIC_MAX,

    // Methods
    step,
    simulateUltrasonic,
    checkCollision,
    getRobotCorners,
    setSpeed,
    setObstacles,
    setMazeWalls,
    clearObstacles,
    getInitialRobotState,
    applyBoundaryConstraints,
  };
})();
