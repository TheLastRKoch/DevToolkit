const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const sessionsModule = require('../public/static/scripts/browser-session.js');
const { openMarkdownPage } = require('./helpers/pages.js');

const markdownScript = fs.readFileSync(path.join(__dirname, '../public/static/scripts/markdown-editor.js'), 'utf8');
const markdownHtml = fs.readFileSync(path.join(__dirname, '../public/markdown-editor.html'), 'utf8');

test('the markdown page mounts the shared header with its own options', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);

    assert.deepEqual(page.optionItems().map((item) => item.textContent), ['New session', 'Clear editor']);

    const header = page.element('pageHeader').children[0];
    const breadcrumb = header.children[0].children[0].children[0];
    assert.equal(breadcrumb.children[1].textContent, 'Markdown Editor');
    assert.equal(page.element('pageNameInput').value, 'Devtoolkit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('a new markdown session starts empty', () => {
    const page = openMarkdownPage(sessionsModule.memoryStorage());
    assert.equal(page.element('mdInput').value, '');
    assert.equal(page.element('charCount').textContent, 0);
    assert.deepEqual(page.storedSession().data, { markdown: '' });
});

test('markdown text and page name are stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);

    page.element('mdInput').value = '# Notes';
    page.element('mdInput').dispatch('input', {});
    assert.equal(page.storedSession().data.markdown, '# Notes');
    assert.equal(page.element('mdPreview').innerHTML, '<p># Notes</p>');
    assert.equal(page.element('charCount').textContent, 7);

    page.element('pageNameInput').value = 'Scratch pad';
    page.element('pageNameInput').dispatch('input', {});
    assert.equal(page.storedSession().name, 'Scratch pad');
    assert.equal(page.document.title, 'Scratch pad');
});

test('a later load restores the stored markdown session', () => {
    const storage = sessionsModule.memoryStorage();
    const first = openMarkdownPage(storage);
    first.element('mdInput').value = '## Remember me';
    first.element('mdInput').dispatch('input', {});
    first.element('pageNameInput').value = 'Notes';
    first.element('pageNameInput').dispatch('input', {});

    const reloaded = openMarkdownPage(storage);
    assert.equal(reloaded.element('mdInput').value, '## Remember me');
    assert.equal(reloaded.element('mdPreview').innerHTML, '<p>## Remember me</p>');
    assert.equal(reloaded.element('pageNameInput').value, 'Notes');
    assert.equal(reloaded.document.title, 'Notes');
});

test('Clear editor empties the content and keeps the page name', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);
    page.element('mdInput').value = '# Keep my name';
    page.element('mdInput').dispatch('input', {});
    page.element('pageNameInput').value = 'Keep me';
    page.element('pageNameInput').dispatch('input', {});

    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[1].dispatch('click', {});

    assert.equal(page.element('mdInput').value, '');
    assert.equal(page.element('mdPreview').innerHTML, '<p></p>');
    assert.equal(page.storedSession().data.markdown, '');
    assert.equal(page.storedSession().name, 'Keep me');
});

test('New session opens the next markdown session', () => {
    const page = openMarkdownPage(sessionsModule.memoryStorage());
    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[0].dispatch('click', {});
    assert.deepEqual(page.window.opened, ['/markdown-editor/2']);
});

test('the markdown page shares the header markup instead of duplicating it', () => {
    assert.ok(markdownHtml.includes('id="pageHeader"'), 'the page mounts the shared header');
    assert.ok(markdownHtml.includes('browser-session.js'), 'the page loads the session store');
    assert.ok(markdownHtml.includes('page-header.js'), 'the page loads the shared header');
    assert.ok(!markdownHtml.includes('breadcrumb'), 'the page must not duplicate the breadcrumb');
    assert.ok(!/\/api\//.test(markdownScript), 'the page must not call /api/ routes');
});
