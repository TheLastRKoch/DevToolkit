/**
 * Editor workspace margins.
 *
 * The text, markdown, and code editor pages inset their workspace with 200px
 * side margins above 768px. This module owns the option that turns that inset
 * on and off: the state is the presence of `editor-margins-enabled` on the
 * workspace element, so every page load starts without margins.
 *
 * Loaded as a classic script in the browser (global `DevToolkitEditorMargins`)
 * and exported for Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.DevToolkitEditorMargins = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, function () {
    const MARGIN_CLASS = 'editor-margins-enabled';
    const OPTION_ID = 'toggle-margins';
    const OPTION_LABEL = 'Toggle margins';

    /**
     * Builds the Options dropdown entry for a workspace element, or returns
     * null when the page has no workspace to inset.
     */
    function createMarginToggle(workspace) {
        if (!workspace || !workspace.classList) {
            return null;
        }

        function isEnabled() {
            return workspace.classList.contains(MARGIN_CLASS);
        }

        function run() {
            workspace.classList.toggle(MARGIN_CLASS);
        }

        return {
            id: OPTION_ID,
            label: OPTION_LABEL,
            run,
            isEnabled,
        };
    }

    return {
        MARGIN_CLASS,
        OPTION_ID,
        OPTION_LABEL,
        createMarginToggle,
    };
}));
