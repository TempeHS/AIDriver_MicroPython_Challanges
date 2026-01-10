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
   * Comprehensive challenge definitions keyed by identifier.
   * Consumers should treat this object as immutable runtime configuration.
   */
  const definitions = {
    // Debug Script: Hardware test from project/main.py
    debug: {
      id: "debug",
      title: "Debug Script",
      subtitle: "Hardware Test",
      icon: "bi-bug",
      menuGroup: "special", // Shows at top with divider after
      difficulty: DIFFICULTY.BEGINNER,
      description:
        "Run the hardware debug script (project/main.py) to test all robot functions.",
      goal: "Verify motors, rotation, and ultrasonic sensor are working correctly.",
      hints: [
        "This script tests all hardware functions",
        "Watch the robot drive forward, backward, rotate, and read distances",
        "Check the debug output for sensor readings",
      ],
      startPosition: { x: 1000, y: 1800, heading: 0 },
      successCriteria: {
        type: "run_without_error",
        minDistance: 100,
      },
      path: null,
      obstacles: [],
    },

    // Challenge 0: Fix the Code
    0: {
      id: 0,
      title: "Fix the Code",
      subtitle: "Debug Practice",
      icon: "bi-wrench",
      menuGroup: "basic",
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
      icon: "bi-arrow-up",
      menuGroup: "basic",
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
        zone: { x: 900, y: 0, width: 200, height: 150 },
        maxDeviation: 150, // Max allowed X deviation from center
      },
      path: {
        type: "line",
        start: { x: 1000, y: 1800 },
        end: { x: 1000, y: 75 },
        width: 150,
      },
      obstacles: [],
    },

    // Challenge 2: Drive a Circle
    2: {
      id: 2,
      title: "Drive a Circle",
      subtitle: "Differential Drive",
      icon: "bi-circle",
      menuGroup: "basic",
      difficulty: DIFFICULTY.EASY,
      description: "Modify wheel speeds to make the robot drive in a circle.",
      goal: "Complete at least one full circle and return near the start.",
      hints: [
        "Different wheel speeds cause turning",
        "Faster left wheel = turn right",
        "Faster right wheel = turn left",
        "Larger speed difference = tighter circle",
      ],
      startPosition: { x: 1000, y: 1400, heading: 90 },
      successCriteria: {
        type: "complete_circle",
        centerTolerance: 100, // Must finish inside the 100mm finish box
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
      icon: "bi-rulers",
      menuGroup: "basic",
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

    // Challenge 4: Drive a Square
    4: {
      id: 4,
      title: "Drive a Square",
      subtitle: "Precision Turning",
      icon: "bi-square",
      menuGroup: "basic",
      difficulty: DIFFICULTY.MEDIUM,
      description: "Drive in a square pattern using 90-degree turns.",
      goal: "Complete a square path and return to the starting position.",
      hints: [
        "Drive forward a set distance",
        "Use rotate_left() or rotate_right() to turn 90 degrees",
        "Repeat 4 times to complete the square",
        "Timing is key for accurate turns",
      ],
      startPosition: { x: 600, y: 1400, heading: 0 },
      successCriteria: {
        type: "complete_square",
        startZone: { x: 500, y: 1300, width: 200, height: 200 },
        minSideLength: 600,
        corners: 4,
      },
      path: {
        type: "square",
        corner: { x: 600, y: 1400 },
        size: 800,
        width: 150,
      },
      obstacles: [],
    },

    // Challenge 5: Obstacle Avoidance
    5: {
      id: 5,
      title: "Obstacle Avoidance",
      subtitle: "Sensor Navigation",
      icon: "bi-exclamation-triangle",
      menuGroup: "basic",
      difficulty: DIFFICULTY.MEDIUM,
      description: "Navigate around obstacles using the ultrasonic sensor.",
      goal: "Turn left, then right to reach the target zone.",
      hints: [
        "Use read_distance() to detect obstacles ahead",
        "Turn left when you detect the first obstacle",
        "Turn right when you detect the second obstacle",
        "Then drive forward to the target",
      ],
      startPosition: { x: 1000, y: 1800, heading: 0 },
      successCriteria: {
        type: "reach_zone",
        zone: { x: 400, y: 100, width: 200, height: 200 },
      },
      path: {
        type: "obstacle_course",
        waypoints: [
          { x: 1000, y: 1800 },
          { x: 1000, y: 900 },
          { x: 500, y: 900 },
          { x: 500, y: 200 },
        ],
        width: 200,
      },
      obstacles: [
        { x: 900, y: 500, width: 200, height: 200 }, // Directly ahead - turn left (gap from path)
        { x: 100, y: 800, width: 200, height: 200 }, // On horizontal path center - turn right
      ],
    },

    // Challenge 6: Maze Navigation
    6: {
      id: 6,
      title: "Maze Navigation",
      subtitle: "Autonomous Navigation",
      icon: "bi-signpost-split",
      menuGroup: "advanced",
      difficulty: DIFFICULTY.HARD,
      description: "Navigate through a maze using ultrasonic sensing.",
      goal: "Reach the exit zone without hitting walls.",
      hints: [
        "Use read_distance() to detect walls",
        "Turn when you get too close",
        "Wall-following is a common strategy",
        "Left-hand rule or right-hand rule can work",
      ],
      startPosition: { x: 300, y: 1700, heading: 0 },
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
      icon: "bi-controller",
      menuGroup: "advanced",
      difficulty: DIFFICULTY.BEGINNER,
      description:
        "Pair the BLE gamepad with your HM-10 module and drive the robot or simulator manually.",
      goal: "Practice manual control while monitoring live ultrasonic telemetry.",
      hints: [
        "Select BLE Gamepad and tap Connect to pair with the HM-10",
        "Drag the joystick or use WASD / arrow keys to steer",
        "Watch the distance readout to plan safe braking",
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
   * Retrieve a challenge definition by identifier, falling back to challenge 0 when missing.
   * @param {number|string} id Challenge identifier; accepts numeric or string ids.
   * @returns {object} Challenge metadata including paths, goals, and criteria.
   */
  function get(id) {
    return definitions[id] || definitions[0];
  }

  /**
   * Access the full definitions map for read-only operations.
   * @returns {Record<string, object>} Dictionary of challenge definitions keyed by id.
   */
  function getAll() {
    return definitions;
  }

  /**
   * Count the total number of registered challenges.
   * @returns {number} Total challenge entries including debug script.
   */
  function count() {
    return Object.keys(definitions).length;
  }

  /**
   * Evaluate the robot state against the challenge-specific success criteria.
   * @param {number|string} challengeId Identifier of the active challenge.
   * @param {{x:number,y:number,leftSpeed:number,rightSpeed:number,heading?:number}} robotState Latest simulator robot snapshot.
   * @param {object} sessionData Aggregated telemetry captured during the run.
   * @returns {{success:boolean,message:string}} Result with user-facing feedback.
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
   * Determine whether the run completed error-free and covered the minimum distance.
   * @param {{x:number,y:number}} robot Current robot coordinates.
   * @param {{hasError?:boolean,startPosition?:{x:number,y:number}}} session Session metrics for the attempt.
   * @param {{minDistance:number}} criteria Success constraint for movement.
   * @returns {{success:boolean,message:string}} Evaluation outcome.
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
   * Determine whether the robot currently resides inside the configured zone.
   * @param {{x:number,y:number}} robot Current robot coordinates.
   * @param {{zone:{x:number,y:number,width:number,height:number}}} criteria Zone dimensions to evaluate.
   * @returns {{success:boolean,message:string}} Evaluation outcome.
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
   * Confirm the robot completed sufficient rotation and returned near its start point.
   * @param {{x:number,y:number}} robot Current robot coordinates.
   * @param {{startPosition:{x:number,y:number},totalRotation?:number}} session Session metrics.
   * @param {{minRotation:number,centerTolerance:number}} criteria Circle completion bounds.
   * @returns {{success:boolean,message:string}} Evaluation outcome.
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
   * Verify the robot has stopped and is within the prescribed distance window from the wall.
   * @param {{x:number,y:number,leftSpeed:number,rightSpeed:number}} robot Robot state including wheel speeds.
   * @param {{wallPosition:number,targetDistance:{min:number,max:number}}} criteria Distance tolerances.
   * @returns {{success:boolean,message:string}} Evaluation outcome.
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
   * Validate the robot reached the top of the arena and returned to the origin zone.
   * @param {{x:number,y:number}} robot Current robot coordinates.
   * @param {{minY?:number}} session Session tracking with minY metric.
   * @param {{startZone:{x:number,y:number,width:number,height:number},mustReachTop:number}} criteria Required movement bounds.
   * @returns {{success:boolean,message:string}} Evaluation outcome.
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
   * Assess figure-eight completion by crossover counts and cumulative rotation.
   * @param {{}} robot Robot state (position not directly used).
   * @param {{crossoverCount?:number,totalRotation?:number}} session Session metrics captured during run.
   * @param {{crossoverCount:number,minRotation:number}} criteria Figure-eight thresholds.
   * @returns {{success:boolean,message:string}} Evaluation outcome.
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

  /**
   * Build the HTML string representing the grouped challenge dropdown menu.
   * @param {"simulator"|"docs"} [menuType="simulator"] Determines link targets within the menu.
   * @returns {string} HTML snippet for insertion into dropdown menus.
   */
  function generateMenuHTML(menuType = "simulator") {
    const groups = { special: [], basic: [], advanced: [] };

    // Sort challenges into groups
    Object.values(definitions).forEach((challenge) => {
      const group = challenge.menuGroup || "basic";
      if (groups[group]) {
        groups[group].push(challenge);
      }
    });

    let html = "";

    // Special group (debug script) - shown first with divider after
    groups.special.forEach((c) => {
      const href =
        menuType === "docs"
          ? `docs.html?doc=Challenge_${c.id}`
          : `simulator.html?challenge=${c.id}`;
      html += `<li><a class="dropdown-item" href="${href}" data-challenge="${c.id}">`;
      html += `<i class="bi ${c.icon} me-2"></i>${c.title}`;
      html += `</a></li>`;
    });

    if (groups.special.length > 0) {
      html += `<li><hr class="dropdown-divider" /></li>`;
    }

    // Basic group (challenges 0-5)
    groups.basic.forEach((c) => {
      const href =
        menuType === "docs"
          ? `docs.html?doc=Challenge_${c.id}`
          : `simulator.html?challenge=${c.id}`;
      const label =
        typeof c.id === "number" ? `Challenge ${c.id}: ${c.title}` : c.title;
      html += `<li><a class="dropdown-item" href="${href}" data-challenge="${c.id}">`;
      html += `<i class="bi ${c.icon} me-2"></i>${label}`;
      html += `</a></li>`;
    });

    if (groups.advanced.length > 0) {
      html += `<li><hr class="dropdown-divider" /></li>`;
    }

    // Advanced group (challenges 6-7)
    groups.advanced.forEach((c) => {
      const href =
        menuType === "docs"
          ? `docs.html?doc=Challenge_${c.id}`
          : `simulator.html?challenge=${c.id}`;
      const label =
        typeof c.id === "number" ? `Challenge ${c.id}: ${c.title}` : c.title;
      html += `<li><a class="dropdown-item" href="${href}" data-challenge="${c.id}">`;
      html += `<i class="bi ${c.icon} me-2"></i>${label}`;
      html += `</a></li>`;
    });

    return html;
  }

  /**
   * Inject generated challenge menu HTML into the targeted list element.
   * @param {string} selector CSS selector for the container element.
   * @param {"simulator"|"docs"} [menuType="simulator"] Link mode determining menu destination.
   * @returns {void}
   */
  function populateMenu(selector, menuType = "simulator") {
    const menuEl = document.querySelector(selector);
    if (menuEl) {
      menuEl.innerHTML = generateMenuHTML(menuType);
    }
  }

  // Public API
  return {
    get,
    getAll,
    count,
    checkSuccess,
    generateMenuHTML,
    populateMenu,
    DIFFICULTY,
  };
})();
