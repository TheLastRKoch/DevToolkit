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

test('GET / returns 200', async () => {
    const res = await getPage('/');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('Devtoolkit'), 'home page should mention Devtoolkit');
});

test('GET /editor returns 200', async () => {
    const res = await getPage('/editor');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('Devtoolkit'), 'editor page should mention Devtoolkit');
});

test('GET /markdown-editor returns 200', async () => {
    const res = await getPage('/markdown-editor');
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.ok(body.includes('Markdown Editor'), 'markdown editor page should contain Markdown Editor');
    assert.ok(body.includes('static/img/favicon.ico'), 'markdown editor page should reference DevToolkit favicon');
    assert.ok(body.includes('charCount'), 'markdown editor page should include character count element');
    assert.ok(body.includes('markdown-editor.js'), 'markdown editor page should load the client script');
});

test('GET /template redirects to /template/1', async () => {
    // fetch follows redirects by default; just check we land on a page
    const res = await getPage('/template');
    // After redirect we should have a 200 for the template page HTML
    assert.equal(res.status, 200);
});
