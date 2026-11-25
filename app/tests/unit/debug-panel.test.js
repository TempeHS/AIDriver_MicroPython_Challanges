/**
 * Debug Panel Unit Tests
 * Exercises the real js/debug-panel.js against the markup from simulator.html.
 */

const { loadModules } = require("../helpers/load-app");

const PANEL_MARKUP = `
  <button class="btn btn-sm btn-outline-light" id="btnClearDebug">
    <i class="bi bi-trash"></i> Clear
  </button>
  <pre id="debugConsole" class="debug-console mb-0">
[AIDriver] Simulator ready
[AIDriver] Select a challenge to begin</pre>
`;

const TIMESTAMPED = /^\[[^\]]+\] /;

let panel;
let consoleEl;

function lines() {
  return Array.from(consoleEl.querySelectorAll("span"));
}

beforeEach(() => {
  document.body.innerHTML = PANEL_MARKUP;
  consoleEl = document.getElementById("debugConsole");
  delete window.Logger;
  panel = loadModules(["debug-panel.js"]).DebugPanel;
  panel.init();
});

describe("DebugPanel log levels", () => {
  test.each([
    ["info", "info", "rgb(88, 166, 255)"],
    ["error", "error", "rgb(248, 81, 73)"],
    ["success", "success", "rgb(63, 185, 80)"],
    ["warning", "warning", "rgb(210, 153, 34)"],
  ])("%s() appends a timestamped %s line", (method, cls, color) => {
    panel[method]("Robot moved");

    const [line] = lines();
    expect(line.className).toBe(cls);
    expect(line.style.color).toBe(color);
    expect(line.textContent).toMatch(TIMESTAMPED);
    expect(line.textContent.endsWith("Robot moved\n")).toBe(true);
  });

  test("output() shows program print text verbatim without a timestamp", () => {
    panel.output("Distance: 512");

    const [line] = lines();
    expect(line.className).toBe("output");
    expect(line.textContent).toBe("Distance: 512\n");
  });

  test("lines are appended in order after the initial banner", () => {
    panel.info("first");
    panel.error("second");

    expect(lines().map((l) => l.textContent.trim().split("] ").pop())).toEqual([
      "first",
      "second",
    ]);
    expect(consoleEl.textContent).toContain("[AIDriver] Simulator ready");
  });

  test("separator() writes a horizontal rule line", () => {
    panel.separator();
    expect(lines()[0].textContent).toContain("─".repeat(50));
  });
});

describe("DebugPanel HTML safety", () => {
  test("learner print output containing markup is shown as text, not parsed", () => {
    const evil = '<script>alert("x")</script><img src=x onerror=alert(1)> & <b>bold</b>';
    panel.output(evil);
    panel.error(evil);

    expect(consoleEl.querySelector("script, img, b")).toBeNull();
    expect(lines()[0].textContent).toBe(`${evil}\n`);
    expect(consoleEl.innerHTML).toContain("&lt;script&gt;");
    expect(consoleEl.innerHTML).toContain("&amp; &lt;b&gt;");
  });
});

describe("DebugPanel buffer management", () => {
  test("clear() removes the banner and all logged lines", () => {
    panel.info("one");
    panel.output("two");
    panel.clear();

    expect(consoleEl.childNodes).toHaveLength(0);
    expect(consoleEl.textContent).toBe("");

    panel.info("after clear");
    expect(lines()).toHaveLength(1);
  });

  test("oldest lines are dropped once maxLines is exceeded", () => {
    panel.clear();
    panel.maxLines = 3;
    ["a", "b", "c", "d", "e"].forEach((m) => panel.output(m));

    expect(lines().map((l) => l.textContent)).toEqual(["c\n", "d\n", "e\n"]);
  });

  test("auto-scrolls to the newest line", () => {
    Object.defineProperty(consoleEl, "scrollHeight", {
      configurable: true,
      get: () => 640,
    });
    let scrollTop = 0;
    Object.defineProperty(consoleEl, "scrollTop", {
      configurable: true,
      get: () => scrollTop,
      set: (v) => {
        scrollTop = v;
      },
    });

    panel.output("new line");
    expect(scrollTop).toBe(640);
  });
});

describe("DebugPanel element lookup", () => {
  test("log() finds the console lazily when init() was never called", () => {
    panel = loadModules(["debug-panel.js"]).DebugPanel;
    expect(panel.element).toBeNull();

    panel.info("early message");
    expect(panel.element).toBe(consoleEl);
    expect(lines()).toHaveLength(1);
  });

  test("falls back to the browser console when the panel is missing", () => {
    document.body.innerHTML = "";
    panel = loadModules(["debug-panel.js"]).DebugPanel;

    expect(() => panel.error("no panel")).not.toThrow();
    expect(console.log).toHaveBeenCalledWith("[DebugPanel error]", "no panel");
  });
});

describe("DebugPanel Logger integration", () => {
  test("messages are mirrored to Logger with matching severity", () => {
    const { Logger } = loadModules(["logger.js"]);
    Logger.entries = [];

    panel.info("i");
    panel.warning("w");
    panel.error("e");
    panel.output("o");

    expect(
      Logger.getByCategory("DEBUG_PANEL").map((e) => [e.message, e.level]),
    ).toEqual([
      ["i", "info"],
      ["w", "warn"],
      ["e", "error"],
      ["o", "info"],
    ]);
  });
});
