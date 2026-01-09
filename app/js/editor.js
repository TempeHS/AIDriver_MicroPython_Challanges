/**
 * AIDriver Simulator - Editor Module
 * ACE Editor configuration and management
 */

const Editor = {
    instance: null,
    markers: [],
    executingLine: null,
    saveTimeout: null,
    
    /**
     * Initialize the ACE editor
     */
    init() {
        this.instance = ace.edit('editor');
        
        // Configure theme and mode
        this.instance.setTheme('ace/theme/monokai');
        this.instance.session.setMode('ace/mode/python');
        
        // Editor options
        this.instance.setOptions({
            fontSize: '14px',
            showPrintMargin: false,
            tabSize: 4,
            useSoftTabs: true,
            wrap: true,
            enableBasicAutocompletion: true,
            enableLiveAutocompletion: false,
            showGutter: true,
            highlightActiveLine: true,
            displayIndentGuides: true
        });
        
        // Set up auto-save on change (debounced)
        this.instance.on('change', () => {
            this.debouncedSave();
        });
        
        // Add custom key bindings
        this.setupKeyBindings();
        
        console.log('[Editor] Initialized');
        return this;
    },
    
    /**
     * Set up custom key bindings
     */
    setupKeyBindings() {
        // Ctrl+Enter to run code
        this.instance.commands.addCommand({
            name: 'runCode',
            bindKey: { win: 'Ctrl-Enter', mac: 'Cmd-Enter' },
            exec: () => {
                if (typeof App !== 'undefined' && !App.isRunning) {
                    runCode();
                }
            }
        });
        
        // Ctrl+. to stop execution
        this.instance.commands.addCommand({
            name: 'stopCode',
            bindKey: { win: 'Ctrl-.', mac: 'Cmd-.' },
            exec: () => {
                if (typeof App !== 'undefined' && App.isRunning) {
                    stopExecution();
                }
            }
        });
    },
    
    /**
     * Get the current code from the editor
     */
    getCode() {
        return this.instance.getValue();
    },
    
    /**
     * Set code in the editor
     * @param {string} code - The code to set
     * @param {boolean} moveCursor - Whether to move cursor to start (-1) or end (1)
     */
    setCode(code, moveCursor = -1) {
        this.instance.setValue(code, moveCursor);
        this.clearAllMarkers();
    },
    
    /**
     * Clear the editor
     */
    clear() {
        this.instance.setValue('', -1);
        this.clearAllMarkers();
    },
    
    /**
     * Mark an error on a specific line
     * @param {number} line - Line number (1-indexed)
     * @param {string} message - Error message
     */
    markError(line, message) {
        const lineIndex = line - 1; // ACE uses 0-indexed lines
        
        // Add annotation (shows in gutter)
        const annotations = this.instance.session.getAnnotations();
        annotations.push({
            row: lineIndex,
            column: 0,
            text: message,
            type: 'error'
        });
        this.instance.session.setAnnotations(annotations);
        
        // Add line highlight marker
        const Range = ace.require('ace/range').Range;
        const markerId = this.instance.session.addMarker(
            new Range(lineIndex, 0, lineIndex, 1),
            'ace_error-line',
            'fullLine',
            true
        );
        this.markers.push(markerId);
        
        // Scroll to error line
        this.instance.gotoLine(line, 0, true);
    },
    
    /**
     * Mark a warning on a specific line
     * @param {number} line - Line number (1-indexed)
     * @param {string} message - Warning message
     */
    markWarning(line, message) {
        const lineIndex = line - 1;
        
        const annotations = this.instance.session.getAnnotations();
        annotations.push({
            row: lineIndex,
            column: 0,
            text: message,
            type: 'warning'
        });
        this.instance.session.setAnnotations(annotations);
    },
    
    /**
     * Highlight the currently executing line
     * @param {number} line - Line number (1-indexed), or null to clear
     */
    highlightExecutingLine(line) {
        // Remove previous highlight
        if (this.executingLine !== null) {
            this.instance.session.removeMarker(this.executingLine);
        }
        
        if (line === null) {
            this.executingLine = null;
            return;
        }
        
        const lineIndex = line - 1;
        const Range = ace.require('ace/range').Range;
        this.executingLine = this.instance.session.addMarker(
            new Range(lineIndex, 0, lineIndex, 1),
            'ace_executing-line',
            'fullLine',
            true
        );
        
        // Scroll to line if not visible
        this.instance.scrollToLine(lineIndex, true, true);
    },
    
    /**
     * Clear all error/warning markers
     */
    clearAllMarkers() {
        // Clear annotations
        this.instance.session.setAnnotations([]);
        
        // Clear markers
        this.markers.forEach(markerId => {
            this.instance.session.removeMarker(markerId);
        });
        this.markers = [];
        
        // Clear executing line highlight
        this.highlightExecutingLine(null);
    },
    
    /**
     * Save code to localStorage (debounced)
     */
    debouncedSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveCode();
        }, 1000);
    },
    
    /**
     * Save code to localStorage immediately
     */
    saveCode() {
        if (typeof App === 'undefined') return;
        
        const code = this.getCode();
        const key = `aidriver_challenge_${App.currentChallenge}_code`;
        localStorage.setItem(key, code);
        console.log(`[Editor] Code saved for challenge ${App.currentChallenge}`);
    },
    
    /**
     * Load code from localStorage
     * @param {number} challengeId - Challenge ID
     * @returns {string|null} Saved code or null if none
     */
    loadSavedCode(challengeId) {
        const key = `aidriver_challenge_${challengeId}_code`;
        return localStorage.getItem(key);
    },
    
    /**
     * Clear saved code for a challenge
     * @param {number} challengeId - Challenge ID
     */
    clearSavedCode(challengeId) {
        const key = `aidriver_challenge_${challengeId}_code`;
        localStorage.removeItem(key);
    },
    
    /**
     * Check if there's saved code for a challenge
     * @param {number} challengeId - Challenge ID
     * @returns {boolean}
     */
    hasSavedCode(challengeId) {
        const key = `aidriver_challenge_${challengeId}_code`;
        return localStorage.getItem(key) !== null;
    },
    
    /**
     * Set editor read-only state
     * @param {boolean} readOnly
     */
    setReadOnly(readOnly) {
        this.instance.setReadOnly(readOnly);
    },
    
    /**
     * Focus the editor
     */
    focus() {
        this.instance.focus();
    },
    
    /**
     * Resize the editor (call after container size changes)
     */
    resize() {
        this.instance.resize();
    },
    
    /**
     * Get total line count
     * @returns {number}
     */
    getLineCount() {
        return this.instance.session.getLength();
    },
    
    /**
     * Get text of a specific line
     * @param {number} line - Line number (1-indexed)
     * @returns {string}
     */
    getLine(line) {
        return this.instance.session.getLine(line - 1);
    }
};

// Add custom CSS for editor markers
const editorStyles = document.createElement('style');
editorStyles.textContent = `
    .ace_error-line {
        background-color: rgba(255, 68, 68, 0.3);
        position: absolute;
    }
    
    .ace_executing-line {
        background-color: rgba(255, 255, 0, 0.2);
        position: absolute;
    }
    
    .ace_gutter-cell.ace_error {
        background-color: #ff4444;
        color: white;
    }
    
    .ace_gutter-cell.ace_warning {
        background-color: #ffc107;
        color: black;
    }
`;
document.head.appendChild(editorStyles);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Editor;
}
