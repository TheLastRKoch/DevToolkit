const assert = require('node:assert/strict');
const test = require('node:test');

const { openRawTextEditorPage, readPage, readScript, sessionsModule } = require('./helpers/pages.js');

const rawTextEditorScript = readScript('raw-text-editor.js');
const rawTextEditorHtml = readPage('raw-text-editor.html');

function latestVersion(page) {
    const session = page.storedSession();
    return session ? session.versions[session.versions.length - 1] : null;
}

function typeInto(page, html, source = 'user') {
    page.quill.root.innerHTML = html;
    page.quill.emit('text-change', [], [], source);
}

test('the raw text editor mounts the shared header with its own options', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());

    assert.deepEqual(page.optionItems().map((item) => item.textContent), ['Toggle margins', 'Clear editor']);
    assert.equal(page.titleInput().getAttribute('placeholder'), 'DevToolKit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('margins are off by default and toggle without touching the content', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
    const workspace = page.element('editorWorkspace');

    assert.equal(workspace.classList.contains('editor-margins-enabled'), false, 'margins are disabled on load');

    typeInto(page, '<p>Keep me</p>');
    page.typeTitle('Notes');

    page.openOptions();
    page.selectOption(0);
    assert.equal(workspace.classList.contains('editor-margins-enabled'), true, 'the first selection enables margins');

    page.openOptions();
    page.selectOption(0);
    assert.equal(workspace.classList.contains('editor-margins-enabled'), false, 'the second selection disables margins');
    assert.equal(page.titleInput().value, 'Notes', 'the title is unchanged');
    assert.equal(latestVersion(page).content, '<p>Keep me</p>', 'the stored content is unchanged');
});

test('the raw text editor builds the Quill editing surface on its output element', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
    assert.equal(page.quill.selector, '#txtOutput');
    assert.equal(page.quill.options.theme, 'snow');
});

test('typed content and title are stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openRawTextEditorPage(storage);

    typeInto(page, '<p>Hello <strong>world</strong></p>');
    assert.equal(sessionsModule.listAll(storage).length, 0, 'untitled work is not stored');

    page.typeTitle('Release notes');
    assert.equal(page.document.title, 'Release notes');
    assert.equal(page.titleInput().getAttribute('disabled'), null, 'the title stays editable while focused');
    page.blurTitle();
    assert.equal(page.titleInput().getAttribute('disabled'), 'true', 'the title locks when focus is lost');

    const session = page.storedSession();
    assert.equal(session.kind, 'raw-text-editor');
    assert.equal(session.title, 'Release notes');
    assert.equal(latestVersion(page).content, '<p>Hello <strong>world</strong></p>');
    assert.ok(!('variables' in latestVersion(page)), 'text editor versions carry no variables');
});

test('stored content is restored through the clipboard conversion, not raw markup', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage(), {
        initialHtml: '<p>Saved</p><script>alert(1)</script>',
        title: 'Saved notes',
    });

    assert.deepEqual(page.conversions, ['<p>Saved</p><script>alert(1)</script>']);
    assert.deepEqual(page.quill.contents, { ops: [{ insert: '<p>Saved</p><script>alert(1)</script>' }] });
    assert.equal(page.quill.appliedSource, 'silent', 'restoring must not count as a user edit');
    assert.equal(page.titleInput().value, 'Saved notes', 'the stored title is restored');
    assert.ok(!/innerHTML\s*=/.test(rawTextEditorScript), 'the page must not render stored markup itself');
});

test('restoring a session does not persist it again', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage(), { initialHtml: '<p>Saved</p>', title: 'Saved' });
    const before = page.storedSession();
    typeInto(page, '<p>Saved</p>', 'api');
    assert.deepEqual(page.storedSession(), before, 'non-user changes are not written');
});

test('Clear editor empties the content and keeps the title', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openRawTextEditorPage(storage);
    typeInto(page, '<p>Keep my title</p>');
    page.typeTitle('Keep me');

    page.openOptions();
    page.selectOption(1);

    assert.deepEqual(page.quill.contents, { ops: [{ insert: '\n' }] }, 'the editor is emptied');
    page.hide();
    assert.equal(latestVersion(page).content, '', 'the cleared content is versioned');
    assert.equal(page.titleInput().value, 'Keep me', 'the title is kept');
});

test('leaving the page snapshots changed content and skips unchanged content', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
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
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
    assert.equal(page.beforeUnloadProbe(), false, 'an untouched untitled page does not warn');

    typeInto(page, '<p>draft</p>');
    assert.equal(page.beforeUnloadProbe(), true, 'an untitled session with changes warns');

    page.typeTitle('Notes');
    typeInto(page, '<p>saved</p>');
    assert.equal(page.beforeUnloadProbe(), false, 'a titled session is auto-versioned instead');
});

test('the raw text editor page shares the header markup and calls no server API', () => {
    assert.ok(rawTextEditorHtml.includes('id="pageHeader"'), 'the page mounts the shared header');
    assert.ok(rawTextEditorHtml.includes('browser-session.js'), 'the page loads the session store');
    assert.ok(rawTextEditorHtml.includes('page-header.js'), 'the page loads the shared header');
    assert.ok(rawTextEditorHtml.includes('editor-margins.js'), 'the page loads the shared margin module');
    assert.ok(rawTextEditorHtml.indexOf('editor-margins.js') < rawTextEditorHtml.indexOf('raw-text-editor.js'), 'the margin module loads before the page script');
    assert.match(rawTextEditorHtml, /@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[\s\S]*?#editorWorkspace\.editor-margins-enabled\s*\{[\s\S]*?margin-left:\s*200px[\s\S]*?margin-right:\s*200px/, 'enabled margins inset the workspace by 200px on wide viewports');
    assert.ok(rawTextEditorHtml.includes('raw-text-editor.js'), 'the page loads its own script');
    assert.ok(!rawTextEditorHtml.includes('breadcrumb') && !rawTextEditorScript.includes('breadcrumb'), 'the page must not include breadcrumb markup');
    assert.ok(!rawTextEditorHtml.includes('template.js'), 'the page must not load the template script');
    assert.ok(!/\/api\//.test(rawTextEditorScript), 'the page must not call /api/ routes');
});

test('pasted content loses its background color', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
    const pasted = page.paste({ ops: [{ insert: 'highlighted', attributes: { background: '#ffff00' } }] });

    assert.equal(pasted.ops[0].attributes.background, undefined, 'the pasted background is removed');
});

test('pasted content gets a black font color', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
    const pasted = page.paste({ ops: [{ insert: 'red text', attributes: { color: '#ff0000' } }] });

    assert.equal(pasted.ops[0].attributes.color, '#000000', 'the pasted font color is forced to black');
});

test('pasting does not rewrite content outside the pasted delta', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
    page.quill.root.innerHTML = '<span style="background-color: yellow">before</span>';

    page.paste({ ops: [{ insert: 'after', attributes: { background: '#ffff00' } }] });

    const html = page.quill.root.innerHTML;
    assert.ok(html.includes('background-color: yellow'), 'existing content keeps its background');
    assert.ok(!html.includes('#ffff00'), 'only the pasted background is removed');
    assert.ok(html.includes('color: #000000'), 'only the pasted text gets the black color');
});

test('a conversion that is not a paste keeps its formatting', () => {
    const page = openRawTextEditorPage(sessionsModule.memoryStorage());
    const delta = { ops: [{ insert: 'restored', attributes: { background: '#ffff00', color: '#ff0000' } }] };

    const converted = page.quill.matchers
        .filter((entry) => entry.selector === 1)
        .reduce((current, entry) => entry.matcher(page.quill.root, current), delta);

    assert.deepEqual(converted, delta, 'restore and programmatic conversions are left untouched');
});

test('a pasted session version stores the cleaned content', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openRawTextEditorPage(storage);
    page.typeTitle('Notes');

    page.paste({ ops: [{ insert: 'pasted', attributes: { background: '#ffff00', color: '#ff0000' } }] });
    page.hide();

    const version = latestVersion(page);
    assert.ok(version, 'the pasted content is versioned');
    assert.ok(!version.content.includes('background'), 'the stored content has no background');
    assert.ok(version.content.includes('color: #000000'), 'the stored content is black');
});
