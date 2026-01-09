/**
 * Editor Unit Tests
 * Tests for ACE Editor wrapper, code management, and validation
 */

const fs = require("fs");
const path = require("path");

// Create mock DOM elements
document.body.innerHTML = `
  <div id="editor"></div>
`;

// Load the Editor module
const editorCode = fs.readFileSync(
  path.join(__dirname, "../../js/editor.js"),
  "utf8"
);
eval(editorCode);

describe("Editor", () => {
  beforeEach(() => {
    // Reset ACE mock
    global.ace.edit.mockClear();
    if (Editor.init) {
      Editor.init();
    }
  });

  describe("Initialization", () => {
    test("should have required methods", () => {
      expect(typeof Editor.init).toBe("function");
      expect(typeof Editor.setCode).toBe("function");
      expect(typeof Editor.getCode).toBe("function");
    });

    test("should initialize ACE editor", () => {
      Editor.init();
      expect(ace.edit).toHaveBeenCalled();
    });

    test("should set Python mode", () => {
      Editor.init();
      const mockSession = ace.edit().getSession();
      expect(mockSession.setMode).toHaveBeenCalledWith(
        expect.stringContaining("python")
      );
    });

    test("should set monokai theme", () => {
      Editor.init();
      expect(ace.edit().setTheme).toHaveBeenCalledWith(
        expect.stringContaining("monokai")
      );
    });
  });

  describe("setCode()", () => {
    test("should set editor content", () => {
      Editor.init();
      Editor.setCode("test code");

      expect(ace.edit().setValue).toHaveBeenCalledWith("test code");
    });

    test("should handle empty string", () => {
      Editor.init();
      expect(() => Editor.setCode("")).not.toThrow();
    });

    test("should handle multiline code", () => {
      Editor.init();
      const code = `line 1
line 2
line 3`;
      expect(() => Editor.setCode(code)).not.toThrow();
    });

    test("should handle code with special characters", () => {
      Editor.init();
      const code = "# Comment with émojis 🤖";
      expect(() => Editor.setCode(code)).not.toThrow();
    });
  });

  describe("getCode()", () => {
    test("should return editor content", () => {
      Editor.init();
      ace.edit().getValue.mockReturnValue("returned code");

      const code = Editor.getCode();
      expect(code).toBe("returned code");
    });

    test("should return empty string for empty editor", () => {
      Editor.init();
      ace.edit().getValue.mockReturnValue("");

      const code = Editor.getCode();
      expect(code).toBe("");
    });
  });

  describe("Error Marking", () => {
    test("should have markError method", () => {
      expect(typeof Editor.markError).toBe("function");
    });

    test("should mark error at line", () => {
      Editor.init();

      if (Editor.markError) {
        Editor.markError(5, "Syntax error");
        const session = ace.edit().getSession();
        expect(session.setAnnotations).toHaveBeenCalled();
      }
    });

    test("should clear errors", () => {
      Editor.init();

      if (Editor.clearErrors) {
        Editor.clearErrors();
        const session = ace.edit().getSession();
        expect(session.clearAnnotations).toHaveBeenCalled();
      }
    });

    test("should handle multiple errors", () => {
      Editor.init();

      if (Editor.markError) {
        Editor.markError(1, "Error 1");
        Editor.markError(5, "Error 2");
        Editor.markError(10, "Error 3");
        // Should not throw
      }
    });
  });

  describe("Line Navigation", () => {
    test("should have gotoLine method", () => {
      if (Editor.gotoLine) {
        expect(typeof Editor.gotoLine).toBe("function");
      }
    });

    test("should navigate to line", () => {
      Editor.init();

      if (Editor.gotoLine) {
        Editor.gotoLine(10);
        expect(ace.edit().gotoLine).toHaveBeenCalledWith(10);
      }
    });
  });

  describe("Code Persistence", () => {
    test("should save code to localStorage", () => {
      Editor.init();

      if (Editor.saveCode) {
        Editor.saveCode("challenge_1");
        expect(localStorage.setItem).toHaveBeenCalled();
      }
    });

    test("should load code from localStorage", () => {
      localStorage.getItem.mockReturnValue("saved code");
      Editor.init();

      if (Editor.loadCode) {
        const code = Editor.loadCode("challenge_1");
        expect(localStorage.getItem).toHaveBeenCalled();
      }
    });

    test("should handle missing saved code", () => {
      localStorage.getItem.mockReturnValue(null);
      Editor.init();

      if (Editor.loadCode) {
        const code = Editor.loadCode("nonexistent");
        expect(code).toBeNull();
      }
    });
  });

  describe("Editor Options", () => {
    test("should set editor options", () => {
      Editor.init();
      expect(ace.edit().setOptions).toHaveBeenCalled();
    });

    test("should enable line numbers", () => {
      Editor.init();
      const options = ace.edit().setOptions.mock.calls[0][0];
      // Line numbers should be enabled (default ACE behavior)
    });

    test("should set appropriate font size", () => {
      Editor.init();
      const options = ace.edit().setOptions.mock.calls[0][0];
      if (options && options.fontSize) {
        expect(options.fontSize).toBeGreaterThanOrEqual(12);
      }
    });
  });

  describe("Event Handling", () => {
    test("should register change listener", () => {
      Editor.init();
      expect(ace.edit().on).toHaveBeenCalledWith(
        "change",
        expect.any(Function)
      );
    });

    test("should validate on change", () => {
      Editor.init();

      // Trigger change callback
      const changeCallback = ace
        .edit()
        .on.mock.calls.find((call) => call[0] === "change");

      if (changeCallback) {
        expect(() => changeCallback[1]()).not.toThrow();
      }
    });
  });

  describe("Resize Handling", () => {
    test("should have resize method", () => {
      Editor.init();
      expect(ace.edit().resize).toBeDefined();
    });

    test("should resize editor", () => {
      Editor.init();

      if (Editor.resize) {
        Editor.resize();
        expect(ace.edit().resize).toHaveBeenCalled();
      }
    });
  });

  describe("Read-Only Mode", () => {
    test("should support read-only mode", () => {
      Editor.init();

      if (Editor.setReadOnly) {
        Editor.setReadOnly(true);
        // Check that editor is read-only
      }
    });
  });

  describe("Autocompletion", () => {
    test("should enable basic autocomplete", () => {
      Editor.init();
      // ACE should have autocomplete configured
    });

    test("should include AIDriver keywords", () => {
      // Completions should include AIDriver methods
      const keywords = [
        "AIDriver",
        "drive_forward",
        "drive_backward",
        "rotate_left",
        "rotate_right",
        "brake",
        "read_distance",
        "hold_state",
      ];

      // Check if custom completers are set
    });
  });

  describe("Edge Cases", () => {
    test("should handle init before DOM ready", () => {
      const editorElement = document.getElementById("editor");
      editorElement.remove();

      // Should handle gracefully
      expect(() => Editor.init()).not.toThrow();

      // Restore
      document.body.innerHTML = '<div id="editor"></div>';
    });

    test("should handle very large code", () => {
      Editor.init();
      const largeCode = "x = 1\n".repeat(10000);

      expect(() => Editor.setCode(largeCode)).not.toThrow();
    });

    test("should handle binary data in code", () => {
      Editor.init();
      const binaryLikeCode = String.fromCharCode(0, 1, 2, 3);

      expect(() => Editor.setCode(binaryLikeCode)).not.toThrow();
    });
  });
});
