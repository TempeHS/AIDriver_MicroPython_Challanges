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
