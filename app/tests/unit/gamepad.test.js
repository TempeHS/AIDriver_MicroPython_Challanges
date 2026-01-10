/**
 * Gamepad Module Tests
 * Focused on joystick-to-wheel speed mapping logic
 */

const Gamepad = require("../../js/gamepad.js");

describe("Gamepad.calculateMotorSpeeds", () => {
  test("returns brake for inputs in deadzone", () => {
    const result = Gamepad.calculateMotorSpeeds(0.05, 0.05);
    expect(result.left).toBe(0);
    expect(result.right).toBe(0);
    expect(result.brake).toBe(true);
  });

  test("maps forward input to maximum speed", () => {
    const result = Gamepad.calculateMotorSpeeds(0, 1);
    expect(result.left).toBe(255);
    expect(result.right).toBe(255);
    expect(result.brake).toBe(false);
  });

  test("maps backward input to negative maximum", () => {
    const result = Gamepad.calculateMotorSpeeds(0, -1);
    expect(result.left).toBe(-255);
    expect(result.right).toBe(-255);
    expect(result.brake).toBe(false);
  });

  test("applies differential steering for right turn", () => {
    const result = Gamepad.calculateMotorSpeeds(0.5, 1);
    expect(result.left).toBe(255); // clamped
    expect(result.right).toBeGreaterThan(0);
    expect(result.right).toBeLessThan(result.left);
    expect(result.brake).toBe(false);
  });

  test("produces spin turn when joystick is horizontal", () => {
    const result = Gamepad.calculateMotorSpeeds(-1, 0);
    expect(result.left).toBe(-255);
    expect(result.right).toBe(255);
    expect(result.brake).toBe(false);
  });
});

describe("Gamepad public API", () => {
  test("getState returns the last computed speeds", () => {
    const state = Gamepad.getState();
    expect(state).toEqual({ left: 0, right: 0, brake: true });
  });
});
