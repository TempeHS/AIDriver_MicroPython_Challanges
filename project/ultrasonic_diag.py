"""Ultrasonic sensor hardware diagnostic v3.

Bypasses the AIDriver library entirely. Tests raw GPIO behaviour
step by step so we can isolate exactly where the signal chain breaks.

Upload to the Pico and run via Arduino MicroPython Lab or REPL.
"""

from machine import Pin, time_pulse_us
from time import sleep_us, sleep_ms, ticks_us, ticks_diff

TRIG_PIN = 7
ECHO_PIN = 6

# GPIOs used by motor driver on the AIDriver PCB — never probe these
MOTOR_GPIOS = {3, 8, 9, 11, 12, 13}
# GPIOs safe to probe (general purpose, not motors, not internal)
SAFE_GPIOS = [g for g in range(0, 29) if g not in MOTOR_GPIOS and g != 25]

TIMEOUT_US = 30000


# ==========================================================
# HELPERS
# ==========================================================
def ping(trig_num, echo_num, settle_ms=60, pulse_us=10):
    """Fire one trigger pulse and return raw time_pulse_us result."""
    trig = Pin(trig_num, Pin.OUT)
    echo = Pin(echo_num, Pin.IN)

    trig.off()
    sleep_ms(settle_ms)

    trig.off()
    sleep_us(2)
    trig.on()
    sleep_us(pulse_us)
    trig.off()

    dur = time_pulse_us(echo, 1, TIMEOUT_US)

    # Release pins
    Pin(trig_num, Pin.IN)
    Pin(echo_num, Pin.IN)
    return dur


def ping_bitbang(trig_num, echo_num, settle_ms=60, pulse_us=10):
    """Bit-bang echo poll — bypasses time_pulse_us entirely."""
    trig = Pin(trig_num, Pin.OUT)
    echo = Pin(echo_num, Pin.IN)

    trig.off()
    sleep_ms(settle_ms)

    trig.off()
    sleep_us(2)
    trig.on()
    sleep_us(pulse_us)
    trig.off()

    t_start = ticks_us()
    rose = -1
    fell = -1
    last_val = echo.value()

    while True:
        elapsed = ticks_diff(ticks_us(), t_start)
        if elapsed > 30000:
            break
        v = echo.value()
        if v == 1 and last_val == 0 and rose < 0:
            rose = elapsed
        if v == 0 and last_val == 1 and fell < 0 and rose >= 0:
            fell = elapsed
            break
        last_val = v

    Pin(trig_num, Pin.IN)
    Pin(echo_num, Pin.IN)

    if rose >= 0 and fell >= 0:
        return fell - rose
    elif rose >= 0:
        return -1  # rose but never fell
    return -2  # never rose


# ==========================================================
# TEST 1  — Can we toggle the trigger pin?
# ==========================================================
def test_trigger_output():
    print("\n[TEST 1] Trigger pin GP{} output toggle".format(TRIG_PIN))
    trig = Pin(TRIG_PIN, Pin.OUT)
    trig.off()
    sleep_ms(10)
    v0 = trig.value()
    trig.on()
    sleep_ms(10)
    v1 = trig.value()
    trig.off()
    Pin(TRIG_PIN, Pin.IN)
    print("  OFF={}, ON={} (expect 0, 1)".format(v0, v1))
    if v0 == 0 and v1 == 1:
        print("  PASS")
        return True
    else:
        print("  FAIL — pin cannot toggle (shorted or driven externally)")
        return False


# ==========================================================
# TEST 2  — Echo pin idle state
# ==========================================================
def test_echo_idle():
    print("\n[TEST 2] Echo pin GP{} idle state".format(ECHO_PIN))
    echo_nopull = Pin(ECHO_PIN, Pin.IN)
    sleep_ms(5)
    v_nopull = echo_nopull.value()
    echo_pd = Pin(ECHO_PIN, Pin.IN, Pin.PULL_DOWN)
    sleep_ms(5)
    v_pd = echo_pd.value()
    echo_pu = Pin(ECHO_PIN, Pin.IN, Pin.PULL_UP)
    sleep_ms(5)
    v_pu = echo_pu.value()
    Pin(ECHO_PIN, Pin.IN)

    print("  No pull={}, PULL_DOWN={}, PULL_UP={}".format(v_nopull, v_pd, v_pu))
    if v_nopull == 0 and v_pd == 0:
        print("  OK — echo LOW at idle")
    elif v_nopull == 1 and v_pd == 1:
        print("  PROBLEM — stuck HIGH even with pull-down")
        print("  (sensor driving it, or TRIG/ECHO swapped)")
    elif v_nopull == 1 and v_pd == 0:
        print("  Floating (normal if sensor not powered)")
    return v_pd


# ==========================================================
# TEST 3  — Normal ping (both methods)
# ==========================================================
def test_normal_ping():
    print("\n[TEST 3] Normal ping GP{}->GP{}".format(TRIG_PIN, ECHO_PIN))
    for i in range(3):
        dur = ping(TRIG_PIN, ECHO_PIN)
        bb = ping_bitbang(TRIG_PIN, ECHO_PIN)
        if dur >= 0:
            print("  #{}: time_pulse={}us ({:.0f}mm)  OK".format(
                i + 1, dur, dur * 0.343 / 2))
        else:
            print("  #{}: time_pulse={}, bitbang={}".format(i + 1, dur, bb))
    return dur if dur >= 0 else bb


# ==========================================================
# TEST 4  — SWAPPED ping (TRIG and ECHO reversed)
# ==========================================================
def test_swapped_ping():
    print("\n[TEST 4] SWAPPED ping GP{}->GP{} (trig/echo reversed)".format(
        ECHO_PIN, TRIG_PIN))
    for i in range(3):
        dur = ping(ECHO_PIN, TRIG_PIN)
        bb = ping_bitbang(ECHO_PIN, TRIG_PIN)
        if dur >= 0:
            print("  #{}: time_pulse={}us ({:.0f}mm)  OK".format(
                i + 1, dur, dur * 0.343 / 2))
            print("  ** TRIG and ECHO wires are SWAPPED! **")
            return dur
        else:
            print("  #{}: time_pulse={}, bitbang={}".format(i + 1, dur, bb))
    return -2


# ==========================================================
# TEST 5  — Trigger pulse width sweep
# ==========================================================
def test_trigger_widths():
    print("\n[TEST 5] Trigger pulse width sweep")
    widths = [5, 10, 20, 50, 100, 500, 1000]
    for w_us in widths:
        dur = ping(TRIG_PIN, ECHO_PIN, pulse_us=w_us)
        if dur >= 0:
            print("  pulse={}us: {}us ({:.0f}mm) OK".format(
                w_us, dur, dur * 0.343 / 2))
            return dur
        else:
            print("  pulse={}us: {}".format(w_us, dur))
    return -2


# ==========================================================
# TEST 6  — Pin presence detection (no jumper wire needed)
#
#   Detects whether something is electrically connected to
#   each pin by measuring charge decay time and pull-up load.
#
#   A floating/disconnected pin has ~50fF pad capacitance and
#   decays in a few microseconds. A pin connected to a PCB
#   trace + sensor input has much more capacitance (and may be
#   actively driven), so it decays differently.
#
#   Also checks if the sensor is sinking current on ECHO by
#   enabling PULL_UP and seeing if it gets pulled LOW (means
#   the sensor's output driver is connected and holding LOW).
# ==========================================================
def _charge_decay_us(gpio_num):
    """Charge a pin HIGH, release to input, count us until it goes LOW."""
    # Drive HIGH
    p = Pin(gpio_num, Pin.OUT)
    p.on()
    sleep_us(50)

    # Release to floating input and time the decay
    p = Pin(gpio_num, Pin.IN)  # no pull
    t0 = ticks_us()
    while p.value() == 1:
        if ticks_diff(ticks_us(), t0) > 5000:
            Pin(gpio_num, Pin.IN)
            return 5000  # still HIGH after 5ms — actively held or very high capacitance
    decay = ticks_diff(ticks_us(), t0)
    Pin(gpio_num, Pin.IN)
    return decay


def _pull_test(gpio_num):
    """Check if something external is driving the pin by fighting pull resistors."""
    # Pull UP — if something pulls it LOW, there's an active driver
    p = Pin(gpio_num, Pin.IN, Pin.PULL_UP)
    sleep_ms(5)
    pu_val = p.value()

    # Pull DOWN — if something pulls it HIGH, there's an active driver
    p = Pin(gpio_num, Pin.IN, Pin.PULL_DOWN)
    sleep_ms(5)
    pd_val = p.value()

    Pin(gpio_num, Pin.IN)
    return pu_val, pd_val


def test_pin_presence():
    print("\n[TEST 6] Pin presence detection (no jumper needed)")
    print("  Checking if sensors are electrically connected...\n")

    # Also test a known-unused pin as a reference baseline
    # GP15 is not used by motors or ultrasonic — good baseline
    ref_pin = 15
    ref_decay = _charge_decay_us(ref_pin)
    ref_pu, ref_pd = _pull_test(ref_pin)
    print("  Reference GP{} (unused): decay={}us, pullup={}, pulldown={}".format(
        ref_pin, ref_decay, ref_pu, ref_pd))

    results = {}
    for label, gpio in [("TRIG", TRIG_PIN), ("ECHO", ECHO_PIN)]:
        decay = _charge_decay_us(gpio)
        pu_val, pd_val = _pull_test(gpio)
        results[label] = (gpio, decay, pu_val, pd_val)

        print("  {} GP{}: decay={}us, pullup={}, pulldown={}".format(
            label, gpio, decay, pu_val, pd_val))

        # Interpret
        connected = False
        if decay > ref_decay * 3 or decay >= 5000:
            print("    -> Significant capacitance — trace/device connected")
            connected = True
        elif decay <= ref_decay + 5:
            print("    -> Low capacitance — may be floating/disconnected")

        if pu_val == 0:
            print("    -> Pin pulled LOW against PULL_UP — sensor output driving LOW")
            connected = True
        if pd_val == 1:
            print("    -> Pin pulled HIGH against PULL_DOWN — sensor output driving HIGH")
            connected = True

        if pu_val == 1 and pd_val == 0 and decay <= ref_decay + 5:
            print("    -> Follows pull resistors, low capacitance = NOTHING CONNECTED")

    # Overall assessment
    print()
    trig_gp, trig_decay, trig_pu, trig_pd = results["TRIG"]
    echo_gp, echo_decay, echo_pu, echo_pd = results["ECHO"]

    trig_conn = (trig_decay > ref_decay * 3) or (trig_pu == 0) or (trig_pd == 1)
    echo_conn = (echo_decay > ref_decay * 3) or (echo_pu == 0) or (echo_pd == 1)

    if trig_conn and echo_conn:
        print("  BOTH PINS have something connected.")
        print("  PCB traces to header appear intact.")
        print("  -> Problem is most likely the SENSOR or its POWER.")
        return "both_connected"
    elif trig_conn and not echo_conn:
        print("  TRIG has something connected but ECHO does not!")
        print("  -> ECHO trace may be broken, or ECHO wire is loose")
        return "trig_only"
    elif not trig_conn and echo_conn:
        print("  ECHO has something connected but TRIG does not!")
        print("  -> TRIG trace may be broken, or TRIG wire is loose")
        return "echo_only"
    else:
        print("  NEITHER PIN has anything connected!")
        print("  -> Sensor is not plugged in, or PCB traces are broken")
        return "nothing"


# ==========================================================
# TEST 7  — Broad GPIO scan
#           Tries every safe GPIO pair to find the sensor.
# ==========================================================
def test_gpio_scan():
    print("\n[TEST 7] GPIO scan — finding the sensor")
    print("  Checking which pins have signals...")

    # First pass: find any pin that's being driven HIGH
    high_pins = []
    for gp in SAFE_GPIOS:
        p = Pin(gp, Pin.IN, Pin.PULL_DOWN)
        sleep_ms(2)
        if p.value() == 1:
            high_pins.append(gp)
        Pin(gp, Pin.IN)

    if high_pins:
        print("  Pins reading HIGH: {}".format(high_pins))
    else:
        print("  No pins reading HIGH")

    # Second pass: try likely pairs near GP6/GP7
    # Test pairs from GP0-GP15 (excluding motor GPIOs)
    candidates = [g for g in range(0, 16) if g not in MOTOR_GPIOS]
    print("  Testing {} candidate GPIOs: {}".format(len(candidates), candidates))

    found = None
    for trig_g in candidates:
        for echo_g in candidates:
            if trig_g == echo_g:
                continue
            dur = ping(trig_g, echo_g, settle_ms=30)
            if dur >= 0:
                mm = dur * 0.343 / 2
                print("\n  ** FOUND: TRIG=GP{} ECHO=GP{} = {}us ({:.0f}mm) **".format(
                    trig_g, echo_g, dur, mm))
                found = (trig_g, echo_g, dur)
                break
        if found:
            break

    if not found:
        # Try extended range GP16-GP22, GP26-GP28 (ADC pins)
        extended = [g for g in SAFE_GPIOS if g >= 16]
        print("  Trying extended range: {}".format(extended))
        for trig_g in extended:
            for echo_g in extended:
                if trig_g == echo_g:
                    continue
                dur = ping(trig_g, echo_g, settle_ms=30)
                if dur >= 0:
                    mm = dur * 0.343 / 2
                    print("\n  ** FOUND: TRIG=GP{} ECHO=GP{} = {}us ({:.0f}mm) **".format(
                        trig_g, echo_g, dur, mm))
                    found = (trig_g, echo_g, dur)
                    break
            if found:
                break

    return found


# ==========================================================
# RUN ALL TESTS
# ==========================================================
print("=" * 50)
print("  Ultrasonic Sensor Diagnostic v3")
print("  Expected: TRIG=GP{}  ECHO=GP{}".format(TRIG_PIN, ECHO_PIN))
print("=" * 50)

trig_ok = test_trigger_output()
echo_idle = test_echo_idle()

normal = test_normal_ping()
swapped = test_swapped_ping()
width_result = test_trigger_widths()
presence = test_pin_presence()

found_pair = None
if normal < 0 and swapped < 0:
    found_pair = test_gpio_scan()

# ==========================================================
# DIAGNOSIS
# ==========================================================
print("\n" + "=" * 50)
print("  DIAGNOSIS")
print("=" * 50)

if normal >= 0:
    mm = normal * 0.343 / 2
    print("Sensor works on GP{}/GP{}: {:.0f}mm".format(TRIG_PIN, ECHO_PIN, mm))
    print("Library should work. If it still returns -1,")
    print("check the distance range (20-2000mm).")

elif swapped >= 0:
    mm = swapped * 0.343 / 2
    print("TRIG and ECHO wires are SWAPPED!")
    print("Sensor works when TRIG=GP{}, ECHO=GP{} ({:.0f}mm)".format(
        ECHO_PIN, TRIG_PIN, mm))
    print()
    print("FIX: Swap the two wires on the sensor header,")
    print("OR pass swapped pins to AIDriver:")
    print("  robot = AIDriver(trig_pin={}, echo_pin={})".format(ECHO_PIN, TRIG_PIN))

elif found_pair:
    tg, eg, dur = found_pair
    mm = dur * 0.343 / 2
    print("Sensor found on DIFFERENT pins!")
    print("  TRIG=GP{}, ECHO=GP{} ({:.0f}mm)".format(tg, eg, mm))
    print()
    print("FIX: robot = AIDriver(trig_pin={}, echo_pin={})".format(tg, eg))

elif width_result >= 0:
    print("Sensor responded to a non-standard trigger width.")
    print("May need a firmware change to adjust trigger pulse.")

else:
    print("NO SENSOR RESPONSE on any GPIO.")
    print()
    if not trig_ok:
        print("GP{} CANNOT TOGGLE — this pin may be damaged".format(TRIG_PIN))
        print("or the sensor/PCB is shorting it.")
        print()

    if presence == "both_connected":
        print("BUT: Both pins detect something connected (TEST 6).")
        print("PCB traces and wiring are likely fine.")
        print()
        print("This means the SENSOR is not responding to triggers.")
        print("Most likely cause: HC-SR04 TRIG needs 5V logic HIGH")
        print("but the Pico outputs 3.3V. Some HC-SR04 don't recognise")
        print("3.3V as HIGH.")
        print()
        print("Try:")
        print(" 1. Use RCWL-1601 instead (3.3V compatible)")
        print(" 2. If you already tried RCWL-1601 and it also failed:")
        print("    check the sensor VCC is actually getting power")
        print("    (LED on the sensor board should glow)")
        print(" 3. Try a different sensor from another batch")
        print(" 4. Try powering from a wall USB charger (more current)")
    elif presence == "nothing":
        print("TEST 6 says NOTHING is connected to either pin.")
        print()
        print("Either:")
        print(" 1. Sensor is not plugged in (check header)")
        print(" 2. PCB traces from Pico to header are broken")
        print("    (inspect solder joints under magnification)")
        print(" 3. Jumper wires are not making contact")
    elif presence == "trig_only":
        print("TEST 6 says TRIG is connected but ECHO is not.")
        print("Check the ECHO wire or PCB trace.")
    elif presence == "echo_only":
        print("TEST 6 says ECHO is connected but TRIG is not.")
        print("Check the TRIG wire or PCB trace.")

print("=" * 50)
