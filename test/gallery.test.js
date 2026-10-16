const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('../server');

const { openGalleryPage, seedSession, readScript, sessionsModule } = require('./helpers/pages.js');

const galleryScript = readScript('gallery.js');
const STORAGE_KEY = 'devtoolkit:sessions:';
const DATE = Date.UTC(2026, 9, 16, 12, 0, 0);
const clock = () => DATE;

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

function cardOf(card) {
    const body = card.children[0].children[0];
    const text = body.children[0];
    return {
        title: text.children[0].textContent,
        meta: text.children[1].textContent,
        kind: card.children[0].getAttribute('data-kind'),
        removeButton: body.children[1],
    };
}

function seedGallery() {
    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'template', { title: 'Invoice', content: 'Hello @[name]', variables: { name: 'Ada' } }, clock);
    seedSession(storage, 'markdown-editor', { title: 'Notes', content: '# Notes' }, clock);
    return storage;
}

test('GET / serves the session gallery home page', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const body = await res.text();

    assert.ok(body.includes('Devtoolkit'), 'should include the Devtoolkit name');
    for (const id of ['filters', 'search', 'gallery', 'resultCount', 'emptyState', 'resetFilters']) {
        assert.ok(body.includes(`id="${id}"`), `should contain the #${id} element`);
    }
    assert.ok(body.includes('static/scripts/browser-session.js'), 'should load the session store');
    assert.ok(body.includes('static/scripts/gallery.js'), 'should load the gallery script');
    assert.ok(!body.includes('type="module"'), 'the gallery is a classic script, not a module');
});

test('the gallery module reads sessions from storage instead of static data', () => {
    assert.ok(galleryScript.includes("devtoolkit:sessions:"), 'the gallery reads the session keys');
    assert.ok(galleryScript.includes('listAll'), 'the gallery reads every saved session');
    assert.ok(galleryScript.includes('remove-btn'), 'the gallery renders a remove button per card');
    assert.ok(!galleryScript.includes('gallery-data.js'), 'the static piece data is gone');
});

test('saved sessions are rendered as cards with title, kind, and date', () => {
    const page = openGalleryPage(seedGallery());

    assert.equal(page.cards().length, 2);
    const cards = page.cards().map(cardOf);
    assert.deepEqual(cards.map((card) => card.title).sort(), ['Invoice', 'Notes']);
    assert.deepEqual(cards.map((card) => card.meta).sort(), ['markdown-editor · 2026-10-16', 'template · 2026-10-16']);
    assert.deepEqual(cards.map((card) => card.kind).sort(), ['markdown-editor', 'template']);
    assert.equal(page.element('resultCount').textContent, '2 sessions');
});

test('filter buttons offer All plus every session kind and filter the gallery', () => {
    const page = openGalleryPage(seedGallery());
    assert.deepEqual(page.filterButtons().map((button) => button.textContent), ['All', 'text-editor', 'markdown-editor', 'template']);

    page.clickFilter('template');
    assert.deepEqual(page.cards().map((card) => cardOf(card).title), ['Invoice']);
    assert.equal(page.element('resultCount').textContent, '1 session');

    page.clickFilter('text-editor');
    assert.equal(page.cards().length, 0, 'a kind with no stored session shows nothing');
    assert.equal(page.element('emptyState').classList.contains('d-none'), false);

    page.clickFilter('All');
    assert.equal(page.cards().length, 2);
});

test('search filters sessions by title', () => {
    const page = openGalleryPage(seedGallery());

    page.search('not');
    assert.deepEqual(page.cards().map((card) => cardOf(card).title), ['Notes']);

    page.search('INVOICE');
    assert.deepEqual(page.cards().map((card) => cardOf(card).title), ['Invoice']);

    page.search('nothing matches');
    assert.equal(page.cards().length, 0);
    assert.equal(page.element('emptyState').classList.contains('d-none'), false);
});

test('deleting a card removes the session from storage and the gallery', () => {
    const storage = seedGallery();
    const page = openGalleryPage(storage);
    const invoiceIndex = page.cards().map(cardOf).findIndex((card) => card.title === 'Invoice');

    page.removeCard(invoiceIndex);

    assert.equal(storage.getItem(`${STORAGE_KEY}template`), null, 'the session is deleted from localStorage');
    assert.equal(storage.getItem(`${STORAGE_KEY}markdown-editor`) !== null, true, 'other sessions are kept');
    assert.deepEqual(page.cards().map((card) => cardOf(card).title), ['Notes']);
    assert.equal(page.element('resultCount').textContent, '1 session');
});

test('the empty state shows when nothing is saved and hides once a session exists', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openGalleryPage(storage);

    assert.equal(page.cards().length, 0);
    assert.equal(page.element('emptyState').classList.contains('d-none'), false, 'the empty state is visible');
    assert.equal(page.element('gallery').classList.contains('d-none'), true);
    assert.equal(page.element('resultCount').textContent, '0 sessions');

    seedSession(storage, 'text-editor', { title: 'Draft', content: '<p>body</p>' }, clock);
    page.render();

    assert.equal(page.cards().length, 1);
    assert.equal(page.element('emptyState').classList.contains('d-none'), true, 'the empty state hides');
});
