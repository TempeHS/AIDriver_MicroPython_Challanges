import machine
import math
import utime

# GamePad Input IDs
GAMEPAD_DIGITAL = 0x01
GAMEPAD_ANALOG  = 0x02
GAMEPAD_ACCL    = 0x03

# Button Bit Masks (value0, digital)
START_BIT    = 0
SELECT_BIT   = 1
TRIANGLE_BIT = 2 
CIRCLE_BIT   = 3
CROSS_BIT    = 4
SQUARE_BIT   = 5

# Arrow Bit Masks (value, digital)
UP_BIT       = 0
DOWN_BIT     = 1
LEFT_BIT     = 2
RIGHT_BIT    = 3

# Dabble protocol
START_OF_FRAME = 0xC0
END_OF_FRAME   = 0xC1

class GamePad:
    def __init__(self, uart_id=0, baudrate=115200, tx=0, rx=1):
        self.uart = machine.UART(uart_id, baudrate=baudrate, tx=machine.Pin(tx), rx=machine.Pin(rx))
        self.mode = 0
        self.value0 = 0
        self.value = 0
        self._frame = bytearray()
        self._in_frame = False

    def poll(self):
        while self.uart.any():
            b = self.uart.read(1)
            if b is None:
                return
            byte = b[0]
            if not self._in_frame:
                if byte == START_OF_FRAME:
                    self._frame = bytearray()
                    self._in_frame = True
                continue
            if byte == END_OF_FRAME:
                self._process_frame(self._frame)
                self._in_frame = False
                continue
            self._frame.append(byte)

    def _process_frame(self, buf):
        # Expect: [ModuleID][FunctionID][ArgN][Len0][value0][Len1][value]...
        # We only care about FunctionID, value0, value
        if len(buf) < 7:
            return
        function_id = buf[1]
        if function_id == GAMEPAD_DIGITAL:
            self.mode = 0
            self.value0 = buf[4]
            self.value  = buf[6]
        elif function_id in (GAMEPAD_ANALOG, GAMEPAD_ACCL):
            self.mode = 1
            self.value0 = buf[4]
            self.value  = buf[6]

    # Digital buttons
    def is_start_pressed(self):    return bool(self.value0 & (1 << START_BIT))
    def is_select_pressed(self):   return bool(self.value0 & (1 << SELECT_BIT))
    def is_triangle_pressed(self): return bool(self.value0 & (1 << TRIANGLE_BIT))
    def is_circle_pressed(self):   return bool(self.value0 & (1 << CIRCLE_BIT))
    def is_cross_pressed(self):    return bool(self.value0 & (1 << CROSS_BIT))
    def is_square_pressed(self):   return bool(self.value0 & (1 << SQUARE_BIT))

    # D-pad arrows (digital only)
    def is_up_pressed(self):       return not self.mode and bool(self.value & (1 << UP_BIT))
    def is_down_pressed(self):     return not self.mode and bool(self.value & (1 << DOWN_BIT))
    def is_left_pressed(self):     return not self.mode and bool(self.value & (1 << LEFT_BIT))
    def is_right_pressed(self):    return not self.mode and bool(self.value & (1 << RIGHT_BIT))

    # Analog stick/joystick
    def get_angle(self):
        if not self.mode:
            return 0
        return (self.value >> 3) * 15

    def get_radius(self):
        if not self.mode:
            return 0
        return self.value & 0x07

    def get_x(self):
        if not self.mode:
            return 0.0
        angle = self.get_angle()
        radius = self.get_radius()
        return radius * math.cos(math.radians(angle))

    def get_y(self):
        if not self.mode:
            return 0.0
        angle = self.get_angle()
        radius = self.get_radius()
        return radius * math.sin(math.radians(angle))