/**
 * Editor text wrap toggle.
 *
 * The code and raw text editor pages start with text wrap disabled on every
 * page load. This module owns the shared `Alt+Z` (Windows/Linux) / `Option+Z`
 * (macOS) shortcut and the disabled state, which lives as the presence of
 * `editor-text-wrap-disabled` on the workspace element. Each page supplies an
 * `apply(enabled)` callback for its own surface: the code editor reconfigures a
 * CodeMirror compartment and the raw text editor relies on the page CSS.
 *
 * Loaded as a classic script in the browser (global `DevToolkitEditorTextWrap`)
 * and exported for Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.DevToolkitEditorTextWrap = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, function () {
    const DISABLED_CLASS = 'editor-text-wrap-disabled';

    /**
     * Builds the text wrap toggle for a workspace element, or returns null when
     * the page has no workspace to control.
     *
     * Options:
     *  - `workspace`: element carrying the disabled class
     *  - `apply`: optional callback receiving the new enabled state
     *  - `document`: optional document to bind the shortcut to (defaults to the
     *    global `document`, which tests replace with a mock)
     */
    function createTextWrapToggle(config) {
        const settings = config || {};
        const workspace = settings.workspace;
        if (!workspace || !workspace.classList) {
            return null;
        }
        const apply = typeof settings.apply === 'function' ? settings.apply : null;
        const doc = settings.document || (typeof document !== 'undefined' ? document : null);

        function isEnabled() {
            return !workspace.classList.contains(DISABLED_CLASS);
        }

        function setEnabled(enabled) {
            const wanted = Boolean(enabled);
            workspace.classList.toggle(DISABLED_CLASS, !wanted);
            if (apply) {
                apply(wanted);
            }
            return wanted;
        }

        function toggle() {
            return setEnabled(!isEnabled());
        }

        function run() {
            toggle();
        }

        function handleKeydown(event) {
            // Match the physical key: macOS reports `Option+Z` as `key: 'Ω'`.
            if (!event || event.code !== 'KeyZ' || !event.altKey || event.ctrlKey || event.metaKey) {
                return;
            }
            event.preventDefault();
            toggle();
        }

        setEnabled(false);
        if (doc && typeof doc.addEventListener === 'function') {
            doc.addEventListener('keydown', handleKeydown);
        }

        return {
            run,
            toggle,
            isEnabled,
            setEnabled,
            handleKeydown,
        };
    }

    return {
        DISABLED_CLASS,
        createTextWrapToggle,
    };
}));
