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

  /**
   * Clear the command queue
   */
  clearQueue() {
    this.commandQueue = [];
  },

  /**
   * Add a command to the queue
   */
  queueCommand(cmd) {
    this.commandQueue.push(cmd);

    if (this.DEBUG_AIDRIVER) {
      DebugPanel.log(
        `[AIDriver] ${cmd.type}: ${JSON.stringify(cmd.params)}`,
        "info"
      );
    }
  },

  /**
   * Get next command from queue
   */
  getNextCommand() {
    return this.commandQueue.shift();
  },

  /**
   * Check if queue has commands
   */
  hasCommands() {
    return this.commandQueue.length > 0;
  },

  /**
   * Get the Skulpt module definition for 'aidriver'
   */
  getModule() {
    const self = this;

    return function (name) {
      if (name !== "aidriver") return undefined;

      const mod = {};

      // DEBUG_AIDRIVER flag
      mod.DEBUG_AIDRIVER = new Sk.builtin.bool(false);

      // AIDriver class
      mod.AIDriver = Sk.misceval.buildClass(
        mod,
        function ($gbl, $loc) {
          // Constructor
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

          // drive_forward(right_speed, left_speed)
          $loc.drive_forward = new Sk.builtin.func(function (
            self,
            rightSpeed,
            leftSpeed
          ) {
            const rs = Sk.ffi.remapToJs(rightSpeed);
            const ls = Sk.ffi.remapToJs(leftSpeed);

            self.rightSpeed = rs;
            self.leftSpeed = ls;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "drive_forward",
              params: { rightSpeed: rs, leftSpeed: ls },
            });

            return Sk.builtin.none.none$;
          });

          // drive_backward(right_speed, left_speed)
          $loc.drive_backward = new Sk.builtin.func(function (
            self,
            rightSpeed,
            leftSpeed
          ) {
            const rs = Sk.ffi.remapToJs(rightSpeed);
            const ls = Sk.ffi.remapToJs(leftSpeed);

            self.rightSpeed = rs;
            self.leftSpeed = ls;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "drive_backward",
              params: { rightSpeed: rs, leftSpeed: ls },
            });

            return Sk.builtin.none.none$;
          });

          // rotate_left(turn_speed)
          $loc.rotate_left = new Sk.builtin.func(function (self, turnSpeed) {
            const ts = Sk.ffi.remapToJs(turnSpeed);

            self.rightSpeed = ts;
            self.leftSpeed = ts;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "rotate_left",
              params: { turnSpeed: ts },
            });

            return Sk.builtin.none.none$;
          });

          // rotate_right(turn_speed)
          $loc.rotate_right = new Sk.builtin.func(function (self, turnSpeed) {
            const ts = Sk.ffi.remapToJs(turnSpeed);

            self.rightSpeed = ts;
            self.leftSpeed = ts;
            self.isMoving = true;

            AIDriverStub.queueCommand({
              type: "rotate_right",
              params: { turnSpeed: ts },
            });

            return Sk.builtin.none.none$;
          });

          // brake()
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

          // read_distance()
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

          // is_moving()
          $loc.is_moving = new Sk.builtin.func(function (self) {
            return new Sk.builtin.bool(self.isMoving);
          });

          // get_motor_speeds()
          $loc.get_motor_speeds = new Sk.builtin.func(function (self) {
            return new Sk.builtin.tuple([
              new Sk.builtin.int_(self.rightSpeed),
              new Sk.builtin.int_(self.leftSpeed),
            ]);
          });

          // set_motor_speeds(right_speed, left_speed)
          $loc.set_motor_speeds = new Sk.builtin.func(function (
            self,
            rightSpeed,
            leftSpeed
          ) {
            const rs = Sk.ffi.remapToJs(rightSpeed);
            const ls = Sk.ffi.remapToJs(leftSpeed);

            self.rightSpeed = rs;
            self.leftSpeed = ls;

            AIDriverStub.queueCommand({
              type: "set_motor_speeds",
              params: { rightSpeed: rs, leftSpeed: ls },
            });

            return Sk.builtin.none.none$;
          });
        },
        "AIDriver",
        []
      );

      // hold_state(seconds) - module-level function
      mod.hold_state = new Sk.builtin.func(function (seconds) {
        const secs = Sk.ffi.remapToJs(seconds);

        AIDriverStub.queueCommand({
          type: "hold_state",
          params: { seconds: secs },
        });

        if (AIDriverStub.DEBUG_AIDRIVER) {
          DebugPanel.log(`[AIDriver] hold_state: ${secs} second(s)`, "info");
        }

        // Return a suspension to pause execution
        return new Sk.misceval.promiseToSuspension(
          new Promise((resolve) => {
            // Simulate the hold with scaled time
            const scaledMs = (secs * 1000) / (App.speedMultiplier || 1);
            setTimeout(() => {
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
