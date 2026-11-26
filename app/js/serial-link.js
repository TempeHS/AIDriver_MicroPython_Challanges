/**
 * AIDriver Simulator - Serial Link Module
 * Web Serial transport to the robot's Raspberry Pi Pico. Knows nothing about
 * MicroPython: it opens a port, streams received bytes to a callback and
 * writes bytes. See Web_Serial_Upload_Design.md §7.
 */

const SerialLink = (function () {
  "use strict";

  const BAUD_RATE = 115200;

  // Raspberry Pi (RP2040 / Pico MicroPython firmware)
  const RASPBERRY_PI_VENDOR_ID = 0x2e8a;
  const PORT_FILTERS = [{ usbVendorId: RASPBERRY_PI_VENDOR_ID }];

  /**
   * Whether this browser supports Web Serial.
   * @returns {boolean}
   */
  function isSupported() {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  /**
   * An open connection to one serial port.
   */
  class Link {
    /**
     * @param {SerialPort} port An already opened Web Serial port.
     */
    constructor(port) {
      this.port = port;
      this.reader = null;
      this.receiver = null;
      this.stopped = false;
      /** Called once when the port is lost (unplugged, reset), not on close(). */
      this.onLost = null;
    }

    /**
     * Register the callback for received bytes.
     * @param {(bytes: Uint8Array) => void} callback
     */
    onData(callback) {
      this.receiver = callback;
    }

    /**
     * Read from the port until it closes or is lost.
     * @returns {Promise<void>}
     */
    async readLoop() {
      while (!this.stopped && this.port.readable) {
        this.reader = this.port.readable.getReader();
        try {
          for (;;) {
            const { value, done } = await this.reader.read();
            if (done) break;
            if (value && this.receiver) this.receiver(value);
          }
        } catch (error) {
          // A read error (e.g. buffer overrun or unplug) ends this reader;
          // the outer loop retries while the port is still readable.
        } finally {
          try {
            this.reader.releaseLock();
          } catch (error) {
            // Lock already released
          }
          this.reader = null;
        }
      }
      if (!this.stopped && this.onLost) {
        this.onLost();
      }
    }

    /**
     * Write bytes to the port.
     * @param {Uint8Array} bytes
     * @returns {Promise<void>}
     */
    async write(bytes) {
      const writable = this.port.writable;
      if (!writable) {
        throw new Error("The robot was disconnected.");
      }
      const writer = writable.getWriter();
      try {
        await writer.write(bytes);
      } finally {
        writer.releaseLock();
      }
    }

    /**
     * Close the port so other tabs and programs can use it.
     * @returns {Promise<void>}
     */
    async close() {
      this.stopped = true;
      try {
        if (this.reader) await this.reader.cancel();
      } catch (error) {
        // Ignore
      }
      try {
        await this.port.close();
      } catch (error) {
        // Ignore
      }
    }
  }

  /**
   * Open a port and start reading from it.
   * @param {SerialPort} port Port from requestPort() or getPorts().
   * @returns {Promise<Link>}
   */
  async function open(port) {
    await port.open({ baudRate: BAUD_RATE });
    try {
      await port.setSignals({ dataTerminalReady: true, requestToSend: false });
    } catch (error) {
      // Not supported by every adapter
    }
    const link = new Link(port);
    link.readLoop();
    return link;
  }

  /**
   * True when the port looks like a Raspberry Pi board (or is unknown).
   * @param {SerialPort} port
   * @returns {boolean}
   */
  function isRobotPort(port) {
    const info = typeof port.getInfo === "function" ? port.getInfo() : {};
    return (
      info.usbVendorId === undefined ||
      info.usbVendorId === RASPBERRY_PI_VENDOR_ID
    );
  }

  /**
   * Connect to the robot. Reuses the port if the student has already granted
   * exactly one robot port to this site; otherwise shows the browser picker,
   * filtered to Raspberry Pi boards (falling back to all ports). Must be
   * called from a click handler.
   * @returns {Promise<Link>}
   */
  async function request() {
    let port = null;
    try {
      const granted = (await navigator.serial.getPorts()).filter(isRobotPort);
      if (granted.length === 1) port = granted[0];
    } catch (error) {
      // Fall through to the picker
    }
    if (port) {
      try {
        return await open(port);
      } catch (error) {
        if (!isBusyError(error)) throw error;
        // Busy granted port: let the student pick, they may have two robots
      }
    }
    try {
      port = await navigator.serial.requestPort({ filters: PORT_FILTERS });
    } catch (error) {
      if (isCancelError(error)) throw error;
      port = await navigator.serial.requestPort();
    }
    return open(port);
  }

  /**
   * After the board disconnects (unplugged or reset), poll the granted ports
   * and reopen the robot when it reappears.
   * @param {number} [timeoutMs=10000]
   * @returns {Promise<Link|null>} The reopened link, or null on timeout.
   */
  async function reopen(timeoutMs = 10000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      let ports = [];
      try {
        ports = await navigator.serial.getPorts();
      } catch (error) {
        return null;
      }
      for (const port of ports.filter(isRobotPort)) {
        try {
          return await open(port);
        } catch (error) {
          // Not ready yet
        }
      }
    }
    return null;
  }

  function errorText(error) {
    return `${(error && error.name) || ""} ${(error && error.message) || error}`;
  }

  /**
   * The student closed the port picker without choosing.
   * @param {*} error
   * @returns {boolean}
   */
  function isCancelError(error) {
    return /NotFoundError|No port selected|cancel/i.test(errorText(error));
  }

  /**
   * The port is already open in another tab or program.
   * @param {*} error
   * @returns {boolean}
   */
  function isBusyError(error) {
    return /InvalidStateError|NetworkError|Failed to open|already open/i.test(
      errorText(error),
    );
  }

  /**
   * Turn a connection error into a message for students, or null when no
   * message should be shown (picker cancelled).
   * @param {*} error
   * @returns {string|null}
   */
  function describeError(error) {
    if (isCancelError(error)) return null;
    if (isBusyError(error)) {
      return "The robot is being used by another program or tab. Close MicroPython Lab / Thonny / other simulator tabs, then press Connect.";
    }
    return `Couldn't connect to the robot: ${(error && error.message) || error}`;
  }

  return {
    BAUD_RATE,
    RASPBERRY_PI_VENDOR_ID,
    PORT_FILTERS,
    Link,
    isSupported,
    open,
    request,
    reopen,
    isCancelError,
    isBusyError,
    describeError,
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SerialLink;
}
