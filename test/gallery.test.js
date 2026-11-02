const assert = require('node:assert/strict');
const test = require('node:test');
const { app } = require('../server');

const {
    openGalleryPage,
    openMarkdownPage,
    openTemplatePage,
    openTextEditorPage,
    openListComparePage,
    seedSession,
    readScript,
    sessionsModule,
} = require('./helpers/pages.js');

const galleryScript = readScript('gallery.js');
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
    const title = text.children[0];
    const link = title.children[0];
    return {
        title: link.textContent,
        titleHref: link.getAttribute('href'),
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
    assert.ok(
        !body.includes('&#x1F4C1;') && !body.includes('\u{1F4C1}'),
        'the empty state should not include a folder icon'
    );
    assert.ok(body.includes('No saved sessions yet.'), 'the empty state should include its message');
    assert.match(body, /<body[^>]*class="[^"]*d-flex\s+flex-column\s+min-vh-100[^"]*"/, 'home page body must have d-flex flex-column min-vh-100');
    assert.match(body, /<main[^>]*class="[^"]*flex-grow-1[^"]*"/, 'home page main must have flex-grow-1');
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

test('card titles link to the page for their session kind', () => {
    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'text-editor', { title: 'Draft', content: '<p>body</p>' }, clock);
    seedSession(storage, 'markdown-editor', { title: 'Notes', content: '# Notes' }, clock);
    seedSession(storage, 'template', { title: 'Invoice', content: 'Hello @[name]', variables: { name: 'Ada' } }, clock);

    const page = openGalleryPage(storage);
    const links = page.cards().map(cardOf).map((card) => [card.title, card.titleHref]);
    assert.deepEqual(links.sort(), [
        ['Draft', '/text-editor/1'],
        ['Invoice', '/template/1'],
        ['Notes', '/markdown-editor/1'],
    ].sort());
});

test('opening a linked page restores the session content saved in the gallery', () => {
    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'text-editor', { title: 'Draft', content: '<p>Editor body</p>' }, clock);
    seedSession(storage, 'markdown-editor', { title: 'Notes', content: '# Raw notes' }, clock);
    seedSession(storage, 'template', { title: 'Invoice', content: 'Hello @[name]', variables: { name: 'Ada' } }, clock);

    const textEditor = openTextEditorPage(storage, { sessionId: 1 });
    assert.equal(textEditor.titleInput().value, 'Draft');
    assert.deepEqual(textEditor.quill.contents, { ops: [{ insert: '<p>Editor body</p>' }] });

    const markdown = openMarkdownPage(storage, { sessionId: 1 });
    assert.equal(markdown.titleInput().value, 'Notes');
    assert.equal(markdown.element('mdInput').value, '# Raw notes');

    const template = openTemplatePage(storage, { sessionId: 1 });
    assert.equal(template.titleInput().value, 'Invoice');
    assert.equal(template.element('txtInput').value, 'Hello @[name]');
    assert.equal(template.element('txtVariables').value, '@[name]=Ada');
});

test('multiple sessions of one kind render as distinct cards', () => {
    const storage = sessionsModule.memoryStorage();
    const first = seedSession(storage, 'template', { title: 'One', content: '1' }, clock);
    const second = seedSession(storage, 'template', { title: 'Two', content: '2' }, clock);

    assert.equal(first.getId(), 1);
    assert.equal(second.getId(), 2);

    const page = openGalleryPage(storage);
    const cards = page.cards().map(cardOf).map((card) => [card.title, card.titleHref]);
    assert.deepEqual(cards.sort(), [
        ['One', '/template/1'],
        ['Two', '/template/2'],
    ]);
});

test('the New menu links to ID-less routes that start fresh sessions', async () => {
    const res = await fetch(`${baseUrl}/`);
    const body = await res.text();
    for (const href of ['/template', '/text-editor', '/markdown-editor', '/list-compare']) {
        assert.ok(body.includes(`href="${href}"`), `the New menu should link to ${href}`);
    }

    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'template', { title: 'Saved', content: 'Saved template' }, clock);
    const cases = [
        { kind: 'template', open: openTemplatePage },
        { kind: 'text-editor', open: openTextEditorPage },
        { kind: 'markdown-editor', open: openMarkdownPage },
        { kind: 'list-compare', open: openListComparePage },
    ];
    for (const { kind, open } of cases) {
        const page = open(storage);
        assert.equal(page.url(), `/${kind}`);
        assert.equal(page.sessionId(), null);
        assert.equal(page.titleInput().value, '', `${kind} New opens an untitled session`);
    }
});

test('legacy single-session documents migrate to ID 1 for every kind', () => {
    const storage = sessionsModule.memoryStorage();
    const kinds = ['template', 'text-editor', 'markdown-editor'];
    for (const kind of kinds) {
        storage.setItem(sessionsModule.sessionKey(kind), JSON.stringify({
            title: `${kind} legacy`,
            kind,
            versions: [{ updatedDate: '2026-10-16T12:00:00.000Z', content: 'legacy' }],
        }));
    }

    const page = openGalleryPage(storage);
    const cards = page.cards().map(cardOf).map((card) => [card.kind, card.title, card.titleHref]);
    assert.deepEqual(cards.sort(), [
        ['markdown-editor', 'markdown-editor legacy', '/markdown-editor/1'],
        ['template', 'template legacy', '/template/1'],
        ['text-editor', 'text-editor legacy', '/text-editor/1'],
    ]);

    for (const kind of kinds) {
        assert.equal(storage.getItem(sessionsModule.sessionKey(kind)), null, 'the legacy key is removed');
        assert.notEqual(storage.getItem(sessionsModule.sessionKey(kind, 1)), null, 'the session exists at ID 1');
    }

    const template = openTemplatePage(storage, { sessionId: 1 });
    assert.equal(template.titleInput().value, 'template legacy');
    assert.equal(template.element('txtInput').value, 'legacy');
});

test('filter buttons offer All plus every session kind and filter the gallery', () => {
    const page = openGalleryPage(seedGallery());
    assert.deepEqual(page.filterButtons().map((button) => button.textContent), ['All', 'text-editor', 'markdown-editor', 'template', 'list-compare']);

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

    assert.equal(storage.getItem(sessionsModule.sessionKey('template', 1)), null, 'the session is deleted from localStorage');
    assert.equal(storage.getItem(sessionsModule.sessionKey('markdown-editor', 1)) !== null, true, 'other sessions are kept');
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
