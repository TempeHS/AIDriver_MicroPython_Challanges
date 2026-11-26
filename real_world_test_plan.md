| Test | Command Inputs                                      | Measurement(s)                                            | Purpose                                      | Simulator Update                                                    | Results                                           |
| ---- | --------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------- |
| 1    | Left=150, Right=200, run until heading change ≥360° | Circle diameter (centre-to-centre), time to complete loop | Quantify turn radius vs speed differential   | Adjust wheel base or speed-to-mm scaling for curved paths           | RESULT1                                           |
| 2    | Left=200, Right=200, run 2 s                        | Linear displacement, heading drift                        | Validate straight-line scale and symmetry    | Tune MM_PER_SPEED_UNIT and correct systematic yaw bias              | 120mm distance, with 2.5 degree drift each second |
| 3    | Left=200, Right=200, run 5 s                        | Displacement vs time samples                              | Check linearity across longer window         | Refine acceleration/friction assumptions if displacement non-linear | 280mm with with 2.5 degree drift each second      |
| 4    | Left=200, Right=0, run 1 s                          | Arc radius and swept angle                                | Characterize extreme differential turns      | Update angular velocity formula and wheel slip factor               | 200 degree turn                                   |
| 5    | Start near obstacle, Left=Right=120, run until stop | Actual front-wall distance readings vs simulated          | Calibrate ultrasonic offset/noise floor      | Offset sensor origin and noise model                                | RESULT5                                           |
| 6    | rotate_right(150), run 2 s                          | Angular displacement (degrees turned)                     | Measure rotation speed at medium power       | Calibrate angular velocity for rotate methods                       | RESULT6                                           |
| 7    | rotate_right(200), run 2 s                          | Angular displacement (degrees turned)                     | Measure rotation speed at high power         | Verify rotation speed scales linearly with power                    | RESULT7                                           |
| 8    | rotate_left(150), run 2 s                           | Angular displacement (degrees turned)                     | Compare left vs right rotation symmetry      | Correct any left/right asymmetry in rotation                        | RESULT8                                           |
| 9    | Left=180, Right=200, run until 360° turn            | Turn radius and time to complete circle                   | Measure tight circle turning                 | Refine differential drive model for small radius turns              | RESULT9                                           |
| 10   | Left=100, Right=200, run until 360° turn            | Turn radius and time to complete circle                   | Measure wide circle with bigger differential | Validate turning model across speed differential range              | RESULT10                                          |

## Notes:

- Once the measurements arrive, I will fit MM_PER_SPEED_UNIT, wheel base, and optional slip factors so simulated displacement and turning match.
- Sensor datasets will drive adjustments to the ultrasonic origin offset, noise amplitude, and clipping thresholds.
- Time-response or lag data lets me decide whether to add acceleration smoothing, motor delay, or drift correction in updateKinematics.

## Simulator upload (Web Serial) checklist

Run on a real AIDriver robot with the latest firmware, in Chrome on a computer and on a school Chromebook. See `Web_Serial_Upload_Design.md` §12.

| # | Steps | Expected | Chrome | Chromebook |
| - | ----- | -------- | ------ | ---------- |
| W1 | Fresh browser profile: **Connect robot**, pick the Pico | Picker lists the Pico; status shows `Pico connected`; debug shows MicroPython and AIDriver versions | | |
| W2 | Reload the page, **Connect robot** again | Connects without showing the picker | | |
| W3 | With the default `main.py` hardware test running, press **Connect robot** | Program stops; debug panel shows the connection | | |
| W4 | **Upload** the Challenge 1 starter | "Uploaded to robot as main.py (…, checked)"; robot doesn't move; unplug and power on runs the new code | | |
| W5 | **Upload & Run** | No pop-up; robot runs the new code; `print()` output appears as `[Robot]` lines; "Program finished" when it ends | | |
| W6 | **Logs** after a run | New tab shows This run / Previous run; Copy, Download and Refresh work | | |
| W7 | **Logs** with pop-ups blocked | Logs open in a dialog on the simulator page | | |
| W8 | Unplug the USB cable during **Upload** of a long program, plug back in | "Trying to reconnect…" then reconnects; the previous `main.py` still runs on power-up | | |
| W9 | Upload a program with `try: … except: pass` around `while True`, run it, press **Stop robot** | Stops after retries, or shows the GP4 recovery message | | |
| W10 | Open the Pico in MicroPython Lab, then press **Connect robot** | "The robot is being used by another program or tab" | | |
| W11 | Open the simulator in Firefox | Robot toolbar in the editor header replaced by "Upload needs Chrome or Edge" | | |
| W12 | Narrow the window to tablet width | Robot buttons show icons only (tooltips name them); all stay visible and usable | | |
| W13 | Hover over each Robot button before connecting, then after connecting | Every button shows a tooltip; greyed-out ones say "Connect a robot first."; after connecting the tooltips describe each action | | |
