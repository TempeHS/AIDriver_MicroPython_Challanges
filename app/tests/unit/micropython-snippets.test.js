/**
 * Runs the real Python helper scripts from js/micropython-board.js under
 * CPython, through the real JS functions (writeFileAtomic, readFile,
 * identify), against a temporary directory. This checks the Python that is
 * sent to the robot, which the fake board in other tests only recognises by
 * its "# aid:<op>" tag. Skipped when python3 isn't installed.
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadModules } = require("../helpers/load-app");
const { installWebApis } = require("../helpers/fake-micropython-board");

const hasPython = spawnSync("python3", ["--version"]).status === 0;
const describeIfPython = hasPython ? describe : describe.skip;

// Stand-in for the frozen aidriver module
const FAKE_AIDRIVER = `
__version__ = "test-1"
`;

let dir;

/**
 * Run a snippet like the raw REPL would and return stdout.
 * @param {string} code
 * @returns {Promise<string>}
 */
async function exec(code) {
  const result = spawnSync("python3", ["-c", code], {
    cwd: dir,
    env: { ...process.env, PYTHONPATH: dir },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new MicroPythonBoard.BoardError(result.stderr.trim().split("\n").pop(), {
      code: "python",
      traceback: result.stderr,
    });
  }
  return result.stdout;
}

const file = (name) => path.join(dir, name);
const read = (name) => fs.readFileSync(file(name), "utf8");

beforeAll(installWebApis);

beforeEach(() => {
  loadModules(["micropython-board.js"]);
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "aidsnip"));
  fs.writeFileSync(file("aidriver.py"), FAKE_AIDRIVER);
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describeIfPython("helper scripts under CPython", () => {
  test("writeFileAtomic writes multi-chunk UTF-8, verifies and keeps a backup", async () => {
    fs.writeFileSync(file("main.py"), "old program\n");
    const code = "print('héllo')\n" + "x = 1  # ✓\n".repeat(500);
    const bytes = new TextEncoder().encode(code);
    expect(bytes.length).toBeGreaterThan(2 * MicroPythonBoard.WRITE_CHUNK);

    await MicroPythonBoard.writeFileAtomic(exec, file("main.py"), bytes);

    expect(read("main.py")).toBe(code);
    expect(read("main.py.bak")).toBe("old program\n");
    expect(fs.existsSync(file("main.py.part"))).toBe(false);
  });

  test("writeFileAtomic works when there is no main.py yet, and for empty files", async () => {
    await MicroPythonBoard.writeFileAtomic(exec, file("main.py"), new Uint8Array());
    expect(read("main.py")).toBe("");
    expect(fs.existsSync(file("main.py.bak"))).toBe(false);
  });

  test("commit with the wrong hash removes the partial file and keeps main.py", async () => {
    fs.writeFileSync(file("main.py"), "old program\n");
    fs.writeFileSync(file("main.py.part"), "corrupted");

    const stdout = await exec(
      MicroPythonBoard.snippets.commit(file("main.py"), "0".repeat(64)),
    );

    expect(MicroPythonBoard.parseMarked(stdout)).toEqual({ ok: false });
    expect(read("main.py")).toBe("old program\n");
    expect(fs.existsSync(file("main.py.part"))).toBe(false);
  });

  test("readFile returns binary-safe contents, or null for a missing file", async () => {
    const bytes = Uint8Array.from({ length: 1000 }, (_, i) => i % 256);
    fs.writeFileSync(file("event_log.txt"), bytes);

    expect(await MicroPythonBoard.readFile(exec, file("event_log.txt"))).toEqual(bytes);
    expect(await MicroPythonBoard.readFile(exec, file("event_log_prev.txt"))).toBeNull();
  });

  test("identify reports the interpreter and AIDriver library", async () => {
    const info = await MicroPythonBoard.identify(exec);

    expect(info).toMatchObject({ impl: "cpython", aidriver: true, version: "test-1" });
    expect(Array.isArray(info.shadowing)).toBe(true);
    expect(typeof info.has_boot_py).toBe("boolean");
  });
});
