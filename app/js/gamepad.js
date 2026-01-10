/**
 * AIDriver Simulator - HM-10 BLE Gamepad Controller
 * Provides Web Bluetooth joystick control and simulator integration for Challenge 7
 */

const Gamepad = (function () {
  "use strict";

  const MAX_SPEED = 255;
  const DEADZONE = 0.12;
  const SPIN_THRESHOLD = 0.2;
  const UPDATE_INTERVAL_MS = 40;
  const SIM_TELEMETRY_INTERVAL_MS = 200;
  const BLE_SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb";
  const BLE_CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb";

  const elements = {};
  const joystickState = { active: false, x: 0, y: 0 };
  const keyboardState = { up: false, down: false, left: false, right: false };

  let pointerId = null;
  let isEnabled = false;
  let updateTimer = null;
  let lastSimTelemetry = 0;
  let lastSpeeds = { left: 0, right: 0, brake: true };

  const ble = {
    supported: typeof navigator !== "undefined" && "bluetooth" in navigator,
    device: null,
    characteristic: null,
    connected: false,
    state: "idle",
    commandSeq: 0,
    lastSent: { left: 0, right: 0, brake: true },
    lastSendTime: 0,
  };

  /**
   * Wire up DOM references, input handlers, and status messaging for the BLE controller.
   * @returns {void}
   */
  function init() {
    cacheElements();
    setupJoystick();
    setupKeyboard();
    setupButtons();
    updateSupportNotice();

    if (typeof DebugPanel !== "undefined") {
      DebugPanel.info(
        "BLE Gamepad ready – connect to HM-10 or use the simulator joystick."
      );
    }
  }

  /**
   * Cache required DOM nodes so repeated lookups are avoided during interaction.
   * @returns {void}
   */
  function cacheElements() {
    elements.panel = document.getElementById("gamepadPanel");
    elements.track = document.getElementById("joystickTrack");
    elements.handle = document.getElementById("joystickHandle");
    elements.debug = document.getElementById("joystickDebug");
    elements.brakeBadge = document.getElementById("brakeBadge");
    elements.motorSpeeds = document.getElementById("motorSpeeds");
    elements.telemetryValue = document.getElementById("gamepadUltrasonic");
    elements.telemetryTimestamp = document.getElementById("telemetryTimestamp");
    elements.btnConnect = document.getElementById("btnBleConnect");
    elements.btnDisconnect = document.getElementById("btnBleDisconnect");
    elements.statusText = document.getElementById("bleStatusText");
    elements.stateBadge = document.getElementById("bleStateBadge");
    elements.unsupportedAlert = document.getElementById("bleUnsupported");
    elements.hint = document.getElementById("bleHint");
  }

  /**
   * Activate the gamepad so joystick and keyboard input drive the simulator.
   * @returns {void}
   */
  function enable() {
    if (isEnabled) return;
    isEnabled = true;
    startLoop();
  }

  /**
   * Deactivate the controller, neutralize inputs, and disconnect from BLE if needed.
   * @returns {void}
   */
  function disable() {
    if (!isEnabled) return;
    isEnabled = false;
    stopLoop();
    setJoystickNeutral();
    applySimulatorSpeeds({ left: 0, right: 0, brake: true });
    if (ble.connected) {
      disconnectBle({ silent: true });
    }
  }

  /**
   * Start the fixed-interval loop responsible for processing input and sending commands.
   * @returns {void}
   */
  function startLoop() {
    if (updateTimer) return;
    loopStep();
    updateTimer = setInterval(loopStep, UPDATE_INTERVAL_MS);
  }

  /**
   * Halt the periodic controller loop and clear timers.
   * @returns {void}
   */
  function stopLoop() {
    if (updateTimer) {
      clearInterval(updateTimer);
      updateTimer = null;
    }
  }

  /**
   * Execute one controller tick including input synthesis, simulator updates, and telemetry.
   * @returns {void}
   */
  function loopStep() {
    if (!isEnabled) return;

    const vector = getActiveVector();
    const speeds = calculateMotorSpeeds(vector.x, vector.y);
    lastSpeeds = speeds;

    applySimulatorSpeeds(speeds);
    updateUi(speeds, vector);
    maybeSendBle(speeds);

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (!ble.connected && typeof calculateDistance === "function") {
      if (now - lastSimTelemetry >= SIM_TELEMETRY_INTERVAL_MS) {
        lastSimTelemetry = now;
        const distance = calculateDistance();
        updateTelemetry(distance, "sim");
      }
    }
  }

  /**
   * Translate normalized joystick axes into differential wheel speeds.
   * @param {number} x Horizontal axis value between -1 and 1.
   * @param {number} y Vertical axis value between -1 and 1 (positive forward).
   * @returns {{left:number,right:number,brake:boolean}} Motor command payload.
   */
  function calculateMotorSpeeds(x, y) {
    const clampedX = clamp(x, -1, 1);
    const clampedY = clamp(y, -1, 1);
    const absX = Math.abs(clampedX);
    const absY = Math.abs(clampedY);

    if (absX < DEADZONE && absY < DEADZONE) {
      return { left: 0, right: 0, brake: true };
    }

    let left;
    let right;

    if (absY < SPIN_THRESHOLD && absX >= DEADZONE) {
      // Spin in place when joystick is mostly horizontal
      left = clamp(clampedX * MAX_SPEED, -MAX_SPEED, MAX_SPEED);
      right = clamp(-clampedX * MAX_SPEED, -MAX_SPEED, MAX_SPEED);
    } else {
      const base = clamp(clampedY * MAX_SPEED, -MAX_SPEED, MAX_SPEED);
      const turn = clamp(clampedX * absY * MAX_SPEED, -MAX_SPEED, MAX_SPEED);
      left = clamp(base + turn, -MAX_SPEED, MAX_SPEED);
      right = clamp(base - turn, -MAX_SPEED, MAX_SPEED);
    }

    return {
      left: Math.round(left),
      right: Math.round(right),
      brake: false,
    };
  }

  /**
   * Mutate the simulator robot object to reflect the desired wheel speeds.
   * @param {{left:number,right:number,brake:boolean}} speeds Motor command payload.
   * @returns {void}
   */
  function applySimulatorSpeeds(speeds) {
    if (typeof App === "undefined" || !App.robot) return;
    App.robot.leftSpeed = speeds.left;
    App.robot.rightSpeed = speeds.right;
    App.robot.isMoving = !speeds.brake;
  }

  /**
   * Refresh joystick visuals, debug readouts, and status badges.
   * @param {{left:number,right:number,brake:boolean}} speeds Motor command payload.
   * @param {{x:number,y:number}} vector Active input vector.
   * @returns {void}
   */
  function updateUi(speeds, vector) {
    updateJoystickVisual(vector.x, vector.y);
    updateJoystickDebug(vector.x, vector.y);
    setMotorSpeedsDisplay(speeds.left, speeds.right);
    setBrakeBadge(speeds.brake);
  }

  /**
   * Position the joystick handle according to the normalized axes.
   * @param {number} x Horizontal axis value.
   * @param {number} y Vertical axis value.
   * @returns {void}
   */
  function updateJoystickVisual(x, y) {
    if (!elements.track || !elements.handle) return;
    const rect = elements.track.getBoundingClientRect();
    if (rect.width === 0) return; // Hidden, skip until visible

    const radius = rect.width / 2;
    const handleRadius = (rect.width * 0.32) / 2; // matches CSS sizing
    const travel = radius - handleRadius;

    const offsetX = clamp(x, -1, 1) * travel;
    const offsetY = clamp(y, -1, 1) * travel;

    elements.handle.style.transform = `translate(-50%, -50%) translate(${offsetX}px, ${-offsetY}px)`;
  }

  /**
   * Display the raw joystick axis values in the debug readout.
   * @param {number} x Horizontal axis value.
   * @param {number} y Vertical axis value.
   * @returns {void}
   */
  function updateJoystickDebug(x, y) {
    if (!elements.debug) return;
    elements.debug.textContent = `${x.toFixed(2)} · ${y.toFixed(2)}`;
  }

  /**
   * Show the current left and right motor speeds in the status badge.
   * @param {number} left Left wheel speed value.
   * @param {number} right Right wheel speed value.
   * @returns {void}
   */
  function setMotorSpeedsDisplay(left, right) {
    if (!elements.motorSpeeds) return;
    elements.motorSpeeds.textContent = `L ${left} | R ${right}`;
  }

  /**
   * Toggle the brake badge visual to match the commanded brake state.
   * @param {boolean} brakeEngaged True when the brake is engaged.
   * @returns {void}
   */
  function setBrakeBadge(brakeEngaged) {
    if (!elements.brakeBadge) return;
    const badge = elements.brakeBadge;
    badge.className = "badge";
    if (brakeEngaged) {
      badge.classList.add("bg-danger");
      badge.textContent = "Engaged";
    } else {
      badge.classList.add("bg-success");
      badge.textContent = "Released";
    }
  }

  /**
   * Combine joystick and keyboard inputs into the authoritative control vector.
   * @returns {{x:number,y:number}} Normalized input vector.
   */
  function getActiveVector() {
    if (joystickState.active) {
      return { x: joystickState.x, y: joystickState.y };
    }

    const keyboardVector = getKeyboardVector();
    return keyboardVector;
  }

  /**
   * Convert held keyboard keys into a normalized directional vector.
   * @returns {{x:number,y:number}} Normalized input vector from keys.
   */
  function getKeyboardVector() {
    let x = 0;
    let y = 0;

    if (keyboardState.left) x -= 1;
    if (keyboardState.right) x += 1;
    if (keyboardState.up) y += 1;
    if (keyboardState.down) y -= 1;

    if (x === 0 && y === 0) {
      return { x: 0, y: 0 };
    }

    const magnitude = Math.hypot(x, y);
    if (magnitude === 0) {
      return { x: 0, y: 0 };
    }

    return { x: x / magnitude, y: y / magnitude };
  }

  /**
   * Clear joystick engagement state and center the visual handle.
   * @returns {void}
   */
  function setJoystickNeutral() {
    joystickState.active = false;
    joystickState.x = 0;
    joystickState.y = 0;
    updateJoystickVisual(0, 0);
    updateJoystickDebug(0, 0);
  }

  /**
   * Attach pointer event handlers to the joystick track element.
   * @returns {void}
   */
  function setupJoystick() {
    if (!elements.track) return;

    elements.track.addEventListener("pointerdown", handlePointerDown);
    elements.track.addEventListener("pointermove", handlePointerMove);
    elements.track.addEventListener("pointerup", handlePointerUp);
    elements.track.addEventListener("pointercancel", handlePointerUp);
    elements.track.addEventListener("pointerleave", handlePointerUp);
  }

  /**
   * Capture pointer input and initiate joystick tracking.
   * @param {PointerEvent} event Browser pointer event.
   * @returns {void}
   */
  function handlePointerDown(event) {
    if (!isEnabled) return;
    event.preventDefault();
    if (pointerId !== null) return;
    pointerId = event.pointerId;
    elements.track.setPointerCapture(pointerId);
    updateJoystickFromPointer(event);
  }

  /**
   * Update joystick state in response to pointer motion.
   * @param {PointerEvent} event Browser pointer event.
   * @returns {void}
   */
  function handlePointerMove(event) {
    if (!isEnabled) return;
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    updateJoystickFromPointer(event);
  }

  /**
   * Release the pointer capture when interaction ends.
   * @param {PointerEvent} event Browser pointer event.
   * @returns {void}
   */
  function handlePointerUp(event) {
    if (!isEnabled) return;
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    releasePointer();
  }

  /**
   * Release pointer capture and reset joystick state.
   * @returns {void}
   */
  function releasePointer() {
    if (pointerId !== null && elements.track.hasPointerCapture(pointerId)) {
      elements.track.releasePointerCapture(pointerId);
    }
    pointerId = null;
    setJoystickNeutral();
  }

  /**
   * Convert pointer coordinates into normalized joystick axes.
   * @param {PointerEvent} event Browser pointer event.
   * @returns {void}
   */
  function updateJoystickFromPointer(event) {
    if (!elements.track) return;
    const rect = elements.track.getBoundingClientRect();
    if (rect.width === 0) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width / 2;

    let x = (event.clientX - centerX) / radius;
    let y = (centerY - event.clientY) / radius; // Invert Y so up is positive

    const magnitude = Math.hypot(x, y);
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }

    joystickState.active = true;
    joystickState.x = clamp(x, -1, 1);
    joystickState.y = clamp(y, -1, 1);

    updateJoystickVisual(joystickState.x, joystickState.y);
    updateJoystickDebug(joystickState.x, joystickState.y);
  }

  /**
   * Register keyboard controls mapping WASD/arrow keys to joystick vectors.
   * @returns {void}
   */
  function setupKeyboard() {
    const keyMap = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
    };

    document.addEventListener("keydown", (event) => {
      if (!isEnabled) return;
      const direction = keyMap[event.key];
      if (!direction) return;
      event.preventDefault();
      keyboardState[direction] = true;
    });

    document.addEventListener("keyup", (event) => {
      if (!isEnabled) return;
      const direction = keyMap[event.key];
      if (!direction) return;
      event.preventDefault();
      keyboardState[direction] = false;
    });

    window.addEventListener("blur", () => {
      Object.keys(keyboardState).forEach((key) => {
        keyboardState[key] = false;
      });
    });
  }

  /**
   * Attach click handlers for BLE connect and disconnect controls.
   * @returns {void}
   */
  function setupButtons() {
    if (elements.btnConnect) {
      elements.btnConnect.addEventListener("click", () => connectBle());
    }
    if (elements.btnDisconnect) {
      elements.btnDisconnect.addEventListener("click", () =>
        disconnectBle({ silent: false })
      );
    }
  }

  /**
   * Reflect Web Bluetooth availability in the UI and adjust button states.
   * @returns {void}
   */
  function updateSupportNotice() {
    if (!elements.unsupportedAlert) return;

    if (!ble.supported) {
      elements.unsupportedAlert.classList.remove("d-none");
      if (elements.btnConnect) {
        elements.btnConnect.disabled = true;
      }
      setConnectionState("unsupported", "Web Bluetooth not supported");
    } else {
      elements.unsupportedAlert.classList.add("d-none");
      setConnectionState("idle", "Disconnected");
    }
  }

  /**
   * Prompt the user to connect to an HM-10 BLE module and configure notifications.
   * @returns {Promise<void>} Resolves when connection attempts finish.
   */
  async function connectBle() {
    if (!ble.supported) return;
    try {
      setConnectionState("connecting", "Scanning for HM-10...");

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_SERVICE_UUID] }],
      });

      ble.device = device;
      ble.device.addEventListener(
        "gattserverdisconnected",
        handleBleDisconnect
      );

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(BLE_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(
        BLE_CHARACTERISTIC_UUID
      );

      ble.characteristic = characteristic;
      ble.connected = true;
      ble.commandSeq = 0;
      ble.lastSent = { left: 0, right: 0, brake: true };

      await characteristic.startNotifications();
      characteristic.addEventListener(
        "characteristicvaluechanged",
        handleTelemetryNotification
      );

      setConnectionState(
        "connected",
        device.name ? `Connected to ${device.name}` : "Connected"
      );

      if (typeof DebugPanel !== "undefined") {
        DebugPanel.success("HM-10 connected – joystick commands are live.");
      }
    } catch (error) {
      console.error("[Gamepad] BLE connection failed", error);
      setConnectionState("error", "Connection failed – try again");
      if (typeof DebugPanel !== "undefined") {
        DebugPanel.error(`BLE connect failed: ${error.message}`);
      }
      cleanupBle();
    }
  }

  /**
   * Terminate the HM-10 connection and optionally log a status message.
   * @param {{silent?:boolean}} [options] Controls whether status messaging is suppressed.
   * @returns {Promise<void>} Resolves after disconnect cleanup.
   */
  async function disconnectBle({ silent } = { silent: false }) {
    if (!ble.device) {
      cleanupBle();
      setConnectionState("idle", "Disconnected");
      return;
    }

    try {
      if (ble.device.gatt.connected) {
        ble.device.gatt.disconnect();
      }
    } catch (error) {
      console.warn("[Gamepad] Error during BLE disconnect", error);
    } finally {
      cleanupBle();
      setConnectionState("idle", "Disconnected");
      if (!silent && typeof DebugPanel !== "undefined") {
        DebugPanel.info("BLE connection closed");
      }
    }
  }

  /**
   * React to BLE disconnect events initiated outside the controller.
   * @returns {void}
   */
  function handleBleDisconnect() {
    cleanupBle();
    setConnectionState("idle", "Disconnected");
    if (typeof DebugPanel !== "undefined") {
      DebugPanel.warning("BLE connection lost");
    }
  }

  /**
   * Clear BLE characteristic references and command tracking state.
   * @returns {void}
   */
  function cleanupBle() {
    if (ble.characteristic) {
      try {
        ble.characteristic.removeEventListener(
          "characteristicvaluechanged",
          handleTelemetryNotification
        );
      } catch (error) {
        // Ignore cleanup issues
      }
    }

    ble.device = null;
    ble.characteristic = null;
    ble.connected = false;
    ble.lastSent = { left: 0, right: 0, brake: true };
  }

  /**
   * Update status badges and button visibility to match the current BLE lifecycle state.
   * @param {string} state Descriptive connection state label.
   * @param {string} message Human-readable status text.
   * @returns {void}
   */
  function setConnectionState(state, message) {
    ble.state = state;

    const badge = elements.stateBadge;
    const status = elements.statusText;

    if (badge) {
      badge.className = "badge";
      switch (state) {
        case "connected":
          badge.classList.add("bg-success");
          badge.textContent = "Connected";
          break;
        case "connecting":
          badge.classList.add("bg-warning", "text-dark");
          badge.textContent = "Connecting";
          break;
        case "error":
          badge.classList.add("bg-danger");
          badge.textContent = "Error";
          break;
        case "unsupported":
          badge.classList.add("bg-secondary");
          badge.textContent = "Unsupported";
          break;
        default:
          badge.classList.add("bg-secondary");
          badge.textContent = "Idle";
          break;
      }
    }

    if (status) {
      status.textContent = message || "";
    }

    if (elements.btnConnect) {
      const hiding = state === "connected";
      elements.btnConnect.classList.toggle("d-none", hiding);
      elements.btnConnect.disabled = state === "connecting";
    }

    if (elements.btnDisconnect) {
      const showDisconnect = state === "connected";
      elements.btnDisconnect.classList.toggle("d-none", !showDisconnect);
    }
  }

  /**
   * Parse telemetry packets published by the HM-10 module.
   * @param {Event} event Web Bluetooth characteristic change event.
   * @returns {void}
   */
  function handleTelemetryNotification(event) {
    const dataView = event.target.value;
    if (!dataView || dataView.byteLength < 1) return;

    const type = dataView.getUint8(0);
    if (type === 0x01 && dataView.byteLength >= 3) {
      const distance = dataView.getUint16(1, false);
      updateTelemetry(distance, "ble");
    }
  }

  /**
   * Refresh telemetry readouts using either simulator or BLE distance data.
   * @param {number} distance Distance measurement in millimeters; -1 when invalid.
   * @param {"ble"|"sim"} source Source identifier for logging purposes.
   * @returns {void}
   */
  function updateTelemetry(distance, source) {
    if (!elements.telemetryValue) return;

    elements.telemetryValue.classList.remove("warning", "danger");

    if (distance === -1) {
      elements.telemetryValue.textContent = "--- mm";
    } else {
      const rounded = Math.round(distance);
      elements.telemetryValue.textContent = `${rounded} mm`;

      if (rounded < 100) {
        elements.telemetryValue.classList.add("danger");
      } else if (rounded < 300) {
        elements.telemetryValue.classList.add("warning");
      }
    }

    if (elements.telemetryTimestamp) {
      if (distance === undefined) {
        elements.telemetryTimestamp.textContent = "Waiting for data";
      } else {
        const label = source === "ble" ? "Robot" : "Simulator";
        const now = new Date();
        const time = now.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });
        elements.telemetryTimestamp.textContent = `${label} · ${time}`;
      }
    }

    if (typeof updateUltrasonicDisplay === "function") {
      updateUltrasonicDisplay(distance);
    }
  }

  /**
   * Send an updated motor command over BLE when new data or timeout thresholds trigger it.
   * @param {{left:number,right:number,brake:boolean}} speeds Motor command payload.
   * @returns {void}
   */
  function maybeSendBle(speeds) {
    if (!ble.connected || !ble.characteristic) return;

    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const changed =
      speeds.left !== ble.lastSent.left ||
      speeds.right !== ble.lastSent.right ||
      speeds.brake !== ble.lastSent.brake;

    if (!changed && now - ble.lastSendTime < 200) {
      return;
    }

    const packet = buildPacket(speeds);
    ble.lastSent = { ...speeds };
    ble.lastSendTime = now;

    writeBle(packet);
  }

  /**
   * Encode motor commands into the four-byte packet expected by the HM-10 firmware.
   * @param {{left:number,right:number,brake:boolean}} speeds Motor command payload.
   * @returns {Uint8Array} Packet ready for transmission.
   */
  function buildPacket(speeds) {
    const packet = new Uint8Array(4);
    packet[0] = speeds.brake ? 0x01 : 0x00;
    packet[1] = toBleByte(speeds.left);
    packet[2] = toBleByte(speeds.right);
    packet[3] = ble.commandSeq & 0xff;
    ble.commandSeq = (ble.commandSeq + 1) & 0xff;
    return packet;
  }

  /**
   * Convert a signed speed (-255 to 255) into an unsigned byte for BLE transport.
   * @param {number} value Speed value to encode.
   * @returns {number} Unsigned byte representation.
   */
  function toBleByte(value) {
    const clamped = clamp(Math.round(value), -MAX_SPEED, MAX_SPEED);
    return clamped < 0 ? 256 + clamped : clamped;
  }

  /**
   * Transmit a packet through the active BLE characteristic using the most efficient API available.
   * @param {Uint8Array} packet Encoded command data.
   * @returns {void}
   */
  function writeBle(packet) {
    if (!ble.characteristic) return;
    const characteristic = ble.characteristic;

    const promise =
      typeof characteristic.writeValueWithoutResponse === "function"
        ? characteristic.writeValueWithoutResponse(packet)
        : characteristic.writeValue(packet);

    promise.catch((error) => {
      console.error("[Gamepad] BLE write failed", error);
      if (typeof DebugPanel !== "undefined") {
        DebugPanel.error(`BLE write failed: ${error.message}`);
      }
      disconnectBle({ silent: false });
    });
  }

  /**
   * Clamp a numeric value to the provided bounds.
   * @param {number} value Input value.
   * @param {number} min Lower bound.
   * @param {number} max Upper bound.
   * @returns {number} Clamped value.
   */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * Public API
   */
  return {
    init,
    enable,
    disable,
    isActive: () => isEnabled,
    getState: () => ({ ...lastSpeeds }),
    calculateMotorSpeeds,
  };
})();

if (typeof module !== "undefined") {
  module.exports = Gamepad;
}
