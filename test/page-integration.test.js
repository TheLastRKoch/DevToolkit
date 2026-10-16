const assert = require('node:assert/strict');
const test = require('node:test');

const { app } = require('../server');
const {
    openTemplatePage,
    openMarkdownPage,
    openTextEditorPage,
    openGalleryPage,
    readPage,
    readScript,
    sessionsModule,
    storedSession,
} = require('./helpers/pages.js');

const PAGES = [
    { script: 'template.js', file: 'template.html', breadcrumb: 'Template', options: ['Clear variables', 'Clear all'] },
    { script: 'text-editor.js', file: 'text-editor.html', breadcrumb: 'Text Editor', options: ['Clear editor'] },
    { script: 'markdown-editor.js', file: 'markdown-editor.html', breadcrumb: 'Markdown Editor', options: ['Clear editor'] },
];

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
    server.close();
});

function declaredList(script, key) {
    const marker = `${key}: [`;
    const start = script.indexOf(marker);
    assert.ok(start >= 0, `the page should declare ${key}`);
    const open = script.indexOf('[', start);
    let depth = 0;
    let end = open;
    for (let index = open; index < script.length; index += 1) {
        if (script[index] === '[') {
            depth += 1;
        } else if (script[index] === ']') {
            depth -= 1;
            if (depth === 0) {
                end = index;
                break;
            }
        }
    }
    return [...script.slice(open, end + 1).matchAll(/label: '([^']+)'/g)].map((match) => match[1]);
}

function latestVersion(session) {
    return session.versions[session.versions.length - 1];
}

test('every editing page serves the shared header with its own options', async () => {
    for (const page of PAGES) {
        for (const path of ['/' + page.file.replace('.html', '')]) {
            const response = await fetch(`${baseUrl}${path}`);
            assert.equal(response.status, 200, `${path} should resolve`);
            const html = await response.text();
            assert.ok(html.includes('id="pageHeader"'), `${page.file} should mount the shared header`);
            assert.ok(html.includes('browser-session.js'), `${page.file} should load the session store`);
            assert.ok(html.includes('page-header.js'), `${page.file} should load the shared header`);
            assert.ok(!html.includes('aria-label="breadcrumb"'), `${page.file} should not own breadcrumb markup`);
            assert.equal(html.split('pageOptionsMenu').length - 1, 0, `${page.file} should not own dropdown markup`);
            assert.ok(!html.includes('bootstrap.bundle'), `${page.file} should not need Bootstrap JS for its header menu`);
        }

        const script = readScript(page.script);
        assert.deepEqual(declaredList(script, 'options'), page.options, `${page.script} options`);
        assert.deepEqual(declaredList(script, 'breadcrumb'), ['Home', page.breadcrumb], `${page.script} breadcrumb`);
    }
});

test('a page whose browser storage is unavailable stays usable and reports it', () => {
    const storage = sessionsModule.memoryStorage();
    storage.setItem = () => {
        throw new Error('SecurityError');
    };

    const page = openMarkdownPage(storage);
    const status = page.element('pageHeaderStatus');
    assert.equal(status.hidden, false, 'the page reports that nothing can be persisted');
    assert.match(status.textContent, /not be persisted/);

    page.type('mdInput', 'still usable');
    assert.equal(page.element('mdInput').value, 'still usable', 'the page keeps working in view');
    assert.equal(page.element('mdPreview').innerHTML, '<p>still usable</p>');

    page.typeTitle('Unsaved notes');
    assert.equal(storedSession(storage, 'markdown-editor'), null, 'a failed write stores nothing');
    assert.equal(page.beforeUnloadProbe(), true, 'unsaved work is still protected');
});

test('the shared header renders the same row on every page with its own content', () => {
    const storage = sessionsModule.memoryStorage();
    const pages = [
        openTemplatePage(storage),
        openTextEditorPage(storage),
        openMarkdownPage(storage),
    ];

    const rows = pages.map((page) => page.headerElement());
    for (const row of rows) {
        assert.equal(row.getAttribute('class'), 'row mt-3');
        assert.equal(row.children.length, 3, 'breadcrumb column, controls column, and status area');
    }
    const layout = rows[0].children.map((child) => child.getAttribute('class'));
    for (const row of rows.slice(1)) {
        assert.deepEqual(row.children.map((child) => child.getAttribute('class')), layout, 'every page uses the same header row layout');
    }

    assert.deepEqual(pages.map((page) => page.breadcrumbItems()), [
        ['Home', 'Template'],
        ['Home', 'Text Editor'],
        ['Home', 'Markdown Editor'],
    ]);
    assert.deepEqual(pages.map((page) => page.element('pageOptionsToggle').textContent), ['Options', 'Options', 'Options']);
    for (const page of pages) {
        assert.equal(page.titleInput().getAttribute('placeholder'), 'DevToolKit');
        assert.equal(page.document.title, 'Devtoolkit', 'an untitled page keeps the default tab title');
    }
});

test('conditional persistence is title-gated and the saved title is immutable', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);
    const key = 'devtoolkit:sessions:markdown-editor';

    page.type('mdInput', '# Draft work');
    assert.equal(storage.getItem(key), null, 'an untitled session is not persisted');

    page.typeTitle('DevToolKit');
    assert.equal(storage.getItem(key), null, 'the default placeholder is not a valid title');
    page.typeTitle('   ');
    assert.equal(storage.getItem(key), null, 'a whitespace title is not a valid title');
    assert.equal(page.titleInput().getAttribute('disabled'), null, 'the title stays editable');

    page.typeTitle('Weekly notes');
    page.hide();
    const session = storedSession(storage, 'markdown-editor');
    assert.equal(session.title, 'Weekly notes', 'a valid title enables persistence');
    assert.equal(latestVersion(session).content, '# Draft work');
    assert.equal(page.titleInput().getAttribute('disabled'), 'true', 'the saved title is immutable');

    page.type('pageTitleInput', 'Renamed');
    assert.equal(storedSession(storage, 'markdown-editor').title, 'Weekly notes', 'the saved title cannot be renamed');
    assert.equal(page.document.title, 'Weekly notes', 'a locked title ignores further edits');
});

test('versioning creates, deduplicates, and truncates snapshots on visibility change', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openMarkdownPage(storage);
    page.typeTitle('Snapshot notes');
    assert.equal(storedSession(storage, 'markdown-editor').versions.length, 0, 'a title alone creates no version');

    page.type('mdInput', 'v1');
    page.hide();
    let session = storedSession(storage, 'markdown-editor');
    assert.equal(session.versions.length, 1, 'leaving the tab snapshots the current content');
    assert.equal(latestVersion(session).content, 'v1');
    assert.ok(Date.parse(latestVersion(session).updatedDate), 'the snapshot carries an ISO timestamp');

    page.type('mdInput', 'v1');
    page.show();
    page.hide();
    assert.equal(storedSession(storage, 'markdown-editor').versions.length, 1, 'unchanged content is not duplicated');

    for (const content of ['v2', 'v3', 'v4']) {
        page.type('mdInput', content);
        page.show();
        page.hide();
    }
    session = storedSession(storage, 'markdown-editor');
    assert.equal(session.versions.length, 3, 'only the last three versions are kept');
    assert.deepEqual(session.versions.map((version) => version.content), ['v2', 'v3', 'v4']);
});

test('the home gallery shows, filters, and deletes sessions saved by the pages', () => {
    const storage = sessionsModule.memoryStorage();

    const template = openTemplatePage(storage);
    template.type('txtInput', 'Hello @[name]');
    template.type('txtVariables', '@[name]=Ada');
    template.typeTitle('Invoice');
    template.hide();

    const textEditor = openTextEditorPage(storage);
    textEditor.quill.root.innerHTML = '<p>Letter</p>';
    textEditor.quill.emit('text-change', [], [], 'user');
    textEditor.typeTitle('Letter');
    textEditor.hide();

    const gallery = openGalleryPage(storage);
    const titles = () => gallery.cards().map((card) => card.children[0].children[0].children[0].children[0].textContent);
    assert.deepEqual(titles().sort(), ['Invoice', 'Letter']);

    gallery.clickFilter('template');
    assert.deepEqual(titles(), ['Invoice']);

    gallery.search('letter');
    assert.equal(gallery.cards().length, 0, 'search and kind filters combine');

    gallery.clickFilter('All');
    assert.deepEqual(titles(), ['Letter']);

    gallery.removeCard(0);
    assert.equal(storage.getItem('devtoolkit:sessions:text-editor'), null, 'the card deletes the session');
    assert.equal(storage.getItem('devtoolkit:sessions:template') !== null, true, 'the other session is untouched');
    assert.equal(gallery.cards().length, 0);
    assert.equal(gallery.element('emptyState').classList.contains('d-none'), false, 'the gallery falls back to its empty state');
});

test('the kept and legacy URLs resolve and the server template API still works', async () => {
    const legacy = await fetch(`${baseUrl}/editor`, { redirect: 'manual' });
    assert.equal(legacy.status, 301);
    assert.equal(legacy.headers.get('location'), '/text-editor');

    for (const path of ['/', '/editor', '/text-editor', '/template', '/markdown-editor']) {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 200, `${path} should resolve to a page`);
    }

    const created = await fetch(`${baseUrl}/api/template/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(created.status, 201);
    const { id } = await created.json();

    const patched = await fetch(`${baseUrl}/api/template/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Server @[name]', syncVariables: true }),
    });
    assert.equal(patched.status, 200);
    const session = await patched.json();
    assert.deepEqual(session.variables, [{ key: 'name', value: '' }]);
    assert.equal(readPage('template.html').includes('id="pageHeader"'), true);
});
