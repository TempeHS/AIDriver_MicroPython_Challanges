/**
 * Jest Test Setup
 * Configure global mocks and test environment
 */

// Mock console methods with suppression for noisy jsdom warnings
const baseConsole = global.console;
const suppressedConsolePatterns = [
  /Not implemented: HTMLCanvasElement\.prototype\.getContext/,
  /Error: Not implemented: HTMLCanvasElement\.prototype\.getContext/,
  /HTMLCanvasElementImpl\.getContext/,
];

const shouldSuppressConsole = (args) =>
  args.some((arg) => {
    if (typeof arg === "string") {
      return suppressedConsolePatterns.some((pattern) => pattern.test(arg));
    }

    if (arg instanceof Error) {
      if (
        typeof arg.message === "string" &&
        suppressedConsolePatterns.some((pattern) => pattern.test(arg.message))
      ) {
        return true;
      }

      if (
        typeof arg.stack === "string" &&
        suppressedConsolePatterns.some((pattern) => pattern.test(arg.stack))
      ) {
        return true;
      }

      return false;
    }

    if (arg && typeof arg === "object") {
      const fieldsToCheck = [arg.message, arg.stack, arg.type];
      return fieldsToCheck.some(
        (field) =>
          typeof field === "string" &&
          suppressedConsolePatterns.some((pattern) => pattern.test(field))
      );
    }

    if (arg && typeof arg.toString === "function") {
      const value = arg.toString();
      if (typeof value === "string") {
        return suppressedConsolePatterns.some((pattern) => pattern.test(value));
      }
    }

    return false;
  });

const createConsoleMock = (level) =>
  jest.fn((...args) => {
    if (shouldSuppressConsole(args)) {
      return;
    }

    if (process.env.DEBUG_CONSOLE === "true") {
      baseConsole[level](...args);
    }
  });

global.console = {
  ...baseConsole,
  log: createConsoleMock("log"),
  warn: createConsoleMock("warn"),
  error: createConsoleMock("error"),
  info: createConsoleMock("info"),
};

// Mock canvas 2D context to avoid jsdom not implemented warnings
const noop = () => {};
const baseCanvasContext = {
  canvas: null,
  clearRect: noop,
  fillRect: noop,
  strokeRect: noop,
  beginPath: noop,
  closePath: noop,
  moveTo: noop,
  lineTo: noop,
  arc: noop,
  arcTo: noop,
  quadraticCurveTo: noop,
  bezierCurveTo: noop,
  ellipse: noop,
  rect: noop,
  fill: noop,
  stroke: noop,
  clip: noop,
  save: noop,
  restore: noop,
  scale: noop,
  rotate: noop,
  translate: noop,
  setTransform: noop,
  resetTransform: noop,
  createLinearGradient: () => ({ addColorStop: noop }),
  createPattern: () => null,
  drawImage: noop,
  putImageData: noop,
  getImageData: () => ({ data: [], width: 0, height: 0 }),
  fillText: noop,
  strokeText: noop,
  measureText: () => ({ width: 0 }),
  setLineDash: noop,
  getLineDash: () => [],
  lineWidth: 1,
  lineCap: "butt",
  lineJoin: "miter",
  font: "10px sans-serif",
  textAlign: "start",
  textBaseline: "alphabetic",
  globalAlpha: 1,
  globalCompositeOperation: "source-over",
};

if (typeof HTMLCanvasElement !== "undefined") {
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
    configurable: true,
    writable: true,
    value: jest.fn(function getContext(type) {
      if (type === "2d") {
        return { ...baseCanvasContext, canvas: this };
      }
      return null;
    }),
  });
}

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) =>
  setTimeout(() => cb(performance.now()), 16),
);
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Mock performance.now
global.performance = {
  now: jest.fn(() => Date.now()),
};

// Mock Bootstrap
global.bootstrap = {
  Tooltip: jest.fn().mockImplementation(() => ({})),
  Modal: jest.fn().mockImplementation(() => ({
    show: jest.fn(),
    hide: jest.fn(),
  })),
  Dropdown: jest.fn().mockImplementation(() => ({})),
};

// Mock ACE Editor
const createMockSession = () => ({
  setMode: jest.fn(),
  setUseWrapMode: jest.fn(),
  on: jest.fn(),
  setAnnotations: jest.fn(),
  clearAnnotations: jest.fn(),
  getAnnotations: jest.fn().mockReturnValue([]),
});

global.ace = {
  edit: jest.fn().mockReturnValue({
    setTheme: jest.fn(),
    getSession: jest.fn().mockImplementation(createMockSession),
    setOptions: jest.fn(),
    setValue: jest.fn(),
    getValue: jest.fn().mockReturnValue(""),
    resize: jest.fn(),
    on: jest.fn(),
    gotoLine: jest.fn(),
  }),
  require: jest.fn().mockReturnValue({
    setCompleters: jest.fn(),
  }),
};

// Placeholders for the browser globals that modules call into. Tests that
// need the real modules load them with tests/helpers/load-app.js, which
// replaces these. DebugPanel mirrors the real API (js/debug-panel.js).
global.DebugPanel = {
  init: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  output: jest.fn(),
  clear: jest.fn(),
  separator: jest.fn(),
};

global.App = {
  robot: {
    x: 1000,
    y: 1000,
    heading: 0,
    leftSpeed: 0,
    rightSpeed: 0,
    isMoving: false,
    trail: [],
  },
  isRunning: false,
  speedMultiplier: 1,
};

// Helper to create mock DOM elements
global.createMockElement = (id, tagName = "div") => {
  const el = document.createElement(tagName);
  el.id = id;
  document.body.appendChild(el);
  return el;
};

// Helper to clean up DOM after tests
const cleanupDOM = () => {
  document.body.innerHTML = "";
};

global.cleanupDOM = cleanupDOM;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  cleanupDOM();
});
