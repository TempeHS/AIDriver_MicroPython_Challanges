/**
 * Robot toolbar tests: boots the real simulator page (all js/ modules and
 * real Skulpt) and drives Connect / Upload / Upload & Run / Logs / Stop robot
 * against a fake AIDriver Pico on a fake Web Serial port.
 */

const { loadModules, loadSkulpt } = require("../helpers/load-app");
const { SIMULATOR_BODY, createFakeAce } = require("../helpers/simulator-page");
const {
  FakeBoard,
  installWebApis,
  installFakeSerial,
  removeFakeSerial,
  waitFor,
  CURRENT_FIRMWARE_VERSION,
} = require("../helpers/fake-micropython-board");

const ALL_MODULES = [
  "logger.js",
  "debug-panel.js",
  "validator.js",
  "simulator.js",
  "challenges.js",
  "mazes.js",
  "gamepad.js",
  "aidriver-stub.js",
  "python-runner.js",
  "editor.js",
  "serial-link.js",
  "micropython-board.js",
  "log-viewer.js",
  "robot-connection.js",
  "app.js",
];

const PROGRAM = [
  "from aidriver import AIDriver, hold_state",
  "my_robot = AIDriver()",
  "my_robot.drive_forward(200, 200)",
  "hold_state(1)",
  "my_robot.brake()",
].join("\r\n"); // Windows line endings, as pasted code may have

const UPLOADED = PROGRAM.replace(/\r\n/g, "\n") + "\n";

let fake;
let confirmSpy;
const addedListeners = [];

const $ = (id) => document.getElementById(id);
const click = (el) =>
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
const debugText = () => $("debugConsole").textContent;
const status = () => $("robotStatus").textContent;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boot() {
  window.history.replaceState(null, "", "/simulator.html?challenge=1");
  const app = loadModules(ALL_MODULES);
  app.init();
  Editor.setCode(PROGRAM);
}

async function connect(options = {}) {
  fake = new FakeBoard({ files: { "/main.py": "old program\n" }, ...options });
  installFakeSerial([fake], { granted: true });
  boot();
  click($("btnRobotConnect"));
  await waitFor(() => !["connecting", "idle"].includes(RobotConnection.state));
}

beforeAll(() => {
  installWebApis();
  loadSkulpt();
});

beforeEach(() => {
  for (const target of [window, document]) {
    const original = target.addEventListener;
    jest.spyOn(target, "addEventListener").mockImplementation(function (...args) {
      addedListeners.push([target, ...args]);
      return original.apply(this, args);
    });
  }
  window.requestAnimationFrame = () => 0;
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
    return new Proxy(
      { canvas: this, measureText: () => ({ width: 0 }), getLineDash: () => [] },
      { get: (target, prop) => (prop in target ? target[prop] : () => {}) },
    );
  });
  jest.spyOn(console, "trace").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);
  window.ace = createFakeAce();
  bootstrap.Modal.getOrCreateInstance = () => ({ show() {}, hide() {} });
  localStorage.clear();
  document.body.innerHTML = SIMULATOR_BODY;
});

afterEach(async () => {
  if (window.RobotConnection && RobotConnection.board) {
    await RobotConnection.closeBoard();
  }
  clearTimeout(Editor.saveTimeout);
  clearTimeout(Editor.validateTimeout);
  for (const [target, ...args] of addedListeners.splice(0)) {
    target.removeEventListener(...args);
  }
  jest.restoreAllMocks();
  removeFakeSerial();
  await sleep(20);
});

describe("Robot toolbar availability", () => {
  test("browsers without Web Serial see a notice instead of the toolbar", () => {
    boot();

    expect($("robotToolbar").classList.contains("d-none")).toBe(true);
    expect($("robotUnsupported").classList.contains("d-none")).toBe(false);
    expect($("robotUnsupported").textContent).toMatch(/Upload needs Chrome or\s+Edge/);
    expect($("robotUnsupported").title).toBe(
      "Uploading to a robot needs Chrome or Edge on a computer.",
    );
  });

  test("the Robot toolbar is in the editor's header, separate from the simulator controls", () => {
    installFakeSerial([new FakeBoard()]);
    boot();

    const editorHeader = $("editorCard").querySelector(".card-header");
    expect(editorHeader.contains($("robotToolbar"))).toBe(true);
    expect(editorHeader.contains($("robotUnsupported"))).toBe(true);
    expect($("btnRun").closest(".card").contains($("robotToolbar"))).toBe(false);
  });

  test("before connecting only Connect robot is enabled; the rest are greyed out", () => {
    installFakeSerial([new FakeBoard()]);
    boot();

    expect(status()).toBe("Not connected");
    expect($("btnRobotConnect").disabled).toBe(false);
    for (const id of ["btnRobotUpload", "btnRobotUploadRun", "btnRobotLogs", "btnRobotStop"]) {
      expect($(id).disabled).toBe(true);
    }
  });

  test("every robot control has a hover tooltip that follows the connection state", async () => {
    const ids = ["robotStatus", "btnRobotConnect", "btnRobotUpload", "btnRobotUploadRun", "btnRobotLogs", "btnRobotStop"];
    const tip = (id) => bootstrap.Tooltip.getInstance($(id)).config.title();

    installFakeSerial([new FakeBoard()]);
    boot();

    for (const id of ids) {
      expect($(id).hasAttribute("title")).toBe(false); // no doubled-up native tooltip
      expect(tip(id)).not.toBe("");
    }
    expect(tip("btnRobotConnect")).toBe("Connect to your robot with a USB cable");
    expect(tip("btnRobotUpload")).toBe(
      "Save the code in the editor to the robot as main.py. Connect a robot first.",
    );
    expect(tip("btnRobotStop")).toMatch(/Connect a robot first\.$/);
    expect(tip("robotStatus")).toMatch(/^No robot connected/);

    removeFakeSerial();
    for (const [target, ...args] of addedListeners.splice(0)) {
      target.removeEventListener(...args);
    }
    document.body.innerHTML = SIMULATOR_BODY;
    await connect();

    expect(tip("btnRobotConnect")).toBe("Disconnect from the robot");
    expect(tip("btnRobotUpload")).toBe("Save the code in the editor to the robot as main.py.");
    expect(tip("btnRobotStop")).toBe("Stop the program running on the robot.");
    expect(tip("robotStatus")).toMatch(/^Raspberry Pi Pico · MicroPython/);
    expect(bootstrap.Tooltip.getInstance($("btnRobotUpload")).setContent).toHaveBeenCalledWith({
      ".tooltip-inner": "Save the code in the editor to the robot as main.py.",
    });

    RobotConnection.setState("busy");
    expect(tip("btnRobotUpload")).toMatch(/Please wait until the robot has finished/);
  });
});

describe("Connect", () => {
  test("stops a running program and reports the robot", async () => {
    await connect({ running: true });

    expect(RobotConnection.state).toBe("ready");
    expect(fake.execLog).toEqual(["identify"]);
    expect(fake.mode).toBe("friendly");
    expect(status()).toBe("Pico connected");
    expect(debugText()).toContain(
      `Connected to robot: Raspberry Pi Pico · MicroPython 1.30.0-preview · AIDriver ${CURRENT_FIRMWARE_VERSION}`,
    );
    expect(debugText()).not.toMatch(/teacher/);
    expect($("btnRobotConnect").textContent).toContain("Disconnect");
    for (const id of ["btnRobotUpload", "btnRobotUploadRun", "btnRobotLogs", "btnRobotStop"]) {
      expect($(id).disabled).toBe(false);
    }
  });

  test("warns about library copies and boot.py", async () => {
    await connect({ files: { "/aidriver.py": "", "/boot.py": "" } });

    expect(debugText()).toMatch(/own copy of aidriver\.py/);
    expect(debugText()).toMatch(/boot\.py, which runs before main\.py/);
  });

  test("the simulator expects the firmware version in project/lib/aidriver.py and the published build", () => {
    const buildInfo = require("fs").readFileSync(
      require("path").join(__dirname, "../../../_Firmware/build_info.txt"),
      "utf8",
    );
    boot();
    expect(RobotConnection.FIRMWARE_VERSION).toBe(CURRENT_FIRMWARE_VERSION);
    expect(buildInfo).toContain(`AIDriver Version: ${CURRENT_FIRMWARE_VERSION}\n`);
  });

  test.each([
    [
      "missing",
      { aidriver: false },
      /doesn't have the AIDriver firmware.*Give your robot to your teacher to install it\./,
    ],
    [
      "older",
      { version: "2025.1.5" },
      new RegExp(
        `out of date \\(it has version 2025\\.1\\.5; the simulator needs version ${CURRENT_FIRMWARE_VERSION.replace(/\./g, "\\.")}\\)\\. Give your robot to your teacher to update it\\.`,
      ),
    ],
    ["unversioned (built before versions)", { version: null }, /out of date \(it has an older version;/],
  ])("%s AIDriver firmware sends the student to their teacher", async (_name, options, message) => {
    await connect(options);

    expect(RobotConnection.state).toBe("ready");
    expect(debugText()).toMatch(message);
    expect(debugText()).toMatch(/Teachers: hold the robot's BOOTSEL button/);
    expect(status()).toBe("Firmware update needed");
    expect($("robotStatus").classList.contains("text-bg-warning")).toBe(true);
    expect(bootstrap.Tooltip.getInstance($("robotStatus")).config.title()).toMatch(message);

    // Uploading still works, with a reminder
    click($("btnRobotUpload"));
    await waitFor(() => debugText().includes("Uploaded to robot as main.py"));
    expect(debugText().match(new RegExp(message.source, "g"))).toHaveLength(2);
  });

  test("newer firmware than the simulator expects is fine", async () => {
    await connect({ version: "2099.1.1" });

    expect(status()).toBe("Pico connected");
    expect(debugText()).not.toMatch(/teacher/);
  });

  test.each([
    ["no reply (no MicroPython)", { silent: true }, /didn't answer like MicroPython.*Give your robot to your teacher/],
    ["another interpreter", { impl: "circuitpython" }, /isn't running MicroPython\. Give your robot to your teacher/],
  ])("%s disconnects and sends the student to their teacher", async (_name, options, message) => {
    fake = new FakeBoard(options);
    installFakeSerial([fake], { granted: true });
    boot();
    click($("btnRobotConnect"));
    await waitFor(() => /Teachers:/.test(debugText()), 10000);

    expect(debugText()).toMatch(message);
    expect(RobotConnection.state).toBe("idle");
    expect(RobotConnection.board).toBeNull();
  }, 15000);

  test("a port used by another program shows the busy message", async () => {
    fake = new FakeBoard();
    fake.port.busy = true;
    installFakeSerial([fake]);
    boot();

    click($("btnRobotConnect"));
    await waitFor(() => debugText().includes("being used by another program"));
    expect(RobotConnection.state).toBe("idle");
  });

  test("Disconnect releases the port", async () => {
    await connect();
    click($("btnRobotConnect"));
    await waitFor(() => fake.port.readable === null);

    expect(RobotConnection.state).toBe("idle");
    expect(debugText()).toContain("Disconnected from robot.");
  });
});

describe("Upload", () => {
  test("writes the editor code to main.py (checked) and keeps it stopped", async () => {
    await connect();

    click($("btnRobotUpload"));
    await waitFor(() => debugText().includes("Uploaded to robot as main.py"));

    expect(fake.file("/main.py")).toBe(UPLOADED);
    expect(fake.file("/main.py.bak")).toBe("old program\n");
    expect(fake.softResets).toBe(0);
    expect(debugText()).toContain(
      `Uploaded to robot as main.py (${UPLOADED.length} bytes, checked). Unplug the USB cable`,
    );
    expect(RobotConnection.state).toBe("ready");
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  test("a syntax error is marked and blocks the upload unless overridden", async () => {
    await connect();
    Editor.setCode("from aidriver import AIDriver\nx = AIDriver()\nif x\n    pass\n");
    confirmSpy.mockReturnValue(false);

    click($("btnRobotUpload"));
    await sleep(50);

    expect(fake.file("/main.py")).toBe("old program\n");
    expect(debugText()).toMatch(/Fix the error on line 3 before uploading/);
    const rows = [...Editor.instance.session.markers.values()].map((m) => m.row);
    expect(rows).toContain(2);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Press Cancel to fix it/);
  });

  test("simulator rule warnings ask before uploading", async () => {
    await connect();
    Editor.setCode("from machine import Pin\nled = Pin(25)\n");

    confirmSpy.mockReturnValue(false);
    click($("btnRobotUpload"));
    await sleep(50);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/simulator rules[\s\S]*Upload anyway\?/);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Module 'machine' is not allowed/);
    expect(fake.file("/main.py")).toBe("old program\n");

    confirmSpy.mockReturnValue(true);
    click($("btnRobotUpload"));
    await waitFor(() => fake.file("/main.py") === "from machine import Pin\nled = Pin(25)\n");
  });

  test("a failed check keeps the old main.py and says so", async () => {
    await connect();
    fake.failures.hashMismatch = true;

    click($("btnRobotUpload"));
    await waitFor(() => debugText().includes("didn't save correctly"));

    expect(fake.file("/main.py")).toBe("old program\n");
    expect(RobotConnection.state).toBe("ready");
  });

  test("a full robot says the storage is full", async () => {
    await connect();
    fake.failures.diskFull = true;

    click($("btnRobotUpload"));
    await waitFor(() => debugText().includes("storage is full"));
    expect(debugText()).toContain("Your old main.py is still on the robot.");
  });
});

describe("Upload & Run", () => {
  test("uploads, restarts the robot without asking, and shows its output", async () => {
    await connect();
    fake.program = { output: ["Hello from the robot <b>"] };

    click($("btnRobotUploadRun"));
    await waitFor(() => debugText().includes("[Robot] Program finished."));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fake.file("/main.py")).toBe(UPLOADED);
    expect(fake.softResets).toBe(1);
    expect(debugText()).toContain("[Robot] Restarted.");
    expect(debugText()).toContain("[Robot] Hello from the robot <b>");
    expect(debugText()).not.toContain("MPY: soft reboot");
    expect(debugText()).not.toContain('Type "help()"');
    expect(RobotConnection.state).toBe("ready");

  });

  test("a running program is reported and Upload asks before stopping it", async () => {
    await connect();
    fake.program = { output: ["looping"], loop: true };

    click($("btnRobotUploadRun"));
    await waitFor(() => RobotConnection.state === "running");
    expect(status()).toBe("Program running");

    confirmSpy.mockClear();
    confirmSpy.mockReturnValue(false);
    click($("btnRobotUpload"));
    await sleep(30);
    expect(confirmSpy.mock.calls[0][0]).toMatch(/stops the program running on the robot/);
    expect(fake.mode).toBe("running");
  });
});

describe("Stop robot", () => {
  test("stops the running program", async () => {
    await connect();
    fake.program = { output: ["looping"], loop: true };
    click($("btnRobotUploadRun"));
    await waitFor(() => RobotConnection.state === "running");

    click($("btnRobotStop"));
    await waitFor(() => debugText().includes("Robot program stopped."));

    expect(fake.mode).toBe("friendly");
    expect(RobotConnection.state).toBe("ready");
  });

  test("cancels an upload in progress, keeping the old main.py", async () => {
    await connect();
    Editor.setCode("x = 1\n".repeat(4000));
    click($("btnRobotUpload"));
    await waitFor(() => fake.execLog.includes("write"));

    click($("btnRobotStop"));
    await waitFor(() => debugText().includes("Robot program stopped."));

    expect(debugText()).toContain("Upload cancelled. The robot still has its previous main.py.");
    expect(fake.file("/main.py")).toBe("old program\n");
    expect(RobotConnection.state).toBe("ready");
  });
});

describe("Logs", () => {
  function fakeViewer() {
    return { closed: false, postMessage: jest.fn() };
  }

  test("opens the viewer in the click and sends both logs once it is ready", async () => {
    await connect({
      files: {
        "/event_log.txt": "===== RUN START =====\nt+0.00s : robot start\n",
        "/event_log_prev.txt": "t+1.00s : Brake applied\n",
      },
    });
    const viewer = fakeViewer();
    const open = jest.spyOn(window, "open").mockReturnValue(viewer);

    click($("btnRobotLogs"));
    expect(open).toHaveBeenCalledWith("log-viewer.html", "aidriver-logs");
    await waitFor(() => RobotConnection.lastLogs !== null);
    expect(viewer.postMessage).not.toHaveBeenCalled();

    // Messages from other windows or origins are ignored
    RobotConnection.handleMessage({
      origin: window.location.origin,
      source: {},
      data: { type: "aidriver-logs-ready" },
    });
    RobotConnection.handleMessage({
      origin: "https://example.com",
      source: viewer,
      data: { type: "aidriver-logs-ready" },
    });
    expect(viewer.postMessage).not.toHaveBeenCalled();

    RobotConnection.handleMessage({
      origin: window.location.origin,
      source: viewer,
      data: { type: "aidriver-logs-ready" },
    });
    expect(viewer.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "aidriver-logs",
        wasRunning: false,
        robot: { board: "Raspberry Pi Pico", release: "1.30.0-preview" },
        files: {
          current: "===== RUN START =====\nt+0.00s : robot start\n",
          previous: "t+1.00s : Brake applied\n",
        },
      }),
      window.location.origin,
    );
    expect(fake.execLog.filter((op) => op === "read")).toHaveLength(2);
  });

  test("a viewer that is ready first still gets the logs", async () => {
    await connect({ files: {} });
    const viewer = fakeViewer();
    jest.spyOn(window, "open").mockReturnValue(viewer);

    click($("btnRobotLogs"));
    RobotConnection.handleMessage({
      origin: window.location.origin,
      source: viewer,
      data: { type: "aidriver-logs-ready" },
    });
    await waitFor(() => viewer.postMessage.mock.calls.length === 1);
    expect(viewer.postMessage.mock.calls[0][0].files).toEqual({
      current: null,
      previous: null,
    });
  });

  test("viewing logs while a program runs asks first and notes the stop", async () => {
    await connect();
    fake.program = { output: ["looping"], loop: true };
    click($("btnRobotUploadRun"));
    await waitFor(() => RobotConnection.state === "running");
    const viewer = fakeViewer();
    jest.spyOn(window, "open").mockReturnValue(viewer);
    confirmSpy.mockClear();

    click($("btnRobotLogs"));
    expect(confirmSpy.mock.calls[0][0]).toMatch(/Viewing logs stops the program/);
    await waitFor(() => RobotConnection.lastLogs !== null);
    expect(RobotConnection.lastLogs.wasRunning).toBe(true);
    expect(RobotConnection.lastLogs.files.current).toMatch(/RUN START/);
  });

  test("Refresh from the viewer reads the logs again", async () => {
    await connect({ files: { "/event_log.txt": "first\n" } });
    const viewer = fakeViewer();
    jest.spyOn(window, "open").mockReturnValue(viewer);
    click($("btnRobotLogs"));
    const ready = { origin: window.location.origin, source: viewer };
    RobotConnection.handleMessage({ ...ready, data: { type: "aidriver-logs-ready" } });
    await waitFor(() => viewer.postMessage.mock.calls.length === 1);

    fake.fs.set("/event_log.txt", new TextEncoder().encode("second\n"));
    RobotConnection.handleMessage({ ...ready, data: { type: "aidriver-logs-refresh" } });
    await waitFor(() => viewer.postMessage.mock.calls.length === 2);
    expect(viewer.postMessage.mock.calls[1][0].files.current).toBe("second\n");
  });

  test("when pop-ups are blocked the logs open in a modal, as text", async () => {
    await connect({ files: { "/event_log.txt": "<img src=x onerror=alert(1)>\n" } });
    jest.spyOn(window, "open").mockReturnValue(null);

    click($("btnRobotLogs"));
    await waitFor(() =>
      $("robotLogsModalBody").textContent.includes("<img src=x onerror=alert(1)>"),
    );
    expect($("robotLogsModalBody").querySelector("img")).toBeNull();
    expect($("robotLogsModalBody").textContent).toContain("No log yet.");
  });
});

describe("Disconnects", () => {
  test("reconnects automatically when the robot is plugged back in", async () => {
    await connect();
    fake.port.unplug();
    await waitFor(() => RobotConnection.state === "reconnecting");
    expect(debugText()).toContain("Trying to reconnect");

    fake.port.replug();
    await waitFor(() => RobotConnection.state === "ready", 4000);
    expect(fake.port.openCount).toBe(2);
  });

  test("gives up with a message if it doesn't come back", async () => {
    await connect();
    jest.spyOn(SerialLink, "reopen").mockResolvedValue(null);

    fake.port.unplug();
    await waitFor(() => RobotConnection.state === "idle");
    expect(debugText()).toContain("Plug it back in and press Connect.");
  });
});

describe("Robot output", () => {
  test("a fast print loop is shown 50 lines at a time", async () => {
    await connect();
    RobotConnection.handleOutput(
      Array.from({ length: 120 }, (_, i) => `line ${i}\r\n`).join(""),
    );
    await sleep(150);

    const lines = debugText().split("\n").filter((l) => l.startsWith("[Robot] line"));
    expect(lines).toHaveLength(50);
    expect(debugText()).toContain("[Robot] 70 more line(s) not shown");
  });
});
