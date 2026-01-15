"""HM-10 BLE command handler for AIDriver robots.

This module reads differential drive commands sent from the Web Bluetooth
controller. Each command packet uses the agreed classroom format:

    Byte 0: control flags (bit0 = brake)
    Byte 1: left motor speed (signed int8, -255..255)
    Byte 2: right motor speed (signed int8, -255..255)
    Byte 3: watchdog counter (wraps at 255)

Packets are streamed over the HM-10 UART without framing bytes. The handler
expects all four bytes, but it also tolerates 3-byte packets for legacy
experiments. The most recent command is cached so that the calling control loop
can keep applying the requested wheel speeds until a timeout occurs.

The module also provides a helper for sending telemetry back to the controller
at a limited refresh rate (default 5 Hz) to minimise BLE traffic.
"""

from time import ticks_diff, ticks_ms

try:
    import machine
except ImportError:  # pragma: no cover - allows unit tests on CPython
    machine = None  # type: ignore


def _to_signed(byte_value):
    """Convert an unsigned byte to a signed int8."""

    if byte_value >= 128:
        return byte_value - 256
    return byte_value


class HM10Controller:
    """Serial protocol helper for the HM-10 BLE UART bridge."""

    TELEMETRY_ULTRASONIC = 0x01

    def __init__(
        self,
        uart_id=0,
        baudrate=9600,
        tx_pin=0,
        rx_pin=1,
        command_timeout_ms=500,
        telemetry_interval_ms=200,
    ):
        if machine is None:
            raise RuntimeError("machine.UART not available in this environment")

        self._uart = machine.UART(
            uart_id,
            baudrate=baudrate,
            tx=machine.Pin(tx_pin),
            rx=machine.Pin(rx_pin),
        )
        self._buffer = bytearray()
        self._command_timeout_ms = command_timeout_ms
        self._telemetry_interval_ms = telemetry_interval_ms
        self._last_telemetry_ms = 0

        # Publicly readable command state
        self.flags = 0
        self.left_speed = 0
        self.right_speed = 0
        self.counter = 0
        self.last_command_ms = ticks_ms()

    def poll(self):
        """Read any pending bytes and update the cached command state.

        Returns True if a complete command packet was processed.
        """

        updated = False
        data = self._uart.read()
        if data:
            self._buffer.extend(data)

        # Prefer 4-byte packets (with watchdog counter). Fallback to 3-byte
        # packets if students experiment with minimal payloads.
        while len(self._buffer) >= 4:
            self._decode_packet(self._buffer[0:4])
            del self._buffer[:4]
            updated = True

        if not updated and len(self._buffer) >= 3:
            self._decode_packet(self._buffer[0:3])
            del self._buffer[:3]
            updated = True

        return updated

    def _decode_packet(self, packet):
        self.flags = packet[0]
        self.left_speed = _to_signed(packet[1])
        self.right_speed = _to_signed(packet[2])
        self.counter = packet[3] if len(packet) > 3 else self.counter
        self.last_command_ms = ticks_ms()

    def is_brake_requested(self):
        return bool(self.flags & 0x01)

    def is_stale(self):
        return ticks_diff(ticks_ms(), self.last_command_ms) > self._command_timeout_ms

    def reset(self):
        """Clear buffered data and reset command state."""

        self._buffer = bytearray()
        self.flags = 0
        self.left_speed = 0
        self.right_speed = 0
        self.counter = 0
        self.last_command_ms = ticks_ms()

    def send_ultrasonic(self, distance_mm):
        """Send an ultrasonic telemetry update if the rate limit allows."""

        now = ticks_ms()
        if ticks_diff(now, self._last_telemetry_ms) < self._telemetry_interval_ms:
            return False

        self._last_telemetry_ms = now
        distance_mm = max(0, min(int(distance_mm), 65535))
        payload = bytearray(3)
        payload[0] = self.TELEMETRY_ULTRASONIC
        payload[1] = (distance_mm >> 8) & 0xFF
        payload[2] = distance_mm & 0xFF
        self._uart.write(payload)
        return True

    def configure_baudrate(self, baudrate):
        """Allow the baud rate to be changed after initialisation."""

        self._uart.init(baudrate=baudrate)

    def any(self):
        return self._uart.any()
