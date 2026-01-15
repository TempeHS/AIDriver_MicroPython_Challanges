| Test | Command Inputs                                                         | Measurement(s)                                            | Purpose                                    | Simulator Update                                                    |
| ---- | ---------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| 1    | Left=150, Right=200, run until heading change ≥360°                    | Circle diameter (centre-to-centre), time to complete loop | Quantify turn radius vs speed differential | Adjust wheel base or speed-to-mm scaling for curved paths           |
| 2    | Left=200, Right=200, run 2 s                                           | Linear displacement, heading drift                        | Validate straight-line scale and symmetry  | Tune MM_PER_SPEED_UNIT and correct systematic yaw bias              |
| 3    | Left=200, Right=200, run 5 s                                           | Displacement vs time samples                              | Check linearity across longer window       | Refine acceleration/friction assumptions if displacement non-linear |
| 4    | Left=200, Right=0, run 1 s                                             | Arc radius and swept angle                                | Characterize extreme differential turns    | Update angular velocity formula and wheel slip factor               |
| 5    | Start near obstacle, Left=Right=120, run until stop                    | Actual front-wall distance readings vs simulated          | Calibrate ultrasonic offset/noise floor    | Offset sensor origin and noise model                                |
| 6    | Rotate in place: Left=−150, Right=150, 10 rot/s command (if available) | Angular rate (deg/s)                                      | Measure pure rotation response             | Align angular velocity mapping and inertia                          |
| 7    | Step test: Left=Right jumps 0→200                                      | Time to reach steady speed, displacement profile          | Capture response lag                       | Introduce motor ramp or slip compensation                           |
| 8    | Obstacle approach: Left=Right=100, start 1000 mm from wall             | Distance readings every 100 mm                            | Validate sensor linearity                  | Adjust sensor range curve or clamp behaviour                        |
| 9    | Diagonal drift: Left=220, Right=200, run 3 s                           | Final pose (x,y,heading)                                  | Cross-check asymmetrical speeds            | Fine-tune differential drive asymmetry                              |
| 10   | Reverse drive: Left=Right=−150, run 2 s                                | Displacement backward, heading drift                      | Ensure reverse motion matches forward      | Mirror linear scaling constants for reverse                         |

## Notes:

- Once the measurements arrive, I will fit MM_PER_SPEED_UNIT, wheel base, and optional slip factors so simulated displacement and turning match.
- Sensor datasets will drive adjustments to the ultrasonic origin offset, noise amplitude, and clipping thresholds.
- Time-response or lag data lets me decide whether to add acceleration smoothing, motor delay, or drift correction in updateKinematics.
