const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const htmlPath = path.join(__dirname, '../public/markdown-editor.html');
const jsPath = path.join(__dirname, '../public/static/scripts/markdown-editor.js');

test('HTML structure: rawPane and previewPane have matching status bar heights', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');
    
    // Check both status bars exist
    assert.ok(html.includes('id="editorStatusBar"'), 'editorStatusBar should exist');
    assert.ok(html.includes('id="previewStatusBar"'), 'previewStatusBar should exist');
    
    // Check min-height matches for vertical symmetry
    const editorBarMatch = html.match(/id="editorStatusBar"[^>]*style="[^"]*min-height:\s*(\d+)px/);
    const previewBarMatch = html.match(/id="previewStatusBar"[^>]*style="[^"]*min-height:\s*(\d+)px/);
    
    assert.ok(editorBarMatch, 'editorStatusBar must have explicit min-height');
    assert.ok(previewBarMatch, 'previewStatusBar must have explicit min-height');
    assert.equal(editorBarMatch[1], previewBarMatch[1], 'Status bar heights must match for pane symmetry');
});

test('JS pane state toggle: uses d-none class for hiding and restoring panes', () => {
    const js = fs.readFileSync(jsPath, 'utf8');

    // Confirm that inline style.display = 'none' is NOT used for pane hiding
    assert.ok(!js.includes("previewPane.style.display = 'none'"), 'Should not use previewPane.style.display = none');
    assert.ok(!js.includes("rawPane.style.display = 'none'"), 'Should not use rawPane.style.display = none');

    // Confirm d-none class toggling is used
    assert.ok(js.includes("previewPane.classList.add('d-none')"), 'Should add d-none to previewPane when expanding editor');
    assert.ok(js.includes("rawPane.classList.add('d-none')"), 'Should add d-none to rawPane when expanding preview');
    assert.ok(js.includes("previewPane.classList.remove('d-none')"), 'Should remove d-none from previewPane on restore');
    assert.ok(js.includes("rawPane.classList.remove('d-none')"), 'Should remove d-none from rawPane on restore');
});

test('Interactive simulation of pane state toggling', () => {
    function createMockElement(id, initialClasses = []) {
        const classes = new Set(initialClasses);
        const attrs = {};
        const listeners = {};
        return {
            id,
            classList: {
                add: (...cls) => cls.forEach(c => classes.add(c)),
                remove: (...cls) => cls.forEach(c => classes.delete(c)),
                contains: (c) => classes.has(c),
            },
            title: '',
            setAttribute: (k, v) => { attrs[k] = v; },
            getAttribute: (k) => attrs[k],
            addEventListener: (event, handler) => {
                listeners[event] = listeners[event] || [];
                listeners[event].push(handler);
            },
            click: () => {
                (listeners['click'] || []).forEach(h => h());
            },
            value: '',
            textContent: '',
            innerHTML: '',
            scrollHeight: 100,
            clientHeight: 50,
            scrollTop: 0,
        };
    }

    const mdInput = createMockElement('mdInput');
    const mdPreview = createMockElement('mdPreview');
    const charCount = createMockElement('charCount');
    const btnExpandEditor = createMockElement('btnExpandEditor');
    const btnExpandPreview = createMockElement('btnExpandPreview');
    const rawPane = createMockElement('rawPane', ['d-flex', 'flex-column', 'flex-grow-1']);
    const previewPane = createMockElement('previewPane', ['d-flex', 'flex-column', 'flex-grow-1']);
    const paneDivider = createMockElement('paneDivider', ['pane-divider', 'd-none', 'd-md-block']);
    const paneDividerMobile = createMockElement('paneDividerMobile', ['d-md-none']);
    const currentYearEl = createMockElement('currentYear');

    const domMap = {
        mdInput,
        mdPreview,
        charCount,
        btnExpandEditor,
        btnExpandPreview,
        rawPane,
        previewPane,
        paneDivider,
        paneDividerMobile,
        currentYearEl,
    };

    const mockDocument = {
        getElementById: (id) => domMap[id] || null,
    };

    const mockWindow = {
        requestAnimationFrame: (cb) => cb(),
    };

    const mockMarked = {
        parse: (t) => `<p>${t}</p>`,
    };

    const scriptCode = fs.readFileSync(jsPath, 'utf8');

    // Run script inside simulated sandbox
    const runScript = new Function('document', 'window', 'marked', scriptCode);
    runScript(mockDocument, mockWindow, mockMarked);

    // Initial state: split view
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane should be visible initially');
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane should be visible initially');
    assert.equal(paneDivider.classList.contains('d-none'), false, 'paneDivider should not have d-none added');

    // Click [] on editor -> expand editor
    btnExpandEditor.click();
    assert.equal(previewPane.classList.contains('d-none'), true, 'previewPane must have d-none when editor expanded');
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane must not have d-none');
    assert.equal(paneDivider.classList.contains('d-none'), true, 'paneDivider must have d-none');

    // Click [] on editor again -> restore split view
    btnExpandEditor.click();
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane must not have d-none after restore');
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane must not have d-none after restore');
    assert.equal(paneDivider.classList.contains('d-none'), false, 'paneDivider must not have d-none after restore');

    // Click [] on preview -> expand preview
    btnExpandPreview.click();
    assert.equal(rawPane.classList.contains('d-none'), true, 'rawPane must have d-none when preview expanded');
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane must not have d-none');
    assert.equal(paneDivider.classList.contains('d-none'), true, 'paneDivider must have d-none');

    // Click [] on preview again -> restore split view
    btnExpandPreview.click();
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane must not have d-none after restore');
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane must not have d-none after restore');
    assert.equal(paneDivider.classList.contains('d-none'), false, 'paneDivider must not have d-none after restore');
});

test('Layout styling: responsive orientation, 200px margins, and 50/50 split sizing', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Verify #editorWorkspace has flex-column on mobile and flex-md-row on desktop
    assert.match(html, /id="editorWorkspace"[^>]*class="[^"]*flex-column\s+flex-md-row/, 'editorWorkspace must have flex-column flex-md-row');

    // Verify 200px margins on #editorWorkspace inside @media (min-width: 768px)
    assert.match(html, /@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[\s\S]*?#editorWorkspace\s*\{[\s\S]*?margin-left:\s*200px[\s\S]*?margin-right:\s*200px/, 'editorWorkspace must have 200px left and right margins inside @media (min-width: 768px)');

    // Verify mobile default 50% height and 100% width on panes
    assert.match(html, /#rawPane,\s*#previewPane\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*50%;/, 'panes must have width: 100% and height: 50% by default on mobile');
    assert.match(html, /#rawPane,\s*#previewPane\s*\{[\s\S]*?flex:\s*1\s+1\s+50%/, 'panes must have flex: 1 1 50%');

    // Verify desktop/tablet 50% width and 100% height inside @media (min-width: 768px)
    assert.match(html, /@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[\s\S]*?#rawPane,\s*#previewPane\s*\{[\s\S]*?width:\s*50%;[\s\S]*?height:\s*100%;/, 'panes must have width: 50% and height: 100% inside @media (min-width: 768px)');
});

