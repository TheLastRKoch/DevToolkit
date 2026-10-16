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
    return await fetch(`${baseUrl}${path}`);
}

test('GET / serves gallery home page with DevToolkit navbar, New dropdown, element IDs, and gallery module', async () => {
    const res = await getPage('/');
    assert.equal(res.status, 200);
    const body = await res.text();

    // Devtoolkit brand and navbar classes
    assert.ok(body.includes('Devtoolkit'), 'should include Devtoolkit brand');
    assert.ok(
        body.includes('navbar navbar-expand-lg navbar-dark bg-dark'),
        'should include standard dark navbar classes'
    );

    // Bootstrap dropdown with "New" text and tool links
    assert.ok(body.includes('data-bs-toggle="dropdown"'), 'should contain dropdown toggle attribute');
    assert.ok(body.includes('New'), 'should contain New dropdown button');
    assert.ok(body.includes('href="/template"'), 'should contain /template link');
    assert.ok(body.includes('href="/editor"'), 'should contain /editor link');
    assert.ok(body.includes('href="/markdown-editor"'), 'should contain /markdown-editor link');

    // Gallery element IDs
    assert.ok(body.includes('id="filters"'), 'should contain #filters element');
    assert.ok(body.includes('id="search"'), 'should contain #search element');
    assert.ok(body.includes('id="resultCount"'), 'should contain #resultCount element');
    assert.ok(body.includes('id="gallery"'), 'should contain #gallery element');
    assert.ok(body.includes('id="emptyState"'), 'should contain #emptyState element');
    assert.ok(body.includes('id="resetFilters"'), 'should contain #resetFilters element');

    // Script reference
    assert.ok(body.includes('/static/scripts/gallery.js'), 'should reference gallery.js module');
});

test('public/static/scripts/gallery-data.js exports CATEGORIES with All and 8 PIECES', async () => {
    const dataModule = await import('../public/static/scripts/gallery-data.js');
    assert.ok(Array.isArray(dataModule.CATEGORIES), 'CATEGORIES should be an array');
    assert.ok(dataModule.CATEGORIES.includes('All'), 'CATEGORIES should include All');
    assert.ok(Array.isArray(dataModule.PIECES), 'PIECES should be an array');
    assert.equal(dataModule.PIECES.length, 8, 'PIECES length should be 8');
});

test('public/static/scripts/gallery.js implements required functionality and card styling', async () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const script = fs.readFileSync(path.join(__dirname, '../public/static/scripts/gallery.js'), 'utf8');

    // Imports gallery-data.js
    assert.ok(script.includes("from './gallery-data.js'"), 'should import from ./gallery-data.js');

    // Renders img-thumbnail markup with alt attribute
    assert.ok(script.includes('img-thumbnail'), 'should include img-thumbnail class on images');
    assert.ok(script.includes('alt='), 'should include alt attribute on images');

    // Renders top-right remove button
    assert.ok(
        script.includes('top-0 end-0') && script.includes('remove-btn'),
        'should position remove button at top-right'
    );

    // No heart or save icons/buttons
    assert.ok(!script.includes('&#9829;'), 'should not contain heart glyph');
    assert.ok(!script.includes('fav-btn'), 'should not contain fav-btn class');
    assert.ok(!script.includes('favoritesOnly'), 'should not contain favoritesOnly state');

    // Implements filter, search, remove, reset, result-count, and empty-state paths
    assert.ok(script.includes('renderFilters'), 'should implement filter rendering');
    assert.ok(script.includes('els.search'), 'should implement search interaction');
    assert.ok(script.includes('removePiece'), 'should implement piece removal');
    assert.ok(script.includes('resetFilters'), 'should implement filter reset');
    assert.ok(script.includes('els.resultCount'), 'should update result count');
    assert.ok(script.includes('els.emptyState'), 'should toggle empty state');
});

