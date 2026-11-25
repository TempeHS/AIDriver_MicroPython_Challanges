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

  // Step mode: the program runs live and pauses before each line
  stepMode: false,
  stepDelay: 750, // Pause before each line in step mode (ms)
  stepLineTime: 0.02, // Simulated seconds of robot motion per stepped line
  stepPaused: false, // Is stepping paused by the user?
  stepResumeResolve: null, // Promise resolver for resuming
  isStepping: false, // True while a step mode run is active
  currentStepLine: 0, // Line about to execute in step mode
  freezePhysics: false, // Robot physics paused while waiting on a step
  sourceCode: "", // Store source code for line display
  sourceLines: [], // Source code split by lines

  // Execution promise
  executionPromise: null,

  /**
   * Configure the Skulpt runtime with simulator-specific IO handlers and timeouts.
   * Registers MicroPython shims before configuration to ensure imports succeed.
   * @returns {void}
   */
  init() {
    console.log(
      "[PythonRunner] Before Sk.configure - Sk.setTimeout:",
      typeof Sk.setTimeout,
    );

    // Configure Skulpt FIRST, then register modules (configure may reset builtinFiles)
    Sk.configure({
      output: this.handleOutput.bind(this),
      read: this.handleRead.bind(this),
      inputfun: this.handleInput.bind(this),
      inputfunTakesPrompt: true,
      __future__: Sk.python3,
      execLimit: null, // No time limit (we control via shouldStop)
      killableWhile: true,
      killableFor: true,
      // CRITICAL: Provide setTimeout for time.sleep() to work properly
      setTimeout: function (fn, delay) {
        console.log("[Skulpt] setTimeout called with delay:", delay);
        return setTimeout(fn, delay);
      },
    });

    // Register external modules AFTER configure so entries are not lost
    this.registerMicroPythonModules();

    console.log(
      "[PythonRunner] After Sk.configure - Sk.setTimeout:",
      typeof Sk.setTimeout,
    );
    console.log(
      "[PythonRunner] Sk.setTimeout function:",
      Sk.setTimeout ? Sk.setTimeout.toString().substring(0, 100) : "undefined",
    );
    console.log("[PythonRunner] Initialized with MicroPython module mocks");
  },

  /**
   * Register JavaScript-backed modules that emulate the MicroPython environment.
   * Injects the aidriver stub as a JS builtin file so Skulpt's import mechanism
   * finds the .js module before falling through to the .py shim.
   * Must be called AFTER Sk.configure() since configure may reset builtinFiles.
   * @returns {void}
   */
  registerMicroPythonModules() {
    // Initialize builtin files (preserves stdlib entries from skulpt-stdlib.js)
    Sk.builtinFiles = Sk.builtinFiles || { files: {} };

    // Register aidriver as a JS builtin file so Skulpt's .js path search finds it.
    // Skulpt 1.2.0 does NOT have Sk.builtinModules - it only checks builtinFiles.
    // The $builtinmodule function is called by Skulpt with the module dict.
    // We store the factory on a global so the eval'd string can reference it.
    window.__aidriverModuleFactory = AIDriverStub.getModule();
    Sk.builtinFiles["files"]["src/lib/aidriver.js"] =
      "var $builtinmodule = function() { return window.__aidriverModuleFactory('aidriver'); };";

    console.log(
      "[PythonRunner] Registered aidriver JS builtin module in builtinFiles",
    );
  },

  /**
   * Provide a Skulpt module factory emulating MicroPython's machine module.
   * Includes basic Pin, PWM, and Timer mocks used by learner scripts.
   * @returns {(name:string)=>object|undefined} Module factory consumed by Skulpt.
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
        [],
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
        [],
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
        [],
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
   * Inject MicroPython-specific time helpers into Skulpt's builtin filesystem.
   * Provides ticks_* and sleep_* functions expected by learner code.
   * @returns {void}
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
   * Route Skulpt stdout to the debug panel while filtering step debug markers.
   * @param {string} text Output emitted by Skulpt.
   * @returns {void}
   */
  handleOutput(text) {
    const trimmed = text.trimEnd();

    // Normal output
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log(trimmed, "output");
    } else {
      console.log("[Python]", text);
    }
  },

  /**
   * Resolve module imports originating from learner code.
   * @param {string} filename Path of the requested module.
   * @returns {string} Module source contents.
   */
  handleRead(filename) {
    console.log("[PythonRunner] handleRead called for:", filename);

    // Check builtin files
    if (Sk.builtinFiles && Sk.builtinFiles["files"][filename]) {
      console.log("[PythonRunner] Returning builtin file:", filename);
      return Sk.builtinFiles["files"][filename];
    }

    throw new Sk.builtin.ImportError("No module named " + filename);
  },

  /**
   * Reject input() usage because interactive stdin is unsupported in the browser environment.
   * @param {string} prompt Prompt text supplied by Skulpt.
   * @throws {Error} Always throws to halt execution.
   */
  handleInput(prompt) {
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log(
        "[Error] input() is not supported in the simulator",
        "error",
      );
    }
    throw new Error("input() is not supported in the simulator");
  },

  /**
   * Execute learner code inside Skulpt with pre-run validation, simulator
   * wiring, and cooperative scheduling hooks. Manages shouldStop signalling,
   * command queue flushing, and DebugPanel output for the duration of the run.
   *
   * @param {string} code Python source code to execute.
   * @returns {Promise<void>} Resolves when execution finishes; rejects only for pre-run validation errors.
   */
  async run(code) {
    if (this.isRunning) {
      console.warn("[PythonRunner] Already running");
      return;
    }

    // Store source code for line display
    this.sourceCode = code;
    this.sourceLines = code.split("\n");

    // Validate code first
    if (typeof Validator !== "undefined") {
      const validation = Validator.validate(code);
      if (!validation.valid) {
        if (typeof DebugPanel !== "undefined") {
          DebugPanel.error(
            "Code has errors that must be fixed before running:",
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
    this.executionId++; // Increment to invalidate stale callbacks

    // Clear command queue
    AIDriverStub.clearQueue();

    // Set DEBUG_AIDRIVER based on code
    AIDriverStub.DEBUG_AIDRIVER = code.includes("DEBUG_AIDRIVER = True");

    if (typeof DebugPanel !== "undefined") {
      DebugPanel.log("[Python] Starting execution...", "info");
    }

    try {
      // Store reference to this for callbacks
      const self = this;

      console.log(
        "[PythonRunner] run() - Before Sk.configure, Sk.setTimeout:",
        typeof Sk.setTimeout,
      );

      // Configure Skulpt FIRST, then re-register modules
      Sk.configure({
        output: this.handleOutput.bind(this),
        read: this.handleRead.bind(this),
        yieldLimit: 100, // Yield every 100 ops to prevent blocking
        execLimit: Number.MAX_SAFE_INTEGER,
        killableFor: true,
        killableWhile: true,
        __future__: Sk.python3,
        // Step mode: suspend before every line of the learner's program
        debugging: self.stepMode,
        // CRITICAL: Provide setTimeout for time.sleep() to work
        setTimeout: function (fn, delay) {
          console.log(
            "[Skulpt run()] setTimeout called with delay:",
            delay,
            "ms",
          );
          return setTimeout(fn, delay);
        },
      });

      // Re-register external modules AFTER configure (configure may reset builtinFiles)
      this.registerMicroPythonModules();

      console.log(
        "[PythonRunner] run() - After Sk.configure, Sk.setTimeout:",
        typeof Sk.setTimeout,
      );
      console.log(
        "[PythonRunner] run() - Sk.setTimeout:",
        Sk.setTimeout ? Sk.setTimeout.toString().substring(0, 80) : "undefined",
      );

      // Compile and run
      const promise = Sk.misceval.asyncToPromise(
        () => Sk.importMainWithBody("<stdin>", false, code, true),
        {
          "Sk.debug": function (susp) {
            return self.handleStepSuspension(susp);
          },
          // Handle time.sleep promises with pause support
          "Sk.promise": function (susp) {
            console.log(
              "[PythonRunner] Sk.promise handler called, susp.data:",
              susp.data,
            );
            console.log("[PythonRunner] susp.data.promise:", susp.data.promise);

            if (self.shouldStop) {
              const err = new Error("Execution stopped");
              err.isStopExecution = true;
              throw err;
            }

            // Process any queued commands BEFORE the sleep starts
            self.processCommandQueue();

            // If paused in step mode, wait for resume
            if (self.stepMode && self.stepPaused) {
              return new Promise((resolve, reject) => {
                self.stepResumeResolve = () => {
                  // After resume, continue with original promise then call resume()
                  susp.data.promise
                    .then((result) => {
                      susp.data.result = result;
                      try {
                        resolve(susp.resume());
                      } catch (e) {
                        reject(e);
                      }
                    })
                    .catch(reject);
                };
              });
            }

            // Return a promise that waits for the sleep, then calls resume()
            // to continue Python execution. This is critical - per Skulpt docs:
            // "A suspension handler should return a Promise yielding the
            // return value of susp.resume()"
            console.log(
              "[PythonRunner] Returning promise from Sk.promise handler",
            );
            return susp.data.promise.then((result) => {
              console.log(
                "[PythonRunner] Sleep promise resolved with:",
                result,
              );
              // CRITICAL: Set the result and call resume() to continue Python
              susp.data.result = result;
              console.log(
                "[PythonRunner] Calling susp.resume() to continue Python execution",
              );
              return susp.resume();
            });
          },
          "*": function () {
            // Check if we should stop
            if (self.shouldStop) {
              const err = new Error("Execution stopped");
              err.isStopExecution = true;
              throw err;
            }
            // Process commands on each yield
            self.processCommandQueue();

            // Trigger render if robot is moving
            if (typeof App !== "undefined" && App.robot && App.robot.isMoving) {
              if (typeof render === "function") {
                render();
              }
            }
          },
        },
      );

      this.executionPromise = promise;
      await promise;

      console.log(
        "[PythonRunner] Execution promise resolved successfully - this is unexpected for infinite loops!",
      );

      if (typeof DebugPanel !== "undefined") {
        DebugPanel.log("[Python] Execution completed", "success");
      }
    } catch (error) {
      console.log("[PythonRunner] Execution threw error:", error);
      this.handleError(error);
    } finally {
      console.log("[PythonRunner] Stopped (finally block)");
      this.isRunning = false;
      this.stepMode = false;
      this.executionPromise = null;
    }
  },

  /**
   * Run learner code in step mode. The program runs live against the
   * simulator (same aidriver module and sensor readings as a normal run), but
   * Skulpt's debugger suspends before every line so it can be highlighted and
   * paused. Robot physics are frozen during each pause; each stepped line then
   * advances the robot by stepLineTime to approximate real execution time.
   *
   * @param {string} code Learner Python source.
   * @returns {Promise<void>} Resolves when the program finishes or is stopped.
   */
  async runStepMode(code) {
    this.stepMode = true;
    this.stepPaused = false;
    this.isStepping = true;
    this.currentStepLine = 0;
    try {
      await this.run(code);
    } finally {
      this.isStepping = false;
      this.stepMode = false;
      this.stepPaused = false;
      this.freezePhysics = false;
      if (typeof Editor !== "undefined" && Editor.clearHighlight) {
        Editor.clearHighlight();
      }
    }
  },

  /**
   * Handle a Skulpt "Sk.debug" suspension raised before a learner line in
   * step mode: highlight the line, wait stepDelay (and while paused), then
   * resume Python.
   *
   * @param {Sk.misceval.Suspension} susp Debug suspension from Skulpt.
   * @returns {Promise<*>} Promise resolving to susp.resume().
   */
  async handleStepSuspension(susp) {
    // The innermost learner frame carries the line about to run
    let lineNum = 0;
    for (let s = susp; s; s = s.child) {
      if (s.$filename === "<stdin>.py" && s.$lineno) {
        lineNum = s.$lineno;
      }
    }
    this.currentStepLine = lineNum;

    if (lineNum > 0) {
      if (typeof Editor !== "undefined" && Editor.highlightLine) {
        Editor.highlightLine(lineNum);
      }
      if (typeof DebugPanel !== "undefined") {
        const info = this.getLineInfo(lineNum);
        DebugPanel.info(`Step mode - ${info.lineNum} ${info.lineCode}`);
      }
    }

    this.freezePhysics = true;
    try {
      await new Promise((resolve) => setTimeout(resolve, this.stepDelay));
      while (this.stepPaused && !this.shouldStop) {
        await new Promise((resolve) => {
          this.stepResumeResolve = resolve;
        });
      }
    } finally {
      this.freezePhysics = false;
    }

    if (this.shouldStop) {
      const err = new Error("Execution stopped");
      err.isStopExecution = true;
      throw err;
    }

    this.processCommandQueue();
    if (
      typeof App !== "undefined" &&
      App.robot &&
      typeof Simulator !== "undefined"
    ) {
      App.robot = Simulator.step(App.robot, this.stepLineTime);
      if (typeof render === "function") {
        render();
      }
    }

    return susp.resume();
  },

  /**
   * Pause step mode before the next line. Execution stays suspended until
   * resumeStep() is invoked or stop() aborts execution.
   */
  pauseStep() {
    this.stepPaused = true;
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.info(`Paused at line ${this.currentStepLine}`);
    }
  },

  /**
   * Resume step mode if previously paused.
   */
  resumeStep() {
    this.stepPaused = false;
    if (this.stepResumeResolve) {
      this.stepResumeResolve();
      this.stepResumeResolve = null;
    }
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.info("Step mode resumed");
    }
  },

  /**
   * Lookup source text for a given 1-based line number previously supplied by
   * Skulpt during step mode or error reporting.
   *
   * @param {number} lineNum Line number to inspect. Values outside the source range are tolerated.
   * @returns {{lineNum: number, lineCode: string}} Canonicalised line metadata with trimmed source text.
   */
  getLineInfo(lineNum) {
    if (lineNum > 0 && lineNum <= this.sourceLines.length) {
      return {
        lineNum: lineNum,
        lineCode: this.sourceLines[lineNum - 1].trim(),
      };
    }
    return { lineNum: lineNum, lineCode: "" };
  },

  /**
   * Stop execution, clearing simulator state, pending commands, and any
   * outstanding step mode promises. Safe to call repeatedly.
   */
  stop() {
    console.log("[PythonRunner] stop() called - stack trace:");
    console.trace();

    this.shouldStop = true;
    this.isRunning = false;
    this.stepMode = false;
    this.stepPaused = false;
    this.isStepping = false;
    this.freezePhysics = false;
    if (this.stepResumeResolve) {
      this.stepResumeResolve();
      this.stepResumeResolve = null;
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
   * Drain and execute robot commands produced by the Python aidriver module.
   * Commands are fetched from both the active Skulpt module and the legacy
   * AIDriverStub queue to maintain backwards compatibility.
   */
  processCommandQueue() {
    // Try to get commands from Python's aidriver module
    let commands = [];

    // Read commands from AIDriverStub queue (populated by the JS builtin module)
    while (AIDriverStub.hasCommands()) {
      commands.push(AIDriverStub.getNextCommand());
    }

    if (commands.length === 0) {
      return; // No commands to process
    }

    console.log("[PythonRunner] Processing", commands.length, "commands");

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
              "[PythonRunner] Robot set to move:",
              App.robot.leftSpeed,
              App.robot.rightSpeed,
              App.robot.isMoving,
            );
            console.log(
              "[PythonRunner] Robot moving forward:",
              App.robot.leftSpeed,
              App.robot.rightSpeed,
            );
            break;

          case "drive_backward":
            App.robot.leftSpeed = -cmd.params.leftSpeed;
            App.robot.rightSpeed = -cmd.params.rightSpeed;
            App.robot.isMoving = true;
            break;

          case "rotate_left":
            // Left wheel forward, right wheel backward → counter-clockwise
            App.robot.leftSpeed = cmd.params.turnSpeed;
            App.robot.rightSpeed = -cmd.params.turnSpeed;
            App.robot.isMoving = true;
            break;

          case "rotate_right":
            // Left wheel backward, right wheel forward → clockwise
            App.robot.leftSpeed = -cmd.params.turnSpeed;
            App.robot.rightSpeed = cmd.params.turnSpeed;
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

          case "set_motor_speeds":
            // As on the robot, stored speeds apply at the next drive/rotate
            break;

          default:
            console.log("[PythonRunner] Unknown command:", cmd);
        }
      }
    }
  },

  /**
   * Handle Python execution errors emitted by Skulpt. Filters out expected stop
   * scenarios, reports actionable errors to the debug panel, and annotates the
   * editor when a line number is available.
   *
   * @param {Error|Sk.builtin.BaseException|string} error Raw error object from Skulpt execution.
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

      // Check for our custom stop execution error
      if (error && error.isStopExecution) {
        return;
      }

      // Check for stop signal string
      if (error === "stopped" || (error && error.message === "stopped")) {
        return;
      }

      // Check for "Execution stopped" message
      if (error && error.message === "Execution stopped") {
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
   * Perform a syntax-only compilation pass to surface SyntaxError details
   * before attempting full execution.
   *
   * @param {string} code Python source code to compile.
   * @returns {{valid: boolean, error: string|null, line: number|null}} Summary containing the error string and 1-based line number when invalid.
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
