/**
 * LogViewer tests against the real js/log-viewer.js (log-viewer.html and the
 * simulator's fallback modal).
 */

const { loadModules } = require("../helpers/load-app");

const ORIGIN = window.location.origin;

const PAYLOAD = {
  type: "aidriver-logs",
  robot: { board: "Raspberry Pi Pico", release: "1.30.0-preview" },
  readAt: new Date(2026, 10, 26, 9, 5).getTime(),
  wasRunning: false,
  files: {
    current:
      "===== RUN START =====\n" +
      "t+0.00s : robot start\n" +
      "t+0.41s : Drive forward requested with R=50, L=50 – speeds are in the stopped range so the robot may not move\n" +
      "t+1.00s : <script>alert(1)</script>\n",
    previous: null,
  },
};

let container;

function pane(key) {
  return container.querySelector(`[data-pane="${key}"]`);
}

beforeEach(() => {
  loadModules(["log-viewer.js"]);
  document.body.innerHTML = '<main id="logViewerRoot"></main>';
  container = document.getElementById("logViewerRoot");
});

describe("LogViewer.render", () => {
  test("shows both logs with numbered, highlighted lines", () => {
    LogViewer.render(container, PAYLOAD);

    const lines = [...pane("current").querySelectorAll("li")];
    expect(lines.map((li) => li.textContent)).toEqual(
      PAYLOAD.files.current.trimEnd().split("\n"),
    );
    expect(lines[0].className).toBe("log-separator");
    expect(lines[2].className).toBe("log-warning");
    expect(lines[1].className).toBe("");
    expect(pane("current").querySelector("h2").textContent).toBe(
      "This runevent_log.txt",
    );
    expect(pane("previous").textContent).toContain("No log yet.");
    expect(container.querySelector(".log-meta").textContent).toMatch(
      /^Raspberry Pi Pico · MicroPython 1\.30\.0-preview · read /,
    );
  });

  test("log text is never turned into HTML", () => {
    LogViewer.render(container, PAYLOAD);
    expect(container.querySelector("script")).toBeNull();
    expect(pane("current").textContent).toContain("<script>alert(1)</script>");
  });

  test("empty and interrupted logs are explained", () => {
    LogViewer.render(container, {
      ...PAYLOAD,
      wasRunning: true,
      files: { current: "t+0.00s : robot start\n", previous: "" },
    });
    expect(pane("current").textContent).toContain(
      "— program stopped by the simulator to read this log —",
    );
    expect(pane("previous").textContent).toContain("The log is empty.");
    expect(
      pane("previous").querySelector('[data-action="download"]').disabled,
    ).toBe(false);
  });

  test("Download saves the log as a dated .txt file", () => {
    URL.createObjectURL = jest.fn(() => "blob:log");
    URL.revokeObjectURL = jest.fn();
    let saved;
    jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function () {
        saved = { href: this.href, download: this.download };
      });
    LogViewer.render(container, PAYLOAD);

    pane("current").querySelector('[data-action="download"]').click();

    expect(saved).toEqual({
      href: "blob:log",
      download: "event_log_2026-11-26_0905.txt",
    });
    expect(pane("previous").querySelector('[data-action="download"]').disabled).toBe(true);
  });

  test("loading and error states", () => {
    const onRefresh = jest.fn();
    LogViewer.render(container, null, { onRefresh });
    expect(container.textContent).toContain("Reading logs from robot…");

    LogViewer.render(
      container,
      { type: "aidriver-logs-error", message: "The robot isn't connected." },
      { onRefresh },
    );
    expect(container.querySelector(".log-error").textContent).toBe(
      "The robot isn't connected.",
    );

    container.querySelector('[data-action="refresh"]').click();
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Reading logs from robot…");
  });
});

describe("LogViewer.initPage (log-viewer.html)", () => {
  function fakeWindow(opener) {
    const listeners = [];
    return {
      document,
      opener,
      location: { origin: ORIGIN },
      addEventListener: (type, fn) => listeners.push(fn),
      dispatch: (event) => listeners.forEach((fn) => fn(event)),
    };
  }

  test("without an opener it explains how to open it", () => {
    LogViewer.initPage(fakeWindow(null));
    expect(container.textContent).toContain(
      "Open this from the simulator's Logs button.",
    );
  });

  test("announces itself to the simulator and shows the logs it sends", () => {
    const opener = { postMessage: jest.fn() };
    const win = fakeWindow(opener);

    LogViewer.initPage(win);
    expect(opener.postMessage).toHaveBeenCalledWith(
      { type: "aidriver-logs-ready" },
      ORIGIN,
    );
    expect(container.textContent).toContain("Reading logs from robot…");

    // Ignored: wrong origin, wrong sender, unknown type
    win.dispatch({ origin: "https://evil.example", source: opener, data: PAYLOAD });
    win.dispatch({ origin: ORIGIN, source: {}, data: PAYLOAD });
    win.dispatch({ origin: ORIGIN, source: opener, data: { type: "other" } });
    expect(container.querySelector("li")).toBeNull();

    win.dispatch({ origin: ORIGIN, source: opener, data: PAYLOAD });
    expect(pane("current").querySelectorAll("li")).toHaveLength(4);

    container.querySelector('[data-action="refresh"]').click();
    expect(opener.postMessage).toHaveBeenLastCalledWith(
      { type: "aidriver-logs-refresh" },
      ORIGIN,
    );
  });
});
