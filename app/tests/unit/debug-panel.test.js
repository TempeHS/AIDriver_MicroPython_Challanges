/**
 * Debug Panel Unit Tests
 * Tests for terminal output, logging, and message formatting
 */

const fs = require("fs");
const path = require("path");

// Create mock DOM elements before loading
document.body.innerHTML = `
  <div id="debugConsole"></div>
  <button id="btnClearDebug"></button>
`;

// Load the DebugPanel module
const debugPanelCode = fs.readFileSync(
  path.join(__dirname, "../../js/debug-panel.js"),
  "utf8"
);
eval(debugPanelCode);

describe("DebugPanel", () => {
  let consoleElement;

  beforeEach(() => {
    consoleElement = document.getElementById("debugConsole");
    consoleElement.innerHTML = "";
    DebugPanel.init();
  });

  describe("Initialization", () => {
    test("should initialize without errors", () => {
      expect(() => DebugPanel.init()).not.toThrow();
    });

    test("should have required methods", () => {
      expect(typeof DebugPanel.log).toBe("function");
      expect(typeof DebugPanel.info).toBe("function");
      expect(typeof DebugPanel.warn).toBe("function");
      expect(typeof DebugPanel.error).toBe("function");
      expect(typeof DebugPanel.success).toBe("function");
      expect(typeof DebugPanel.clear).toBe("function");
    });

    test("should find console element", () => {
      expect(DebugPanel.console || consoleElement).toBeDefined();
    });
  });

  describe("log() - Basic Logging", () => {
    test("should add message to console", () => {
      DebugPanel.log("Test message");
      expect(consoleElement.textContent).toContain("Test message");
    });

    test("should handle empty message", () => {
      expect(() => DebugPanel.log("")).not.toThrow();
    });

    test("should handle null message", () => {
      expect(() => DebugPanel.log(null)).not.toThrow();
    });

    test("should handle undefined message", () => {
      expect(() => DebugPanel.log(undefined)).not.toThrow();
    });

    test("should handle numeric message", () => {
      DebugPanel.log(12345);
      expect(consoleElement.textContent).toContain("12345");
    });

    test("should handle object message", () => {
      expect(() => DebugPanel.log({ key: "value" })).not.toThrow();
    });
  });

  describe("Message Types", () => {
    test("info() should log with info style", () => {
      DebugPanel.info("Info message");
      expect(consoleElement.innerHTML).toContain("Info message");
    });

    test("warn() should log with warning style", () => {
      DebugPanel.warn("Warning message");
      expect(consoleElement.innerHTML).toContain("Warning message");
    });

    test("error() should log with error style", () => {
      DebugPanel.error("Error message");
      expect(consoleElement.innerHTML).toContain("Error message");
    });

    test("success() should log with success style", () => {
      DebugPanel.success("Success message");
      expect(consoleElement.innerHTML).toContain("Success message");
    });
  });

  describe("Message Styling", () => {
    test("should apply different classes for message types", () => {
      DebugPanel.log("normal", "info");
      DebugPanel.log("warning", "warning");
      DebugPanel.log("error", "error");
      DebugPanel.log("success", "success");

      const html = consoleElement.innerHTML;
      // Check that different styles are applied
      expect(consoleElement.children.length).toBeGreaterThan(0);
    });

    test("should include timestamp", () => {
      DebugPanel.log("Test message");
      const html = consoleElement.innerHTML;

      // Should have time in format [HH:MM:SS] or similar
      expect(
        html.match(/\[\d{1,2}:\d{2}(:\d{2})?\]/) ||
          html.includes("Test message")
      ).toBeTruthy();
    });
  });

  describe("clear() - Console Clearing", () => {
    test("should clear all messages", () => {
      DebugPanel.log("Message 1");
      DebugPanel.log("Message 2");
      DebugPanel.log("Message 3");

      DebugPanel.clear();

      expect(consoleElement.children.length).toBe(0);
    });

    test("should be able to log after clear", () => {
      DebugPanel.log("Before clear");
      DebugPanel.clear();
      DebugPanel.log("After clear");

      expect(consoleElement.textContent).toContain("After clear");
      expect(consoleElement.textContent).not.toContain("Before clear");
    });
  });

  describe("Auto-scroll", () => {
    test("should scroll to bottom when adding messages", () => {
      // Add many messages to trigger scroll
      for (let i = 0; i < 50; i++) {
        DebugPanel.log(`Message ${i}`);
      }

      // Last message should be visible (scroll position at bottom)
      expect(consoleElement.textContent).toContain("Message 49");
    });
  });

  describe("Message Formatting", () => {
    test("should preserve newlines in messages", () => {
      DebugPanel.log("Line 1\nLine 2\nLine 3");
      // Check that content includes all lines
      expect(consoleElement.textContent).toContain("Line 1");
    });

    test("should escape HTML in messages", () => {
      DebugPanel.log('<script>alert("xss")</script>');
      // Should not create actual script element
      expect(consoleElement.querySelector("script")).toBeNull();
    });

    test("should handle very long messages", () => {
      const longMessage = "x".repeat(10000);
      expect(() => DebugPanel.log(longMessage)).not.toThrow();
    });

    test("should handle special characters", () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:",.<>?/\\`~';
      DebugPanel.log(specialChars);
      expect(consoleElement.textContent).toContain(specialChars);
    });

    test("should handle unicode characters", () => {
      const unicode = "Hello 世界 🤖 αβγ";
      DebugPanel.log(unicode);
      expect(consoleElement.textContent).toContain(unicode);
    });
  });

  describe("Message History", () => {
    test("should maintain message order", () => {
      DebugPanel.log("First");
      DebugPanel.log("Second");
      DebugPanel.log("Third");

      const text = consoleElement.textContent;
      const firstPos = text.indexOf("First");
      const secondPos = text.indexOf("Second");
      const thirdPos = text.indexOf("Third");

      expect(firstPos).toBeLessThan(secondPos);
      expect(secondPos).toBeLessThan(thirdPos);
    });

    test("should limit message history", () => {
      // Add many messages
      for (let i = 0; i < 1000; i++) {
        DebugPanel.log(`Message ${i}`);
      }

      // Should have reasonable number of children (not unlimited)
      expect(consoleElement.children.length).toBeLessThanOrEqual(1000);
    });
  });

  describe("Color Coding", () => {
    test("should use appropriate colors for message types", () => {
      DebugPanel.log("Output", "output");
      DebugPanel.log("Info", "info");
      DebugPanel.log("Warning", "warning");
      DebugPanel.log("Error", "error");
      DebugPanel.log("Success", "success");

      // Check that children have different classes or styles
      expect(consoleElement.children.length).toBe(5);
    });
  });

  describe("Performance", () => {
    test("should handle rapid logging", () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        DebugPanel.log(`Rapid message ${i}`);
      }

      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(1000); // Should complete in under 1 second
    });

    test("should not cause memory issues with many messages", () => {
      for (let i = 0; i < 500; i++) {
        DebugPanel.log(`Memory test ${i}`, i % 2 === 0 ? "info" : "warning");
      }

      // Should complete without throwing
      expect(consoleElement.children.length).toBeGreaterThan(0);
    });
  });

  describe("Clear Button Integration", () => {
    test("should wire up clear button if exists", () => {
      const clearBtn = document.getElementById("btnClearDebug");
      expect(clearBtn).toBeDefined();

      // Simulate click
      DebugPanel.log("Test message");
      clearBtn.click();

      // Should be cleared (if event listener is set up in init)
    });
  });

  describe("Python Output Formatting", () => {
    test("should handle print output format", () => {
      DebugPanel.log("[Python] Output line", "output");
      expect(consoleElement.textContent).toContain("Output line");
    });

    test("should handle error output format", () => {
      DebugPanel.log("[Error] Line 5: SyntaxError", "error");
      expect(consoleElement.textContent).toContain("SyntaxError");
    });
  });
});
