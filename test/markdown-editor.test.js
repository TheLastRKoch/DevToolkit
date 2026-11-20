const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const sessionsModule = require('../public/static/scripts/browser-session.js');
const pageHeaderModule = require('../public/static/scripts/page-header.js');
const editorMarginsModule = require('../public/static/scripts/editor-margins.js');
const { createDom, createWindow, runScript, withDocument } = require('./helpers/mock-dom.js');
const { openMarkdownPage } = require('./helpers/pages.js');

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
    const dom = createDom([
        'pageHeader',
        'mdInput',
        'mdPreview',
        'charCount',
        'btnExpandEditor',
        'btnExpandPreview',
        'rawPane',
        'previewPane',
        'paneDivider',
        'paneDividerMobile',
        'editorWorkspace',
        'currentYear',
    ]);
    const rawPane = dom.document.getElementById('rawPane');
    const previewPane = dom.document.getElementById('previewPane');
    const paneDivider = dom.document.getElementById('paneDivider');
    const btnExpandEditor = dom.document.getElementById('btnExpandEditor');
    const btnExpandPreview = dom.document.getElementById('btnExpandPreview');

    const window = createWindow('/markdown-editor');
    window.requestAnimationFrame = (cb) => cb();

    const storage = sessionsModule.memoryStorage();
    const marked = { parse: (text) => `<p>${text}</p>` };
    const scriptCode = fs.readFileSync(jsPath, 'utf8');

    // Run script inside simulated sandbox
    runScript(scriptCode, {
        document: dom.document,
        window,
        globals: {
            marked,
            DevToolkitSessions: Object.assign({}, sessionsModule, { browserStorage: () => storage }),
            DevToolkitPageHeader: withDocument(pageHeaderModule, dom.document),
            DevToolkitEditorMargins: editorMarginsModule,
        },
    });

    // Initial state: split view, margins disabled
    const workspaceEl = dom.document.getElementById('editorWorkspace');
    assert.equal(workspaceEl.classList.contains('editor-margins-enabled'), false, 'margins must be disabled on load');

    // The first dropdown option toggles the margins on and off
    const optionsToggle = dom.document.getElementById('pageOptionsToggle');
    const optionsMenu = dom.document.getElementById('pageOptionsMenu');
    optionsToggle.dispatch('click', { preventDefault() {} });
    assert.equal(optionsMenu.children[0].children[0].textContent, 'Toggle margins');
    optionsMenu.children[0].children[0].dispatch('click', {});
    assert.equal(workspaceEl.classList.contains('editor-margins-enabled'), true, 'selecting Toggle margins enables margins');
    optionsToggle.dispatch('click', { preventDefault() {} });
    optionsMenu.children[0].children[0].dispatch('click', {});
    assert.equal(workspaceEl.classList.contains('editor-margins-enabled'), false, 'selecting Toggle margins again disables margins');
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane should be visible initially');
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane should be visible initially');
    assert.equal(paneDivider.classList.contains('d-none'), false, 'paneDivider should not have d-none added');

    // Click [] on editor -> expand editor
    btnExpandEditor.dispatch('click', {});
    assert.equal(previewPane.classList.contains('d-none'), true, 'previewPane must have d-none when editor expanded');
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane must not have d-none');
    assert.equal(paneDivider.classList.contains('d-none'), true, 'paneDivider must have d-none');

    // Click [] on editor again -> restore split view
    btnExpandEditor.dispatch('click', {});
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane must not have d-none after restore');
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane must not have d-none after restore');
    assert.equal(paneDivider.classList.contains('d-none'), false, 'paneDivider must not have d-none after restore');

    // Click [] on preview -> expand preview
    btnExpandPreview.dispatch('click', {});
    assert.equal(rawPane.classList.contains('d-none'), true, 'rawPane must have d-none when preview expanded');
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane must not have d-none');
    assert.equal(paneDivider.classList.contains('d-none'), true, 'paneDivider must have d-none');

    // Click [] on preview again -> restore split view
    btnExpandPreview.dispatch('click', {});
    assert.equal(rawPane.classList.contains('d-none'), false, 'rawPane must not have d-none after restore');
    assert.equal(previewPane.classList.contains('d-none'), false, 'previewPane must not have d-none after restore');
    assert.equal(paneDivider.classList.contains('d-none'), false, 'paneDivider must not have d-none after restore');
});

test('Typing updates the preview and Clear editor empties it without scroll sync', () => {
    const page = openMarkdownPage(sessionsModule.memoryStorage());

    page.type('mdInput', '# Notes');
    assert.equal(page.element('mdPreview').innerHTML, '<p># Notes</p>', 'typing must update the rendered preview');

    page.openOptions();
    page.selectOption(1);
    assert.equal(page.element('mdInput').value, '', 'Clear editor must empty the raw editor');
    assert.equal(page.element('mdPreview').innerHTML, '<p></p>', 'Clear editor must empty the preview');

    const script = fs.readFileSync(jsPath, 'utf8');
    assert.ok(!script.includes('syncScroll'), 'the preview must not synchronize scroll position');
    assert.ok(!/addEventListener\('scroll'/.test(script), 'the script must not listen for pane scroll events');
});

test('Layout styling: responsive orientation, 200px margins, and inline preview', () => {
    const html = fs.readFileSync(htmlPath, 'utf8');

    // Verify #editorWorkspace has flex-column on mobile and flex-md-row on desktop
    assert.match(html, /id="editorWorkspace"[^>]*class="[^"]*flex-column\s+flex-md-row/, 'editorWorkspace must have flex-column flex-md-row');

    // Verify the 200px margins only apply while margins are enabled
    assert.match(html, /@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[\s\S]*?#editorWorkspace\.editor-margins-enabled\s*\{[\s\S]*?margin-left:\s*200px[\s\S]*?margin-right:\s*200px/, 'editorWorkspace must have 200px left and right margins only for the editor-margins-enabled state inside @media (min-width: 768px)');

    // Verify the shared margin module loads before the page script
    assert.ok(html.indexOf('/static/scripts/editor-margins.js') < html.indexOf('/static/scripts/markdown-editor.js'), 'editor-margins.js must load before markdown-editor.js');

    // Verify the workspace no longer renders as a bordered, clipped card
    assert.doesNotMatch(html, /id="editorWorkspace"[^>]*class="[^"]*\b(?:border|rounded|shadow-sm|overflow-hidden|bg-white)\b/, 'editorWorkspace must not render a bordered card panel');

    // Verify the workspace is not pinned to the viewport height
    const workspaceRule = html.match(/#editorWorkspace\s*\{([\s\S]*?)\}/);
    assert.ok(workspaceRule, 'editorWorkspace CSS rule must exist');
    assert.doesNotMatch(workspaceRule[1], /[^-]height\s*:/, 'editorWorkspace must not have a fixed height');

    // Verify the preview flows in the page instead of owning a scroll region
    const previewRule = html.match(/#mdPreview\s*\{([\s\S]*?)\}/);
    assert.ok(previewRule, 'mdPreview CSS rule must exist');
    assert.doesNotMatch(previewRule[1], /overflow/, 'mdPreview must not scroll independently');
    assert.doesNotMatch(html, /id="mdPreview"[^>]*class="[^"]*\boverflow-auto\b/, 'mdPreview must not use an overflow-auto container');
    assert.doesNotMatch(html, /id="mdPreview"[^>]*class="[^"]*\bbg-white\b/, 'mdPreview must not paint a card background');

    // Verify the 50/50 split stays at 768px and the panes keep their base flex sizing
    assert.match(html, /#rawPane,\s*#previewPane\s*\{[\s\S]*?flex:\s*1\s+1\s+50%/, 'panes must have flex: 1 1 50%');
    assert.match(html, /#rawPane,\s*#previewPane\s*\{[\s\S]*?width:\s*100%;/, 'panes must have width: 100% below 768px');
    assert.match(html, /@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[\s\S]*?#rawPane,\s*#previewPane\s*\{[\s\S]*?width:\s*50%;/, 'panes must have width: 50% inside @media (min-width: 768px)');

    // Verify the raw editor keeps a bounded, usable height
    const mdInputRule = html.match(/#mdInput\s*\{([\s\S]*?)\}/);
    assert.ok(mdInputRule, 'mdInput CSS rule must exist');
    assert.match(mdInputRule[1], /height:\s*calc\(100vh/, 'mdInput must keep a viewport-derived height');
    assert.match(mdInputRule[1], /min-height:\s*\d+px/, 'mdInput must keep a minimum usable height');

    // Verify the panes stack with the raw editor first below 768px
    assert.ok(html.indexOf('id="rawPane"') < html.indexOf('id="previewPane"'), 'the raw editor must come before the preview when stacked');

    // Verify #editorWorkspace includes top margin separating it from the page header
    assert.match(html, /id="editorWorkspace"[^>]*class="[^"]*(?:mt-3|my-3)[^"]*"/, 'editorWorkspace must have mt-3 or my-3 for vertical margin separation');
});

