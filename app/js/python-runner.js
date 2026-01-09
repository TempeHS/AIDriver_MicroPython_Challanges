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
  executionId: 0, // Track current execution to ignore stale callbacks

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
    // Register external modules FIRST (before configure)
    this.registerMicroPythonModules();

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

    console.log("[PythonRunner] Initialized with MicroPython module mocks");
  },

  /**
   * Register MicroPython-compatible modules in Skulpt
   */
  registerMicroPythonModules() {
    // Initialize builtin files
    Sk.builtinFiles = Sk.builtinFiles || { files: {} };

    // Add aidriver module as pure Python with JS interop
    Sk.builtinFiles["files"]["src/lib/aidriver.py"] =
      this.getAIDriverPythonModule();

    console.log("[PythonRunner] Registered aidriver Python module");
  },

  /**
   * Get Python source for aidriver module
   * This uses a simple approach - call window functions from Python
   */
  getAIDriverPythonModule() {
    // Get speed multiplier from App (default to 1)
    const speedMult =
      typeof App !== "undefined" && App.speedMultiplier
        ? App.speedMultiplier
        : 1;
    return `
# AIDriver module for browser simulator
# This is a Python implementation that works with Skulpt

DEBUG_AIDRIVER = False
_SPEED_MULTIPLIER = ${speedMult}

# Command queue - will be read by JavaScript
_command_queue = []

def _queue_command(cmd_type, params=None):
    """Queue a command for the JavaScript simulator"""
    global _command_queue
    if params is None:
        params = {}
    _command_queue.append({"type": cmd_type, "params": params})

def _get_commands():
    """Get all queued commands and clear the queue"""
    global _command_queue
    cmds = _command_queue[:]
    _command_queue = []
    return cmds

class AIDriver:
    """AIDriver robot controller for the simulator"""
    
    def __init__(self):
        """Initialize the robot"""
        self._right_speed = 0
        self._left_speed = 0
        self._is_moving = False
        _queue_command("init")
        if DEBUG_AIDRIVER:
            print("[AIDriver] Robot initialized")
    
    def drive_forward(self, right_speed, left_speed):
        """Drive the robot forward with specified wheel speeds"""
        self._right_speed = int(right_speed)
        self._left_speed = int(left_speed)
        self._is_moving = True
        _queue_command("drive_forward", {
            "rightSpeed": self._right_speed,
            "leftSpeed": self._left_speed
        })
        if DEBUG_AIDRIVER:
            print("[AIDriver] drive_forward:", right_speed, left_speed)
    
    def drive_backward(self, right_speed, left_speed):
        """Drive the robot backward with specified wheel speeds"""
        self._right_speed = int(right_speed)
        self._left_speed = int(left_speed)
        self._is_moving = True
        _queue_command("drive_backward", {
            "rightSpeed": self._right_speed,
            "leftSpeed": self._left_speed
        })
        if DEBUG_AIDRIVER:
            print("[AIDriver] drive_backward:", right_speed, left_speed)
    
    def rotate_left(self, turn_speed):
        """Rotate the robot left"""
        self._is_moving = True
        _queue_command("rotate_left", {"turnSpeed": int(turn_speed)})
        if DEBUG_AIDRIVER:
            print("[AIDriver] rotate_left:", turn_speed)
    
    def rotate_right(self, turn_speed):
        """Rotate the robot right"""
        self._is_moving = True
        _queue_command("rotate_right", {"turnSpeed": int(turn_speed)})
        if DEBUG_AIDRIVER:
            print("[AIDriver] rotate_right:", turn_speed)
    
    def brake(self):
        """Stop the robot"""
        self._right_speed = 0
        self._left_speed = 0
        self._is_moving = False
        _queue_command("brake")
        if DEBUG_AIDRIVER:
            print("[AIDriver] brake")
    
    def read_distance(self):
        """Read ultrasonic sensor distance in mm"""
        # This will be overridden by JavaScript
        _queue_command("read_distance")
        return 1000
    
    def is_moving(self):
        """Check if robot is moving"""
        return self._is_moving
    
    def get_motor_speeds(self):
        """Get current motor speeds as tuple (right, left)"""
        return (self._right_speed, self._left_speed)


def hold_state(seconds):
    """Hold the current state for specified seconds (adjusted by speed multiplier)"""
    import time
    if DEBUG_AIDRIVER:
        print("[AIDriver] hold_state:", seconds, "seconds")
    _queue_command("hold_state", {"seconds": float(seconds)})
    # Divide sleep time by speed multiplier so faster speeds = shorter real time
    actual_sleep = float(seconds) / _SPEED_MULTIPLIER
    time.sleep(actual_sleep)
`;
  },

  /**
   * Get mock 'machine' module for MicroPython compatibility
   */
  getMachineModule() {
    return function (name) {
      if (name !== "machine") return undefined;

      const mod = {};

      // Pin class mock
      mod.Pin = Sk.misceval.buildClass(
        mod,
        function ($gbl, $loc) {
          $loc.__init__ = new Sk.builtin.func(function (self, pin, mode) {
            self.pin = Sk.ffi.remapToJs(pin);
            self.mode = mode ? Sk.ffi.remapToJs(mode) : 0;
            self.value_ = 0;
            return Sk.builtin.none.none$;
          });

          $loc.on = new Sk.builtin.func(function (self) {
            self.value_ = 1;
            return Sk.builtin.none.none$;
          });

          $loc.off = new Sk.builtin.func(function (self) {
            self.value_ = 0;
            return Sk.builtin.none.none$;
          });

          $loc.value = new Sk.builtin.func(function (self, val) {
            if (val !== undefined) {
              self.value_ = Sk.ffi.remapToJs(val);
              return Sk.builtin.none.none$;
            }
            return new Sk.builtin.int_(self.value_);
          });

          $loc.toggle = new Sk.builtin.func(function (self) {
            self.value_ = self.value_ ? 0 : 1;
            return Sk.builtin.none.none$;
          });
        },
        "Pin",
        []
      );

      // Pin constants
      mod.Pin.OUT = new Sk.builtin.int_(1);
      mod.Pin.IN = new Sk.builtin.int_(0);
      mod.Pin.PULL_UP = new Sk.builtin.int_(1);
      mod.Pin.PULL_DOWN = new Sk.builtin.int_(2);

      // PWM class mock
      mod.PWM = Sk.misceval.buildClass(
        mod,
        function ($gbl, $loc) {
          $loc.__init__ = new Sk.builtin.func(function (self, pin) {
            self.freq_ = 1000;
            self.duty_ = 0;
            return Sk.builtin.none.none$;
          });

          $loc.freq = new Sk.builtin.func(function (self, f) {
            if (f !== undefined) {
              self.freq_ = Sk.ffi.remapToJs(f);
            }
            return new Sk.builtin.int_(self.freq_);
          });

          $loc.duty_u16 = new Sk.builtin.func(function (self, d) {
            if (d !== undefined) {
              self.duty_ = Sk.ffi.remapToJs(d);
            }
            return new Sk.builtin.int_(self.duty_);
          });
        },
        "PWM",
        []
      );

      // Timer class mock
      mod.Timer = Sk.misceval.buildClass(
        mod,
        function ($gbl, $loc) {
          $loc.__init__ = new Sk.builtin.func(function (self, id) {
            return Sk.builtin.none.none$;
          });

          $loc.init = new Sk.builtin.func(function (self, kwargs) {
            // Timer callbacks are not supported in browser
            return Sk.builtin.none.none$;
          });

          $loc.deinit = new Sk.builtin.func(function (self) {
            return Sk.builtin.none.none$;
          });
        },
        "Timer",
        []
      );

      mod.Timer.PERIODIC = new Sk.builtin.int_(1);
      mod.Timer.ONE_SHOT = new Sk.builtin.int_(0);

      // time_pulse_us mock - returns simulated pulse duration
      mod.time_pulse_us = new Sk.builtin.func(function (pin, level, timeout) {
        // Return a simulated pulse based on robot's distance to wall
        let distance = 1000; // default 1 meter
        if (
          typeof Simulator !== "undefined" &&
          typeof App !== "undefined" &&
          App.robot
        ) {
          distance = Simulator.simulateUltrasonic(App.robot);
        }
        // Convert distance to pulse duration (microseconds)
        // distance = (duration * 0.343) / 2, so duration = distance * 2 / 0.343
        const duration = Math.round((distance * 2) / 0.343);
        return new Sk.builtin.int_(duration);
      });

      return mod;
    };
  },

  /**
   * Extend the time module with MicroPython-specific functions
   */
  extendTimeModule() {
    // We'll add these via builtinFiles as Python code that works with Skulpt
    const timeExtensions = `
# MicroPython time module extensions for browser simulation
import time as _time

def sleep_ms(ms):
    """Sleep for given number of milliseconds"""
    _time.sleep(ms / 1000.0)

def sleep_us(us):
    """Sleep for given number of microseconds"""
    _time.sleep(us / 1000000.0)

_start_ticks = 0

def ticks_ms():
    """Return increasing millisecond counter"""
    return int(_time.time() * 1000) & 0x3FFFFFFF

def ticks_us():
    """Return increasing microsecond counter"""
    return int(_time.time() * 1000000) & 0x3FFFFFFF

def ticks_diff(t1, t2):
    """Return difference between two ticks values"""
    diff = t1 - t2
    if diff < -0x20000000:
        diff += 0x40000000
    elif diff > 0x1FFFFFFF:
        diff -= 0x40000000
    return diff
`;

    // Register as a module that can be imported
    Sk.builtinFiles = Sk.builtinFiles || { files: {} };
    Sk.builtinFiles["files"]["src/lib/micropython_time.py"] = timeExtensions;
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
    console.log("[PythonRunner] handleRead called for:", filename);

    // Handle aidriver module - check various possible paths
    if (
      filename === "src/lib/aidriver.py" ||
      filename === "./aidriver.py" ||
      filename === "aidriver.py" ||
      filename === "src/lib/aidriver/__init__.py"
    ) {
      console.log("[PythonRunner] Returning aidriver Python module");
      return this.getAIDriverPythonModule();
    }

    // Check builtin files
    if (Sk.builtinFiles && Sk.builtinFiles["files"][filename]) {
      return Sk.builtinFiles["files"][filename];
    }

    throw new Sk.builtin.ImportError("No module named " + filename);
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
          DebugPanel.error(
            "Code has errors that must be fixed before running:"
          );
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
    this.executionId++; // Increment to invalidate stale callbacks

    // Clear command queue
    AIDriverStub.clearQueue();

    // Set DEBUG_AIDRIVER based on code
    AIDriverStub.DEBUG_AIDRIVER = code.includes("DEBUG_AIDRIVER = True");

    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log("[Python] Starting execution...", "info");
    }

    try {
      // Re-register external modules (in case they were cleared)
      this.registerMicroPythonModules();

      // Configure Skulpt for async execution
      Sk.configure({
        output: this.handleOutput.bind(this),
        read: this.handleRead.bind(this),
        yieldLimit: 100, // Yield every 100 ops to prevent blocking
        execLimit: Number.MAX_SAFE_INTEGER,
        __future__: Sk.python3,
      });

      // Compile and run
      const promise = Sk.misceval.asyncToPromise(
        () => Sk.importMainWithBody("<stdin>", false, code, true),
        {
          "*": () => {
            // Check if we should stop
            if (this.shouldStop) {
              throw new Sk.builtin.KeyboardInterrupt("Execution stopped");
            }
            // Process commands on each yield
            this.processCommandQueue();

            // Trigger render if robot is moving
            if (typeof App !== "undefined" && App.robot && App.robot.isMoving) {
              if (typeof render === "function") {
                render();
              }
            }
          },
        }
      );

      this.executionPromise = promise;
      await promise;

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
    if (typeof App !== "undefined" && App.robot) {
      App.robot.leftSpeed = 0;
      App.robot.rightSpeed = 0;
      App.robot.isMoving = false;
    }

    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log("[Python] Execution stopped", "warning");
    }

    console.log("[PythonRunner] Stopped");
  },

  /**
   * Process commands from the Python aidriver module's queue
   */
  processCommandQueue() {
    // Try to get commands from Python's aidriver module
    let commands = [];

    try {
      // Access the aidriver module if it's been imported
      if (Sk.sysmodules && Sk.sysmodules.mp$subscript) {
        const aidriverMod = Sk.sysmodules.mp$subscript(
          new Sk.builtin.str("aidriver")
        );
        if (aidriverMod) {
          // Call _get_commands() to retrieve and clear the queue
          const getCommandsFunc = aidriverMod.tp$getattr(
            new Sk.builtin.str("_get_commands")
          );
          if (getCommandsFunc) {
            const result = Sk.misceval.callsimOrSuspend(getCommandsFunc);
            if (result && result.v) {
              // Convert Python list to JavaScript array
              commands = Sk.ffi.remapToJs(result);
            }
          }
        }
      }
    } catch (e) {
      // Module not loaded yet or error - ignore
      console.log("[PythonRunner] Could not get commands from Python:", e);
    }

    // Also check AIDriverStub for backwards compatibility
    while (AIDriverStub.hasCommands()) {
      commands.push(AIDriverStub.getNextCommand());
    }

    // Process all commands
    for (const cmd of commands) {
      console.log("[PythonRunner] Processing command:", cmd.type, cmd.params);

      // Update App.robot directly based on command
      if (typeof App !== "undefined" && App.robot) {
        switch (cmd.type) {
          case "drive_forward":
            App.robot.leftSpeed = cmd.params.leftSpeed;
            App.robot.rightSpeed = cmd.params.rightSpeed;
            App.robot.isMoving = true;
            console.log(
              "[PythonRunner] Robot moving forward:",
              App.robot.leftSpeed,
              App.robot.rightSpeed
            );
            break;

          case "drive_backward":
            App.robot.leftSpeed = -cmd.params.leftSpeed;
            App.robot.rightSpeed = -cmd.params.rightSpeed;
            App.robot.isMoving = true;
            break;

          case "rotate_left":
            App.robot.leftSpeed = -cmd.params.turnSpeed;
            App.robot.rightSpeed = cmd.params.turnSpeed;
            App.robot.isMoving = true;
            break;

          case "rotate_right":
            App.robot.leftSpeed = cmd.params.turnSpeed;
            App.robot.rightSpeed = -cmd.params.turnSpeed;
            App.robot.isMoving = true;
            break;

          case "brake":
            App.robot.leftSpeed = 0;
            App.robot.rightSpeed = 0;
            App.robot.isMoving = false;
            break;

          case "init":
            // Robot initialized
            if (typeof DebugPanel !== "undefined") {
              DebugPanel.info("[AIDriver] Robot initialized");
            }
            break;

          case "hold_state":
            // Hold state is handled by Python's time.sleep
            break;

          case "read_distance":
            // Just logging, no action needed
            break;

          default:
            console.log("[PythonRunner] Unknown command:", cmd);
        }
      }
    }
  },

  /**
   * Handle Python errors
   */
  handleError(error) {
    try {
      // Ignore errors if we're already stopped
      if (this.shouldStop || !this.isRunning) {
        return;
      }

      let message = "";
      let lineNumber = null;

      // Check for KeyboardInterrupt (user stopped execution)
      try {
        if (
          Sk.builtin &&
          Sk.builtin.KeyboardInterrupt &&
          error instanceof Sk.builtin.KeyboardInterrupt
        ) {
          return;
        }
      } catch (e) {
        // instanceof check failed, continue to check by name
      }

      // Also check by name in case instanceof fails
      if (error && error.tp$name === "KeyboardInterrupt") {
        return;
      }

      // Check for stop signal string
      if (error === "stopped" || (error && error.message === "stopped")) {
        return;
      }

      if (error && error.traceback && error.traceback.length > 0) {
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
    } catch (e) {
      // Ignore any errors in error handling itself
      console.error("[PythonRunner] Error in handleError:", e);
    }
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

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PythonRunner;
}
