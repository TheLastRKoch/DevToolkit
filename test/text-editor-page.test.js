const assert = require('node:assert/strict');
const test = require('node:test');

const { openTextEditorPage, readPage, readScript, sessionsModule } = require('./helpers/pages.js');

const textEditorScript = readScript('text-editor.js');
const textEditorHtml = readPage('text-editor.html');
const STORAGE_KEY = 'devtoolkit:sessions:text-editor';

function latestVersion(page) {
    const session = page.storedSession();
    return session ? session.versions[session.versions.length - 1] : null;
}

function typeInto(page, html, source = 'user') {
    page.quill.root.innerHTML = html;
    page.quill.emit('text-change', [], [], source);
}

test('the text editor mounts the shared header with its own options', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage());

    assert.deepEqual(page.optionItems().map((item) => item.textContent), ['Clear editor']);
    assert.deepEqual(page.breadcrumbItems(), ['Home', 'Text Editor']);
    assert.equal(page.titleInput().getAttribute('placeholder'), 'DevToolKit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('the text editor builds the Quill editing surface on its output element', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage());
    assert.equal(page.quill.selector, '#txtOutput');
    assert.equal(page.quill.options.theme, 'snow');
});

test('typed content and title are stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTextEditorPage(storage);

    typeInto(page, '<p>Hello <strong>world</strong></p>');
    assert.equal(storage.getItem(STORAGE_KEY), null, 'untitled work is not stored');

    page.typeTitle('Release notes');
    assert.equal(page.document.title, 'Release notes');
    assert.equal(page.titleInput().getAttribute('disabled'), 'true');

    const session = page.storedSession();
    assert.equal(session.kind, 'text-editor');
    assert.equal(session.title, 'Release notes');
    assert.equal(latestVersion(page).content, '<p>Hello <strong>world</strong></p>');
    assert.ok(!('variables' in latestVersion(page)), 'text editor versions carry no variables');
});

test('stored content is restored through the clipboard conversion, not raw markup', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage(), {
        initialHtml: '<p>Saved</p><script>alert(1)</script>',
        title: 'Saved notes',
    });

    assert.deepEqual(page.conversions, ['<p>Saved</p><script>alert(1)</script>']);
    assert.deepEqual(page.quill.contents, { ops: [{ insert: '<p>Saved</p><script>alert(1)</script>' }] });
    assert.equal(page.quill.appliedSource, 'silent', 'restoring must not count as a user edit');
    assert.equal(page.titleInput().value, 'Saved notes', 'the stored title is restored');
    assert.ok(!/innerHTML\s*=/.test(textEditorScript), 'the page must not render stored markup itself');
});

test('restoring a session does not persist it again', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage(), { initialHtml: '<p>Saved</p>', title: 'Saved' });
    const before = page.storedSession();
    typeInto(page, '<p>Saved</p>', 'api');
    assert.deepEqual(page.storedSession(), before, 'non-user changes are not written');
});

test('Clear editor empties the content and keeps the title', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTextEditorPage(storage);
    typeInto(page, '<p>Keep my title</p>');
    page.typeTitle('Keep me');

    page.openOptions();
    page.selectOption(0);

    assert.deepEqual(page.quill.contents, { ops: [{ insert: '\n' }] }, 'the editor is emptied');
    page.hide();
    assert.equal(latestVersion(page).content, '', 'the cleared content is versioned');
    assert.equal(page.titleInput().value, 'Keep me', 'the title is kept');
});

test('leaving the page snapshots changed content and skips unchanged content', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage());
    typeInto(page, '<p>first</p>');
    page.typeTitle('Notes');
    assert.equal(page.storedSession().versions.length, 1);

    page.hide();
    assert.equal(page.storedSession().versions.length, 1, 'unchanged content is not snapshotted twice');

    typeInto(page, '<p>second</p>');
    page.unload();
    assert.equal(latestVersion(page).content, '<p>second</p>');

    typeInto(page, '<p>third</p>');
    page.hide();
    assert.equal(page.storedSession().versions.length, 3, 'three snapshots are kept');
});

test('an untitled text editor session with changes is confirmed, a titled one is not', () => {
    const page = openTextEditorPage(sessionsModule.memoryStorage());
    assert.equal(page.beforeUnloadProbe(), false, 'an untouched untitled page does not warn');

    typeInto(page, '<p>draft</p>');
    assert.equal(page.beforeUnloadProbe(), true, 'an untitled session with changes warns');

    page.typeTitle('Notes');
    typeInto(page, '<p>saved</p>');
    assert.equal(page.beforeUnloadProbe(), false, 'a titled session is auto-versioned instead');
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
