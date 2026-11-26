/**
 * Fake Raspberry Pi Pico running AIDriver MicroPython, for tests.
 *
 * Provides a fake Web Serial port and `navigator.serial`, and emulates the
 * parts of the MicroPython REPL the Robot toolbar uses: the friendly REPL,
 * Ctrl-C interrupts, the raw REPL, soft reset (which rotates the event logs
 * and runs main.py) and the helper scripts from micropython-board.js, which
 * are recognised by their "# aid:<op>" tag and run against an in-memory
 * filesystem. The real Python of those scripts is tested separately under
 * CPython (micropython-snippets.test.js).
 */

const nodeCrypto = require("crypto");
const util = require("util");
const streams = require("stream/web");

const RAW_BANNER = "raw REPL; CTRL-B to exit\r\n>";
const BANNER =
  "MicroPython v1.30.0-preview on 2026-11-25; Raspberry Pi Pico with RP2040\r\n" +
  'Type "help()" for more information.\r\n';

/**
 * Provide the browser APIs the Web Serial modules need that jsdom lacks.
 */
function installWebApis() {
  if (typeof global.TextEncoder === "undefined") {
    global.TextEncoder = util.TextEncoder;
    global.TextDecoder = util.TextDecoder;
  }
  if (!global.crypto || !global.crypto.subtle) {
    Object.defineProperty(global, "crypto", {
      value: nodeCrypto.webcrypto,
      configurable: true,
    });
  }
  for (const name of ["ReadableStream", "WritableStream"]) {
    if (typeof global[name] === "undefined") global[name] = streams[name];
  }
}

const encoder = new util.TextEncoder();
const decoder = new util.TextDecoder();

class FakeBoard {
  /**
   * @param {object} [options]
   * @param {Record<string, string>} [options.files] Initial filesystem.
   * @param {boolean} [options.aidriver=true] AIDriver library present.
   * @param {string} [options.impl="micropython"]
   * @param {boolean} [options.silent] Never answers (not MicroPython).
   * @param {number} [options.ignoreInterrupts=0] Ctrl-C presses ignored.
   * @param {boolean} [options.running] A program is running at start.
   * @param {{output?: string[], loop?: boolean}} [options.program]
   *   What main.py does after a soft reset.
   */
  constructor(options = {}) {
    this.fs = new Map();
    for (const [path, text] of Object.entries(options.files || {})) {
      this.fs.set(path, encoder.encode(text));
    }
    this.aidriver = options.aidriver !== false;
    this.impl = options.impl || "micropython";
    this.silent = Boolean(options.silent);
    this.ignoreInterrupts = options.ignoreInterrupts || 0;
    this.program = options.program || { output: ["hello from main.py"] };
    this.mode = options.running ? "running" : "friendly";
    this.rawBuffer = "";
    this.brakeCount = 0;
    this.softResets = 0;
    this.execLog = [];
    this.failures = {}; // diskFull, hashMismatch, unplugAfterWrites, pythonError
    this.writes = 0;
    this.port = new FakeSerialPort(this);
  }

  file(path) {
    const bytes = this.fs.get(path);
    return bytes === undefined ? undefined : decoder.decode(bytes);
  }

  emit(text) {
    this.port.push(encoder.encode(text));
  }

  receive(bytes) {
    if (this.silent) return;
    for (const c of decoder.decode(bytes)) this.handleChar(c);
  }

  handleChar(c) {
    if (this.mode === "running") {
      if (c === "\x03") {
        if (this.ignoreInterrupts > 0) {
          this.ignoreInterrupts--;
          return;
        }
        this.mode = "friendly";
        this.emit(
          `Traceback (most recent call last):\r\n  File "main.py", line 3, in <module>\r\nKeyboardInterrupt: \r\n${BANNER}>>> `,
        );
      }
      return;
    }
    if (this.mode === "friendly") {
      if (c === "\x01") {
        this.mode = "raw";
        this.rawBuffer = "";
        this.emit(RAW_BANNER);
      } else if (c === "\x03") {
        this.emit("\r\n>>> ");
      } else if (c === "\x04") {
        this.softReset();
      }
      return;
    }
    // raw REPL
    if (c === "\x01") {
      this.rawBuffer = "";
      this.emit(RAW_BANNER);
    } else if (c === "\x02") {
      this.mode = "friendly";
      this.emit(`\r\n${BANNER}>>> `);
    } else if (c === "\x03") {
      this.rawBuffer = "";
    } else if (c === "\x04") {
      const code = this.rawBuffer;
      this.rawBuffer = "";
      this.emit("OK");
      const { stdout, stderr } = this.execute(code);
      if (this.port.unplugged) return;
      this.emit(`${stdout}\x04${stderr}\x04>`);
    } else {
      this.rawBuffer += c;
    }
  }

  softReset() {
    this.softResets++;
    const log = this.fs.get("/event_log.txt");
    if (log && log.length) {
      this.fs.set("/event_log_prev.txt", log);
    }
    this.fs.set(
      "/event_log.txt",
      encoder.encode("===== RUN START =====\nt+0.00s : robot start\n"),
    );
    this.emit("MPY: soft reboot\r\n");
    if (!this.fs.has("/main.py")) {
      this.emit(`${BANNER}>>> `);
      return;
    }
    const lines = (this.program.output || []).map((l) => `${l}\r\n`).join("");
    if (this.program.loop) {
      this.mode = "running";
      this.emit(lines);
    } else {
      this.emit(`${lines}${BANNER}>>> `);
    }
  }

  print(value) {
    return `<<AID${JSON.stringify(value)}AID>>\r\n`;
  }

  error(message) {
    return {
      stdout: "",
      stderr: `Traceback (most recent call last):\r\n  File "<stdin>", line 1, in <module>\r\n${message}\r\n`,
    };
  }

  execute(code) {
    const op = (code.match(/^# aid:(\w+)/) || [])[1] || "unknown";
    this.execLog.push(op);
    const path = (code.match(/open\(("[^"]+")/) || [])[1];
    const target = path && JSON.parse(path);

    switch (op) {
      case "identify": {
        const names = [...this.fs.keys()]
          .filter((p) => p.lastIndexOf("/") === 0)
          .map((p) => p.slice(1));
        return {
          stdout: this.print({
            impl: this.impl,
            release: "1.30.0-preview",
            machine: "Raspberry Pi Pico with RP2040",
            aidriver: this.aidriver,
            version: null,
            shadowing: names.filter((n) =>
              [
                "aidriver",
                "eventlog",
                "hm10_controller",
                "gamepad_driver_controller",
                "gamepad_pico",
              ].includes(n.split(".")[0]),
            ),
            has_boot_py: names.includes("boot.py"),
            free: 1000000,
          }),
          stderr: "",
        };
      }
      case "brake":
        this.brakeCount++;
        return { stdout: "", stderr: "" };
      case "write": {
        if (this.failures.diskFull) return this.error("OSError: 28");
        const mode = code.match(/, '(wb|ab)'\)/)[1];
        const data = Buffer.from(code.match(/a2b_base64\('([^']*)'\)/)[1], "base64");
        const before = mode === "ab" ? this.fs.get(target) || new Uint8Array() : new Uint8Array();
        this.fs.set(target, new Uint8Array([...before, ...data]));
        this.writes++;
        if (this.failures.unplugAfterWrites === this.writes) {
          this.port.unplug();
        }
        return { stdout: "", stderr: "" };
      }
      case "commit": {
        const part = target;
        const finalPath = part.replace(/\.part$/, "");
        const expected = code.match(/== '([0-9a-f]{64})'/)[1];
        const actual = nodeCrypto
          .createHash("sha256")
          .update(this.fs.get(part))
          .digest("hex");
        const ok = actual === expected && !this.failures.hashMismatch;
        if (ok) {
          if (this.fs.has(finalPath)) {
            this.fs.set(`${finalPath}.bak`, this.fs.get(finalPath));
          }
          this.fs.set(finalPath, this.fs.get(part));
        }
        this.fs.delete(part);
        return { stdout: this.print({ ok }), stderr: "" };
      }
      case "read": {
        const bytes = this.fs.get(target);
        if (this.failures.pythonError) return this.error(this.failures.pythonError);
        return {
          stdout: this.print(
            bytes === undefined ? null : Buffer.from(bytes).toString("base64"),
          ),
          stderr: "",
        };
      }
      default:
        return this.error("NameError: name 'x' isn't defined");
    }
  }
}

/**
 * Minimal Web Serial SerialPort backed by a FakeBoard.
 */
class FakeSerialPort {
  constructor(board) {
    this.board = board;
    this.readable = null;
    this.writable = null;
    this.controller = null;
    this.busy = false;
    this.unplugged = false;
    this.openCount = 0;
  }

  getInfo() {
    return { usbVendorId: 0x2e8a, usbProductId: 0x0005 };
  }

  async open() {
    if (this.busy) {
      const error = new Error("Failed to open serial port.");
      error.name = "InvalidStateError";
      throw error;
    }
    if (this.unplugged) {
      const error = new Error("The device has been lost.");
      error.name = "NetworkError";
      throw error;
    }
    this.openCount++;
    this.readable = new streams.ReadableStream({
      start: (controller) => {
        this.controller = controller;
      },
    });
    this.writable = new streams.WritableStream({
      write: (chunk) => {
        // Deliver asynchronously, like USB
        setTimeout(() => this.board.receive(chunk), 0);
      },
    });
  }

  async setSignals() {}

  push(bytes) {
    if (!this.controller) return;
    setTimeout(() => {
      try {
        this.controller.enqueue(bytes);
      } catch (error) {
        // Stream closed
      }
    }, 0);
  }

  async close() {
    try {
      if (this.controller) this.controller.close();
    } catch (error) {
      // Already errored
    }
    this.readable = null;
    this.writable = null;
    this.controller = null;
  }

  /** Simulate pulling the USB cable. */
  unplug() {
    this.unplugged = true;
    const controller = this.controller;
    this.readable = null;
    this.writable = null;
    this.controller = null;
    if (controller) controller.error(new Error("The device has been lost."));
  }

  /** Simulate plugging the cable back in. */
  replug() {
    this.unplugged = false;
  }
}

/**
 * Install a fake `navigator.serial` that offers the given boards' ports.
 * @param {FakeBoard[]} boards Boards the picker returns (first one).
 * @param {{granted?: boolean, cancel?: boolean}} [options]
 * @returns {{requestPort: jest.Mock, getPorts: jest.Mock, granted: Set}}
 */
function installFakeSerial(boards, { granted = false, cancel = false } = {}) {
  const grantedPorts = new Set(granted ? boards.map((b) => b.port) : []);
  const serial = {
    granted: grantedPorts,
    requestPort: jest.fn(async () => {
      if (cancel) {
        const error = new Error("No port selected by the user.");
        error.name = "NotFoundError";
        throw error;
      }
      grantedPorts.add(boards[0].port);
      return boards[0].port;
    }),
    getPorts: jest.fn(async () => [...grantedPorts]),
  };
  Object.defineProperty(window.navigator, "serial", {
    value: serial,
    configurable: true,
  });
  return serial;
}

function removeFakeSerial() {
  delete window.navigator.serial;
}

/**
 * Wait until `predicate()` is true.
 * @param {() => boolean} predicate
 * @param {number} [timeout=4000]
 */
async function waitFor(predicate, timeout = 4000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timed out waiting for ${predicate}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

module.exports = {
  FakeBoard,
  FakeSerialPort,
  installWebApis,
  installFakeSerial,
  removeFakeSerial,
  waitFor,
  BANNER,
  RAW_BANNER,
};
