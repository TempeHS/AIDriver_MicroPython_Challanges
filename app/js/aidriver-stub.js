/**
 * AIDriver Simulator - AIDriver Stub Module
 * Browser-based mock of the AIDriver MicroPython library
 * Implements all AIDriver methods and queues commands for the simulator
 */

const AIDriverStub = {
  // Command queue for simulator to consume
  commandQueue: [],

  // Debug flag
  DEBUG_AIDRIVER: false,

  // Robot instance state
  robotInstance: null,

  // Speed warnings already shown during this run
  speedWarnings: new Set(),

  // Speeds at or below this are reported by the real library as too low to move
  STOPPED_SPEED_MAX: 80,

  /**
   * Reset the simulator command queue so pending actions are discarded.
   */
  clearQueue() {
    this.commandQueue = [];
    this.speedWarnings = new Set();
  },

  /**
   * Validate a speed argument the same way the robot's L298N.set_speed does
   * and convert it to the 0-255 scale used by the physics engine. Values above
   * 255 are raw 16-bit PWM on the robot (so 300 is almost stopped).
   * @param {*} value Python speed argument.
   * @returns {{requested: number, effective: number}} Requested and physics speed.
   * @throws {Sk.builtin.TypeError|Sk.builtin.ValueError} For non-numeric or negative speeds.
   */
  toMotorSpeed(value) {
    const speed = Number(Sk.ffi.remapToJs(value));
    if (isNaN(speed)) {
      throw new Sk.builtin.TypeError("Speed must be a number");
    }
    if (speed < 0) {
      throw new Sk.builtin.ValueError(
        `Speed must be between 0 and 255, got ${speed}`
      );
    }
    if (speed > 255) {
      this.warnSpeed(
        `Speed ${speed} is above 255 - the real robot treats it as a raw PWM value (0-65535), so it will barely move`
      );
      return { requested: speed, effective: Math.min(speed, 65535) / 257 };
    }
    if (speed > 0 && speed <= this.STOPPED_SPEED_MAX) {
      this.warnSpeed(
        `Speed ${speed} is in the stopped range (0-${this.STOPPED_SPEED_MAX}) - the real robot may not move`
      );
    }
    return { requested: speed, effective: speed };
  },

  /**
   * Show a speed warning in the debug panel once per run.
   * @param {string} message Warning text.
   */
  warnSpeed(message) {
    if (this.speedWarnings.has(message)) return;
    this.speedWarnings.add(message);
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.warn(`[AIDriver] ${message}`);
    }
  },

  /**
   * Enqueue a structured command for the simulator and optionally log it.
   * @param {{type: string, params: Record<string, unknown>}} cmd Command payload.
   */
  queueCommand(cmd) {
    console.log("[AIDriverStub] queueCommand:", cmd.type, cmd.params);
    this.commandQueue.push(cmd);

    if (this.DEBUG_AIDRIVER) {
      DebugPanel.log(
        `[AIDriver] ${cmd.type}: ${JSON.stringify(cmd.params)}`,
        "info"
      );
    }
  },

  /**
   * Dequeue the next pending command.
   * @returns {{type: string, params: Record<string, unknown>}|undefined} Oldest command or undefined.
   */
  getNextCommand() {
    return this.commandQueue.shift();
  },

  /**
   * Determine whether commands remain in the queue.
   * @returns {boolean} True when at least one command is waiting to be processed.
   */
  hasCommands() {
    return this.commandQueue.length > 0;
  },

  /**
   * Build the Skulpt module definition that the Python runtime imports as `aidriver`.
   * @returns {(name: string) => object|undefined} Module factory compatible with Skulpt expectations.
   */
  getModule() {
    const self = this;

    return function (name) {
      console.log("[AIDriverStub] getModule called with name:", name);
      if (name !== "aidriver") return undefined;

      const mod = {};

      // DEBUG_AIDRIVER flag
      mod.DEBUG_AIDRIVER = new Sk.builtin.bool(false);

      // AIDriver class
      mod.AIDriver = Sk.misceval.buildClass(
        mod,
        function ($gbl, $loc) {
          /**
           * Initialize the stub and register the robot instance.
           * @returns {null}
           */
          $loc.__init__ = new Sk.builtin.func(function (self) {
            self.rightSpeed = 0;
            self.leftSpeed = 0;
            self.isMoving = false;

            AIDriverStub.robotInstance = self;
            AIDriverStub.queueCommand({
              type: "init",
              params: {},
            });

            if (AIDriverStub.DEBUG_AIDRIVER) {
              DebugPanel.log("[AIDriver] Robot initialized", "info");
            }

            return Sk.builtin.none.none$;
          });

          /**
           * Queue a forward driving command with discrete wheel speeds.
           * @param {Sk.builtin.int_} rightSpeed Mapped to right wheel speed.
           * @param {Sk.builtin.int_} leftSpeed Mapped to left wheel speed.
           * @returns {null}
           */
          $loc.drive_forward = new Sk.builtin.func(function (
            self,
            rightSpeed,
            leftSpeed
          ) {
            const rs = AIDriverStub.toMotorSpeed(rightSpeed);
            const ls = AIDriverStub.toMotorSpeed(leftSpeed);

            self.rightSpeed = rs.requested;
            self.leftSpeed = ls.requested;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "drive_forward",
              params: { rightSpeed: rs.effective, leftSpeed: ls.effective },
            });

            return Sk.builtin.none.none$;
          });

          /**
           * Queue a backward driving command with discrete wheel speeds.
           * @param {Sk.builtin.int_} rightSpeed Mapped to right wheel speed.
           * @param {Sk.builtin.int_} leftSpeed Mapped to left wheel speed.
           * @returns {null}
           */
          $loc.drive_backward = new Sk.builtin.func(function (
            self,
            rightSpeed,
            leftSpeed
          ) {
            const rs = AIDriverStub.toMotorSpeed(rightSpeed);
            const ls = AIDriverStub.toMotorSpeed(leftSpeed);

            self.rightSpeed = rs.requested;
            self.leftSpeed = ls.requested;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "drive_backward",
              params: { rightSpeed: rs.effective, leftSpeed: ls.effective },
            });

            return Sk.builtin.none.none$;
          });

          /**
           * Queue a left rotation command using a single turn speed.
           * @param {Sk.builtin.int_} turnSpeed Desired rotation speed value.
           * @returns {null}
           */
          $loc.rotate_left = new Sk.builtin.func(function (self, turnSpeed) {
            const ts = AIDriverStub.toMotorSpeed(turnSpeed);

            self.rightSpeed = ts.requested;
            self.leftSpeed = ts.requested;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "rotate_left",
              params: { turnSpeed: ts.effective },
            });

            return Sk.builtin.none.none$;
          });

          /**
           * Queue a right rotation command using a single turn speed.
           * @param {Sk.builtin.int_} turnSpeed Desired rotation speed value.
           * @returns {null}
           */
          $loc.rotate_right = new Sk.builtin.func(function (self, turnSpeed) {
            const ts = AIDriverStub.toMotorSpeed(turnSpeed);

            self.rightSpeed = ts.requested;
            self.leftSpeed = ts.requested;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "rotate_right",
              params: { turnSpeed: ts.effective },
            });

            return Sk.builtin.none.none$;
          });

          /**
           * Immediately stop all movement and queue a brake command.
           * @returns {null}
           */
          $loc.brake = new Sk.builtin.func(function (self) {
            self.rightSpeed = 0;
            self.leftSpeed = 0;
            self.isMoving = false;

            AIDriverStub.queueCommand({
              type: "brake",
              params: {},
            });

            return Sk.builtin.none.none$;
          });

          /**
           * Measure distance using the simulator abstraction.
           * @returns {Sk.builtin.int_} Integer distance in simulated centimeters.
           */
          $loc.read_distance = new Sk.builtin.func(function (self) {
            // Get distance from simulator using current robot state
            let distance = 1000;
            if (
              typeof Simulator !== "undefined" &&
              typeof App !== "undefined" &&
              App.robot
            ) {
              distance = Simulator.simulateUltrasonic(App.robot);
            }

            AIDriverStub.queueCommand({
              type: "read_distance",
              params: { result: distance },
            });

            return new Sk.builtin.int_(distance);
          });

          /**
           * Background housekeeping (LED heartbeat on the robot); no-op here.
           * @returns {null}
           */
          $loc.service = new Sk.builtin.func(function (self) {
            return Sk.builtin.none.none$;
          });

          /**
           * Report whether motion commands are currently active.
           * @returns {Sk.builtin.bool} True when the robot is moving.
           */
          $loc.is_moving = new Sk.builtin.func(function (self) {
            return new Sk.builtin.bool(self.isMoving);
          });

          /**
           * Return the requested motor speeds, or (0, 0) while stopped, matching
           * the robot library.
           * @returns {Sk.builtin.tuple} Pair of right and left speeds.
           */
          $loc.get_motor_speeds = new Sk.builtin.func(function (self) {
            const moving = self.isMoving;
            return new Sk.builtin.tuple([
              Sk.ffi.remapToPy(moving ? self.rightSpeed : 0),
              Sk.ffi.remapToPy(moving ? self.leftSpeed : 0),
            ]);
          });

          /**
           * Update the stored motor speeds. As on the robot, the new speeds only
           * take effect at the next drive or rotate call.
           * @param {Sk.builtin.int_} rightSpeed New right wheel speed.
           * @param {Sk.builtin.int_} leftSpeed New left wheel speed.
           * @returns {null}
           */
          $loc.set_motor_speeds = new Sk.builtin.func(function (
            self,
            rightSpeed,
            leftSpeed
          ) {
            const rs = AIDriverStub.toMotorSpeed(rightSpeed);
            const ls = AIDriverStub.toMotorSpeed(leftSpeed);

            self.rightSpeed = rs.requested;
            self.leftSpeed = ls.requested;

            AIDriverStub.queueCommand({
              type: "set_motor_speeds",
              params: { rightSpeed: rs.effective, leftSpeed: ls.effective },
            });

            return Sk.builtin.none.none$;
          });
        },
        "AIDriver",
        []
      );

      /**
       * Suspend execution for the requested time while keeping the last state.
       * @param {Sk.builtin.int_|Sk.builtin.float_} seconds Duration expressed in seconds.
       * @returns {Sk.misceval.Suspension} Suspension resolving when the duration elapses.
       */
      mod.hold_state = new Sk.builtin.func(function (seconds) {
        const secs = Sk.ffi.remapToJs(seconds);

        console.log("[AIDriverStub] hold_state JS called with seconds:", secs);

        AIDriverStub.queueCommand({
          type: "hold_state",
          params: { seconds: secs },
        });

        if (AIDriverStub.DEBUG_AIDRIVER) {
          DebugPanel.log(`[AIDriver] hold_state: ${secs} second(s)`, "info");
        }

        // Return a suspension to pause execution
        const scaledMs = (secs * 1000) / (App.speedMultiplier || 1);
        console.log(
          "[AIDriverStub] Creating promiseToSuspension with scaledMs:",
          scaledMs
        );

        return new Sk.misceval.promiseToSuspension(
          new Promise((resolve) => {
            console.log(
              "[AIDriverStub] Promise created, setting setTimeout for",
              scaledMs,
              "ms"
            );
            setTimeout(() => {
              console.log("[AIDriverStub] setTimeout fired, resolving promise");
              resolve(Sk.builtin.none.none$);
            }, scaledMs);
          })
        );
      });

      return mod;
    };
  },
};

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = AIDriverStub;
}
