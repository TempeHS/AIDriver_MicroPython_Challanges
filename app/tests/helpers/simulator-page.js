/**
 * Shared pieces for tests that boot the real simulator page: the body markup
 * of simulator.html (without scripts) and an in-memory stand-in for the ACE
 * editor, which the browser loads from a CDN.
 */

const fs = require("fs");
const path = require("path");

const SIMULATOR_BODY = fs
  .readFileSync(path.join(__dirname, "..", "..", "simulator.html"), "utf8")
  .match(/<body[^>]*>([\s\S]*)<\/body>/i)[1]
  .replace(/<script\b[\s\S]*?<\/script>/gi, "");

// Minimal in-memory stand-in for the ACE editor (a CDN global in the browser)
function createFakeAce() {
  class Range {
    constructor(startRow, startCol, endRow, endCol) {
      this.start = { row: startRow, column: startCol };
      this.end = { row: endRow, column: endCol };
    }
  }
  return {
    require: () => ({ Range }),
    edit() {
      const changeListeners = [];
      let value = "";
      let nextMarkerId = 1;
      return {
        session: {
          annotations: [],
          markers: new Map(),
          setMode() {},
          getAnnotations() {
            return this.annotations;
          },
          setAnnotations(a) {
            this.annotations = a;
          },
          addMarker(range, clazz) {
            const id = nextMarkerId++;
            this.markers.set(id, { row: range.start.row, clazz });
            return id;
          },
          removeMarker(id) {
            this.markers.delete(id);
          },
        },
        commands: { addCommand() {} },
        setTheme() {},
        setOptions() {},
        scrollToLine() {},
        resize() {},
        on(event, fn) {
          if (event === "change") changeListeners.push(fn);
        },
        getValue: () => value,
        setValue(text) {
          value = text;
          changeListeners.forEach((fn) => fn({}));
        },
      };
    },
  };
}

module.exports = { SIMULATOR_BODY, createFakeAce };
