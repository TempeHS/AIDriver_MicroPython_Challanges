/**
 * Gamepad BLE Integration Tests
 * Validates joystick UI behaviour and Web Bluetooth lifecycle using jsdom
 */

describe("Gamepad BLE Integration", () => {
  let originalGlobalGamepad;
  let originalNavigatorDescriptor;
  let originalUpdateUltrasonicDisplay;
  let originalCalculateDistance;
  let Gamepad;
  let bluetoothMock;
  let characteristic;
  let notificationHandler;
  let flushAsync;
  let settleAsync;

  beforeAll(() => {
    flushAsync = () => Promise.resolve();
    settleAsync = async (iterations = 6) => {
      for (let i = 0; i < iterations; i += 1) {
        await flushAsync();
      }
    };
    if (Object.getOwnPropertyDescriptor(global.navigator, "bluetooth")) {
      originalNavigatorDescriptor = Object.getOwnPropertyDescriptor(
        global.navigator,
        "bluetooth"
      );
    }

    if (typeof PointerEvent === "undefined") {
      class FakePointerEvent extends Event {
        constructor(type, props) {
          super(type, props);
          Object.assign(this, props);
        }
      }
      global.PointerEvent = FakePointerEvent;
    }
  });

  beforeEach(async () => {
    jest.useFakeTimers();
    originalGlobalGamepad = global.Gamepad;
    jest.resetModules();

    notificationHandler = null;
    characteristic = {
      startNotifications: jest.fn().mockResolvedValue(undefined),
      addEventListener: jest.fn((event, handler) => {
        if (event === "characteristicvaluechanged") {
          notificationHandler = handler;
        }
      }),
      removeEventListener: jest.fn(),
      writeValue: jest.fn().mockResolvedValue(undefined),
      writeValueWithoutResponse: jest.fn().mockResolvedValue(undefined),
    };

    const service = {
      getCharacteristic: jest.fn().mockResolvedValue(characteristic),
    };

    const server = {
      getPrimaryService: jest.fn().mockResolvedValue(service),
    };

    const device = {
      name: "HM-10-TEST",
      gatt: {
        connect: jest.fn().mockResolvedValue(server),
        disconnect: jest.fn(),
      },
      addEventListener: jest.fn(),
    };

    bluetoothMock = {
      requestDevice: jest.fn().mockResolvedValue(device),
    };

    Object.defineProperty(global.navigator, "bluetooth", {
      configurable: true,
      writable: true,
      value: bluetoothMock,
    });

    Gamepad = require("../../js/gamepad.js");
    global.Gamepad = Gamepad;

    // Construct DOM skeleton required by Gamepad module
    document.body.innerHTML = `
      <div id="gamepadPanel">
        <div id="bleUnsupported" class="alert alert-warning d-none"></div>
        <div class="gamepad-status">
          <div>
            <span id="bleStatusText"></span>
            <span id="bleStateBadge" class="badge"></span>
          </div>
          <div>
            <button id="btnBleConnect" class="btn btn-primary">Connect</button>
            <button id="btnBleDisconnect" class="btn btn-outline-light d-none">Disconnect</button>
          </div>
        </div>
        <div class="gamepad-layout">
          <div class="joystick-column">
            <div class="joystick-wrapper">
              <div id="joystickTrack" class="joystick-track">
                <div class="joystick-deadzone"></div>
                <div id="joystickHandle" class="joystick-handle"></div>
              </div>
            </div>
            <div class="text-center mt-3">
              <span id="joystickDebug" class="badge bg-dark">0 · 0</span>
            </div>
          </div>
          <div class="status-column">
            <div class="info-panel">
              <div class="info-heading">Telemetry</div>
              <div class="info-value" id="gamepadUltrasonic">--- mm</div>
              <div class="info-subtle" id="telemetryTimestamp">Waiting for data</div>
            </div>
            <div class="info-panel mt-3">
              <span id="brakeBadge" class="badge bg-secondary">Released</span>
              <span id="motorSpeeds" class="info-value small">0 | 0</span>
            </div>
          </div>
        </div>
        <div id="bleHint" class="text-muted small"></div>
      </div>
    `;

    const track = document.getElementById("joystickTrack");
    track.setPointerCapture = jest.fn();
    track.releasePointerCapture = jest.fn();
    track.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
    });

    global.App.robot = {
      x: 1000,
      y: 1000,
      angle: 0,
      leftSpeed: 0,
      rightSpeed: 0,
      isMoving: false,
    };

    originalUpdateUltrasonicDisplay = global.updateUltrasonicDisplay;
    originalCalculateDistance = global.calculateDistance;

    global.updateUltrasonicDisplay = jest.fn();
    global.calculateDistance = jest.fn(() => 600);

    Gamepad.init();
    Gamepad.enable();

    jest.advanceTimersByTime(40);
    await flushAsync();
  });

  afterEach(async () => {
    if (Gamepad && typeof Gamepad.disable === "function") {
      Gamepad.disable();
    }

    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    if (originalNavigatorDescriptor) {
      Object.defineProperty(
        global.navigator,
        "bluetooth",
        originalNavigatorDescriptor
      );
    } else {
      delete global.navigator.bluetooth;
    }

    if (originalUpdateUltrasonicDisplay === undefined) {
      delete global.updateUltrasonicDisplay;
    } else {
      global.updateUltrasonicDisplay = originalUpdateUltrasonicDisplay;
    }

    if (originalCalculateDistance === undefined) {
      delete global.calculateDistance;
    } else {
      global.calculateDistance = originalCalculateDistance;
    }

    global.Gamepad = originalGlobalGamepad;
  });

  test("connects to HM-10 and updates status UI", async () => {
    const connectButton = document.getElementById("btnBleConnect");
    connectButton.click();

    await settleAsync(8);

    expect(bluetoothMock.requestDevice).toHaveBeenCalledWith({
      filters: [{ services: ["0000ffe0-0000-1000-8000-00805f9b34fb"] }],
    });

    await settleAsync(6);

    const statusText = document.getElementById("bleStatusText").textContent;
    expect(statusText).toContain("Connected");

    expect(characteristic.startNotifications).toHaveBeenCalled();
    const disconnectButton = document.getElementById("btnBleDisconnect");
    expect(disconnectButton.classList.contains("d-none")).toBe(false);
    expect(connectButton.classList.contains("d-none")).toBe(true);
  });

  test("applies joystick movement to robot state and UI", async () => {
    const track = document.getElementById("joystickTrack");

    const pointerDown = new PointerEvent("pointerdown", {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    track.dispatchEvent(pointerDown);

    const pointerMove = new PointerEvent("pointermove", {
      pointerId: 1,
      clientX: 100,
      clientY: 30,
    });
    track.dispatchEvent(pointerMove);

    jest.advanceTimersByTime(50);
    await flushAsync();

    const state = Gamepad.getState();
    expect(state.brake).toBe(false);
    expect(state.left).toBeGreaterThan(0);
    expect(state.right).toBeGreaterThan(0);

    expect(global.App.robot.isMoving).toBe(true);
    expect(document.getElementById("motorSpeeds").textContent).toMatch(
      /L .*\| R .*/
    );
    expect(
      document.getElementById("brakeBadge").classList.contains("bg-success")
    ).toBe(true);

    jest.advanceTimersByTime(250);
    await flushAsync();
    expect(global.updateUltrasonicDisplay).toHaveBeenCalled();
  });

  test("handles telemetry notifications from HM-10", async () => {
    document.getElementById("btnBleConnect").click();
    await settleAsync(8);

    expect(typeof notificationHandler).toBe("function");

    const buffer = new ArrayBuffer(3);
    const view = new DataView(buffer);
    view.setUint8(0, 0x01);
    view.setUint16(1, 150, false);

    notificationHandler({ target: { value: view } });
    await flushAsync();

    const telemetryValue = document.getElementById("gamepadUltrasonic");
    expect(telemetryValue.textContent).toBe("150 mm");
    expect(telemetryValue.classList.contains("warning")).toBe(true);
    expect(global.updateUltrasonicDisplay).toHaveBeenLastCalledWith(150);
  });
});
