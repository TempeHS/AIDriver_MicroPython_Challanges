/**
 * Jest Test Setup
 * Configure global mocks and test environment
 */

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 16));
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
global.ace = {
  edit: jest.fn().mockReturnValue({
    setTheme: jest.fn(),
    getSession: jest.fn().mockReturnValue({
      setMode: jest.fn(),
      setUseWrapMode: jest.fn(),
      on: jest.fn(),
      setAnnotations: jest.fn(),
      clearAnnotations: jest.fn(),
      getAnnotations: jest.fn().mockReturnValue([]),
    }),
    setOptions: jest.fn(),
    setValue: jest.fn(),
    getValue: jest.fn().mockReturnValue(""),
    resize: jest.fn(),
    on: jest.fn(),
    gotoLine: jest.fn(),
    getSession: jest.fn().mockReturnValue({
      setMode: jest.fn(),
      on: jest.fn(),
      setAnnotations: jest.fn(),
      clearAnnotations: jest.fn(),
    }),
  }),
  require: jest.fn().mockReturnValue({
    setCompleters: jest.fn(),
  }),
};

// Mock Skulpt
global.Sk = {
  configure: jest.fn(),
  misceval: {
    asyncToPromise: jest.fn().mockResolvedValue({}),
    buildClass: jest.fn((mod, builder, name) => {
      const $gbl = {};
      const $loc = {};
      builder($gbl, $loc);
      return { $loc };
    }),
    callsimArray: jest.fn(),
  },
  builtin: {
    func: jest.fn((fn) => fn),
    str: jest.fn((s) => ({ v: s })),
    int_: jest.fn((n) => ({ v: n })),
    float_: jest.fn((n) => ({ v: n })),
    bool: jest.fn((b) => ({ v: b })),
    none: { none$: null },
    tuple: jest.fn((arr) => ({ v: arr })),
    KeyboardInterrupt: class KeyboardInterrupt extends Error {},
  },
  ffi: {
    remapToJs: jest.fn((v) => (v && v.v !== undefined ? v.v : v)),
    remapToPy: jest.fn((v) => ({ v })),
  },
  importMainWithBody: jest.fn(),
  builtinFiles: { files: {} },
  builtins: {},
  externalLibs: {},
  compile: jest.fn(),
  python3: true,
};

// Mock DebugPanel globally
global.DebugPanel = {
  init: jest.fn(),
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  success: jest.fn(),
  clear: jest.fn(),
};

// Mock Simulator globally
global.Simulator = {
  init: jest.fn(),
  reset: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  update: jest.fn(),
  render: jest.fn(),
  isRunning: false,
  ARENA_WIDTH: 2000,
  ARENA_HEIGHT: 2000,
  calculateUltrasonic: jest.fn().mockReturnValue(500),
  getWalls: jest.fn().mockReturnValue([]),
  checkCollision: jest.fn().mockReturnValue(false),
  getMazeWalls: jest.fn().mockReturnValue([]),
};

// Mock Editor globally
global.Editor = {
  init: jest.fn(),
  getCode: jest.fn().mockReturnValue(""),
  setCode: jest.fn(),
  markError: jest.fn(),
  clearErrors: jest.fn(),
  resize: jest.fn(),
  gotoLine: jest.fn(),
};

// Mock Validator globally
global.Validator = {
  validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  validateImports: jest.fn().mockReturnValue({ valid: true, errors: [] }),
  validateSyntax: jest.fn().mockReturnValue({ valid: true, errors: [] }),
};

// Mock PythonRunner globally
global.PythonRunner = {
  init: jest.fn(),
  run: jest.fn().mockResolvedValue({ success: true }),
  stop: jest.fn(),
  isRunning: jest.fn().mockReturnValue(false),
};

// Mock Challenges globally
global.Challenges = {
  list: [
    {
      id: 0,
      name: "Challenge 0",
      description: "Test",
      successCriteria: () => true,
    },
    {
      id: 1,
      name: "Challenge 1",
      description: "Test",
      successCriteria: () => true,
    },
    {
      id: 2,
      name: "Challenge 2",
      description: "Test",
      successCriteria: () => true,
    },
    {
      id: 3,
      name: "Challenge 3",
      description: "Test",
      successCriteria: () => true,
    },
    {
      id: 4,
      name: "Challenge 4",
      description: "Test",
      successCriteria: () => true,
    },
    {
      id: 5,
      name: "Challenge 5",
      description: "Test",
      successCriteria: () => true,
    },
    {
      id: 6,
      name: "Challenge 6",
      description: "Test",
      successCriteria: () => true,
    },
    {
      id: 7,
      name: "Challenge 7",
      description: "Test (Gamepad)",
      successCriteria: () => true,
    },
  ],
  get: jest.fn((id) => global.Challenges.list[id]),
  getCurrent: jest.fn(() => global.Challenges.list[0]),
};

// Mock Mazes globally
global.Mazes = {
  get: jest
    .fn()
    .mockReturnValue({ walls: [], startPosition: { x: 1000, y: 1000 } }),
  getWalls: jest.fn().mockReturnValue([]),
};

// Mock Gamepad globally
global.Gamepad = {
  init: jest.fn(),
  update: jest.fn(),
  isEnabled: jest.fn().mockReturnValue(false),
  getState: jest.fn().mockReturnValue({ left: 0, right: 0 }),
};

// Mock App globally
global.App = {
  init: jest.fn(),
  currentChallenge: 0,
  robot: {
    x: 1000,
    y: 1000,
    angle: 0,
    leftSpeed: 0,
    rightSpeed: 0,
    isMoving: false,
  },
  isRunning: false,
  commandQueue: [],
};

// Helper to create mock DOM elements
global.createMockElement = (id, tagName = "div") => {
  const el = document.createElement(tagName);
  el.id = id;
  document.body.appendChild(el);
  return el;
};

// Helper to clean up DOM after tests
global.cleanupDOM = () => {
  document.body.innerHTML = "";
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});

afterEach(() => {
  cleanupDOM();
});
