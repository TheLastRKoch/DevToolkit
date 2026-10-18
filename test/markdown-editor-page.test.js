const assert = require('node:assert/strict');
const test = require('node:test');

const { openMarkdownPage, readPage, readScript, sessionsModule } = require('./helpers/pages.js');

const markdownScript = readScript('markdown-editor.js');
const markdownHtml = readPage('markdown-editor.html');

function latestVersion(page) {
    const session = page.storedSession();
    return session ? session.versions[session.versions.length - 1] : null;
}

test('the markdown page declares the shared header with its own options', () => {
    const page = openMarkdownPage(sessionsModule.memoryStorage());

    assert.deepEqual(page.optionItems().map((item) => item.textContent), ['Clear editor']);
    assert.deepEqual(page.breadcrumbItems(), ['Home', 'Markdown Editor']);
    assert.equal(page.titleInput().getAttribute('placeholder'), 'DevToolKit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('a new markdown session starts empty', () => {
    const page = openMarkdownPage(sessionsModule.memoryStorage());
    assert.equal(page.element('mdInput').value, '');
    assert.equal(page.element('charCount').textContent, 0);
    assert.equal(page.storedSession(), null, 'an untitled session is not stored');
});

test('markdown text and title are stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);

    page.type('mdInput', '# Notes');
    assert.equal(page.element('mdPreview').innerHTML, '<p># Notes</p>');
    assert.equal(page.element('charCount').textContent, 7);
    assert.equal(storage.getItem('devtoolkit:sessions:markdown-editor'), null, 'untitled work is not stored');

    page.typeTitle('Scratch pad');
    assert.equal(page.document.title, 'Scratch pad');
    assert.equal(page.titleInput().getAttribute('disabled'), 'true');

    const session = page.storedSession();
    assert.equal(session.kind, 'markdown-editor');
    assert.equal(session.title, 'Scratch pad');
    assert.equal(latestVersion(page).content, '# Notes');
    assert.ok(!('variables' in latestVersion(page)), 'markdown versions carry no variables');
});

test('a later load restores the stored markdown session', () => {
    const storage = sessionsModule.memoryStorage();
    const first = openMarkdownPage(storage);
    first.type('mdInput', '## Remember me');
    first.typeTitle('Notes');
    first.hide();

    const reloaded = openMarkdownPage(storage);
    assert.equal(reloaded.element('mdInput').value, '## Remember me');
    assert.equal(reloaded.element('mdPreview').innerHTML, '<p>## Remember me</p>');
    assert.equal(reloaded.titleInput().value, 'Notes');
    assert.equal(reloaded.document.title, 'Notes');
});

test('Clear editor empties the content and keeps the title', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);
    page.type('mdInput', '# Keep my title');
    page.typeTitle('Keep me');

    page.openOptions();
    page.selectOption(0);

    assert.equal(page.element('mdInput').value, '');
    assert.equal(page.element('mdPreview').innerHTML, '<p></p>');
    assert.equal(page.element('charCount').textContent, 0);
    page.hide();
    assert.equal(latestVersion(page).content, '', 'the cleared content is versioned');
    assert.equal(page.titleInput().value, 'Keep me', 'the title is kept');
});

test('leaving the page snapshots changed markdown and skips unchanged markdown', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);
    page.type('mdInput', 'first');
    page.typeTitle('Notes');
    assert.equal(page.storedSession().versions.length, 1);

    page.hide();
    assert.equal(page.storedSession().versions.length, 1, 'unchanged markdown is not snapshotted twice');

    page.type('mdInput', 'second');
    page.unload();
    assert.equal(latestVersion(page).content, 'second');

    page.type('mdInput', 'third');
    page.hide();
    assert.equal(page.storedSession().versions.length, 3, 'three snapshots are kept');
});

test('an untitled markdown session with changes is confirmed, a titled one is not', () => {
    const page = openMarkdownPage(sessionsModule.memoryStorage());
    assert.equal(page.beforeUnloadProbe(), false, 'an untouched untitled page does not warn');

    page.type('mdInput', 'draft');
    assert.equal(page.beforeUnloadProbe(), true, 'an untitled session with changes warns');

    page.typeTitle('Notes');
    page.type('mdInput', 'saved');
    assert.equal(page.beforeUnloadProbe(), false, 'a titled session is auto-versioned instead');
});

test('the markdown page shares the header markup instead of duplicating it', () => {
    assert.ok(markdownHtml.includes('id="pageHeader"'), 'the page mounts the shared header');
    assert.ok(markdownHtml.includes('browser-session.js'), 'the page loads the session store');
    assert.ok(markdownHtml.includes('page-header.js'), 'the page loads the shared header');
    assert.ok(!markdownHtml.includes('breadcrumb'), 'the page must not duplicate the breadcrumb');
    assert.ok(!/\/api\//.test(markdownScript), 'the page must not call /api/ routes');
});
