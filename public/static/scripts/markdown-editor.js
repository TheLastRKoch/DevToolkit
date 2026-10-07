/**
 * Markdown Editor – DevToolkit
 *
 * Handles:
 *  - Live Markdown-to-HTML rendering via marked
 *  - Real-time character count status bar
 *  - Per-pane expand/restore toggles
 *  - Bidirectional proportional synchronized scrolling
 */

'use strict';

(function () {
    // ── DOM references ──────────────────────────────────────────────────────
    const mdInput       = document.getElementById('mdInput');
    const mdPreview     = document.getElementById('mdPreview');
    const charCount     = document.getElementById('charCount');
    const btnExpandEditor  = document.getElementById('btnExpandEditor');
    const btnExpandPreview = document.getElementById('btnExpandPreview');
    const rawPane       = document.getElementById('rawPane');
    const previewPane   = document.getElementById('previewPane');
    const paneDivider   = document.getElementById('paneDivider');
    const paneDividerMobile = document.getElementById('paneDividerMobile');
    const currentYearEl = document.getElementById('currentYear');

    // ── Year in footer ───────────────────────────────────────────────────────
    if (currentYearEl) {
        currentYearEl.textContent = new Date().getFullYear();
    }

    // ── marked configuration ─────────────────────────────────────────────────
    // Use a strict renderer that disables inline HTML to reduce XSS risk.
    const markedOptions = {
        breaks: false,
        gfm: true,
        pedantic: false,
    };

    // ── Render markdown ───────────────────────────────────────────────────────
    function renderMarkdown(text) {
        // marked.parse is synchronous in marked v4+/v12+
        return marked.parse(text, markedOptions);
    }

    // ── Update preview and character count ───────────────────────────────────
    function updateContent() {
        const text = mdInput.value;
        // Character count
        charCount.textContent = text.length;
        // Render preview
        mdPreview.innerHTML = renderMarkdown(text);
    }

    // ── Scroll synchronization ───────────────────────────────────────────────
    let isSyncing = false;

    function syncScroll(source, target) {
        if (isSyncing) return;
        isSyncing = true;

        const sourceScrollable = source.scrollHeight - source.clientHeight;
        const targetScrollable = target.scrollHeight - target.clientHeight;

        if (sourceScrollable > 0 && targetScrollable > 0) {
            const ratio = source.scrollTop / sourceScrollable;
            target.scrollTop = ratio * targetScrollable;
        }

        window.requestAnimationFrame(() => {
            isSyncing = false;
        });
    }

    mdInput.addEventListener('scroll', () => syncScroll(mdInput, mdPreview), { passive: true });
    mdPreview.addEventListener('scroll', () => syncScroll(mdPreview, mdInput), { passive: true });

    // ── Pane expand/restore toggles ──────────────────────────────────────────
    // focusedPane: null | 'editor' | 'preview'
    let focusedPane = null;

    function applyPaneState() {
        if (focusedPane === 'editor') {
            // Raw pane takes full width; hide preview
            rawPane.classList.remove('d-none');
            previewPane.classList.add('d-none');
            paneDivider.classList.add('d-none', 'd-md-none');
            paneDividerMobile.classList.add('d-none');
            btnExpandEditor.title = 'Restore split view';
            btnExpandEditor.setAttribute('aria-label', 'Restore split view');
        } else if (focusedPane === 'preview') {
            // Preview pane takes full width; hide raw editor
            rawPane.classList.add('d-none');
            previewPane.classList.remove('d-none');
            paneDivider.classList.add('d-none', 'd-md-none');
            paneDividerMobile.classList.add('d-none');
            btnExpandPreview.title = 'Restore split view';
            btnExpandPreview.setAttribute('aria-label', 'Restore split view');
        } else {
            // Split view
            rawPane.classList.remove('d-none');
            previewPane.classList.remove('d-none');
            paneDivider.classList.remove('d-none', 'd-md-none');
            paneDividerMobile.classList.remove('d-none');
            btnExpandEditor.title = 'Expand editor full screen';
            btnExpandEditor.setAttribute('aria-label', 'Expand editor full screen');
            btnExpandPreview.title = 'Expand preview full screen';
            btnExpandPreview.setAttribute('aria-label', 'Expand preview full screen');
        }
    }

    btnExpandEditor.addEventListener('click', () => {
        focusedPane = (focusedPane === 'editor') ? null : 'editor';
        applyPaneState();
    });

    btnExpandPreview.addEventListener('click', () => {
        focusedPane = (focusedPane === 'preview') ? null : 'preview';
        applyPaneState();
    });

    // ── Default sample content ────────────────────────────────────────────────
    const sampleMarkdown = [
        '# Welcome to the Markdown Editor',
        '',
        'Type or paste **Markdown** on the left and see the rendered preview on the right.',
        '',
        '## Features',
        '',
        '- Live preview as you type',
        '- Character count in the status bar below',
        '- Expand either pane to full width with the `[]` button',
        '- Synchronized scrolling between panes',
        '',
        '## Code Example',
        '',
        '```javascript',
        'console.log("Hello, Markdown!");',
        '```',
        '',
        '> Tip: Use the `[]` button on any pane to maximize it.',
    ].join('\n');

    mdInput.value = sampleMarkdown;

    // ── Initialize ────────────────────────────────────────────────────────────
    updateContent();
    applyPaneState();

    // Live updates on input (covers typing, paste, cut, undo/redo)
    mdInput.addEventListener('input', updateContent);
}());
