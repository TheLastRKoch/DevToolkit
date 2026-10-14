const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const sessionsModule = require('../public/static/scripts/browser-session.js');
const { openTextEditorPage } = require('./helpers/pages.js');

const textEditorScript = fs.readFileSync(path.join(__dirname, '../public/static/scripts/text-editor.js'), 'utf8');
const textEditorHtml = fs.readFileSync(path.join(__dirname, '../public/text-editor.html'), 'utf8');

test('the text editor mounts the shared header with its own options', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage());

    assert.deepEqual(page.optionItems().map((item) => item.textContent), ['New session', 'Clear editor']);

    const header = page.element('pageHeader').children[0];
    const breadcrumb = header.children[0].children[0].children[0];
    assert.equal(breadcrumb.children[1].textContent, 'Text Editor');
    assert.equal(page.element('pageNameInput').value, 'Devtoolkit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('the text editor builds the Quill editing surface on its output element', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage());
    assert.equal(page.quill.selector, '#txtOutput');
    assert.equal(page.quill.options.theme, 'snow');
});

test('typed content is stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTextEditorPage(storage);

    page.quill.root.innerHTML = '<p>Hello <strong>world</strong></p>';
    page.quill.emit('text-change', [], [], 'user');
    assert.equal(page.storedSession().data.html, '<p>Hello <strong>world</strong></p>');

    page.element('pageNameInput').value = 'Release notes';
    page.element('pageNameInput').dispatch('input', {});
    assert.equal(page.storedSession().name, 'Release notes');
    assert.equal(page.document.title, 'Release notes');
});

test('stored content is restored through the clipboard conversion, not raw markup', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage(), {
        initialHtml: '<p>Saved</p><script>alert(1)</script>',
    });

    assert.deepEqual(page.conversions, ['<p>Saved</p><script>alert(1)</script>']);
    assert.deepEqual(page.quill.contents, { ops: [{ insert: '<p>Saved</p><script>alert(1)</script>' }] });
    assert.equal(page.quill.appliedSource, 'silent', 'restoring must not count as a user edit');
    assert.ok(!/innerHTML\s*=/.test(textEditorScript), 'the page must not render stored markup itself');
});

test('restoring a session does not persist it again', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage(), { initialHtml: '<p>Saved</p>' });
    page.quill.root.innerHTML = '<p>Saved</p>';
    page.quill.emit('text-change', [], [], 'api');
    assert.equal(page.storedSession().data.html, '<p>Saved</p>', 'non-user changes are not written');
});

test('Clear editor empties the content and keeps the page name', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTextEditorPage(storage);
    page.element('pageNameInput').value = 'Keep me';
    page.element('pageNameInput').dispatch('input', {});

    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[1].dispatch('click', {});

    assert.deepEqual(page.quill.contents, { ops: [{ insert: '\n' }] }, 'the editor is emptied');
    assert.equal(page.storedSession().data.html, '');
    assert.equal(page.storedSession().name, 'Keep me', 'the page name is kept');
});

test('New session opens the next text editor session', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage());
    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[0].dispatch('click', {});
    assert.deepEqual(page.window.opened, ['/text-editor/2']);
});

test('the text editor page shares the header markup and calls no server API', () => {
    assert.ok(textEditorHtml.includes('id="pageHeader"'), 'the page mounts the shared header');
    assert.ok(textEditorHtml.includes('browser-session.js'), 'the page loads the session store');
    assert.ok(textEditorHtml.includes('page-header.js'), 'the page loads the shared header');
    assert.ok(textEditorHtml.includes('text-editor.js'), 'the page loads its own script');
    assert.ok(!textEditorHtml.includes('breadcrumb'), 'the page must not duplicate the breadcrumb');
    assert.ok(!textEditorHtml.includes('template.js'), 'the page must not load the template script');
    assert.ok(!/\/api\//.test(textEditorScript), 'the page must not call /api/ routes');
});
