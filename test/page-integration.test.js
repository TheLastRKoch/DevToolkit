const assert = require('node:assert/strict');
const test = require('node:test');

const { app } = require('../server');
const {
    openTemplatePage,
    openMarkdownPage,
    openTextEditorPage,
    readPage,
    readScript,
    sessionsModule,
} = require('./helpers/pages.js');

const DAY_MS = 24 * 60 * 60 * 1000;
const PAGES = [
    { path: '/template/1', file: 'template.html', script: 'template.js', breadcrumb: 'Template' },
    { path: '/text-editor/1', file: 'text-editor.html', script: 'text-editor.js', breadcrumb: 'Text Editor' },
    { path: '/markdown-editor/1', file: 'markdown-editor.html', script: 'markdown-editor.js', breadcrumb: 'Markdown Editor' },
];
const EXPECTED_OPTIONS = {
    'template.js': ['New session', 'Clear variables', 'Clear all'],
    'text-editor.js': ['New session', 'Clear editor'],
    'markdown-editor.js': ['New session', 'Clear editor'],
};

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

test('every editing page serves the shared header with its own options', async () => {
    for (const page of PAGES) {
        const response = await fetch(`${baseUrl}${page.path}`);
        assert.equal(response.status, 200, `${page.path} should resolve`);
        const html = await response.text();

        assert.ok(html.includes('id="pageHeader"'), `${page.file} should mount the shared header`);
        assert.ok(html.includes('browser-session.js'), `${page.file} should load the session store`);
        assert.ok(html.includes('page-header.js'), `${page.file} should load the shared header`);
        assert.ok(!html.includes('aria-label="breadcrumb"'), `${page.file} should not own breadcrumb markup`);
        assert.equal(
            html.split('pageOptionsMenu').length - 1,
            0,
            `${page.file} should not own dropdown markup`,
        );

        const script = readScript(page.script);
        assert.deepEqual(declaredList(script, 'options'), EXPECTED_OPTIONS[page.script], `${page.script} options`);
        assert.deepEqual(declaredList(script, 'breadcrumb'), ['Home', page.breadcrumb], `${page.script} breadcrumb`);
    }
});

test('the shared header renders the same row on every page', () => {
    const template = openTemplatePage(sessionsModule.memoryStorage());
    const textEditor = openTextEditorPage(sessionsModule.memoryStorage());
    const markdown = openMarkdownPage(sessionsModule.memoryStorage());

    const rows = [template, textEditor, markdown].map((page) => page.element('pageHeader').children[0]);
    for (const row of rows) {
        assert.equal(row.getAttribute('class'), 'row mt-3');
        assert.equal(row.children.length, 3, 'breadcrumb column, controls column, and status area');
    }
    assert.deepEqual(rows[1].children.map((child) => child.getAttribute('class')), rows[0].children.map((child) => child.getAttribute('class')));

    const breadcrumbs = [template, textEditor, markdown].map((page) => page.breadcrumbItems());
    assert.deepEqual(breadcrumbs, [['Home', 'Template'], ['Home', 'Text Editor'], ['Home', 'Markdown Editor']]);

    for (const page of [template, textEditor, markdown]) {
        assert.ok(page.element('pageNameInput'), 'every page shows the page name textbox');
        assert.equal(page.element('pageOptionsToggle').textContent, 'Options');
    }
});

test('the same session identifier keeps separate state on each page', () => {
    const storage = sessionsModule.memoryStorage();

    const template = openTemplatePage(storage);
    template.element('txtInput').value = 'Template body';
    template.element('txtInput').dispatch('input', {});
    template.element('pageNameInput').value = 'Template one';
    template.element('pageNameInput').dispatch('input', {});

    const markdown = openMarkdownPage(storage);
    markdown.element('mdInput').value = 'Markdown body';
    markdown.element('mdInput').dispatch('input', {});
    markdown.element('pageNameInput').value = 'Markdown one';
    markdown.element('pageNameInput').dispatch('input', {});

    const textEditor = openTextEditorPage(storage);
    textEditor.quill.root.innerHTML = '<p>Text body</p>';
    textEditor.quill.emit('text-change', [], [], 'user');
    textEditor.element('pageNameInput').value = 'Text one';
    textEditor.element('pageNameInput').dispatch('input', {});

    assert.equal(template.storedSession(1).name, 'Template one');
    assert.equal(template.storedSession(1).data.text, 'Template body');
    assert.equal(markdown.storedSession(1).name, 'Markdown one');
    assert.equal(markdown.storedSession(1).data.markdown, 'Markdown body');
    assert.equal(textEditor.storedSession(1).name, 'Text one');
    assert.equal(textEditor.storedSession(1).data.html, '<p>Text body</p>');

    assert.deepEqual(template.storedSession(1).data, { text: 'Template body', variables: {} });
    assert.deepEqual(markdown.storedSession(1).data, { markdown: 'Markdown body' });
});

test('session state survives without any server request and expires after 30 days', () => {
    const storage = sessionsModule.memoryStorage();
    let current = 0;
    const now = () => current;

    const template = openTemplatePage(storage, { clock: now });
    template.element('txtInput').value = 'Dated body';
    template.element('txtInput').dispatch('input', {});
    template.element('pageNameInput').value = 'Dated';
    template.element('pageNameInput').dispatch('input', {});

    const markdown = openMarkdownPage(storage, { clock: now });
    markdown.element('mdInput').value = 'Dated markdown';
    markdown.element('mdInput').dispatch('input', {});

    current += 29 * DAY_MS;
    const stillThere = openTemplatePage(storage, { clock: now });
    assert.equal(stillThere.element('txtInput').value, 'Dated body', 'a 29 day old session is restored');
    assert.equal(stillThere.element('pageNameInput').value, 'Dated');

    current += 2 * DAY_MS;
    const expired = openTemplatePage(storage, { clock: now });
    assert.equal(expired.element('txtInput').value, '', 'a session older than 30 days starts fresh');
    assert.equal(expired.element('pageNameInput').value, 'Devtoolkit');

    const expiredMarkdown = openMarkdownPage(storage, { clock: now });
    assert.equal(expiredMarkdown.element('mdInput').value, '');
});

test('the renamed, kept, and legacy URLs all still resolve', async () => {
    const legacy = await fetch(`${baseUrl}/editor`, { redirect: 'manual' });
    assert.equal(legacy.status, 301);
    assert.equal(legacy.headers.get('location'), '/text-editor');

    for (const path of ['/editor', '/text-editor', '/text-editor/1', '/template', '/template/1', '/markdown-editor', '/markdown-editor/1']) {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 200, `${path} should resolve to a page`);
    }

    for (const path of ['/text-editor/abc', '/markdown-editor/abc', '/template/abc']) {
        const response = await fetch(`${baseUrl}${path}`);
        assert.equal(response.status, 400, `${path} should be rejected`);
    }
});

test('the server-side template API is still available alongside browser sessions', async () => {
    const created = await fetch(`${baseUrl}/api/template/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(created.status, 201);
    const { id, path } = await created.json();
    assert.match(path, /^\/template\/[1-9][0-9]*$/);

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
