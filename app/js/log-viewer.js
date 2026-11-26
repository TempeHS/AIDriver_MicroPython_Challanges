/**
 * AIDriver Simulator - Log Viewer Module
 * Renders the robot's event_log.txt / event_log_prev.txt. Used by
 * log-viewer.html (opened in a new tab by the Robot toolbar's Logs button)
 * and by the simulator's fallback modal when pop-ups are blocked.
 * Log text is only ever inserted with textContent.
 * See docs/developer/web-serial.md.
 */

const LogViewer = (function () {
  "use strict";

  const PANES = [
    {
      key: "current",
      title: "This run",
      file: "event_log.txt",
      filePrefix: "event_log",
    },
    {
      key: "previous",
      title: "Previous run",
      file: "event_log_prev.txt",
      filePrefix: "event_log_prev",
    },
  ];

  const WARNING_PATTERN =
    /stopped range|may not move|may not turn|arc toward|ultrasonic|stuck/i;
  const SEPARATOR_PATTERN = /^=====.*=====$/;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function dateStamp(time) {
    const d = new Date(time);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
      d.getHours(),
    )}${pad(d.getMinutes())}`;
  }

  /**
   * Offer text as a .txt download.
   * @param {string} text
   * @param {string} filename
   */
  function download(text, filename) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = el("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Numbered, lightly highlighted lines of one log file.
   * @param {string} text
   * @returns {HTMLElement}
   */
  function renderLines(text) {
    const list = el("ol", "log-lines");
    const lines = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n");
    for (const line of lines) {
      let className = "";
      if (SEPARATOR_PATTERN.test(line.trim())) className = "log-separator";
      else if (WARNING_PATTERN.test(line)) className = "log-warning";
      list.appendChild(el("li", className, line));
    }
    return list;
  }

  function renderPane(pane, payload) {
    const text = payload.files ? payload.files[pane.key] : null;
    const section = el("section", "log-pane");
    section.dataset.pane = pane.key;

    const header = el("div", "log-pane-header");
    const heading = el("h2", "h6 mb-0", pane.title);
    heading.appendChild(el("small", "text-muted ms-2", pane.file));
    header.appendChild(heading);

    const actions = el("div", "btn-group btn-group-sm");
    const copy = el("button", "btn btn-outline-light", "Copy");
    copy.type = "button";
    copy.dataset.action = "copy";
    const save = el("button", "btn btn-outline-light", "Download");
    save.type = "button";
    save.dataset.action = "download";
    if (text === null || text === undefined) {
      copy.disabled = true;
      save.disabled = true;
    }
    copy.addEventListener("click", () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(
          () => (copy.textContent = "Copied"),
          () => (copy.textContent = "Copy failed"),
        );
      }
    });
    save.addEventListener("click", () =>
      download(text, `${pane.filePrefix}_${dateStamp(payload.readAt)}.txt`),
    );
    actions.append(copy, save);
    header.appendChild(actions);
    section.appendChild(header);

    const body = el("div", "log-pane-body");
    if (text === null || text === undefined) {
      body.appendChild(el("p", "log-empty", "No log yet."));
    } else if (text.trim() === "") {
      body.appendChild(el("p", "log-empty", "The log is empty."));
    } else {
      body.appendChild(renderLines(text));
    }
    if (pane.key === "current" && payload.wasRunning) {
      body.appendChild(
        el(
          "p",
          "log-note",
          "— program stopped by the simulator to read this log —",
        ),
      );
    }
    section.appendChild(body);
    return section;
  }

  /**
   * Render logs (or a status/error message) into a container.
   * @param {HTMLElement} container
   * @param {{type?: string, message?: string, robot?: object, readAt?: number, wasRunning?: boolean, files?: {current: string|null, previous: string|null}}|null} payload
   *   Logs payload, an error payload ({type: "aidriver-logs-error", message}),
   *   or null while loading.
   * @param {{onRefresh?: () => void}} [options]
   */
  function render(container, payload, { onRefresh } = {}) {
    container.textContent = "";
    const root = el("div", "log-viewer");

    const header = el("div", "log-viewer-header");
    header.appendChild(el("h1", "h5 mb-1", "Robot event logs"));
    const meta = el("p", "log-meta mb-1");
    if (payload && payload.robot) {
      const parts = [payload.robot.board, `MicroPython ${payload.robot.release}`];
      if (payload.readAt) {
        parts.push(`read ${new Date(payload.readAt).toLocaleTimeString()}`);
      }
      meta.textContent = parts.filter(Boolean).join(" · ");
    }
    header.appendChild(meta);
    header.appendChild(
      el(
        "p",
        "log-help mb-2",
        "Times (t+…s) are seconds since the robot started. Every restart starts a new log: " +
          '"This run" is the latest run and "Previous run" is the one before. ' +
          "After Upload & Run, This run is your new program.",
      ),
    );
    if (onRefresh) {
      const refresh = el("button", "btn btn-sm btn-primary", "Refresh");
      refresh.type = "button";
      refresh.dataset.action = "refresh";
      refresh.addEventListener("click", () => {
        render(container, null, { onRefresh });
        onRefresh();
      });
      header.appendChild(refresh);
    }
    root.appendChild(header);

    if (!payload) {
      root.appendChild(el("p", "log-status", "Reading logs from robot…"));
    } else if (payload.type === "aidriver-logs-error") {
      root.appendChild(el("p", "log-status log-error", payload.message));
    } else {
      const panes = el("div", "log-panes");
      for (const pane of PANES) panes.appendChild(renderPane(pane, payload));
      root.appendChild(panes);
    }
    container.appendChild(root);
  }

  /**
   * Set up log-viewer.html: tell the simulator tab we're ready and render
   * whatever it sends back.
   * @param {Window} [win=window]
   */
  function initPage(win = window) {
    const container = win.document.getElementById("logViewerRoot");
    const opener = win.opener;
    if (!opener) {
      render(container, {
        type: "aidriver-logs-error",
        message: "Open this from the simulator's Logs button.",
      });
      return;
    }
    const origin = win.location.origin;
    const onRefresh = () =>
      opener.postMessage({ type: "aidriver-logs-refresh" }, origin);

    win.addEventListener("message", (event) => {
      if (event.origin !== origin || event.source !== opener) return;
      const data = event.data || {};
      if (data.type === "aidriver-logs" || data.type === "aidriver-logs-error") {
        render(container, data, { onRefresh });
      }
    });
    render(container, null, { onRefresh });
    opener.postMessage({ type: "aidriver-logs-ready" }, origin);
  }

  return { PANES, render, initPage };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = LogViewer;
}
