/**
 * AIDriver Simulator - Robot Connection Module
 * Robot toolbar controller: connect to the robot over Web Serial, upload the
 * editor code to /main.py, view the robot's event logs, stop the robot, and
 * show the robot's output in the debug panel.
 * See Web_Serial_Upload_Design.md §6-§10.
 */

const RobotConnection = {
  /** unsupported | idle | connecting | ready | running | busy | reconnecting */
  state: "idle",
  link: null,
  board: null,
  info: null,
  elements: {},
  busyToken: 0,

  // Robot output buffering for the debug panel
  outputRest: "",
  outputQueue: [],
  outputTimer: null,
  outputFlushMs: 100,
  maxOutputLinesPerFlush: 50,

  // Log viewer target: {window, ready} for a tab, {modal: true} for the modal
  logTarget: null,
  lastLogs: null,

  MAIN_PATH: "/main.py",
  LOG_PATHS: { current: "/event_log.txt", previous: "/event_log_prev.txt" },
  RECOVERY_MESSAGE:
    "The robot's program won't stop (it may be ignoring Ctrl-C). Unplug the robot, connect GP4 to GND, " +
    "plug it back in to restore the default main.py, remove the wire, then upload again. " +
    "See 'Recovery Mode' in Build_Custom_MicroPython_Firmware.md.",
  FIRMWARE_MESSAGE:
    "Connected, but the board didn't answer like MicroPython. Check the AIDriver firmware is installed " +
    "(Downloads → AIDriver Custom Firmware). If it is, the robot's program may be ignoring Stop: use GP4 " +
    "recovery mode (see 'Recovery Mode' in Build_Custom_MicroPython_Firmware.md).",
  OUTPUT_IGNORE: [
    /^MPY: soft reboot/,
    /^MicroPython v\S+ on /,
    /^Type "help\(\)" for more information\./,
    /^>>>\s*$/,
    /^raw REPL/,
  ],

  /**
   * Find the toolbar elements and wire up events.
   * @returns {void}
   */
  init() {
    const byId = (id) => document.getElementById(id);
    this.elements = {
      toolbar: byId("robotToolbar"),
      unsupported: byId("robotUnsupported"),
      connect: byId("btnRobotConnect"),
      upload: byId("btnRobotUpload"),
      uploadRun: byId("btnRobotUploadRun"),
      logs: byId("btnRobotLogs"),
      stop: byId("btnRobotStop"),
      status: byId("robotStatus"),
      logsModal: byId("robotLogsModal"),
      logsModalBody: byId("robotLogsModalBody"),
    };
    if (!this.elements.toolbar) return;

    if (!SerialLink.isSupported()) {
      this.state = "unsupported";
      this.elements.toolbar.classList.add("d-none");
      if (this.elements.unsupported) {
        this.elements.unsupported.classList.remove("d-none");
      }
      return;
    }

    const { connect, upload, uploadRun, logs, stop } = this.elements;
    connect.addEventListener("click", () => this.toggleConnection());
    upload.addEventListener("click", () => this.upload({ run: false }));
    uploadRun.addEventListener("click", () => this.upload({ run: true }));
    logs.addEventListener("click", () => this.openLogs());
    stop.addEventListener("click", () => this.stopRobot());

    window.addEventListener("message", (event) => this.handleMessage(event));
    window.addEventListener("pagehide", () => {
      if (this.link) this.link.close();
    });

    this.initTooltips();
    this.setState("idle");
  },

  /**
   * Bootstrap hover tooltips for the status pill and buttons. The text comes
   * from data-bs-title so it can follow the connection state, including on
   * greyed-out buttons (which explain why they are unavailable).
   * @returns {void}
   */
  initTooltips() {
    const { status, connect, upload, uploadRun, logs, stop } = this.elements;
    const Tooltip = typeof bootstrap !== "undefined" && bootstrap.Tooltip;
    for (const el of [status, connect, upload, uploadRun, logs, stop]) {
      if (!el) continue;
      if (el.title && !el.dataset.bsTitle) el.dataset.bsTitle = el.title;
      el.removeAttribute("title");
      if (!Tooltip) continue;
      Tooltip.getOrCreateInstance(el, {
        title: () => el.dataset.bsTitle || "",
      });
      // Don't leave a tooltip showing after a click (e.g. behind the port picker)
      el.addEventListener("click", () => Tooltip.getInstance(el)?.hide());
    }
  },

  /**
   * Set a tooltip's text, refreshing it if it's currently showing.
   * @param {HTMLElement} el
   * @param {string} text
   */
  setTip(el, text) {
    if (!el || el.dataset.bsTitle === text) return;
    el.dataset.bsTitle = text;
    const Tooltip = typeof bootstrap !== "undefined" && bootstrap.Tooltip;
    const tip = Tooltip && Tooltip.getInstance(el);
    if (tip) tip.setContent({ ".tooltip-inner": text });
  },

  // ---------------------------------------------------------------- state

  /**
   * Change connection state and refresh the toolbar.
   * @param {string} state
   * @param {string} [statusText] Overrides the default status pill text.
   */
  setState(state, statusText) {
    this.state = state;
    this.setStatus(statusText || this.defaultStatus());
    this.updateButtons();
  },

  defaultStatus() {
    switch (this.state) {
      case "connecting":
        return "Connecting…";
      case "reconnecting":
        return "Reconnecting…";
      case "ready":
        return this.info ? `${this.shortBoardName()} connected` : "Connected";
      case "running":
        return "Program running";
      case "busy":
        return "Working…";
      default:
        return "Not connected";
    }
  },

  setStatus(text) {
    const status = this.elements.status;
    if (!status) return;
    status.textContent = text;
    const classes = {
      ready: "bg-success",
      running: "bg-primary",
      busy: "bg-info",
      connecting: "bg-info",
      reconnecting: "bg-warning",
    };
    status.className = `badge robot-status ${classes[this.state] || "bg-secondary"}`;
    this.setTip(status, this.statusTip());
  },

  statusTip() {
    if (this.info && (this.state === "ready" || this.state === "running")) {
      return this.connectionSummary();
    }
    switch (this.state) {
      case "connecting":
        return "Connecting to the robot…";
      case "reconnecting":
        return "The robot is restarting. Waiting for it to come back…";
      case "busy":
        return "Talking to the robot. Please wait.";
      default:
        return "No robot connected. Plug the robot in with a USB cable and press Connect robot.";
    }
  },

  updateButtons() {
    const { connect, upload, uploadRun, logs, stop } = this.elements;
    if (!connect) return;
    const connected = ["ready", "running", "busy"].includes(this.state);
    const usable = this.state === "ready" || this.state === "running";

    connect.disabled = !["idle", "ready", "running"].includes(this.state);
    connect.innerHTML = connected
      ? '<i class="bi bi-plug"></i> <span class="robot-label">Disconnect</span>'
      : '<i class="bi bi-usb-symbol"></i> <span class="robot-label">Connect robot</span>';
    this.setTip(
      connect,
      connected
        ? "Disconnect from the robot"
        : connect.disabled
          ? "Please wait…"
          : "Connect to your robot with a USB cable",
    );
    connect.setAttribute(
      "aria-label",
      connected ? "Disconnect robot" : "Connect robot",
    );
    upload.disabled = !usable;
    uploadRun.disabled = !usable;
    logs.disabled = !usable;
    stop.disabled = !connected;

    const unavailable = connected
      ? "Please wait until the robot has finished the current task."
      : "Connect a robot first.";
    const tip = (el, text, enabled) =>
      this.setTip(el, enabled ? text : `${text} ${unavailable}`);
    tip(upload, "Save the code in the editor to the robot as main.py.", usable);
    tip(
      uploadRun,
      "Save the code to the robot as main.py and run it now.",
      usable,
    );
    tip(logs, "Open the robot's event logs in a new tab.", usable);
    tip(stop, "Stop the program running on the robot.", connected);
  },

  /**
   * Mark the start of a board operation.
   * @param {string} text Status pill text.
   * @returns {number} Token for endBusy().
   */
  beginBusy(text) {
    this.busyToken++;
    this.setState("busy", text);
    return this.busyToken;
  },

  /**
   * End a board operation, unless a newer one (e.g. Stop robot) replaced it.
   * @param {number} token From beginBusy().
   * @param {string} [state="ready"]
   */
  endBusy(token, state = "ready") {
    if (token !== this.busyToken || !this.board) return;
    this.setState(state);
  },

  shortBoardName() {
    const machine = (this.info && this.info.machine) || "";
    if (/Pico 2/i.test(machine)) return "Pico 2";
    if (/Pico/i.test(machine)) return "Pico";
    return "Robot";
  },

  connectionSummary() {
    const info = this.info || {};
    const parts = [
      (info.machine || "").split(" with ")[0] || "Robot",
      `MicroPython ${info.release}`,
    ];
    if (info.aidriver) {
      parts.push(info.version ? `AIDriver ${info.version}` : "AIDriver ✓");
    }
    return parts.join(" · ");
  },

  log(message) {
    if (typeof Logger !== "undefined") Logger.info("ROBOT", message);
  },

  // ----------------------------------------------------------- connection

  toggleConnection() {
    return this.board ? this.disconnect() : this.connect();
  },

  /**
   * Show the browser's port picker (or reuse a granted port) and connect.
   * @returns {Promise<void>}
   */
  async connect() {
    if (typeof Logger !== "undefined") Logger.userAction("Connect robot");
    this.setState("connecting");
    let link;
    try {
      link = await SerialLink.request();
    } catch (error) {
      this.setState("idle");
      const message = SerialLink.describeError(error);
      if (message) DebugPanel.error(message);
      return;
    }
    await this.attach(link);
  },

  /**
   * Take over an open link, identify the board and report what was found.
   * @param {SerialLink.Link} link
   * @returns {Promise<void>}
   */
  async attach(link) {
    const board = new MicroPythonBoard.Board(link);
    this.link = link;
    this.board = board;
    this.info = null;
    this.outputRest = "";
    board.onOutput((text) => this.handleOutput(text));
    link.onLost = () => this.handleLost(board);
    this.setState("connecting");

    let info;
    try {
      info = await board.session(MicroPythonBoard.identify);
    } catch (error) {
      // Lost during identify: handleLost() reports it and reconnects
      if (this.board !== board || error.code === "disconnected") return;
      DebugPanel.error(
        error.code === "wont-stop"
          ? this.RECOVERY_MESSAGE
          : error.code === "no-reply"
            ? this.FIRMWARE_MESSAGE
            : `${this.FIRMWARE_MESSAGE} (${error.message})`,
      );
      await this.closeBoard();
      return;
    }

    if (info.impl !== "micropython") {
      DebugPanel.error(
        "This board isn't running MicroPython. Install the AIDriver firmware (Downloads → AIDriver Custom Firmware).",
      );
      await this.closeBoard();
      return;
    }

    this.info = info;
    DebugPanel.success(`Connected to robot: ${this.connectionSummary()}`);
    if (!info.aidriver) {
      DebugPanel.warning(
        "This robot has standard MicroPython without the AIDriver library. Install the AIDriver firmware " +
          "(Downloads → AIDriver Custom Firmware). You can still upload, but your code won't find aidriver.",
      );
    }
    if (info.shadowing && info.shadowing.length) {
      DebugPanel.warning(
        `The robot has its own copy of ${info.shadowing.join(", ")}. It replaces the built-in library and may be ` +
          "out of date: delete it with MicroPython Lab, or use GP4 recovery mode.",
      );
    }
    if (info.has_boot_py) {
      DebugPanel.info("Note: the robot has a boot.py, which runs before main.py.");
    }
    this.log(`Connected: ${this.connectionSummary()}`);
    this.setState("ready");
  },

  /**
   * Disconnect on request, releasing the port for other programs.
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (typeof Logger !== "undefined") Logger.userAction("Disconnect robot");
    await this.closeBoard();
    DebugPanel.info("Disconnected from robot.");
  },

  async closeBoard() {
    const board = this.board;
    this.board = null;
    this.link = null;
    this.info = null;
    this.busyToken++;
    this.setState("idle");
    if (board) {
      try {
        await board.close();
      } catch (error) {
        // Ignore
      }
    }
  },

  /**
   * The robot was unplugged or reset: try to reconnect for 10 s.
   * @param {MicroPythonBoard.Board} board The board that was lost.
   * @returns {Promise<void>}
   */
  async handleLost(board) {
    if (board !== this.board) return;
    board.lost();
    this.board = null;
    this.link = null;
    this.info = null;
    this.busyToken++;
    this.setState("reconnecting");
    DebugPanel.warning("The robot was disconnected. Trying to reconnect…");
    const link = await SerialLink.reopen(10000);
    if (this.state !== "reconnecting") {
      if (link) link.close();
      return;
    }
    if (link) {
      await this.attach(link);
    } else {
      this.setState("idle");
      DebugPanel.error(
        "The robot was disconnected. Plug it back in and press Connect.",
      );
    }
  },

  /**
   * Turn a board error into a student-friendly message.
   * @param {Error} error
   * @param {"upload"|"logs"|"stop"} context
   */
  reportError(error, context) {
    const code = error && error.code;
    const traceback = (error && error.traceback) || "";
    if (code === "disconnected") return; // handleLost reports it
    let message;
    if (code === "stopped") {
      message =
        context === "upload"
          ? "Upload cancelled. The robot still has its previous main.py."
          : "Cancelled.";
      DebugPanel.warning(message);
      return;
    }
    if (code === "wont-stop") message = this.RECOVERY_MESSAGE;
    else if (code === "no-reply") message = this.FIRMWARE_MESSAGE;
    else if (code === "verify-failed") {
      message =
        "The upload didn't save correctly, so your old main.py was kept. Try again.";
    } else if (code === "timeout") {
      message = "The robot stopped answering. Press Stop robot, then try again.";
    } else if (/ENOSPC|Errno 28|OSError: 28/.test(traceback + error.message)) {
      message =
        "The robot's storage is full. Delete files with MicroPython Lab, or use GP4 recovery mode.";
    } else if (code === "python") {
      message = `The robot reported: ${error.message}`;
      console.error("[RobotConnection] Robot traceback:\n" + traceback);
    } else {
      message = (error && error.message) || String(error);
    }
    if (context === "upload" && code !== "verify-failed") {
      message += " Your old main.py is still on the robot.";
    }
    DebugPanel.error(message);
    this.log(`Error (${context}): ${message}`);
  },

  // -------------------------------------------------------------- upload

  /**
   * Check the editor code and return it as bytes, or null if the student
   * chose not to upload.
   * @returns {{code: string, bytes: Uint8Array}|null}
   */
  prepareUpload() {
    let code = Editor.getCode().replace(/\r\n?/g, "\n");
    if (!code.endsWith("\n")) code += "\n";
    const bytes = new TextEncoder().encode(code);

    if (bytes.length > MicroPythonBoard.MAX_UPLOAD_BYTES) {
      DebugPanel.error("That's too big for main.py (the limit is 64 KB).");
      return null;
    }

    const syntax = PythonRunner.validateSyntax(code);
    if (!syntax.valid) {
      const where = syntax.line ? ` on line ${syntax.line}` : "";
      if (syntax.line) Editor.markError(syntax.line, syntax.error);
      const message = `Fix the error${where} before uploading. Your robot would stop with this error.`;
      DebugPanel.error(`${message} (${syntax.error})`);
      if (
        !window.confirm(
          `${message}\n\n${syntax.error}\n\nPress Cancel to fix it (recommended), or OK to upload anyway.`,
        )
      ) {
        return null;
      }
    }

    const validation = Validator.validate(code);
    const issues = [...validation.errors, ...validation.warnings];
    if (issues.length) {
      const list = issues
        .slice(0, 5)
        .map((issue) => `• Line ${issue.line}: ${issue.message}`)
        .join("\n");
      const more = issues.length > 5 ? `\n…and ${issues.length - 5} more` : "";
      if (
        !window.confirm(
          `The simulator found:\n\n${list}${more}\n\nThese are simulator rules, so your code may still work on the robot. Upload anyway?`,
        )
      ) {
        return null;
      }
    }
    return { code, bytes };
  },

  /**
   * Write the editor code to /main.py; with `run`, restart the robot so it
   * runs straight away.
   * @param {{run?: boolean}} [options]
   * @returns {Promise<boolean>} True when the upload succeeded.
   */
  async upload({ run = false } = {}) {
    if (!this.board || !["ready", "running"].includes(this.state)) return false;

    const prepared = this.prepareUpload();
    if (!prepared) return false;

    if (
      this.state === "running" &&
      !window.confirm(
        "Uploading stops the program running on the robot. Continue?",
      )
    ) {
      return false;
    }
    if (typeof Logger !== "undefined") {
      Logger.userAction(run ? "Upload & Run to robot" : "Upload to robot");
    }
    const { bytes } = prepared;
    const board = this.board;
    const started = Date.now();
    const token = this.beginBusy("Uploading…");
    try {
      await board.session((exec) =>
        MicroPythonBoard.writeFileAtomic(
          exec,
          this.MAIN_PATH,
          bytes,
          (written, total) =>
            token === this.busyToken &&
            this.setStatus(
              `Uploading ${Math.round((written / total) * 100)}%…`,
            ),
        ),
      );
    } catch (error) {
      this.reportError(error, "upload");
      this.endBusy(token);
      return false;
    }

    const size =
      bytes.length < 1024
        ? `${bytes.length} bytes`
        : `${(bytes.length / 1024).toFixed(1)} KB`;
    this.log(
      `Uploaded main.py (${bytes.length} bytes, verified) in ${Date.now() - started} ms`,
    );

    if (!run) {
      DebugPanel.success(
        `✅ Uploaded to robot as main.py (${size}, checked). Unplug the USB cable and switch the robot on ` +
          "to run it, or press Upload & Run next time.",
      );
      this.endBusy(token);
      return true;
    }

    DebugPanel.success(`✅ Uploaded to robot as main.py (${size}, checked).`);
    try {
      await board.softReset();
    } catch (error) {
      this.reportError(error, "stop");
      this.endBusy(token);
      return true;
    }
    DebugPanel.info(
      "Robot restarted: your program is running. Its output appears below as [Robot] lines. Press Stop robot to stop it.",
    );
    this.endBusy(token, "running");
    return true;
  },

  // ---------------------------------------------------------------- stop

  /**
   * Stop the robot's program, cancelling any operation in progress.
   * @returns {Promise<void>}
   */
  async stopRobot() {
    const board = this.board;
    if (!board) return;
    if (typeof Logger !== "undefined") Logger.userAction("Stop robot");
    if (this.state === "busy") {
      board.abort(
        new MicroPythonBoard.BoardError("Stopped", { code: "stopped" }),
      );
    }
    const token = this.beginBusy("Stopping…");
    try {
      await board.stopProgram();
    } catch (error) {
      this.reportError(error, "stop");
      this.endBusy(token);
      return;
    }
    DebugPanel.info("Robot program stopped.");
    this.endBusy(token);
  },

  // ---------------------------------------------------------------- logs

  /**
   * Open the log viewer and read both logs. Must run synchronously in the
   * click handler so the new tab isn't blocked as a pop-up.
   * @returns {void}
   */
  openLogs() {
    if (!this.board || !["ready", "running"].includes(this.state)) return;
    const wasRunning = this.state === "running";
    if (
      wasRunning &&
      !window.confirm(
        "Viewing logs stops the program running on the robot. Continue?",
      )
    ) {
      return;
    }
    if (typeof Logger !== "undefined") Logger.userAction("View robot logs");

    this.lastLogs = null;
    const viewer = window.open("log-viewer.html", "aidriver-logs");
    if (viewer) {
      this.logTarget = { window: viewer, ready: false };
    } else {
      this.logTarget = { modal: true };
      this.showLogsModal();
    }
    this.loadLogs(wasRunning);
  },

  /**
   * Read both log files and send them to the viewer.
   * @param {boolean} wasRunning Whether reading interrupted a program.
   * @returns {Promise<void>}
   */
  async loadLogs(wasRunning = false) {
    const board = this.board;
    const token = this.beginBusy("Reading logs…");
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const decode = (bytes) => (bytes === null ? null : decoder.decode(bytes));
    try {
      const files = await board.session(async (exec) => ({
        current: await MicroPythonBoard.readFile(exec, this.LOG_PATHS.current),
        previous: await MicroPythonBoard.readFile(
          exec,
          this.LOG_PATHS.previous,
        ),
      }));
      this.lastLogs = {
        type: "aidriver-logs",
        robot: {
          board: (this.info.machine || "").split(" with ")[0],
          release: this.info.release,
        },
        readAt: Date.now(),
        wasRunning,
        files: { current: decode(files.current), previous: decode(files.previous) },
      };
    } catch (error) {
      this.reportError(error, "logs");
      this.lastLogs = {
        type: "aidriver-logs-error",
        message: "Couldn't read the logs from the robot. Check the simulator's debug panel.",
      };
    }
    this.endBusy(token);
    this.deliverLogs();
  },

  /**
   * Send the latest logs to the viewer tab (once it is ready) or modal.
   */
  deliverLogs() {
    const target = this.logTarget;
    if (!target || !this.lastLogs) return;
    if (target.modal) {
      this.showLogsModal();
    } else if (target.ready && !target.window.closed) {
      target.window.postMessage(this.lastLogs, window.location.origin);
    }
  },

  /**
   * Handle the log viewer tab's ready/refresh messages.
   * @param {MessageEvent} event
   */
  handleMessage(event) {
    if (event.origin !== window.location.origin) return;
    const target = this.logTarget;
    if (!target || !target.window || event.source !== target.window) return;
    const type = event.data && event.data.type;
    if (type === "aidriver-logs-ready") {
      target.ready = true;
      this.deliverLogs();
    } else if (type === "aidriver-logs-refresh") {
      this.refreshLogs();
    }
  },

  /**
   * Re-read the logs for the viewer's Refresh button.
   */
  refreshLogs() {
    this.lastLogs = null;
    if (this.state === "ready") {
      this.loadLogs(false);
      return;
    }
    this.lastLogs = {
      type: "aidriver-logs-error",
      message:
        this.state === "running"
          ? "The robot is running a program. Press Logs in the simulator to stop it and read the logs."
          : this.board
            ? "The robot is busy. Try Refresh again in a moment."
            : "The robot isn't connected. Connect it in the simulator, then press Logs.",
    };
    this.deliverLogs();
  },

  /**
   * Fallback when pop-ups are blocked: show the logs in a modal.
   */
  showLogsModal() {
    const { logsModal, logsModalBody } = this.elements;
    if (!logsModal || !logsModalBody) return;
    LogViewer.render(logsModalBody, this.lastLogs, {
      onRefresh: () => this.refreshLogs(),
    });
    if (typeof bootstrap !== "undefined" && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(logsModal).show();
    }
  },

  // -------------------------------------------------------------- output

  /**
   * Text printed by the robot outside a session: the running program's
   * output. Shown as [Robot] lines and used to track running/finished.
   * @param {string} text
   */
  handleOutput(text) {
    const lines = (this.outputRest + text).split("\n");
    this.outputRest = lines.pop();

    for (const raw of lines) {
      const line = raw.replace(/\r/g, "");
      if (/^MPY: soft reboot/.test(line)) {
        this.queueOutput({ info: "[Robot] Restarted." });
        continue;
      }
      if (this.OUTPUT_IGNORE.some((pattern) => pattern.test(line))) continue;
      if (this.state === "ready") this.setState("running");
      this.queueOutput({ line: `[Robot] ${line}` });
    }

    // The friendly prompt means the program has finished
    if (this.outputRest.replace(/\r/g, "").endsWith(">>> ")) {
      this.outputRest = "";
      if (this.state === "running") {
        this.queueOutput({ info: "[Robot] Program finished." });
        this.setState("ready");
      }
    }
  },

  queueOutput(entry) {
    this.outputQueue.push(entry);
    if (!this.outputTimer) {
      this.outputTimer = setTimeout(() => this.flushOutput(), this.outputFlushMs);
    }
  },

  /**
   * Write queued robot output to the debug panel, at most
   * maxOutputLinesPerFlush lines at a time so a fast print loop can't freeze
   * the page.
   */
  flushOutput() {
    this.outputTimer = null;
    const entries = this.outputQueue.splice(0);
    const shown = entries.slice(0, this.maxOutputLinesPerFlush);
    for (const entry of shown) {
      if (entry.info) DebugPanel.info(entry.info);
      else DebugPanel.output(entry.line);
    }
    const skipped = entries.length - shown.length;
    if (skipped > 0) {
      DebugPanel.warning(
        `[Robot] ${skipped} more line(s) not shown: the robot is printing faster than the page can show.`,
      );
    }
  },
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = RobotConnection;
}
