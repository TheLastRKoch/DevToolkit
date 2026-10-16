const assert = require('node:assert/strict');
const test = require('node:test');

const {
    openStore,
    memoryStorage,
    DEFAULT_NAME,
    EXPIRY_MS,
    STORAGE_PREFIX,
} = require('../public/static/scripts/browser-session.js');

const DAY_MS = 24 * 60 * 60 * 1000;

function fakeClock(start) {
    let current = start;
    return {
        now: () => current,
        advance: (ms) => {
            current += ms;
        },
    };
}

function storedDocument(storage, pageType) {
    return JSON.parse(storage.getItem(`${STORAGE_PREFIX}${pageType}`));
}

test('a new session starts as an empty default session', () => {
    const store = openStore('template', memoryStorage());
    const session = store.ensure(1, { text: '', variables: {} });
    assert.equal(session.name, DEFAULT_NAME);
    assert.deepEqual(session.data, { text: '', variables: {} });
    assert.equal(session.expiresAt - session.updatedAt, EXPIRY_MS);
    assert.equal(store.get(1).name, DEFAULT_NAME);
});

test('invalid session identifiers are rejected', () => {
    const store = openStore('template', memoryStorage());
    assert.equal(store.get('abc'), null);
    assert.equal(store.ensure('abc'), null);
    assert.equal(store.save('0', { name: 'nope' }), null);
    assert.equal(store.get('-1'), null);
});

test('saved state is read back by a store created later', () => {
    const storage = memoryStorage();
    const first = openStore('template', storage);
    first.ensure(1, { text: '', variables: {} });
    first.save(1, { name: 'Release notes', data: { text: 'Hi @[name]', variables: { name: 'Ada' } } });

    const reopened = openStore('template', storage);
    const session = reopened.get(1);
    assert.equal(session.name, 'Release notes');
    assert.deepEqual(session.data, { text: 'Hi @[name]', variables: { name: 'Ada' } });
});

test('pages and sessions keep their state isolated', () => {
    const storage = memoryStorage();
    const template = openStore('template', storage);
    const textEditor = openStore('text-editor', storage);
    const markdown = openStore('markdown-editor', storage);

    template.ensure(1, { text: '', variables: {} });
    textEditor.ensure(1, { html: '' });
    markdown.ensure(1, { markdown: '' });

    template.save(1, { name: 'Template one', data: { text: 'template body', variables: {} } });
    textEditor.save(1, { name: 'Text one', data: { html: '<p>text body</p>' } });
    markdown.save(1, { name: 'Markdown one', data: { markdown: '# markdown body' } });

    assert.equal(template.get(1).name, 'Template one');
    assert.equal(textEditor.get(1).name, 'Text one');
    assert.equal(markdown.get(1).name, 'Markdown one');
    assert.deepEqual(markdown.get(1).data, { markdown: '# markdown body' });

    template.ensure(2, { text: '', variables: {} });
    template.save(2, { name: 'Template two' });
    assert.equal(template.get(1).name, 'Template one');
    assert.equal(template.get(2).name, 'Template two');
    assert.equal(textEditor.get(2), null);
});

test('new session identifiers are allocated per page above every stored one', () => {
    const storage = memoryStorage();
    const template = openStore('template', storage);
    const markdown = openStore('markdown-editor', storage);

    assert.equal(template.allocateId(), 1);
    template.ensure(1, { text: '', variables: {} });
    assert.equal(template.allocateId(), 2);

    const reopened = openStore('template', storage);
    assert.equal(reopened.allocateId(), 3);

    markdown.ensure(1, { markdown: '' });
    assert.equal(markdown.allocateId(), 2, 'another page keeps its own counter');

    template.save(9, { name: 'Manual nine' });
    assert.equal(template.allocateId(), 10, 'allocation clears every stored identifier');
});

test('a stored session expires 30 days after its last change', () => {
    const storage = memoryStorage();
    const clock = fakeClock(1_000_000);
    const store = openStore('template', storage, { now: clock.now });
    store.ensure(1, { text: '', variables: {} });
    store.save(1, { name: 'Dated', data: { text: 'keep me', variables: {} } });

    clock.advance(30 * DAY_MS);
    assert.ok(store.get(1), 'exactly 30 days is still stored');

    clock.advance(DAY_MS);
    assert.equal(store.get(1), null, 'more than 30 days expires the session');
    assert.equal(storedDocument(storage, 'template').sessions[1], undefined, 'expired state is dropped');
});

test('editing a session refreshes its 30 day lifetime', () => {
    const storage = memoryStorage();
    const clock = fakeClock(0);
    const store = openStore('template', storage, { now: clock.now });
    store.ensure(1, { text: '', variables: {} });

    clock.advance(29 * DAY_MS);
    store.save(1, { name: 'Still alive', data: { text: 'edit', variables: {} } });

    clock.advance(29 * DAY_MS);
    assert.equal(store.get(1).name, 'Still alive', 'the lifetime restarted at the last edit');
});

test('an expired session is recreated empty', () => {
    const storage = memoryStorage();
    const clock = fakeClock(0);
    const store = openStore('markdown-editor', storage, { now: clock.now });
    store.ensure(1, { markdown: '# old' });

    clock.advance(31 * DAY_MS);
    const session = store.ensure(1, { markdown: '' });
    assert.deepEqual(session.data, { markdown: '' });
    assert.equal(session.name, DEFAULT_NAME);
});

test('sessions can be removed and listed', () => {
    const store = openStore('text-editor', memoryStorage());
    store.ensure(2, { html: '' });
    store.ensure(1, { html: '' });
    assert.deepEqual(store.listIds(), [1, 2]);
    assert.equal(store.remove(1), true);
    assert.equal(store.remove(1), false);
    assert.deepEqual(store.listIds(), [2]);
});

test('a failed write keeps the change in the page view and reports it', () => {
    const storage = memoryStorage();
    const errors = [];
    const store = openStore('template', storage, {
        onWriteError: (error) => errors.push(error),
    });
    store.ensure(1, { text: '', variables: {} });
    assert.equal(store.isPersisted(), true);

    storage.setItem = () => {
        throw new Error('QuotaExceededError');
    };

    const saved = store.save(1, { name: 'Unsaved', data: { text: 'visible', variables: {} } });
    assert.equal(saved.name, 'Unsaved');
    assert.equal(store.get(1).data.text, 'visible', 'the change is still visible');
    assert.equal(store.isPersisted(), false, 'the page is told the change was not persisted');
    assert.deepEqual(store.status(), { persistent: true, lastWriteFailed: true });
    assert.equal(errors.length, 1);
});

test('missing storage degrades to in-memory state and is reported', () => {
    const store = openStore('markdown-editor', null);
    assert.equal(store.isPersisted(), false);
    const session = store.ensure(1, { markdown: '' });
    assert.equal(session.name, DEFAULT_NAME);

    store.save(1, { name: 'In memory', data: { markdown: '# kept' } });
    assert.equal(store.get(1).name, 'In memory', 'the page view keeps the change');
    assert.deepEqual(store.status(), { persistent: false, lastWriteFailed: false });
});

test('unavailable storage is not treated as persistent', () => {
    const broken = memoryStorage();
    broken.setItem = () => {
        throw new Error('SecurityError');
    };
    const store = openStore('template', broken);
    assert.equal(store.isPersisted(), false);
    store.ensure(1, { text: '', variables: {} });
    store.save(1, { name: 'Still usable', data: { text: 'body', variables: {} } });
    assert.equal(store.get(1).data.text, 'body');
});

test('a corrupted stored document does not break the page', () => {
    const storage = memoryStorage();
    storage.setItem(`${STORAGE_PREFIX}template`, 'not-json');
    const store = openStore('template', storage);
    assert.equal(store.get(1), null);
    const session = store.ensure(1, { text: '', variables: {} });
    assert.equal(session.name, DEFAULT_NAME);
});
