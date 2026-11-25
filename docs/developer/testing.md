# Testing Strategy

Testing lives inside `app/tests/` and uses Jest with the `jest-environment-jsdom` environment. Suites are organised by type:

- `tests/unit/` – Focused coverage for individual modules like the simulator engine, validator, and editor wiring
- `tests/integration/` – Cross-module scenarios covering Python execution, BLE gamepad integration, and end-to-end challenge completion
- `tests/helpers/load-app.js` – Shared loader used by the suites to run the **real** `js/` files (see below)
- `tests/lint/` – Static analysis harnesses that ensure every HTML and JavaScript file under `app/` stays standards-compliant
- Standalone HTML harnesses (e.g. `tests/integration-test.html`) exist for manual verification in the browser

## Running Tests

```bash
cd app
npm test
```

The default script executes the full suite with coverage reporting and runs the HTML/JS lint harness. Expect jsdom to warn about unimplemented canvas APIs when simulator rendering tests exercise `HTMLCanvasElement.getContext`; these warnings are currently benign.

### Targeted Runs

- `npm run test:unit` – Unit tests only
- `npm run test:integration` – Integration suites only
- `npm run test:watch` – Re-runs affected tests on file changes
- `npm run test:verbose` – Adds verbose reporting with coverage

## Coverage

`npm test` prints a text coverage summary. Note that the `js/` files are loaded with `eval` (see below), so Jest cannot instrument them and the summary does not reflect coverage of the app code.

## Writing New Tests

Always test the real source files – never copy module code into a test.

The `js/` files are plain browser scripts, so load them with `tests/helpers/load-app.js`:

```js
const { loadModules, loadSkulpt, captureDebugPanel, makeRobot } = require("../helpers/load-app");

beforeAll(() => loadSkulpt()); // only when running Python
beforeEach(() => {
  loadModules(["simulator.js", "aidriver-stub.js", "python-runner.js", "app.js"]);
  window.render = () => {}; // override dependencies after loading if needed
});
```

- `loadModules(files)` evaluates the files as global scripts (top-level `const` becomes `var`), so each module (`Simulator`, `PythonRunner`, `App`, ...) is published on `window`, replacing the placeholder mocks from `tests/setup.js`. Calling it again gives fresh module state.
- `loadSkulpt()` loads Skulpt from the `skulpt` dev dependency, pinned to the same version `simulator.html` loads from the CDN, so learner Python runs through the real interpreter.
- `captureDebugPanel()` swaps in a recorder for debug-panel output; `makeRobot()` returns a fresh `App.robot`-shaped state.
- `tests/integration/real-runtime.test.js` is a compact example of running Python end to end.

Other conventions:

1. Place unit tests under `tests/unit/` and mirror the module name, e.g. `simulator.test.js`
2. Keep test data deterministic; stub the ultrasonic noise with `jest.spyOn(Math, "random")`
3. Test behaviour through the public API; do not assert on constants or restate the implementation

## Manual Verification

- Open `app/index.html` in a browser and use DevTools to watch `DebugPanel` output while running learner code
- The integration HTML pages provide minimal bootstrapping when diagnosing issues that are hard to reproduce under Jest
- When modifying the `aidriver` module or step mode, run code in step mode in the browser to confirm line highlighting and robot motion look correct
