const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('../server');

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

async function getPage(path) {
    return fetch(`${baseUrl}${path}`);
}

async function getRedirect(path) {
    return fetch(`${baseUrl}${path}`, { redirect: 'manual' });
}

test('GET / returns 200', async () => {
    const res = await getPage('/');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('Devtoolkit'), 'home page should mention Devtoolkit');
});

test('GET / links to the text editor and not to the legacy editor route', async () => {
    const res = await getPage('/');
    const body = await res.text();
    assert.ok(body.includes('Text Editor'), 'home page should list the Text Editor');
    assert.ok(body.includes('href="/text-editor"'), 'home page should link to /text-editor');
    assert.ok(!body.includes('href="/editor"'), 'home page should not link to /editor');
});

test('GET /text-editor returns the text editor page', async () => {
    const res = await getPage('/text-editor');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('Text Editor'), 'text editor page should be named Text Editor');
    assert.ok(body.includes('txtOutput'), 'text editor page should include its editing surface');
});

test('GET /editor redirects permanently to /text-editor', async () => {
    const res = await getRedirect('/editor');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/text-editor');

    const followed = await getPage('/editor');
    assert.equal(followed.status, 200);
    assert.ok((await followed.text()).includes('Text Editor'));
});

test('GET /markdown-editor returns the markdown editor page', async () => {
    const res = await getPage('/markdown-editor');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('Markdown Editor'), 'markdown editor page should contain Markdown Editor');
    assert.ok(body.includes('static/img/favicon.ico'), 'markdown editor page should reference the favicon');
    assert.ok(body.includes('charCount'), 'markdown editor page should include character count element');
    assert.ok(body.includes('markdown-editor.js'), 'markdown editor page should load the client script');
});

test('GET /template returns the template page', async () => {
    const res = await getPage('/template');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('id="pageHeader"'), 'template page should mount the shared header');
    assert.ok(body.includes('txtInput'), 'template page should include its editing surface');
});

test('numeric session routes serve their page kind', async () => {
    for (const path of ['/text-editor/1', '/markdown-editor/2', '/template/3']) {
        const res = await getPage(path);
        assert.equal(res.status, 200, `${path} should resolve`);
    }
});

test('non-numeric session routes are rejected', async () => {
    for (const path of ['/text-editor/abc', '/markdown-editor/abc', '/template/abc']) {
        const res = await getPage(path);
        assert.equal(res.status, 404, `${path} should be rejected`);
    }
});

test('nested session routes use absolute asset URLs', async () => {
    const pages = [
        { path: '/text-editor/1', script: '/static/scripts/text-editor.js' },
        { path: '/markdown-editor/1', script: '/static/scripts/markdown-editor.js' },
    ];

    for (const { path, script } of pages) {
        const res = await getPage(path);
        assert.equal(res.status, 200, `${path} should resolve`);
        const body = await res.text();
        assert.ok(body.includes('src="/static/scripts/browser-session.js"'), `${path} should load the store by absolute URL`);
        assert.ok(body.includes('src="/static/scripts/page-header.js"'), `${path} should load the header by absolute URL`);
        assert.ok(body.includes(`src="${script}"`), `${path} should load its page script by absolute URL`);
        assert.ok(body.includes('href="/static/img/favicon.ico"'), `${path} should use an absolute favicon URL`);
        assert.ok(!body.includes('src="static/scripts/'), `${path} should not use relative script URLs`);

        for (const asset of ['/static/scripts/browser-session.js', '/static/scripts/page-header.js', script, '/static/img/favicon.ico']) {
            const assetRes = await getPage(asset);
            assert.equal(assetRes.status, 200, `${asset} should resolve`);
        }
    }
});

test('legacy editor session routes redirect to the text editor route', async () => {
    const res = await getRedirect('/editor/3');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/text-editor/3');

    const followed = await getPage('/editor/3');
    assert.equal(followed.status, 200);
    assert.ok((await followed.text()).includes('Text Editor'));

    const invalid = await getPage('/editor/abc');
    assert.equal(invalid.status, 404);
});
