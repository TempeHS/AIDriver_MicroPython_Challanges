/**
 * Full Application Integration Tests
 * Boots the real simulator (simulator.html markup + every js/ module + real
 * Skulpt) and drives it through the UI the way a learner would.
 */

const { loadModules, loadSkulpt } = require("../helpers/load-app");
const { SIMULATOR_BODY, createFakeAce } = require("../helpers/simulator-page");

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
  "app.js",
];

const DRIVE_PROGRAM = [
  "from aidriver import AIDriver, hold_state",
  "r = AIDriver()",
  "r.drive_forward(200, 200)",
  "hold_state(0.5)",
  "r.brake()",
  "print('arrived <home> & done')",
].join("\n");

const LOOP_PROGRAM = [
  "from aidriver import AIDriver, hold_state",
  "r = AIDriver()",
  "count = 0",
  "while True:",
  "    count = count + 1",
  "    r.drive_forward(200, 200)",
].join("\n");

let app;
let rafEnabled;
const addedListeners = [];

function $(id) {
  return document.getElementById(id);
}

function click(el) {
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

function debugText() {
  return $("debugConsole").textContent;
}

function markerRows(clazz) {
  return [...Editor.instance.session.markers.values()]
    .filter((m) => m.clazz === clazz)
    .map((m) => m.row);
}

async function waitFor(predicate, timeout = 4000) {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeout) {
      throw new Error(`Timed out waiting for ${predicate}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function boot(url = "/simulator.html") {
  window.history.replaceState(null, "", url);
  app = loadModules(ALL_MODULES);
  app.init();
}

beforeAll(() => {
  loadSkulpt();
});

beforeEach(() => {
  // Track global listeners registered by init() so each test starts clean
  for (const target of [window, document]) {
    const original = target.addEventListener;
    jest.spyOn(target, "addEventListener").mockImplementation(function (...args) {
      addedListeners.push([target, ...args]);
      return original.apply(this, args);
    });
  }

  // Browsers pass a timestamp to rAF callbacks (setup.js's mock does not)
  rafEnabled = true;
  window.requestAnimationFrame = (cb) =>
    rafEnabled ? setTimeout(() => cb(performance.now()), 16) : 0;

  // setup.js's 2D context lacks some drawing calls render() uses; stub them all
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function () {
    const gradient = { addColorStop() {} };
    const base = {
      canvas: this,
      measureText: () => ({ width: 0 }),
      createLinearGradient: () => gradient,
      createRadialGradient: () => gradient,
      getLineDash: () => [],
    };
    return new Proxy(base, {
      get: (target, prop) => (prop in target ? target[prop] : () => {}),
    });
  });

  // PythonRunner.stop() calls console.trace(), which setup.js does not silence
  jest.spyOn(console, "trace").mockImplementation(() => {});

  window.ace = createFakeAce();
  bootstrap.Modal.getInstance = () => ({ hide() {} });
  localStorage.clear();
  document.body.innerHTML = SIMULATOR_BODY;
});

afterEach(async () => {
  rafEnabled = false;
  if (window.PythonRunner && PythonRunner.isRunning) {
    PythonRunner.stop();
  }
  clearTimeout(Editor.saveTimeout);
  clearTimeout(Editor.validateTimeout);
  jest.useRealTimers();
  for (const [target, ...args] of addedListeners.splice(0)) {
    target.removeEventListener(...args);
  }
  jest.restoreAllMocks();
  await sleep(20);
});

describe("Startup", () => {
  test("loads challenge 0 into the editor, arena and debug panel", () => {
    boot();

    expect(App.currentChallenge).toBe(0);
    expect($("challengeSimulatorMenu").querySelectorAll("[data-challenge]")).toHaveLength(9);
    expect($("challengeDropdown").textContent).toContain("Challenge 0: Fix the Code");
    expect(Editor.getCode()).toContain("# Challenge 0: Fix the Code");
    expect(App.robot).toMatchObject({ x: 1000, y: 1800, heading: 0, leftSpeed: 0 });
    expect(debugText()).toContain("=== Challenge 0: Fix the Code ===");
    expect($("statusMessage").textContent).toBe("Challenge 0: Fix the Code loaded");
    expect($("ultrasonicDisplay").textContent).toMatch(/^Distance: \d+ mm$/);
    expect($("loadingOverlay").classList.contains("hidden")).toBe(true);
    expect($("btnRun").disabled).toBe(false);
  });

  test("honours the ?challenge= URL parameter", () => {
    boot("/simulator.html?challenge=2");

    expect(App.currentChallenge).toBe(2);
    expect($("challengeDropdown").textContent).toContain("Challenge 2: Drive a Circle");
    expect(Editor.getCode()).toContain("# Challenge 2: Drive a Circle");
    expect(App.robot).toMatchObject({ x: 1000, y: 1400, heading: 90 });
  });

  test("loading challenge 0 flags its deliberate errors and disables Run", () => {
    jest.useFakeTimers();
    boot();
    jest.advanceTimersByTime(500);

    // Line 12 is the `while ... == -1` missing its colon
    expect(markerRows("ace_error-line")).toContain(11);
    expect($("challengeStatus").textContent).toMatch(/^\d+ error\(s\)$/);
    expect($("btnRun").disabled).toBe(true);
  });
});

describe("Switching challenges", () => {
  beforeEach(() => boot());

  test("menu selection loads starter code, start pose and URL", () => {
    App.robot.x = 123;
    App.robot.leftSpeed = 200;
    click(document.querySelector('[data-challenge="4"]'));

    expect(App.currentChallenge).toBe(4);
    expect(window.location.search).toBe("?challenge=4");
    expect($("challengeDropdown").textContent).toContain("Challenge 4: Drive a Square");
    expect(Editor.getCode()).toContain("# Challenge 4: Drive a Square");
    expect(App.robot).toMatchObject({ x: 600, y: 1400, heading: 0, leftSpeed: 0 });
    expect(document.querySelectorAll("[data-challenge].active")).toHaveLength(1);
    expect($("mazeSelector").classList.contains("d-none")).toBe(true);

    click(document.querySelector('[data-challenge="6"]'));
    expect($("mazeSelector").classList.contains("d-none")).toBe(false);
    expect(App.robot).toMatchObject({ x: 300, y: 1700 });
  });

  test("challenge obstacles feed the ultrasonic reading", () => {
    const distanceOf = (id) => {
      click(document.querySelector(`[data-challenge="${id}"]`));
      return Number($("ultrasonicDisplay").textContent.match(/\d+/)[0]);
    };
    // Same start pose; challenge 5 has a block ahead at y=500..700
    expect(distanceOf(5)).toBeLessThan(distanceOf(1) - 400);
  });

  test("browser back/forward (popstate) loads the challenge from the URL", () => {
    window.history.replaceState(null, "", "/simulator.html?challenge=3");
    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(App.currentChallenge).toBe(3);
    expect(Editor.getCode()).toContain("# Challenge 3: Distance Sensor");
  });

  test("edited code is saved and restored, and Reset Code restores the starter", () => {
    jest.useFakeTimers();
    click(document.querySelector('[data-challenge="1"]'));
    Editor.setCode("# my work\n" + DRIVE_PROGRAM);
    jest.advanceTimersByTime(1000);

    click(document.querySelector('[data-challenge="2"]'));
    click(document.querySelector('[data-challenge="1"]'));
    expect(Editor.getCode()).toBe("# my work\n" + DRIVE_PROGRAM);
    expect(debugText()).toContain("Loaded saved code for Challenge 1");

    click($("btnResetCode"));
    click($("btnConfirmReset"));
    expect(Editor.getCode()).toContain("# Challenge 1: Drive in a Straight Line");
    expect(Editor.hasSavedCode(1)).toBe(false);
  });

  test("edits made just before switching challenge are not lost", () => {
    jest.useFakeTimers();
    click(document.querySelector('[data-challenge="1"]'));
    Editor.setCode("# quick edit\n" + DRIVE_PROGRAM);
    jest.advanceTimersByTime(200); // before the 1 s auto-save

    click(document.querySelector('[data-challenge="2"]'));
    jest.advanceTimersByTime(2000);
    click(document.querySelector('[data-challenge="1"]'));
    expect(Editor.getCode()).toBe("# quick edit\n" + DRIVE_PROGRAM);
  });
});

describe("Running code", () => {
  beforeEach(() => {
    boot("/simulator.html?challenge=1");
    app.startAnimationLoop();
  });

  test("Run executes the program, the robot drives, and Run waits for Reset", async () => {
    Editor.setCode(DRIVE_PROGRAM);
    click($("btnRun"));

    expect(App.isRunning).toBe(true);
    expect($("btnRun").disabled).toBe(true);
    expect($("btnStop").disabled).toBe(false);
    expect($("challengeStatus").textContent).toBe("Running");

    await waitFor(() => !App.isRunning);

    expect(App.robot.y).toBeLessThan(1700);
    expect(App.robot.x).toBeCloseTo(1000, 0);
    expect(App.robot.trail.length).toBeGreaterThan(0);
    expect(App.robot).toMatchObject({ leftSpeed: 0, rightSpeed: 0 });
    expect(debugText()).toContain("Execution completed");
    expect($("challengeStatus").textContent).toBe("Completed");

    // Learner print output reaches the panel as text, not markup
    const printed = [...$("debugConsole").querySelectorAll("span.output")];
    expect(printed.map((s) => s.textContent)).toContain("arrived <home> & done\n");

    expect($("btnRun").disabled).toBe(true);
    expect($("btnStep").disabled).toBe(true);
  });

  test("Ctrl+Enter does nothing while Run is disabled after a run", async () => {
    Editor.setCode(DRIVE_PROGRAM);
    click($("btnRun"));
    await waitFor(() => !App.isRunning);
    const finishedAt = App.robot.y;

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }),
    );
    expect(App.isRunning).toBe(false);
    await sleep(100);
    expect(App.robot.y).toBe(finishedAt);
  });

  test("a runtime error shows Error, not Completed", async () => {
    Editor.setCode("from aidriver import AIDriver\nr = AIDriver()\nx = 1 / 0\n");
    click($("btnRun"));
    await waitFor(() => !App.isRunning);

    expect($("challengeStatus").textContent).toBe("Error");
    expect(App.session.hasError).toBe(true);
    expect(debugText()).not.toContain("Execution completed");
  });

  test("Stop halts an endless program and zeroes the motors", async () => {
    Editor.setCode(LOOP_PROGRAM);
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true, bubbles: true }),
    );
    await waitFor(() => App.robot.y < 1750);

    click($("btnStop"));
    expect(App.isRunning).toBe(false);
    expect(PythonRunner.isRunning).toBe(false);
    expect(App.robot).toMatchObject({ leftSpeed: 0, rightSpeed: 0, isMoving: false });
    expect($("challengeStatus").textContent).toBe("Stopped");
    expect($("btnStop").disabled).toBe(true);
    expect($("btnRun").disabled).toBe(true);

    const stoppedAt = App.robot.y;
    await sleep(150);
    expect(App.robot.y).toBe(stoppedAt);
    expect(App.robot.leftSpeed).toBe(0);
  });

  test("Reset restores the start pose (with rotation) and re-enables Run", async () => {
    Editor.setCode(DRIVE_PROGRAM);
    click($("btnRun"));
    await waitFor(() => !App.isRunning);
    expect(App.robot.y).toBeLessThan(1700);

    click($("btnReset"));
    expect(App.robot).toMatchObject({ x: 1000, y: 1800, heading: 0, trail: [] });
    expect(App.hasRun).toBe(false);
    expect($("btnRun").disabled).toBe(false);
    expect($("btnStep").disabled).toBe(false);

    click($("btnRotateCar"));
    expect($("rotationDisplay").textContent).toBe("90°");
    expect(App.robot.heading).toBe(90);

    click($("btnRun"));
    await waitFor(() => !App.isRunning);
    expect(App.robot.x).toBeGreaterThan(1100);
    expect(App.robot.y).toBeCloseTo(1800, 0);
  });

  test("validation errors are reported in the debug panel and block the run", async () => {
    Editor.setCode(DRIVE_PROGRAM.replace("r = AIDriver()", "while True\nr = AIDriver()"));
    click($("btnRun"));
    await waitFor(() => !App.isRunning);

    expect(debugText()).toContain("Code has errors that must be fixed before running:");
    expect(debugText()).toContain("Line 2: Missing colon ':' at end of statement");
    expect(debugText()).not.toContain("[Python] Starting execution...");
    expect($("challengeStatus").textContent).toBe("Error");
    expect(App.robot).toMatchObject({ x: 1000, y: 1800 });
  });

  test("low-speed warnings appear in the panel without stopping the program", async () => {
    Editor.setCode(DRIVE_PROGRAM.replace("drive_forward(200, 200)", "drive_forward(50, 50)"));
    click($("btnRun"));
    await waitFor(() => !App.isRunning);

    const warnings = [...$("debugConsole").querySelectorAll("span.warning")];
    expect(warnings.some((s) => s.textContent.includes("Speed 50 is in the stopped range"))).toBe(true);
    expect(debugText()).not.toContain("[Error]");
    expect(debugText()).toContain("arrived <home> & done");
  });

  test("speed slider sets App.speedMultiplier and robot velocity together", () => {
    const slider = $("speedSlider");
    slider.value = "4";
    slider.dispatchEvent(new Event("input"));

    expect(App.speedMultiplier).toBe(4);
    expect($("speedValue").textContent).toBe("4x");
    const moved = App.robot.y - Simulator.step({ ...App.robot, leftSpeed: 255, rightSpeed: 255 }, 0.25).y;
    // 255 = 800 mm/s at 1x
    expect(moved).toBeCloseTo(800);
  });
});

describe("Step mode", () => {
  test("Step runs line by line and toggles Pause/Resume", async () => {
    boot("/simulator.html?challenge=1");
    app.startAnimationLoop();
    PythonRunner.stepDelay = 5;
    Editor.setCode(LOOP_PROGRAM);

    click($("btnStep"));
    expect($("btnStep").textContent).toBe("Pause");
    expect($("btnRun").disabled).toBe(true);
    await waitFor(() => PythonRunner.currentStepLine >= 5);

    click($("btnStep"));
    expect($("btnStep").textContent).toBe("Resume");
    await sleep(30);
    const pausedLine = PythonRunner.currentStepLine;
    const pausedY = App.robot.y;
    expect(markerRows("ace_executing-line")).toEqual([pausedLine - 1]);
    await sleep(100);
    expect(PythonRunner.currentStepLine).toBe(pausedLine);
    expect(App.robot.y).toBe(pausedY);

    click($("btnStep"));
    expect($("btnStep").textContent).toBe("Pause");
    await waitFor(() => App.robot.y < pausedY);

    click($("btnStop"));
    await waitFor(() => $("btnStep").textContent === "Step");
    expect(PythonRunner.isStepping).toBe(false);
    expect(markerRows("ace_executing-line")).toEqual([]);
    expect($("btnStep").disabled).toBe(true);
    expect($("btnRun").disabled).toBe(true);
  });
});
