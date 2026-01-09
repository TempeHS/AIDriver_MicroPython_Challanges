/**
 * AIDriver Simulator - Code Validator
 * Enforces strict usage of the AIDriver library
 */

const Validator = (function () {
  "use strict";

  // Allowed imports
  const ALLOWED_IMPORTS = new Set(["aidriver", "time"]);

  // Allowed from aidriver imports
  const ALLOWED_FROM_AIDRIVER = new Set(["AIDriver", "hold_state"]);

  // Allowed builtins
  const ALLOWED_BUILTINS = new Set([
    // Core Python builtins
    "print",
    "range",
    "len",
    "int",
    "float",
    "str",
    "bool",
    "list",
    "dict",
    "tuple",
    "set",
    "abs",
    "min",
    "max",
    "sum",
    "round",
    "type",
    "isinstance",
    "True",
    "False",
    "None",
    // Control flow related
    "break",
    "continue",
    "pass",
    // Exceptions
    "Exception",
    "ValueError",
    "TypeError",
    "RuntimeError",
  ]);

  // AIDriver class allowed methods
  const AIDRIVER_METHODS = new Set([
    "drive_forward",
    "drive_backward",
    "rotate_left",
    "rotate_right",
    "brake",
    "read_distance",
    "is_moving",
    "get_motor_speeds",
  ]);

  // Forbidden patterns - things we don't want in student code
  const FORBIDDEN_PATTERNS = [
    { pattern: /\bexec\s*\(/, message: "exec() is not allowed" },
    { pattern: /\beval\s*\(/, message: "eval() is not allowed" },
    {
      pattern: /\bopen\s*\(/,
      message: "open() is not allowed (no file access)",
    },
    { pattern: /\b__import__\s*\(/, message: "__import__() is not allowed" },
    { pattern: /\bcompile\s*\(/, message: "compile() is not allowed" },
    { pattern: /\bglobals\s*\(/, message: "globals() is not allowed" },
    { pattern: /\blocals\s*\(/, message: "locals() is not allowed" },
    { pattern: /\bgetattr\s*\(/, message: "getattr() is not allowed" },
    { pattern: /\bsetattr\s*\(/, message: "setattr() is not allowed" },
    { pattern: /\bdelattr\s*\(/, message: "delattr() is not allowed" },
    { pattern: /\bimport\s+os\b/, message: "os module is not allowed" },
    { pattern: /\bimport\s+sys\b/, message: "sys module is not allowed" },
    {
      pattern: /\bimport\s+subprocess\b/,
      message: "subprocess module is not allowed",
    },
    { pattern: /\bfrom\s+os\s+import/, message: "os module is not allowed" },
    { pattern: /\bfrom\s+sys\s+import/, message: "sys module is not allowed" },
  ];

  /**
   * Parse import statements from code
   * @param {string} code - Python code
   * @returns {Array} - List of import info objects
   */
  function parseImports(code) {
    const imports = [];
    const lines = code.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + 1;

      // Match "import module" or "import module as alias"
      const importMatch = line.match(/^import\s+(\w+)(?:\s+as\s+\w+)?$/);
      if (importMatch) {
        imports.push({
          type: "import",
          module: importMatch[1],
          line: lineNum,
        });
        continue;
      }

      // Match "from module import ..."
      const fromMatch = line.match(/^from\s+(\w+)\s+import\s+(.+)$/);
      if (fromMatch) {
        const module = fromMatch[1];
        const names = fromMatch[2]
          .split(",")
          .map((n) => n.trim().split(/\s+as\s+/)[0]);
        imports.push({
          type: "from",
          module: module,
          names: names,
          line: lineNum,
        });
      }
    }

    return imports;
  }

  /**
   * Validate Python code
   * @param {string} code - Python code to validate
   * @returns {object} - { valid: boolean, errors: [], warnings: [] }
   */
  function validate(code) {
    const errors = [];
    const warnings = [];

    // Check for forbidden patterns
    for (const { pattern, message } of FORBIDDEN_PATTERNS) {
      const match = code.match(pattern);
      if (match) {
        // Find line number
        const beforeMatch = code.substring(0, match.index);
        const lineNum = beforeMatch.split("\n").length;
        errors.push({
          line: lineNum,
          message: message,
          type: "forbidden",
        });
      }
    }

    // Parse and validate imports
    const imports = parseImports(code);
    let hasAIDriverImport = false;

    for (const imp of imports) {
      if (imp.type === "import") {
        if (!ALLOWED_IMPORTS.has(imp.module)) {
          errors.push({
            line: imp.line,
            message: `Module '${imp.module}' is not allowed. Only 'aidriver' and 'time' are permitted.`,
            type: "import",
          });
        }
        if (imp.module === "aidriver") {
          hasAIDriverImport = true;
        }
      } else if (imp.type === "from") {
        if (!ALLOWED_IMPORTS.has(imp.module)) {
          errors.push({
            line: imp.line,
            message: `Module '${imp.module}' is not allowed. Only 'aidriver' is permitted.`,
            type: "import",
          });
        } else if (imp.module === "aidriver") {
          hasAIDriverImport = true;
          for (const name of imp.names) {
            if (name !== "*" && !ALLOWED_FROM_AIDRIVER.has(name)) {
              warnings.push({
                line: imp.line,
                message: `'${name}' is not a known export from aidriver. Expected: AIDriver, hold_state`,
                type: "import",
              });
            }
          }
        }
      }
    }

    // Check if aidriver is imported
    if (!hasAIDriverImport) {
      warnings.push({
        line: 1,
        message:
          "No aidriver import found. You need to import AIDriver to control the robot.",
        type: "import",
      });
    }

    // Check for AIDriver instantiation
    if (!code.includes("AIDriver(")) {
      warnings.push({
        line: 1,
        message:
          "No AIDriver instance created. You need to create an AIDriver object.",
        type: "usage",
      });
    }

    // Check for basic syntax issues using simple heuristics
    const syntaxChecks = checkBasicSyntax(code);
    errors.push(...syntaxChecks.errors);
    warnings.push(...syntaxChecks.warnings);

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
    };
  }

  /**
   * Check for basic Python syntax issues
   * @param {string} code - Python code
   * @returns {object} - { errors: [], warnings: [] }
   */
  function checkBasicSyntax(code) {
    const errors = [];
    const warnings = [];
    const lines = code.split("\n");

    let inMultilineString = false;
    let multilineStringChar = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (trimmed === "" || trimmed.startsWith("#")) {
        continue;
      }

      // Track multiline strings
      const tripleQuotes = trimmed.match(/'''/g) || [];
      const tripleDoubleQuotes = trimmed.match(/"""/g) || [];

      if (tripleQuotes.length % 2 !== 0) {
        inMultilineString = !inMultilineString;
        multilineStringChar = "'''";
      }
      if (tripleDoubleQuotes.length % 2 !== 0) {
        inMultilineString = !inMultilineString;
        multilineStringChar = '"""';
      }

      if (inMultilineString) continue;

      // Check for missing colon after control statements
      const controlStatements = [
        /^if\s+.+[^:]$/,
        /^elif\s+.+[^:]$/,
        /^else[^:]$/,
        /^while\s+.+[^:]$/,
        /^for\s+.+[^:]$/,
        /^def\s+.+[^:]$/,
        /^class\s+.+[^:]$/,
        /^try[^:]$/,
        /^except.*[^:]$/,
        /^finally[^:]$/,
      ];

      for (const pattern of controlStatements) {
        if (pattern.test(trimmed) && !trimmed.endsWith(":")) {
          errors.push({
            line: lineNum,
            message: "Missing colon ':' at end of statement",
            type: "syntax",
          });
          break;
        }
      }

      // Check for common typos
      if (trimmed.includes("pritn(") || trimmed.includes("pirnt(")) {
        errors.push({
          line: lineNum,
          message: "Did you mean 'print'?",
          type: "typo",
        });
      }

      if (trimmed.includes("whlie ") || trimmed.includes("wihle ")) {
        errors.push({
          line: lineNum,
          message: "Did you mean 'while'?",
          type: "typo",
        });
      }

      if (trimmed.includes("ture") || trimmed.includes("Ture")) {
        warnings.push({
          line: lineNum,
          message: "Did you mean 'True'?",
          type: "typo",
        });
      }

      if (trimmed.includes("flase") || trimmed.includes("Flase")) {
        warnings.push({
          line: lineNum,
          message: "Did you mean 'False'?",
          type: "typo",
        });
      }

      // Check for unbalanced parentheses on single line
      const openParens = (line.match(/\(/g) || []).length;
      const closeParens = (line.match(/\)/g) || []).length;
      if (
        openParens !== closeParens &&
        !line.includes("'''") &&
        !line.includes('"""')
      ) {
        // This might be intentional multi-line, just warn
        if (Math.abs(openParens - closeParens) > 1) {
          warnings.push({
            line: lineNum,
            message: "Parentheses may be unbalanced",
            type: "syntax",
          });
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate that code uses proper AIDriver method calls
   * @param {string} code - Python code
   * @returns {Array} - List of method usage warnings
   */
  function validateMethodUsage(code) {
    const warnings = [];
    const lines = code.split("\n");

    // Look for robot method calls
    const methodCallPattern = /\.(\w+)\s*\(/g;
    let match;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Reset regex
      methodCallPattern.lastIndex = 0;

      while ((match = methodCallPattern.exec(line)) !== null) {
        const methodName = match[1];

        // Check if it looks like an AIDriver method but isn't valid
        if (
          methodName.startsWith("drive") ||
          methodName.startsWith("rotate") ||
          methodName.startsWith("read") ||
          methodName.startsWith("is_") ||
          methodName.startsWith("get_")
        ) {
          if (!AIDRIVER_METHODS.has(methodName)) {
            warnings.push({
              line: lineNum,
              message: `Unknown AIDriver method '${methodName}'. Valid methods: ${Array.from(
                AIDRIVER_METHODS
              ).join(", ")}`,
              type: "method",
            });
          }
        }
      }
    }

    return warnings;
  }

  /**
   * Get suggestions for common errors
   * @param {string} errorMessage - Error message from Python interpreter
   * @returns {string|null} - Suggestion or null
   */
  function getSuggestion(errorMessage) {
    const suggestions = {
      SyntaxError: "Check for missing colons, parentheses, or quotation marks",
      NameError:
        "Make sure the variable is defined before use. Did you import AIDriver?",
      TypeError:
        "Check that you're using the correct number and types of arguments",
      AttributeError:
        "Check the spelling of the method name. Use help() to see available methods.",
      IndentationError:
        "Python uses spaces for indentation. Make sure your code is properly indented.",
    };

    for (const [error, suggestion] of Object.entries(suggestions)) {
      if (errorMessage.includes(error)) {
        return suggestion;
      }
    }

    return null;
  }

  // Public API
  return {
    validate,
    validateMethodUsage,
    getSuggestion,
    ALLOWED_IMPORTS,
    ALLOWED_FROM_AIDRIVER,
    AIDRIVER_METHODS,
  };
})();
