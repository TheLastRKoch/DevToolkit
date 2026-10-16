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
    const response = await fetch(`${baseUrl}${path}`);
    return response;
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

test('GET /text-editor redirects to the first text editor session', async () => {
    const res = await getRedirect('/text-editor');
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/text-editor/1');
});

test('GET /text-editor/1 returns the text editor page', async () => {
    const res = await getPage('/text-editor/1');
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

test('GET /text-editor/abc is rejected', async () => {
    const res = await getPage('/text-editor/abc');
    assert.equal(res.status, 400);
});

test('GET /markdown-editor redirects to the first markdown editor session', async () => {
    const res = await getRedirect('/markdown-editor');
    assert.equal(res.status, 302);
    assert.equal(res.headers.get('location'), '/markdown-editor/1');
});

test('GET /markdown-editor/1 returns 200', async () => {
    const res = await getPage('/markdown-editor/1');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('Markdown Editor'), 'markdown editor page should contain Markdown Editor');
    assert.ok(body.includes('static/img/favicon.ico'), 'markdown editor page should reference DevToolkit favicon');
    assert.ok(body.includes('charCount'), 'markdown editor page should include character count element');
    assert.ok(body.includes('markdown-editor.js'), 'markdown editor page should load the client script');
});

test('GET /markdown-editor/abc is rejected', async () => {
    const res = await getPage('/markdown-editor/abc');
    assert.equal(res.status, 400);
});

test('GET /template redirects to /template/1', async () => {
    // fetch follows redirects by default; just check we land on a page
    const res = await getPage('/template');
    // After redirect we should have a 200 for the template page HTML
    assert.equal(res.status, 200);
});
