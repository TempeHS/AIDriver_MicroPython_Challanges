/**
 * Editor Unit Tests
 * Exercises the real js/editor.js. ACE is a CDN global in the browser, so a
 * small in-memory fake of the ACE API that Editor uses replaces it here; the
 * assertions are about Editor's own logic, not ACE.
 */

const { loadModules } = require("../helpers/load-app");

class FakeRange {
  constructor(startRow, startCol, endRow, endCol) {
    this.start = { row: startRow, column: startCol };
    this.end = { row: endRow, column: endCol };
  }
}

function createFakeAceEditor(containerId) {
  const listeners = {};
  let value = "";
  let nextMarkerId = 1;

  const session = {
    annotations: [],
    markers: new Map(),
    setMode: jest.fn(),
    getAnnotations() {
      return this.annotations;
    },
    setAnnotations(annotations) {
      this.annotations = annotations;
    },
    addMarker(range, clazz, type, inFront) {
      const id = nextMarkerId++;
      this.markers.set(id, { range, clazz, type, inFront });
      return id;
    },
    removeMarker(id) {
      this.markers.delete(id);
    },
    getLength: () => value.split("\n").length,
    getLine: (row) => value.split("\n")[row] ?? "",
  };

  return {
    containerId,
    session,
    commands: {
      byName: {},
      addCommand(cmd) {
        this.byName[cmd.name] = cmd;
      },
    },
    setTheme: jest.fn(),
    setOptions: jest.fn(),
    scrollToLine: jest.fn(),
    on(event, fn) {
      (listeners[event] = listeners[event] || []).push(fn);
    },
    getValue: () => value,
    // Like ACE, programmatic setValue also fires "change"
    setValue(text, cursorPos) {
      value = text;
      this.lastCursorPos = cursorPos;
      (listeners.change || []).forEach((fn) => fn({}));
    },
  };
}

function markerRows(session, clazz) {
  return [...session.markers.values()]
    .filter((m) => m.clazz === clazz)
    .map((m) => m.range.start.row);
}

const CLEAN_CODE = [
  "from aidriver import AIDriver, hold_state",
  "robot = AIDriver()",
  "robot.drive_forward(200, 200)",
  "hold_state(1)",
  "robot.brake()",
].join("\n");

const BROKEN_CODE = [
  "from aidriver import AIDriver, hold_state",
  "robot = AIDriver()",
  "while True",
  "    robot.drive_forward(200, 200)",
  "    explode()",
].join("\n");

let Editor;
let aceEditor;
let session;

beforeEach(() => {
  // Editor debounces validation/saving with timers; keep them deterministic
  jest.useFakeTimers();
  document.body.innerHTML = `
    <div id="editor"></div>
    <span id="challengeStatus" class="badge bg-secondary">Ready</span>
    <button id="btnRun"></button>
  `;

  window.ace = {
    edit: jest.fn((id) => {
      aceEditor = createFakeAceEditor(id);
      return aceEditor;
    }),
    require: jest.fn((mod) => (mod === "ace/range" ? { Range: FakeRange } : {})),
  };

  // jsdom provides a real localStorage
  localStorage.clear();

  window.App = {
    currentChallenge: 3,
    isRunning: false,
    hasRun: false,
    elements: {
      challengeStatus: document.getElementById("challengeStatus"),
      btnRun: document.getElementById("btnRun"),
    },
  };
  window.runCode = jest.fn();
  window.stopExecution = jest.fn();

  ({ Editor } = loadModules(["validator.js", "editor.js"]));
  Editor.init();
  session = aceEditor.session;
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  delete window.runCode;
  delete window.stopExecution;
});

describe("init", () => {
  test("creates a Python editor on the #editor element", () => {
    expect(ace.edit).toHaveBeenCalledWith("editor");
    expect(session.setMode).toHaveBeenCalledWith("ace/mode/python");
    expect(Editor.instance).toBe(aceEditor);
  });

  test("Ctrl+Enter runs code only when nothing is running", () => {
    const run = aceEditor.commands.byName.runCode;
    expect(run.bindKey).toEqual({ win: "Ctrl-Enter", mac: "Cmd-Enter" });

    run.exec();
    expect(window.runCode).toHaveBeenCalledTimes(1);

    App.isRunning = true;
    run.exec();
    expect(window.runCode).toHaveBeenCalledTimes(1);
  });

  test("Ctrl+. stops code only while running", () => {
    const stop = aceEditor.commands.byName.stopCode;
    expect(stop.bindKey).toEqual({ win: "Ctrl-.", mac: "Cmd-." });

    stop.exec();
    expect(window.stopExecution).not.toHaveBeenCalled();

    App.isRunning = true;
    stop.exec();
    expect(window.stopExecution).toHaveBeenCalledTimes(1);
  });
});

describe("getCode / setCode / clear", () => {
  test("setCode replaces the buffer and moves the cursor to the top by default", () => {
    Editor.setCode(CLEAN_CODE);
    expect(Editor.getCode()).toBe(CLEAN_CODE);
    expect(aceEditor.lastCursorPos).toBe(-1);

    Editor.setCode("x = 1", 1);
    expect(aceEditor.lastCursorPos).toBe(1);
    expect(Editor.getLineCount()).toBe(1);
    expect(Editor.getLine(1)).toBe("x = 1");
  });

  test("setCode and clear remove error markers, annotations and the step highlight", () => {
    Editor.markError(2, "bad");
    Editor.markWarning(3, "hmm");
    Editor.highlightLine(4);

    Editor.setCode(CLEAN_CODE);
    expect(session.annotations).toEqual([]);
    expect(session.markers.size).toBe(0);
    expect(Editor.markers).toEqual([]);

    Editor.markError(1, "bad again");
    Editor.clear();
    expect(Editor.getCode()).toBe("");
    expect(session.annotations).toEqual([]);
    expect(session.markers.size).toBe(0);
  });
});

describe("error and warning markers", () => {
  test("markError adds a gutter annotation and a full-line marker on the 1-based line", () => {
    Editor.markError(3, "Missing colon");
    Editor.markError(5, "Undefined name");

    expect(session.annotations).toEqual([
      { row: 2, column: 0, text: "Missing colon", type: "error" },
      { row: 4, column: 0, text: "Undefined name", type: "error" },
    ]);
    expect(markerRows(session, "ace_error-line")).toEqual([2, 4]);
    expect([...session.markers.values()][0].type).toBe("fullLine");
  });

  test("markWarning annotates the gutter without highlighting the line", () => {
    Editor.markWarning(2, "Did you mean 'True'?");

    expect(session.annotations).toEqual([
      { row: 1, column: 0, text: "Did you mean 'True'?", type: "warning" },
    ]);
    expect(session.markers.size).toBe(0);
  });

  test("clearAllMarkers removes every marker that was added", () => {
    Editor.markError(1, "a");
    Editor.markError(2, "b");
    Editor.clearAllMarkers();

    expect(session.markers.size).toBe(0);
    expect(session.annotations).toEqual([]);
  });
});

describe("step-mode line highlight", () => {
  test("highlightLine keeps exactly one executing-line marker and scrolls to it", () => {
    Editor.setCode(CLEAN_CODE);
    Editor.highlightLine(2);
    Editor.highlightLine(4);

    expect(markerRows(session, "ace_executing-line")).toEqual([3]);
    expect(aceEditor.scrollToLine).toHaveBeenLastCalledWith(3, true, true);
  });

  test("clearHighlight removes the executing line but keeps error markers", () => {
    Editor.markError(1, "err");
    Editor.highlightLine(2);
    Editor.clearHighlight();

    expect(markerRows(session, "ace_executing-line")).toEqual([]);
    expect(markerRows(session, "ace_error-line")).toEqual([0]);
    expect(Editor.executingLine).toBeNull();
  });
});

describe("validateCode", () => {
  test("marks validator errors and blocks the Run button", () => {
    Editor.setCode(BROKEN_CODE);
    const result = Editor.validateCode();

    const status = App.elements.challengeStatus;
    expect(result.errors.map((e) => e.line).sort()).toEqual([3, 5]);
    expect(markerRows(session, "ace_error-line").sort()).toEqual([2, 4]);
    expect(status.textContent).toBe("2 error(s)");
    expect(status.className).toBe("badge bg-danger");
    expect(App.elements.btnRun.disabled).toBe(true);
    expect(App.elements.btnRun.title).toBe("Fix errors before running");
  });

  test("warnings (e.g. unknown robot method) are shown but do not block Run", () => {
    Editor.setCode(CLEAN_CODE + "\nrobot.fly()");
    App.elements.btnRun.disabled = true;
    Editor.validateCode();

    expect(session.annotations).toContainEqual(
      expect.objectContaining({ row: 5, type: "warning" }),
    );
    expect(App.elements.challengeStatus.textContent).toBe("1 warning(s)");
    expect(App.elements.btnRun.disabled).toBe(false);
  });

  test("clean code clears old markers and shows Ready", () => {
    Editor.markError(1, "stale");
    Editor.setCode(CLEAN_CODE);
    App.elements.btnRun.disabled = true;
    Editor.validateCode();

    expect(session.annotations).toEqual([]);
    expect(session.markers.size).toBe(0);
    expect(App.elements.challengeStatus.textContent).toBe("Ready");
    expect(App.elements.challengeStatus.className).toBe("badge bg-success");
    expect(App.elements.btnRun.disabled).toBe(false);
  });

  test("does not re-enable Run after a run until the robot is reset", () => {
    Editor.setCode(CLEAN_CODE);
    App.hasRun = true;
    App.elements.btnRun.disabled = true;
    Editor.validateCode();

    expect(App.elements.challengeStatus.textContent).toBe("Ready");
    expect(App.elements.btnRun.disabled).toBe(true);
  });
});

describe("auto-validate and auto-save on edit", () => {
  test("edits are validated after 500ms and saved per challenge after 1s (debounced)", () => {
    aceEditor.setValue("from aidriver import AIDriver\nwhile True", 1);
    aceEditor.setValue(BROKEN_CODE, 1);

    jest.advanceTimersByTime(499);
    expect(session.markers.size).toBe(0);
    jest.advanceTimersByTime(1);
    expect(markerRows(session, "ace_error-line").sort()).toEqual([2, 4]);

    const setItem = jest.spyOn(Storage.prototype, "setItem");
    jest.advanceTimersByTime(499);
    expect(setItem).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("aidriver_challenge_3_code")).toBe(BROKEN_CODE);
    setItem.mockRestore();
  });
});

describe("saved code storage", () => {
  test("save, load, detect and clear code per challenge", () => {
    Editor.setCode("print('three')");
    Editor.saveCode();
    App.currentChallenge = "debug";
    Editor.setCode("print('debug')");
    Editor.saveCode();

    expect(Editor.hasSavedCode(3)).toBe(true);
    expect(Editor.loadSavedCode(3)).toBe("print('three')");
    expect(Editor.loadSavedCode("debug")).toBe("print('debug')");
    expect(Editor.hasSavedCode(5)).toBe(false);
    expect(Editor.loadSavedCode(5)).toBeNull();

    Editor.clearSavedCode(3);
    expect(Editor.hasSavedCode(3)).toBe(false);
    expect(Editor.hasSavedCode("debug")).toBe(true);
  });
});
