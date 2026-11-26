/**
 * Load the real simulator source files (app/js/*.js) into the jsdom test
 * environment, as the browser does with <script> tags.
 *
 * Files are evaluated as global scripts. Top-level `const`/`let` are turned
 * into `var` so that each module becomes a property of `window` (replacing the
 * placeholder mocks from tests/setup.js), files can be re-loaded for fresh
 * state, and tests can swap a dependency (e.g. `window.render = () => {}`).
 */

const fs = require("fs");
const path = require("path");

const JS_DIR = path.join(__dirname, "..", "..", "js");

// File -> global name declared by that file. Order matches simulator.html.
const MODULES = {
  "logger.js": "Logger",
  "debug-panel.js": "DebugPanel",
  "validator.js": "Validator",
  "simulator.js": "Simulator",
  "challenges.js": "Challenges",
  "mazes.js": "Mazes",
  "gamepad.js": "Gamepad",
  "aidriver-stub.js": "AIDriverStub",
  "python-runner.js": "PythonRunner",
  "editor.js": "Editor",
  "serial-link.js": "SerialLink",
  "micropython-board.js": "MicroPythonBoard",
  "log-viewer.js": "LogViewer",
  "robot-connection.js": "RobotConnection",
  "app.js": "App",
};

// Top-level functions in app.js that tests call by name
const APP_FUNCTIONS = [
  "init",
  "cacheElements",
  "loadChallenge",
  "runCode",
  "stopExecution",
  "stepCode",
  "resetRobot",
  "render",
  "calculateDistance",
  "updateUltrasonicDisplay",
  "updateSessionTracking",
  "checkChallengeSuccess",
  "syncSimulationSpeed",
  "startAnimationLoop",
];

const indirectEval = eval;
let skulptLoaded = false;

/**
 * Load Skulpt 1.2.0 (the version simulator.html pulls from the CDN) from the
 * `skulpt` dev dependency. Safe to call more than once.
 * @returns {object} The global Sk object.
 */
function loadSkulpt() {
  // jsdom has no setImmediate; Skulpt uses it to resume loop suspensions
  window.setImmediate = (fn, ...args) => setTimeout(() => fn(...args), 0);
  if (!skulptLoaded) {
    delete window.Sk;
    const dist = path.dirname(require.resolve("skulpt/dist/skulpt.min.js"));
    indirectEval(fs.readFileSync(path.join(dist, "skulpt.min.js"), "utf8"));
    indirectEval(fs.readFileSync(path.join(dist, "skulpt-stdlib.js"), "utf8"));
    skulptLoaded = true;
  }
  return window.Sk;
}

/**
 * Evaluate real app modules and publish them on window. Calling again
 * re-evaluates the files, giving fresh module state.
 *
 * @param {string[]} files File names from app/js, e.g. ["simulator.js"].
 * @returns {Record<string, *>} Map of global name -> real module object.
 */
function loadModules(files) {
  const unknown = files.filter((f) => !(f in MODULES));
  if (unknown.length) {
    throw new Error(`Unknown app module(s): ${unknown.join(", ")}`);
  }
  const ordered = Object.keys(MODULES).filter((f) => files.includes(f));
  const names = ordered.map((f) => MODULES[f]);
  if (ordered.includes("app.js")) {
    names.push(...APP_FUNCTIONS);
  }

  for (const file of ordered) {
    const source = fs
      .readFileSync(path.join(JS_DIR, file), "utf8")
      .replace(/^(const|let) /gm, "var ");
    indirectEval(`${source}\n//# sourceURL=${path.join(JS_DIR, file)}`);
  }

  const loaded = {};
  for (const n of names) {
    if (n in window) loaded[n] = window[n];
  }
  return loaded;
}

/**
 * Replace DebugPanel with a recorder (for tests that don't need the real
 * panel's DOM). Only the methods the real DebugPanel has are provided, so a
 * call to a non-existent method fails the test. Messages from warning() and
 * error() are prefixed with WARN / ERROR.
 * @returns {{messages: string[], panel: object}}
 */
function captureDebugPanel() {
  const messages = [];
  const record = (prefix) => (msg) =>
    messages.push(prefix ? `${prefix} ${msg}` : String(msg));
  window.DebugPanel = {
    init() {},
    clear() {
      messages.length = 0;
    },
    separator() {},
    log: record(""),
    info: record(""),
    success: record(""),
    output: record(""),
    warning: record("WARN"),
    error: record("ERROR"),
  };
  return { messages, panel: window.DebugPanel };
}

/**
 * Fresh robot state matching App.robot's shape.
 * @param {object} [overrides] Fields to override.
 * @returns {object}
 */
function makeRobot(overrides = {}) {
  return {
    x: 1000,
    y: 1000,
    heading: 0,
    leftSpeed: 0,
    rightSpeed: 0,
    isMoving: false,
    trail: [],
    ...overrides,
  };
}

module.exports = {
  loadSkulpt,
  loadModules,
  captureDebugPanel,
  makeRobot,
  JS_DIR,
};
