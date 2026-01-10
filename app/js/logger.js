/**
 * AIDriver Simulator - Centralized Logger Module
 * Captures all debug information for troubleshooting
 */

const Logger = {
  // Configuration
  enabled: true,
  consoleOutput: true, // Also log to browser console
  maxEntries: 2000,

  // Log storage
  entries: [],
  sessionStart: new Date(),

  // Categories for filtering
  categories: {
    APP: "App",
    PYTHON: "Python",
    SIMULATOR: "Simulator",
    EDITOR: "Editor",
    CHALLENGE: "Challenge",
    GAMEPAD: "Gamepad",
    DEBUG_PANEL: "DebugPanel",
    COMMAND: "Command",
    STATE: "State",
    ERROR: "Error",
    USER: "User",
  },

  /**
   * Initialize the logger
   */
  init() {
    this.sessionStart = new Date();
    this.entries = [];
    this.log("APP", "Logger initialized", {
      sessionStart: this.sessionStart.toISOString(),
    });

    // Capture unhandled errors
    window.addEventListener("error", (event) => {
      this.error("Unhandled error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener("unhandledrejection", (event) => {
      this.error("Unhandled promise rejection", {
        reason: String(event.reason),
        stack: event.reason?.stack,
      });
    });
  },

  /**
   * Core logging function
   * @param {string} category - Log category (APP, PYTHON, etc.)
   * @param {string} message - Log message
   * @param {object} data - Optional data object
   * @param {string} level - Log level: 'info', 'warn', 'error', 'debug'
   */
  log(category, message, data = null, level = "info") {
    if (!this.enabled) return;

    const entry = {
      timestamp: new Date().toISOString(),
      relativeTime: this._getRelativeTime(),
      category: category,
      level: level,
      message: message,
      data: data,
    };

    this.entries.push(entry);

    // Limit entries
    while (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Console output
    if (this.consoleOutput) {
      const prefix = `[${category}]`;
      const consoleMethod =
        level === "error" ? "error" : level === "warn" ? "warn" : "log";
      if (data) {
        console[consoleMethod](prefix, message, data);
      } else {
        console[consoleMethod](prefix, message);
      }
    }
  },

  /**
   * Log info message
   */
  info(category, message, data = null) {
    this.log(category, message, data, "info");
  },

  /**
   * Log warning message
   */
  warn(category, message, data = null) {
    this.log(category, message, data, "warn");
  },

  /**
   * Log error message
   */
  error(message, data = null) {
    this.log("ERROR", message, data, "error");
  },

  /**
   * Log debug message (verbose)
   */
  debug(category, message, data = null) {
    this.log(category, message, data, "debug");
  },

  /**
   * Log a command execution
   */
  command(commandType, params = null) {
    this.log("COMMAND", `Executing: ${commandType}`, params, "info");
  },

  /**
   * Log state change
   */
  stateChange(component, property, oldValue, newValue) {
    this.log(
      "STATE",
      `${component}.${property} changed`,
      { from: oldValue, to: newValue },
      "debug"
    );
  },

  /**
   * Log Python output (from print statements)
   */
  pythonOutput(message) {
    this.log("PYTHON", message, null, "info");
  },

  /**
   * Log user action
   */
  userAction(action, details = null) {
    this.log("USER", action, details, "info");
  },

  /**
   * Get relative time since session start
   */
  _getRelativeTime() {
    const elapsed = Date.now() - this.sessionStart.getTime();
    const seconds = (elapsed / 1000).toFixed(3);
    return `+${seconds}s`;
  },

  /**
   * Capture current application state
   */
  captureAppState() {
    const state = {
      timestamp: new Date().toISOString(),
      app: {
        currentChallenge:
          typeof App !== "undefined" ? App.currentChallenge : null,
        isRunning: typeof App !== "undefined" ? App.isRunning : null,
        isPaused: typeof App !== "undefined" ? App.isPaused : null,
        hasRun: typeof App !== "undefined" ? App.hasRun : null,
        speedMultiplier:
          typeof App !== "undefined" ? App.speedMultiplier : null,
        startHeadingOffset:
          typeof App !== "undefined" ? App.startHeadingOffset : null,
      },
      robot:
        typeof App !== "undefined" && App.robot
          ? {
              x: App.robot.x,
              y: App.robot.y,
              heading: App.robot.heading,
              leftSpeed: App.robot.leftSpeed,
              rightSpeed: App.robot.rightSpeed,
              isMoving: App.robot.isMoving,
              trailLength: App.robot.trail ? App.robot.trail.length : 0,
            }
          : null,
      pythonRunner: {
        isRunning:
          typeof PythonRunner !== "undefined" ? PythonRunner.isRunning : null,
        shouldStop:
          typeof PythonRunner !== "undefined" ? PythonRunner.shouldStop : null,
        isStepMode:
          typeof PythonRunner !== "undefined" ? PythonRunner.isStepMode : null,
      },
      challenge:
        typeof Challenges !== "undefined" && typeof App !== "undefined"
          ? Challenges.get(App.currentChallenge)
          : null,
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        screenSize: `${window.screen.width}x${window.screen.height}`,
        windowSize: `${window.innerWidth}x${window.innerHeight}`,
      },
    };
    return state;
  },

  /**
   * Get current code from editor
   */
  getCurrentCode() {
    if (typeof Editor !== "undefined" && Editor.getCode) {
      return Editor.getCode();
    }
    if (typeof App !== "undefined" && App.editor) {
      return App.editor.getValue();
    }
    return "(code not available)";
  },

  /**
   * Get debug console content
   */
  getDebugConsoleContent() {
    const console = document.getElementById("debugConsole");
    if (console) {
      return console.textContent || console.innerText || "(empty)";
    }
    return "(console not available)";
  },

  /**
   * Generate comprehensive debug report
   */
  generateReport() {
    const state = this.captureAppState();
    const code = this.getCurrentCode();
    const consoleOutput = this.getDebugConsoleContent();

    let report = "";
    report += "═".repeat(80) + "\n";
    report += "  AIDRIVER SIMULATOR - DEBUG LOG REPORT\n";
    report += "═".repeat(80) + "\n\n";

    // Session info
    report += "▸ SESSION INFORMATION\n";
    report += "─".repeat(40) + "\n";
    report += `  Generated: ${new Date().toISOString()}\n`;
    report += `  Session Start: ${this.sessionStart.toISOString()}\n`;
    report += `  Duration: ${this._getRelativeTime()}\n`;
    report += `  URL: ${window.location.href}\n\n`;

    // Browser info
    report += "▸ BROWSER INFORMATION\n";
    report += "─".repeat(40) + "\n";
    report += `  User Agent: ${state.browser.userAgent}\n`;
    report += `  Platform: ${state.browser.platform}\n`;
    report += `  Language: ${state.browser.language}\n`;
    report += `  Screen: ${state.browser.screenSize}\n`;
    report += `  Window: ${state.browser.windowSize}\n\n`;

    // App state
    report += "▸ APPLICATION STATE\n";
    report += "─".repeat(40) + "\n";
    if (state.app) {
      report += `  Current Challenge: ${state.app.currentChallenge}\n`;
      report += `  Is Running: ${state.app.isRunning}\n`;
      report += `  Is Paused: ${state.app.isPaused}\n`;
      report += `  Has Run: ${state.app.hasRun}\n`;
      report += `  Speed Multiplier: ${state.app.speedMultiplier}x\n`;
      report += `  Start Heading: ${state.app.startHeadingOffset}°\n`;
    }
    report += "\n";

    // Robot state
    report += "▸ ROBOT STATE\n";
    report += "─".repeat(40) + "\n";
    if (state.robot) {
      report += `  Position: (${state.robot.x.toFixed(
        1
      )}, ${state.robot.y.toFixed(1)}) mm\n`;
      report += `  Heading: ${state.robot.heading.toFixed(1)}°\n`;
      report += `  Motor Speeds: L=${state.robot.leftSpeed}, R=${state.robot.rightSpeed}\n`;
      report += `  Is Moving: ${state.robot.isMoving}\n`;
      report += `  Trail Points: ${state.robot.trailLength}\n`;
    }
    report += "\n";

    // Python runner state
    report += "▸ PYTHON RUNNER STATE\n";
    report += "─".repeat(40) + "\n";
    if (state.pythonRunner) {
      report += `  Is Running: ${state.pythonRunner.isRunning}\n`;
      report += `  Should Stop: ${state.pythonRunner.shouldStop}\n`;
      report += `  Step Mode: ${state.pythonRunner.isStepMode}\n`;
    }
    report += "\n";

    // Challenge info
    report += "▸ CURRENT CHALLENGE\n";
    report += "─".repeat(40) + "\n";
    if (state.challenge) {
      report += `  ID: ${state.challenge.id}\n`;
      report += `  Title: ${state.challenge.title}\n`;
      report += `  Description: ${state.challenge.description}\n`;
      report += `  Goal: ${state.challenge.goal}\n`;
      if (state.challenge.successCriteria) {
        report += `  Success Criteria: ${JSON.stringify(
          state.challenge.successCriteria
        )}\n`;
      }
    } else {
      report += "  (no challenge loaded)\n";
    }
    report += "\n";

    // Current code
    report += "▸ CURRENT CODE\n";
    report += "─".repeat(40) + "\n";
    report += "```python\n";
    report += code + "\n";
    report += "```\n\n";

    // Console output
    report += "▸ DEBUG CONSOLE OUTPUT\n";
    report += "─".repeat(40) + "\n";
    report += consoleOutput + "\n\n";

    // Log entries
    report += "▸ LOG ENTRIES (" + this.entries.length + " entries)\n";
    report += "─".repeat(40) + "\n";
    this.entries.forEach((entry) => {
      const level = entry.level.toUpperCase().padEnd(5);
      const cat = entry.category.padEnd(12);
      let line = `${entry.relativeTime.padStart(10)} [${level}] [${cat}] ${
        entry.message
      }`;
      if (entry.data) {
        try {
          line += ` | ${JSON.stringify(entry.data)}`;
        } catch (e) {
          line += " | (data not serializable)";
        }
      }
      report += line + "\n";
    });

    report += "\n" + "═".repeat(80) + "\n";
    report += "  END OF REPORT\n";
    report += "═".repeat(80) + "\n";

    return report;
  },

  /**
   * Download the debug report as a text file
   */
  downloadReport() {
    const report = this.generateReport();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    const filename = `aidriver-debug-log-${timestamp}.txt`;

    const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.info("APP", `Debug log downloaded: ${filename}`);
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.success(`Debug log downloaded: ${filename}`);
    }
  },

  /**
   * Clear all log entries
   */
  clear() {
    this.entries = [];
    this.sessionStart = new Date();
    this.log("APP", "Logger cleared");
  },

  /**
   * Get entries filtered by category
   */
  getByCategory(category) {
    return this.entries.filter((e) => e.category === category);
  },

  /**
   * Get entries filtered by level
   */
  getByLevel(level) {
    return this.entries.filter((e) => e.level === level);
  },

  /**
   * Get error entries only
   */
  getErrors() {
    return this.getByLevel("error");
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = Logger;
}
