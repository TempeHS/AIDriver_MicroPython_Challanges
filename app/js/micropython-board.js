/**
 * AIDriver Simulator - MicroPython Board Module
 * MicroPython raw REPL protocol over a SerialLink, plus the operations the
 * Robot toolbar needs: identify, stop, atomic upload of main.py and
 * reading files. See docs/developer/web-serial.md.
 */

const MicroPythonBoard = (function () {
  "use strict";

  const CTRL_A = "\x01"; // enter raw REPL
  const CTRL_B = "\x02"; // exit raw REPL
  const CTRL_C = "\x03"; // interrupt
  const CTRL_D = "\x04"; // end of input / soft reset
  const RAW_BANNER = "raw REPL; CTRL-B to exit\r\n>";
  const FRIENDLY_PROMPT = ">>> ";
  const MARK_START = "<<AID";
  const MARK_END = "AID>>";
  const SEND_SLICE = 256;
  const WRITE_CHUNK = 2048;
  const INTERRUPT_ATTEMPTS = 3;
  const MAX_UPLOAD_BYTES = 64 * 1024;

  // Frozen modules that a root-level copy on the robot would replace
  const FROZEN_MODULES = [
    "aidriver",
    "eventlog",
    "hm10_controller",
    "gamepad_driver_controller",
    "gamepad_pico",
  ];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /**
   * Error raised for failures reported by (or about) the board.
   */
  class BoardError extends Error {
    /**
     * @param {string} message Short message.
     * @param {object} [details]
     * @param {string} [details.code] Machine-readable reason.
     * @param {string} [details.traceback] Full Python traceback.
     */
    constructor(message, { code = "board", traceback = "" } = {}) {
      super(message);
      this.name = "BoardError";
      this.code = code;
      this.traceback = traceback;
    }
  }

  /**
   * Validate a board path and return it quoted as a Python string literal.
   * @param {string} path Absolute path such as "/main.py".
   * @returns {string}
   */
  function quotePath(path) {
    if (
      typeof path !== "string" ||
      !/^\/[\w./-]+$/.test(path) ||
      path.split("/").includes("..")
    ) {
      throw new Error(`Can't use ${path} on the robot.`);
    }
    return JSON.stringify(path);
  }

  /**
   * Python helper scripts sent to the board. Each starts with a
   * "# aid:<op>" tag so it is recognisable in tests and board traces.
   */
  const snippets = {
    identify() {
      return `# aid:identify
import sys, os, json
u = os.uname()
info = {'impl': sys.implementation.name, 'release': u.release,
        'machine': u.machine, 'aidriver': False, 'version': None}
# Check the firmware's built-in library, not a copy saved on the robot
p = sys.path
saved = list(p)
if '.frozen' in saved:
    while p:
        p.pop()
    p.append('.frozen')
    sys.modules.pop('aidriver', None)
try:
    import aidriver
    info['aidriver'] = True
    info['version'] = getattr(aidriver, '__version__', None)
except ImportError:
    pass
finally:
    while p:
        p.pop()
    p.extend(saved)
names = os.listdir('/')
info['shadowing'] = [n for n in names if n.split('.')[0] in ${JSON.stringify(FROZEN_MODULES)}]
info['has_boot_py'] = 'boot.py' in names
try:
    s = os.statvfs('/')
    info['free'] = s[0] * s[3]
except Exception:
    info['free'] = None
print('${MARK_START}' + json.dumps(info) + '${MARK_END}')`;
    },

    writeChunk(path, base64, first) {
      return `# aid:write
import binascii
with open(${quotePath(path)}, '${first ? "wb" : "ab"}') as f:
    f.write(binascii.a2b_base64('${base64}'))`;
    },

    commit(path, sha256) {
      if (!/^[0-9a-f]{64}$/.test(sha256)) {
        throw new Error("Invalid SHA-256");
      }
      const target = quotePath(path);
      const part = quotePath(`${path}.part`);
      const backup = quotePath(`${path}.bak`);
      return `# aid:commit
import os, json, hashlib, binascii
h = hashlib.sha256()
with open(${part}, 'rb') as f:
    while True:
        b = f.read(512)
        if not b:
            break
        h.update(b)
ok = binascii.hexlify(h.digest()).decode() == '${sha256}'
if ok:
    try:
        os.remove(${backup})
    except OSError:
        pass
    try:
        os.rename(${target}, ${backup})
    except OSError:
        pass
    os.rename(${part}, ${target})
else:
    os.remove(${part})
print('${MARK_START}' + json.dumps({'ok': ok}) + '${MARK_END}')`;
    },

    read(path) {
      return `# aid:read
import binascii, json
try:
    with open(${quotePath(path)}, 'rb') as f:
        print('${MARK_START}"', end='')
        while True:
            b = f.read(384)
            if not b:
                break
            print(binascii.b2a_base64(b).decode().strip(), end='')
        print('"${MARK_END}')
except OSError:
    print('${MARK_START}' + json.dumps(None) + '${MARK_END}')`;
    },
  };

  /**
   * Extract the JSON value printed between the AID markers.
   * @param {string} stdout
   * @returns {*}
   */
  function parseMarked(stdout) {
    const start = stdout.indexOf(MARK_START);
    const end = stdout.indexOf(MARK_END, start);
    if (start === -1 || end === -1) {
      throw new BoardError("The robot sent an unexpected reply.", {
        code: "bad-reply",
      });
    }
    return JSON.parse(stdout.slice(start + MARK_START.length, end));
  }

  /**
   * Timeout for running a snippet, scaled by how much is sent and processed.
   * @param {number} codeLength Characters sent.
   * @param {number} [extraBytes=0] Bytes the board reads or writes.
   * @returns {number} Milliseconds.
   */
  function execTimeout(codeLength, extraBytes = 0) {
    return 1500 + Math.ceil(codeLength / 10.4) + Math.ceil(extraBytes * 0.1);
  }

  /**
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  function toBase64(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  }

  /**
   * @param {string} base64
   * @returns {Uint8Array}
   */
  function fromBase64(base64) {
    return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  }

  /**
   * @param {Uint8Array} bytes
   * @returns {Promise<string>} Lower-case hex SHA-256.
   */
  async function sha256Hex(bytes) {
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }

  /**
   * Raw REPL protocol over a link with onData/write/close.
   */
  class Board {
    /**
     * @param {{onData: Function, write: Function, close: Function}} link
     */
    constructor(link) {
      this.link = link;
      this.decoder = new TextDecoder();
      this.encoder = new TextEncoder();
      this.pending = "";
      this.waiter = null;
      this.raw = false;
      this.queue = Promise.resolve();
      this.received = 0;
      this.output = null;
      this.closed = false;
      this.abortError = null;
      link.onData((bytes) =>
        this.receive(this.decoder.decode(bytes, { stream: true })),
      );
    }

    /**
     * Register a callback for text the board prints outside sessions (the
     * running program's output).
     * @param {(text: string) => void} callback
     */
    onOutput(callback) {
      this.output = callback;
    }

    receive(text) {
      this.received += text.length;
      if (!this.raw) {
        if (this.output) this.output(text);
        return;
      }
      this.pending += text;
      if (this.waiter && this.pending.includes(this.waiter.needle)) {
        const waiter = this.waiter;
        this.waiter = null;
        waiter.resolve();
      }
    }

    async send(text) {
      if (this.raw && this.abortError) throw this.abortError;
      await this.link.write(this.encoder.encode(text));
    }

    /**
     * Wait until the board has sent `needle`, then consume and return the
     * received text up to and including it.
     * @param {string} needle
     * @param {number} timeoutMs
     * @param {string} what Description used in the timeout message.
     * @returns {Promise<string>}
     */
    async until(needle, timeoutMs, what) {
      if (this.abortError) throw this.abortError;
      if (!this.pending.includes(needle)) {
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            this.waiter = null;
            reject(
              new BoardError(`The robot stopped answering (${what}).`, {
                code: "timeout",
              }),
            );
          }, timeoutMs);
          this.waiter = {
            needle,
            resolve: () => {
              clearTimeout(timer);
              resolve();
            },
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            },
          };
        });
      }
      const end = this.pending.indexOf(needle) + needle.length;
      const text = this.pending.slice(0, end);
      this.pending = this.pending.slice(end);
      return text;
    }

    /**
     * Cancel the current session: whatever it is sending or waiting for
     * fails with `error`. Later sessions are not affected.
     * @param {Error} error
     */
    abort(error) {
      if (this.raw) this.abortError = error;
      if (this.waiter) {
        const waiter = this.waiter;
        this.waiter = null;
        waiter.reject(error);
      }
    }

    /**
     * Interrupt any running program and enter the raw REPL, retrying for
     * programs that catch the first KeyboardInterrupt.
     * @returns {Promise<void>}
     */
    async enterRawRepl() {
      for (let attempt = 0; attempt < INTERRUPT_ATTEMPTS; attempt++) {
        await this.send(`\r${CTRL_C}${CTRL_C}`);
        await sleep(60);
        this.pending = "";
        await this.send(CTRL_A);
        try {
          await this.until(RAW_BANNER, 2000, "entering raw REPL");
          return;
        } catch (error) {
          if (error.code !== "timeout") throw error;
        }
      }
      // A board that has never sent anything is probably not running
      // MicroPython (or is a silent program ignoring Ctrl-C)
      if (this.received === 0) {
        throw new BoardError(
          "Connected, but the board didn't answer like MicroPython.",
          { code: "no-reply" },
        );
      }
      throw new BoardError("The robot's program won't stop.", {
        code: "wont-stop",
      });
    }

    /**
     * Run code in the raw REPL and return its stdout.
     * @param {string} code
     * @param {number} [timeoutMs]
     * @returns {Promise<string>}
     */
    async exec(code, timeoutMs = execTimeout(code.length)) {
      for (let i = 0; i < code.length; i += SEND_SLICE) {
        await this.send(code.slice(i, i + SEND_SLICE));
        await sleep(2);
      }
      await this.send(CTRL_D);
      await this.until("OK", Math.max(2000, timeoutMs), "starting code");
      const stdout = (await this.until(CTRL_D, timeoutMs, "running code"))
        .slice(0, -1);
      const stderr = (await this.until(CTRL_D, timeoutMs, "running code"))
        .slice(0, -1);
      await this.until(">", timeoutMs, "running code");
      if (stderr.trim()) {
        const lines = stderr.trim().split("\n");
        throw new BoardError(lines[lines.length - 1].trim(), {
          code: "python",
          traceback: stderr,
        });
      }
      return stdout;
    }

    /**
     * Run `fn` inside a raw REPL session. Sessions are queued so only one
     * conversation with the board happens at a time. Any running program is
     * interrupted first. (The motors have their own power switch, which is
     * off while the robot is plugged in, so no braking is needed.)
     * @template T
     * @param {(exec: (code: string, timeoutMs?: number) => Promise<string>) => Promise<T>} fn
     * @returns {Promise<T>}
     */
    session(fn) {
      const run = async () => {
        this.raw = true;
        this.pending = "";
        try {
          await this.enterRawRepl();
          return await fn((code, timeoutMs) => this.exec(code, timeoutMs));
        } finally {
          this.abortError = null;
          try {
            await this.send(CTRL_B);
            // Swallow the friendly REPL banner so it isn't shown as output
            await this.until(FRIENDLY_PROMPT, 1000, "leaving raw REPL");
          } catch (error) {
            // Disconnected or slow; nothing more to do
          }
          this.pending = "";
          this.raw = false;
        }
      };
      const result = this.queue.then(run, run);
      this.queue = result.catch(() => {});
      return result;
    }

    /**
     * Stop the running program.
     * @returns {Promise<void>}
     */
    stopProgram() {
      return this.session(async () => {});
    }

    /**
     * Soft reset from the friendly REPL so main.py runs again. The USB
     * connection stays open.
     * @returns {Promise<void>}
     */
    softReset() {
      const run = async () => {
        this.raw = true;
        try {
          await this.send(`\r${CTRL_C}${CTRL_C}`);
          await sleep(60);
          this.pending = "";
        } finally {
          this.raw = false;
        }
        await this.send(CTRL_D);
      };
      const result = this.queue.then(run, run);
      this.queue = result.catch(() => {});
      return result;
    }

    /**
     * Called when the link is lost; fails any waiting operation.
     */
    lost() {
      this.closed = true;
      this.abort(
        new BoardError("The robot was disconnected.", { code: "disconnected" }),
      );
    }

    async close() {
      this.closed = true;
      this.abort(new BoardError("Disconnected.", { code: "disconnected" }));
      await this.link.close();
    }
  }

  /**
   * Identify the board and the AIDriver firmware.
   * @param {Function} exec
   * @returns {Promise<object>}
   */
  async function identify(exec) {
    return parseMarked(await exec(snippets.identify(), 5000));
  }

  /**
   * Write a file atomically: chunks go to `<path>.part`, which is verified
   * with SHA-256 and then renamed over `path` (the old file is kept as
   * `<path>.bak`). The old file is untouched if anything fails.
   * @param {Function} exec
   * @param {string} path
   * @param {Uint8Array} bytes
   * @param {(written: number, total: number) => void} [onProgress]
   * @returns {Promise<void>}
   */
  async function writeFileAtomic(exec, path, bytes, onProgress) {
    const part = `${path}.part`;
    const expected = await sha256Hex(bytes);
    if (bytes.length === 0) {
      await exec(snippets.writeChunk(part, "", true));
    }
    for (let i = 0; i < bytes.length; i += WRITE_CHUNK) {
      const code = snippets.writeChunk(
        part,
        toBase64(bytes.subarray(i, i + WRITE_CHUNK)),
        i === 0,
      );
      await exec(code, execTimeout(code.length, WRITE_CHUNK));
      if (onProgress) {
        onProgress(Math.min(bytes.length, i + WRITE_CHUNK), bytes.length);
      }
    }
    const result = parseMarked(
      await exec(
        snippets.commit(path, expected),
        execTimeout(1000, bytes.length),
      ),
    );
    if (!result.ok) {
      throw new BoardError(`${path} didn't save correctly.`, {
        code: "verify-failed",
      });
    }
  }

  /**
   * Read a file from the board.
   * @param {Function} exec
   * @param {string} path
   * @returns {Promise<Uint8Array|null>} Contents, or null if it doesn't exist.
   */
  async function readFile(exec, path) {
    const value = parseMarked(await exec(snippets.read(path), 30000));
    return value === null ? null : fromBase64(value);
  }

  return {
    RAW_BANNER,
    FRIENDLY_PROMPT,
    MAX_UPLOAD_BYTES,
    WRITE_CHUNK,
    FROZEN_MODULES,
    BoardError,
    Board,
    snippets,
    parseMarked,
    execTimeout,
    quotePath,
    toBase64,
    fromBase64,
    sha256Hex,
    identify,
    writeFileAtomic,
    readFile,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = MicroPythonBoard;
}
