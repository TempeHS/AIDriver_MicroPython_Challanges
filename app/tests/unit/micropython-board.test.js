/**
 * MicroPythonBoard tests: the real raw REPL protocol in
 * js/micropython-board.js talking to a fake AIDriver Pico.
 */

const { loadModules } = require("../helpers/load-app");
const {
  FakeBoard,
  installWebApis,
  installFakeSerial,
  removeFakeSerial,
  waitFor,
} = require("../helpers/fake-micropython-board");

let fake;
let board;
let output;

async function connect(options) {
  fake = new FakeBoard(options);
  installFakeSerial([fake]);
  const link = await SerialLink.request();
  board = new MicroPythonBoard.Board(link);
  output = [];
  board.onOutput((text) => output.push(text));
  return board;
}

const encode = (text) => new TextEncoder().encode(text);

beforeAll(installWebApis);

beforeEach(() => {
  loadModules(["serial-link.js", "micropython-board.js"]);
});

afterEach(async () => {
  if (board) await board.close();
  board = null;
  removeFakeSerial();
});

describe("sessions", () => {
  test("interrupt a running program and identify the board, without braking", async () => {
    await connect({ running: true, files: { "/boot.py": "", "/aidriver.py": "" } });

    const info = await board.session(MicroPythonBoard.identify);

    expect(info).toMatchObject({
      impl: "micropython",
      release: "1.30.0-preview",
      aidriver: true,
      has_boot_py: true,
      shadowing: ["aidriver.py"],
    });
    expect(fake.execLog).toEqual(["identify"]);
    expect(fake.mode).toBe("friendly");
    // The raw REPL exchange and banner are not shown as program output
    expect(output.join("")).toBe("");
  });

  test("keeps interrupting a program that ignores the first Ctrl-Cs", async () => {
    await connect({ running: true, ignoreInterrupts: 3 });

    await board.stopProgram();

    expect(fake.execLog).toEqual([]);
    expect(fake.mode).toBe("friendly");
  });

  test("a program that won't stop is reported after three attempts", async () => {
    await connect({ running: true, ignoreInterrupts: Infinity });
    fake.program.loop = true;
    // The fake still prints nothing, but it did answer earlier...
    fake.emit("still running\r\n");
    await waitFor(() => output.length > 0);

    const error = await board.stopProgram().catch((e) => e);

    expect(error.code).toBe("wont-stop");
    expect(error.message).toBe("The robot's program won't stop.");
  }, 15000);

  test("a board that never answers is reported as not MicroPython", async () => {
    await connect({ silent: true });

    const error = await board.session(MicroPythonBoard.identify).catch((e) => e);

    expect(error.code).toBe("no-reply");
  }, 15000);

  test("sessions run one at a time, in order", async () => {
    await connect();
    const order = [];

    await Promise.all([
      board.session(async (exec) => {
        order.push("a-start");
        await exec("# aid:identify");
        order.push("a-end");
      }),
      board.session(async () => {
        order.push("b");
      }),
    ]);

    expect(order).toEqual(["a-start", "a-end", "b"]);
  });

  test("a Python error is raised with its last traceback line", async () => {
    await connect();

    const error = await board
      .session((exec) => exec("# aid:unknown\nx"))
      .catch((e) => e);

    expect(error).toBeInstanceOf(MicroPythonBoard.BoardError);
    expect(error.code).toBe("python");
    expect(error.message).toBe("NameError: name 'x' isn't defined");
    expect(error.traceback).toMatch(/^Traceback/);
  });

  test("a failed session still leaves the raw REPL", async () => {
    await connect();
    await board.session((exec) => exec("# aid:unknown")).catch(() => {});

    expect(fake.mode).toBe("friendly");
    expect(board.raw).toBe(false);
  });

  test("softReset runs main.py and its output goes to onOutput", async () => {
    await connect({ files: { "/main.py": "print('hi')\n" } });

    await board.softReset();
    await waitFor(() => output.join("").includes(">>> "));

    expect(fake.softResets).toBe(1);
    expect(output.join("")).toContain("hello from main.py");
  });

  test("losing the board fails the waiting operation", async () => {
    await connect();
    let started = false;
    const pending = board.session(() => {
      started = true;
      return new Promise(() => {});
    });
    await waitFor(() => started);

    board.lost();
    const stuck = board.session((exec) => exec("# aid:identify"));
    fake.silent = true;

    await expect(Promise.race([stuck, new Promise((r) => setTimeout(() => r("waiting"), 50))]))
      .resolves.toBe("waiting");
    pending.catch(() => {});
    stuck.catch(() => {});
  });
});

describe("writeFileAtomic", () => {
  test("writes in 2 KB chunks, verifies, and keeps the old file as .bak", async () => {
    await connect({ files: { "/main.py": "old program\n" } });
    const code = "print('é')\n" + "x = 1\n".repeat(700); // > 4 KB, UTF-8
    const progress = [];

    await board.session((exec) =>
      MicroPythonBoard.writeFileAtomic(exec, "/main.py", encode(code), (done, total) =>
        progress.push([done, total]),
      ),
    );

    const size = encode(code).length;
    expect(fake.file("/main.py")).toBe(code);
    expect(fake.file("/main.py.bak")).toBe("old program\n");
    expect(fake.fs.has("/main.py.part")).toBe(false);
    expect(fake.execLog.filter((op) => op === "write")).toHaveLength(3);
    expect(progress).toEqual([
      [2048, size],
      [4096, size],
      [size, size],
    ]);
  });

  test("a hash mismatch keeps the old main.py", async () => {
    await connect({ files: { "/main.py": "old program\n" } });
    fake.failures.hashMismatch = true;

    const error = await board
      .session((exec) => MicroPythonBoard.writeFileAtomic(exec, "/main.py", encode("new\n")))
      .catch((e) => e);

    expect(error.code).toBe("verify-failed");
    expect(fake.file("/main.py")).toBe("old program\n");
    expect(fake.fs.has("/main.py.part")).toBe(false);
  });

  test("unplugging mid-upload leaves the old main.py intact", async () => {
    await connect({ files: { "/main.py": "old program\n" } });
    fake.failures.unplugAfterWrites = 1;
    board.link.onLost = () => board.lost();

    const error = await board
      .session((exec) =>
        MicroPythonBoard.writeFileAtomic(exec, "/main.py", encode("y = 2\n".repeat(1000))),
      )
      .catch((e) => e);

    expect(error.code).toBe("disconnected");
    expect(fake.file("/main.py")).toBe("old program\n");
  });

  test("a full filesystem is reported as a Python OSError", async () => {
    await connect();
    fake.failures.diskFull = true;

    const error = await board
      .session((exec) => MicroPythonBoard.writeFileAtomic(exec, "/main.py", encode("x\n")))
      .catch((e) => e);

    expect(error.message).toBe("OSError: 28");
    expect(fake.fs.has("/main.py")).toBe(false);
  });
});

describe("readFile", () => {
  test("returns the file bytes, or null if it doesn't exist", async () => {
    await connect({ files: { "/event_log.txt": "t+0.00s : robot start\n" } });

    const [log, missing] = await board.session(async (exec) => [
      await MicroPythonBoard.readFile(exec, "/event_log.txt"),
      await MicroPythonBoard.readFile(exec, "/event_log_prev.txt"),
    ]);

    expect(new TextDecoder().decode(log)).toBe("t+0.00s : robot start\n");
    expect(missing).toBeNull();
  });
});

describe("helpers", () => {
  test("only simple absolute paths can be used in snippets", () => {
    expect(MicroPythonBoard.quotePath("/lib/x_1.py")).toBe('"/lib/x_1.py"');
    for (const bad of ["main.py", "/../x", "/a'b", '/a"b', "/a\nb"]) {
      expect(() => MicroPythonBoard.quotePath(bad)).toThrow(/Can't use/);
    }
  });

  test("parseMarked reads JSON between the markers and rejects anything else", () => {
    expect(MicroPythonBoard.parseMarked('noise<<AID{"ok": true}AID>>\r\n')).toEqual({
      ok: true,
    });
    expect(() => MicroPythonBoard.parseMarked("Traceback")).toThrow(
      "The robot sent an unexpected reply.",
    );
  });
});
