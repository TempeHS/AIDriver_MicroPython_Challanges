/**
 * SerialLink tests against the real js/serial-link.js with a fake Web Serial
 * port (tests/helpers/fake-micropython-board.js).
 */

const { loadModules } = require("../helpers/load-app");
const {
  FakeBoard,
  installWebApis,
  installFakeSerial,
  removeFakeSerial,
  waitFor,
} = require("../helpers/fake-micropython-board");

beforeAll(installWebApis);

beforeEach(() => {
  loadModules(["serial-link.js"]);
});

afterEach(removeFakeSerial);

describe("SerialLink.isSupported", () => {
  test("follows navigator.serial", () => {
    expect(SerialLink.isSupported()).toBe(false);
    installFakeSerial([new FakeBoard()]);
    expect(SerialLink.isSupported()).toBe(true);
  });
});

describe("SerialLink.request", () => {
  test("shows the picker filtered to Raspberry Pi boards and opens at 115200", async () => {
    const board = new FakeBoard();
    const serial = installFakeSerial([board]);
    const open = jest.spyOn(board.port, "open");

    const link = await SerialLink.request();

    expect(serial.requestPort).toHaveBeenCalledWith({
      filters: [{ usbVendorId: 0x2e8a }],
    });
    expect(open).toHaveBeenCalledWith({ baudRate: 115200 });
    expect(link.port).toBe(board.port);
    await link.close();
  });

  test("reuses a single already-granted port without the picker", async () => {
    const board = new FakeBoard();
    const serial = installFakeSerial([board], { granted: true });

    const link = await SerialLink.request();

    expect(serial.requestPort).not.toHaveBeenCalled();
    expect(link.port).toBe(board.port);
    await link.close();
  });

  test("falls back to an unfiltered picker if the filtered one fails", async () => {
    const board = new FakeBoard();
    const serial = installFakeSerial([board]);
    serial.requestPort.mockImplementationOnce(async () => {
      throw new TypeError("filters not supported");
    });

    const link = await SerialLink.request();

    expect(serial.requestPort).toHaveBeenLastCalledWith();
    await link.close();
  });

  test("a cancelled picker is reported as no message", async () => {
    installFakeSerial([new FakeBoard()], { cancel: true });
    const error = await SerialLink.request().catch((e) => e);
    expect(SerialLink.describeError(error)).toBeNull();
  });

  test("a port in use elsewhere gets the busy message", async () => {
    const board = new FakeBoard();
    board.port.busy = true;
    installFakeSerial([board]);
    const error = await SerialLink.request().catch((e) => e);
    expect(SerialLink.describeError(error)).toMatch(
      /being used by another program or tab/,
    );
  });
});

describe("Link", () => {
  test("delivers received bytes and writes bytes", async () => {
    const board = new FakeBoard();
    installFakeSerial([board]);
    const link = await SerialLink.request();
    const received = [];
    link.onData((bytes) => received.push(new TextDecoder().decode(bytes)));

    await link.write(new TextEncoder().encode("\x03"));
    await waitFor(() => received.join("").includes(">>> "));
    await link.close();
  });

  test("onLost fires when unplugged, but not on close()", async () => {
    const board = new FakeBoard();
    installFakeSerial([board]);
    const lost = jest.fn();

    const closed = await SerialLink.request();
    closed.onLost = lost;
    await closed.close();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(lost).not.toHaveBeenCalled();

    const link = await SerialLink.request();
    link.onLost = lost;
    board.port.unplug();
    await waitFor(() => lost.mock.calls.length === 1);
    await expect(link.write(new Uint8Array([1]))).rejects.toThrow(
      "The robot was disconnected.",
    );
  });

  test("reopen() reconnects when the robot is plugged back in", async () => {
    const board = new FakeBoard();
    installFakeSerial([board], { granted: true });
    const link = await SerialLink.request();
    board.port.unplug();
    setTimeout(() => board.port.replug(), 700);

    const reopened = await SerialLink.reopen(3000);

    expect(reopened).not.toBeNull();
    expect(reopened.port).toBe(board.port);
    await reopened.close();
    await link.close();
  });

  test("reopen() gives up after the timeout", async () => {
    const board = new FakeBoard();
    installFakeSerial([board], { granted: true });
    board.port.unplug();
    await expect(SerialLink.reopen(600)).resolves.toBeNull();
  });
});
