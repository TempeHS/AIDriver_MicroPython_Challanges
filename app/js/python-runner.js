/**
 * AIDriver Simulator - Python Runner Module
 * Skulpt Python interpreter configuration and execution control
 */

const PythonRunner = {
  // Execution state
  isRunning: false,
  isPaused: false,
  shouldStop: false,
  currentSuspension: null,

  // Step mode
  stepMode: false,
  stepResolve: null,
  currentLine: 0,

  // Execution promise
  executionPromise: null,

  /**
   * Initialize Skulpt configuration
   */
  init() {
    // Configure Skulpt
    Sk.configure({
      output: this.handleOutput.bind(this),
      read: this.handleRead.bind(this),
      inputfun: this.handleInput.bind(this),
      inputfunTakesPrompt: true,
      __future__: Sk.python3,
      execLimit: null, // No time limit (we control via shouldStop)
      killableWhile: true,
      killableFor: true,
    });

    // Register the aidriver module
    Sk.builtinFiles["files"]["src/lib/aidriver.py"] =
      this.getAIDriverModuleSource();

    // Also register as external module
    Sk.externalLibs = Sk.externalLibs || {};
    Sk.externalLibs["aidriver"] = AIDriverStub.getModule();

    console.log("[PythonRunner] Initialized");
  },

  /**
   * Get the Python source for the aidriver module shim
   */
  getAIDriverModuleSource() {
    // This is a thin Python wrapper that delegates to JS
    return `
# AIDriver module shim - delegates to JavaScript implementation
DEBUG_AIDRIVER = False

class AIDriver:
    def __init__(self):
        self._js_init()
    
    def _js_init(self):
        pass
    
    def drive_forward(self, right_speed, left_speed):
        pass
    
    def drive_backward(self, right_speed, left_speed):
        pass
    
    def rotate_left(self, turn_speed):
        pass
    
    def rotate_right(self, turn_speed):
        pass
    
    def brake(self):
        pass
    
    def read_distance(self):
        return 1000
    
    def is_moving(self):
        return False
    
    def get_motor_speeds(self):
        return (0, 0)

def hold_state(seconds):
    pass
`;
  },

  /**
   * Handle Python print output
   */
  handleOutput(text) {
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log(text.trimEnd(), "output");
    } else {
      console.log("[Python]", text);
    }
  },

  /**
   * Handle Python module imports
   */
  handleRead(filename) {
    // Check for aidriver module
    if (filename === "src/lib/aidriver.py" || filename === "./aidriver.py") {
      // Return the stub module - actual implementation is via external module
      return this.getAIDriverModuleSource();
    }

    // Check builtin files
    if (Sk.builtinFiles && Sk.builtinFiles["files"][filename]) {
      return Sk.builtinFiles["files"][filename];
    }

    throw new Error(`Module not found: ${filename}`);
  },

  /**
   * Handle Python input (not supported in simulator)
   */
  handleInput(prompt) {
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log(
        "[Error] input() is not supported in the simulator",
        "error"
      );
    }
    throw new Error("input() is not supported in the simulator");
  },

  /**
   * Run Python code
   * @param {string} code - Python source code to execute
   * @returns {Promise} Resolves when execution completes
   */
  async run(code) {
    if (this.isRunning) {
      console.warn("[PythonRunner] Already running");
      return;
    }

    // Validate code first
    if (typeof Validator !== "undefined") {
      const validation = Validator.validate(code);
      if (!validation.valid) {
        if (typeof DebugPanel !== "undefined") {
          DebugPanel.error("Code has errors that must be fixed before running:");
          for (const error of validation.errors) {
            DebugPanel.error(`  Line ${error.line}: ${error.message}`);
          }
        }
        throw new Error("Validation failed - fix errors before running");
      }
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.stepMode = false;

    // Clear command queue
    AIDriverStub.clearQueue();

    // Set DEBUG_AIDRIVER based on code
    AIDriverStub.DEBUG_AIDRIVER = code.includes("DEBUG_AIDRIVER = True");

    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log("[Python] Starting execution...", "info");
    }

    try {
      // Configure interrupt check
      Sk.execLimit = null;
      Sk.execLimitFunction = () => {
        if (this.shouldStop) {
          throw new Sk.builtin.KeyboardInterrupt("Execution stopped by user");
        }
      };

      // Compile the code
      const compiled = Sk.compile(code, "<stdin>", "exec", true);

      // Create module and run
      const module = Sk.importMainWithBody("<stdin>", false, code, true);

      // Wait for execution to complete
      this.executionPromise = Sk.misceval.asyncToPromise(() => module, {
        "*": () => {
          // Check if we should stop
          if (this.shouldStop) {
            throw new Sk.builtin.KeyboardInterrupt("Execution stopped by user");
          }

          // Process queued commands
          this.processCommandQueue();
        },
      });

      await this.executionPromise;

      if (typeof DebugPanel !== "undefined") {
        DebugPanel.log("[Python] Execution completed", "success");
      }
    } catch (error) {
      this.handleError(error);
    } finally {
      this.isRunning = false;
      this.executionPromise = null;
    }
  },

  /**
   * Run code in step mode
   * @param {string} code - Python source code
   */
  async runStep(code) {
    this.stepMode = true;
    await this.run(code);
  },

  /**
   * Execute next step (when in step mode)
   */
  step() {
    if (this.stepMode && this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }
  },

  /**
   * Stop execution
   */
  stop() {
    this.shouldStop = true;
    this.isRunning = false;
    this.stepMode = false;

    if (this.stepResolve) {
      this.stepResolve();
      this.stepResolve = null;
    }

    // Clear command queue
    AIDriverStub.clearQueue();

    // Stop the robot
    if (typeof Simulator !== "undefined") {
      Simulator.brake();
    }

    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log("[Python] Execution stopped", "warning");
    }

    console.log("[PythonRunner] Stopped");
  },

  /**
   * Process commands from the queue
   */
  processCommandQueue() {
    while (AIDriverStub.hasCommands()) {
      const cmd = AIDriverStub.getNextCommand();

      if (typeof Simulator !== "undefined") {
        Simulator.executeCommand(cmd);
      } else {
        console.log("[PythonRunner] Command:", cmd);
      }
    }
  },

  /**
   * Handle Python errors
   */
  handleError(error) {
    let message = "";
    let lineNumber = null;

    if (error instanceof Sk.builtin.KeyboardInterrupt) {
      // User stopped execution - not an error
      return;
    }

    if (error.traceback && error.traceback.length > 0) {
      const tb = error.traceback[0];
      lineNumber = tb.lineno;
      message = `Line ${lineNumber}: ${error.toString()}`;
    } else {
      message = error.toString();
    }

    // Log to debug panel
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log(`[Error] ${message}`, "error");
    }

    // Mark error in editor
    if (typeof Editor !== "undefined" && lineNumber) {
      Editor.markError(lineNumber, error.toString());
    }

    console.error("[PythonRunner] Error:", error);
  },

  /**
   * Validate Python syntax without running
   * @param {string} code - Python source code
   * @returns {{valid: boolean, error: string|null, line: number|null}}
   */
  validateSyntax(code) {
    try {
      Sk.compile(code, "<stdin>", "exec", true);
      return { valid: true, error: null, line: null };
    } catch (error) {
      let line = null;
      let message = error.toString();

      if (error.traceback && error.traceback.length > 0) {
        line = error.traceback[0].lineno;
      } else if (error.args && error.args.v && error.args.v.length > 1) {
        // Try to extract line from SyntaxError
        const args = error.args.v;
        if (args[1] && args[1].v && args[1].v.length > 1) {
          line = Sk.ffi.remapToJs(args[1].v[1]);
        }
      }

      return { valid: false, error: message, line: line };
    }
  },
};

/**
 * Debug Panel helper (if not defined elsewhere)
 */
if (typeof DebugPanel === "undefined") {
  var DebugPanel = {
    log(message, type = "info") {
      const console = document.getElementById("debugConsole");
      if (console) {
        const line = document.createElement("span");
        line.className = type;
        line.textContent = message + "\n";
        console.appendChild(line);
        console.scrollTop = console.scrollHeight;
      }
      console.log(`[${type}]`, message);
    },

    clear() {
      const console = document.getElementById("debugConsole");
      if (console) {
        console.textContent = "";
      }
    },
  };
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PythonRunner;
}
