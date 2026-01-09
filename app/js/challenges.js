/**
 * AIDriver Simulator - Challenge Definitions
 * Defines all 8 challenges (0-7) with goals, paths, success criteria
 */

const Challenges = (function () {
  "use strict";

  // Challenge difficulty colors
  const DIFFICULTY = {
    BEGINNER: "success",
    EASY: "info",
    MEDIUM: "warning",
    HARD: "danger",
  };

  /**
   * Challenge definitions
   */
  const definitions = {
    // Challenge 0: Fix the Code
    0: {
      id: 0,
      title: "Fix the Code",
      subtitle: "Debug Practice",
      difficulty: DIFFICULTY.BEGINNER,
      description: "Find and fix the syntax errors in the provided code.",
      goal: "Make the code run without errors. The robot should drive forward.",
      hints: [
        "Look for missing colons (:) after 'while' statements",
        "Check variable names for typos (my_robot vs my_robt)",
        "Python is case-sensitive!",
      ],
      startPosition: { x: 1000, y: 1800, heading: 0 },
      successCriteria: {
        type: "run_without_error",
        minDistance: 100, // Must move at least 100mm
      },
      path: null, // No specific path required
      obstacles: [],
    },

    // Challenge 1: Drive in a Straight Line
    1: {
      id: 1,
      title: "Drive in a Straight Line",
      subtitle: "Motor Balance",
      difficulty: DIFFICULTY.BEGINNER,
      description: "Balance the motor speeds so the robot drives straight.",
      goal: "Drive from start to the green target zone without veering off.",
      hints: [
        "If robot veers right, increase left motor speed",
        "If robot veers left, increase right motor speed",
        "Small adjustments (5-10) make a big difference",
      ],
      startPosition: { x: 1000, y: 1800, heading: 0 },
      successCriteria: {
        type: "reach_zone",
        zone: { x: 900, y: 100, width: 200, height: 200 },
        maxDeviation: 150, // Max allowed X deviation from center
      },
      path: {
        type: "line",
        start: { x: 1000, y: 1800 },
        end: { x: 1000, y: 200 },
        width: 150,
      },
      obstacles: [],
    },

    // Challenge 2: Drive a Circle
    2: {
      id: 2,
      title: "Drive a Circle",
      subtitle: "Differential Drive",
      difficulty: DIFFICULTY.EASY,
      description: "Modify wheel speeds to make the robot drive in a circle.",
      goal: "Complete at least one full circle and return near the start.",
      hints: [
        "Different wheel speeds cause turning",
        "Faster left wheel = turn right",
        "Faster right wheel = turn left",
        "Larger speed difference = tighter circle",
      ],
      startPosition: { x: 1000, y: 1200, heading: 0 },
      successCriteria: {
        type: "complete_circle",
        centerTolerance: 300, // Must return within 300mm of start
        minRotation: 330, // Must rotate at least 330 degrees
      },
      path: {
        type: "circle",
        center: { x: 1000, y: 1000 },
        radius: 400,
        width: 150,
      },
      obstacles: [],
    },

    // Challenge 3: Detect and Stop
    3: {
      id: 3,
      title: "Detect and Stop",
      subtitle: "Ultrasonic Sensor",
      difficulty: DIFFICULTY.EASY,
      description: "Use the ultrasonic sensor to detect the wall and stop.",
      goal: "Stop within 100-200mm of the wall without hitting it.",
      hints: [
        "read_distance() returns distance in mm",
        "Returns -1 if too close (<20mm) or too far (>2000mm)",
        "Check distance in a loop and brake() when close enough",
      ],
      startPosition: { x: 1000, y: 1800, heading: 0 },
      successCriteria: {
        type: "stop_at_distance",
        targetDistance: { min: 100, max: 200 },
        wallPosition: 50, // Y position of wall
      },
      path: {
        type: "line",
        start: { x: 1000, y: 1800 },
        end: { x: 1000, y: 200 },
        width: 200,
      },
      obstacles: [],
    },

    // Challenge 4: U-Turn
    4: {
      id: 4,
      title: "U-Turn",
      subtitle: "Rotation Control",
      difficulty: DIFFICULTY.MEDIUM,
      description: "Drive forward, detect the wall, do a 180° turn, return.",
      goal: "Complete a U-turn maneuver and return to the starting area.",
      hints: [
        "Drive forward until close to wall",
        "rotate_left() or rotate_right() to turn",
        "Time the rotation for 180 degrees",
        "Drive back to start",
      ],
      startPosition: { x: 1000, y: 1800, heading: 0 },
      successCriteria: {
        type: "return_to_start",
        startZone: { x: 800, y: 1600, width: 400, height: 400 },
        mustReachTop: 400, // Must get within 400mm of top
      },
      path: {
        type: "uturn",
        startY: 1800,
        endY: 300,
        width: 200,
      },
      obstacles: [],
    },

    // Challenge 5: Figure 8
    5: {
      id: 5,
      title: "Figure 8",
      subtitle: "Complex Path",
      difficulty: DIFFICULTY.MEDIUM,
      description:
        "Drive in a figure-8 pattern combining left and right turns.",
      goal: "Complete at least one figure-8 loop.",
      hints: [
        "Figure 8 = circle left, then circle right (or vice versa)",
        "Switch wheel speed differential at the crossover",
        "Timing and speed balance are key",
      ],
      startPosition: { x: 1000, y: 1000, heading: 0 },
      successCriteria: {
        type: "figure_eight",
        crossoverPoint: { x: 1000, y: 1000 },
        crossoverCount: 2, // Must cross center twice
        minRotation: 600, // Must rotate at least 600 degrees total
      },
      path: {
        type: "figure_eight",
        center: { x: 1000, y: 1000 },
        loopRadius: 350,
        width: 150,
      },
      obstacles: [],
    },

    // Challenge 6: Maze Navigation
    6: {
      id: 6,
      title: "Maze Navigation",
      subtitle: "Autonomous Navigation",
      difficulty: DIFFICULTY.HARD,
      description: "Navigate through a maze using ultrasonic sensing.",
      goal: "Reach the exit zone without hitting walls.",
      hints: [
        "Use read_distance() to detect walls",
        "Turn when you get too close",
        "Wall-following is a common strategy",
        "Left-hand rule or right-hand rule can work",
      ],
      startPosition: { x: 200, y: 1800, heading: 0 },
      successCriteria: {
        type: "reach_zone",
        zone: { x: 1700, y: 100, width: 200, height: 200 },
        timeLimit: 60, // 60 seconds max
      },
      path: null,
      obstacles: [], // Defined by maze loader
      maze: "simple", // Default maze
    },

    // Challenge 7: Gamepad Control
    7: {
      id: 7,
      title: "Gamepad Control",
      subtitle: "Manual Driving",
      difficulty: DIFFICULTY.BEGINNER,
      description: "Use the on-screen gamepad to drive the robot manually.",
      goal: "Practice manual control to understand robot behavior.",
      hints: [
        "Use arrow buttons or keyboard arrows",
        "W/A/S/D also works for control",
        "Try driving different patterns",
      ],
      startPosition: { x: 1000, y: 1000, heading: 0 },
      successCriteria: {
        type: "manual",
        noAutoCheck: true,
      },
      path: null,
      obstacles: [],
      gamepadEnabled: true,
    },
  };

  /**
   * Get challenge by ID
   * @param {number} id - Challenge ID (0-7)
   * @returns {object} Challenge definition
   */
  function get(id) {
    return definitions[id] || definitions[0];
  }

  /**
   * Get all challenges
   * @returns {object} All challenge definitions
   */
  function getAll() {
    return definitions;
  }

  /**
   * Get challenge count
   * @returns {number} Number of challenges
   */
  function count() {
    return Object.keys(definitions).length;
  }

  /**
   * Check if robot meets success criteria
   * @param {number} challengeId - Challenge ID
   * @param {object} robotState - Current robot state
   * @param {object} sessionData - Session tracking data
   * @returns {object} { success: boolean, message: string }
   */
  function checkSuccess(challengeId, robotState, sessionData) {
    const challenge = get(challengeId);
    const criteria = challenge.successCriteria;

    switch (criteria.type) {
      case "run_without_error":
        return checkRunWithoutError(robotState, sessionData, criteria);

      case "reach_zone":
        return checkReachZone(robotState, criteria);

      case "complete_circle":
        return checkCompleteCircle(robotState, sessionData, criteria);

      case "stop_at_distance":
        return checkStopAtDistance(robotState, criteria);

      case "return_to_start":
        return checkReturnToStart(robotState, sessionData, criteria);

      case "figure_eight":
        return checkFigureEight(robotState, sessionData, criteria);

      case "manual":
        return { success: false, message: "Manual mode - no auto-check" };

      default:
        return { success: false, message: "Unknown criteria type" };
    }
  }

  /**
   * Check: Run without error and move
   */
  function checkRunWithoutError(robot, session, criteria) {
    if (session.hasError) {
      return { success: false, message: "Code has errors" };
    }

    const startPos = session.startPosition || { x: robot.x, y: robot.y };
    const distance = Math.hypot(robot.x - startPos.x, robot.y - startPos.y);

    if (distance < criteria.minDistance) {
      return {
        success: false,
        message: `Move at least ${criteria.minDistance}mm`,
      };
    }

    return { success: true, message: "Code runs correctly!" };
  }

  /**
   * Check: Reach target zone
   */
  function checkReachZone(robot, criteria) {
    const zone = criteria.zone;
    const inZone =
      robot.x >= zone.x &&
      robot.x <= zone.x + zone.width &&
      robot.y >= zone.y &&
      robot.y <= zone.y + zone.height;

    if (inZone) {
      return { success: true, message: "Target zone reached!" };
    }

    return {
      success: false,
      message: "Reach the green target zone",
    };
  }

  /**
   * Check: Complete a circle
   */
  function checkCompleteCircle(robot, session, criteria) {
    const startPos = session.startPosition;
    const totalRotation = session.totalRotation || 0;

    if (Math.abs(totalRotation) < criteria.minRotation) {
      return {
        success: false,
        message: `Complete more rotation (${Math.abs(totalRotation).toFixed(
          0
        )}° / ${criteria.minRotation}°)`,
      };
    }

    const distanceFromStart = Math.hypot(
      robot.x - startPos.x,
      robot.y - startPos.y
    );
    if (distanceFromStart > criteria.centerTolerance) {
      return {
        success: false,
        message: `Return closer to start (${distanceFromStart.toFixed(
          0
        )}mm away)`,
      };
    }

    return { success: true, message: "Circle completed!" };
  }

  /**
   * Check: Stop at specific distance
   */
  function checkStopAtDistance(robot, criteria) {
    const distanceToWall = robot.y - criteria.wallPosition;
    const isStopped = robot.leftSpeed === 0 && robot.rightSpeed === 0;

    if (!isStopped) {
      return { success: false, message: "Robot must stop" };
    }

    if (distanceToWall < criteria.targetDistance.min) {
      return { success: false, message: "Too close to wall!" };
    }

    if (distanceToWall > criteria.targetDistance.max) {
      return {
        success: false,
        message: `Get closer to wall (${distanceToWall.toFixed(0)}mm)`,
      };
    }

    return { success: true, message: "Perfect stop!" };
  }

  /**
   * Check: Return to start after U-turn
   */
  function checkReturnToStart(robot, session, criteria) {
    const zone = criteria.startZone;
    const inStartZone =
      robot.x >= zone.x &&
      robot.x <= zone.x + zone.width &&
      robot.y >= zone.y &&
      robot.y <= zone.y + zone.height;

    // Check if reached top
    const reachedTop = session.minY && session.minY <= criteria.mustReachTop;

    if (!reachedTop) {
      return { success: false, message: "Drive to the top first" };
    }

    if (!inStartZone) {
      return { success: false, message: "Return to the starting area" };
    }

    return { success: true, message: "U-turn complete!" };
  }

  /**
   * Check: Figure 8 pattern
   */
  function checkFigureEight(robot, session, criteria) {
    const crossovers = session.crossoverCount || 0;
    const totalRotation = Math.abs(session.totalRotation || 0);

    if (crossovers < criteria.crossoverCount) {
      return {
        success: false,
        message: `Cross the center more (${crossovers}/${criteria.crossoverCount})`,
      };
    }

    if (totalRotation < criteria.minRotation) {
      return {
        success: false,
        message: `Complete more turns (${totalRotation.toFixed(0)}° / ${
          criteria.minRotation
        }°)`,
      };
    }

    return { success: true, message: "Figure 8 complete!" };
  }

  // Public API
  return {
    get,
    getAll,
    count,
    checkSuccess,
    DIFFICULTY,
  };
})();
