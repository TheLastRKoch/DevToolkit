const assert = require('node:assert/strict');
const test = require('node:test');

const {
    openStore,
    listAll,
    memoryStorage,
    isValidTitle,
    sessionKey,
    MAX_VERSIONS,
    STORAGE_PREFIX,
} = require('../public/static/scripts/browser-session.js');

const MINUTE_MS = 60 * 1000;

function fakeClock(start) {
    let current = start;
    return {
        now: () => current,
        advance: (ms) => {
            current += ms;
        },
    };
}

/** A localStorage stand-in that records every write, like a browser would. */
function recordingStorage() {
    const values = new Map();
    const writes = [];
    return {
        writes,
        get length() {
            return values.size;
        },
        key: (index) => Array.from(values.keys())[index] ?? null,
        getItem: (key) => (values.has(String(key)) ? values.get(String(key)) : null),
        setItem(key, value) {
            writes.push(String(key));
            values.set(String(key), String(value));
        },
        removeItem: (key) => {
            values.delete(String(key));
        },
    };
}

function storedDocument(storage, kind) {
    return JSON.parse(storage.getItem(sessionKey(kind)));
}

test('the module loads in Node and exports the store factory', () => {
    assert.equal(typeof openStore, 'function');
    assert.equal(typeof listAll, 'function');
    assert.equal(sessionKey('template'), `${STORAGE_PREFIX}template`);
});

test('an untitled session is never written to storage', () => {
    const storage = recordingStorage();
    const store = openStore('template', storage);

    store.save({ content: 'Hello @[name]', variables: { name: 'Ada' } });
    assert.equal(storage.getItem(sessionKey('template')), null, 'nothing is persisted while untitled');
    assert.equal(store.isTitled(), false);
    assert.equal(store.content().content, 'Hello @[name]', 'the content stays in the page view');

    assert.deepEqual(store.save({ title: '' }), { titled: false, persisted: false, title: '' });
    store.save({ title: 'DevToolKit' });
    assert.equal(store.isTitled(), false, 'the default placeholder is not a title');
    store.save({ title: '   ' });
    assert.equal(store.isTitled(), false, 'whitespace is not a title');
    assert.equal(storage.getItem(sessionKey('template')), null);
});

test('a valid title enables conditional persistence', () => {
    const storage = recordingStorage();
    const store = openStore('template', storage);

    const saved = store.save({ title: 'Release notes', content: 'Hello', variables: { name: 'Ada' } });
    assert.deepEqual(saved, { titled: true, persisted: true, title: 'Release notes' });
    assert.deepEqual(storedDocument(storage, 'template'), {
        title: 'Release notes',
        kind: 'template',
        versions: [],
    });

    const trailing = store.save({ title: '  Sprint plan  ' });
    assert.equal(trailing.title, 'Sprint plan', 'a valid title is stored trimmed');
});

test('title validation matches the spec', () => {
    for (const valid of ['My Project Notes', 'devtoolkit notes', 'A']) {
        assert.equal(isValidTitle(valid), true, `${valid} should be valid`);
    }
    for (const invalid of ['', '   ', 'DevToolKit', 'devtoolkit', 'DEVTOOLKIT', null, undefined, 42]) {
        assert.equal(isValidTitle(invalid), false, `${invalid} should be invalid`);
    }
});

test('versions are created on demand, deduplicated, and truncated at three', () => {
    const storage = recordingStorage();
    const clock = fakeClock(Date.UTC(2026, 9, 16, 12, 0, 0));
    const store = openStore('markdown-editor', storage, { now: clock.now });
    store.save({ title: 'Notes' });

    store.save({ content: 'v1' });
    assert.equal(store.snapshot(), true, 'the first snapshot records the staged content');
    assert.equal(store.get().versions.length, 1);
    assert.equal(store.get().versions[0].updatedDate, '2026-10-16T12:00:00.000Z');

    store.save({ content: 'v1' });
    assert.equal(store.snapshot(), false, 'unchanged content is not snapshotted again');
    assert.equal(storedDocument(storage, 'markdown-editor').versions.length, 1);

    for (const content of ['v2', 'v3', 'v4']) {
        clock.advance(MINUTE_MS);
        store.save({ content });
        assert.equal(store.snapshot(), true);
    }
    const versions = store.get().versions;
    assert.equal(versions.length, MAX_VERSIONS, 'only the last three versions are kept');
    assert.deepEqual(versions.map((version) => version.content), ['v2', 'v3', 'v4']);
    assert.deepEqual(versions.map((version) => version.content), storedDocument(storage, 'markdown-editor').versions.map((version) => version.content));
});

test('an untitled session never snapshots and starts again untitled', () => {
    const storage = recordingStorage();
    const store = openStore('text-editor', storage);
    store.save({ content: '<p>draft</p>' });
    assert.equal(store.snapshot(), false, 'untitled work is not versioned');
    assert.equal(storage.getItem(sessionKey('text-editor')), null);
    assert.deepEqual(store.get(), { title: '', kind: 'text-editor', versions: [] });
});

test('template versions carry variables and compare them for deduplication', () => {
    const storage = recordingStorage();
    const store = openStore('template', storage, { now: () => 0 });
    store.save({ title: 'Invoice', content: 'Hello @[name]', variables: { name: 'Ada' } });
    store.snapshot();

    store.save({ content: 'Hello @[name]', variables: { name: 'Grace' } });
    assert.equal(store.snapshot(), true, 'a changed variable is a new version');
    assert.deepEqual(store.get().versions[1].variables, { name: 'Grace' });

    store.save({ content: 'Hello @[name]', variables: { name: 'Grace' } });
    assert.equal(store.snapshot(), false, 'identical variables and content are not duplicated');
    assert.equal(store.get().versions.length, 2);
});

test('a titled session is read back by a store created later', () => {
    const storage = recordingStorage();
    const first = openStore('markdown-editor', storage);
    first.save({ title: 'Scratch pad', content: '# Body' });
    first.snapshot();

    const reopened = openStore('markdown-editor', storage);
    assert.equal(reopened.isTitled(), true);
    assert.equal(reopened.getTitle(), 'Scratch pad');
    assert.equal(reopened.content().content, '# Body', 'the stored content is restored');
    assert.equal(reopened.get().kind, 'markdown-editor');
});

test('each page type keeps its own session', () => {
    const storage = recordingStorage();
    const template = openStore('template', storage);
    const textEditor = openStore('text-editor', storage);
    const markdown = openStore('markdown-editor', storage);

    template.save({ title: 'Template one', content: 'template body', variables: {} });
    textEditor.save({ title: 'Text one', content: '<p>text body</p>' });
    markdown.save({ title: 'Markdown one', content: '# markdown body' });

    assert.equal(template.getTitle(), 'Template one');
    assert.equal(textEditor.getTitle(), 'Text one');
    assert.equal(markdown.getTitle(), 'Markdown one');
    markdown.save({ title: 'Renamed' });
    assert.equal(template.getTitle(), 'Template one', 'another page keeps its title');
});

test('remove drops the session from storage and from the view', () => {
    const storage = recordingStorage();
    const store = openStore('text-editor', storage);
    store.save({ title: 'Keep me', content: 'body' });

    assert.equal(store.remove(), true);
    assert.equal(storage.getItem(sessionKey('text-editor')), null);
    assert.equal(store.remove(), false, 'removing a missing session reports nothing removed');
    assert.deepEqual(store.get(), { title: '', kind: 'text-editor', versions: [] });
});

test('listAll reads every titled stored session with its latest date', () => {
    const storage = recordingStorage();
    const clock = fakeClock(Date.UTC(2026, 9, 16, 8, 0, 0));

    const template = openStore('template', storage, { now: clock.now });
    template.save({ title: 'Invoice', content: 'v1', variables: {} });
    template.snapshot();
    clock.advance(MINUTE_MS);
    template.save({ content: 'v2', variables: {} });
    template.snapshot();

    const markdown = openStore('markdown-editor', storage, { now: clock.now });
    clock.advance(MINUTE_MS);
    markdown.save({ title: 'Notes', content: '# Notes' });
    markdown.snapshot();

    openStore('text-editor', storage).save({ content: '<p>draft</p>' });

    assert.deepEqual(listAll(storage), [
        { kind: 'markdown-editor', title: 'Notes', latestDate: '2026-10-16T08:02:00.000Z' },
        { kind: 'template', title: 'Invoice', latestDate: '2026-10-16T08:01:00.000Z' },
    ]);

    assert.deepEqual(openStore('template', storage).listAll(), listAll(storage), 'the store exposes listAll too');
});

test('listAll tolerates unavailable and unreadable storage', () => {
    assert.deepEqual(listAll(null), []);
    assert.deepEqual(listAll(openStore('template', null) && null), []);

    const storage = recordingStorage();
    storage.setItem(sessionKey('template'), 'not-json');
    assert.deepEqual(listAll(storage), [], 'a corrupted document is skipped');
});

test('a failed write keeps the change in the page view and reports it', () => {
    const storage = recordingStorage();
    const errors = [];
    const store = openStore('template', storage, { onWriteError: (error) => errors.push(error) });
    store.save({ title: 'Started', content: 'first' });
    assert.equal(store.isPersisted(), true);

    storage.setItem = () => {
        throw new Error('QuotaExceededError');
    };

    store.save({ content: 'second' });
    assert.equal(store.content().content, 'second', 'the change is still visible');
    assert.equal(store.isPersisted(), false, 'the page is told the change was not persisted');
    assert.deepEqual(store.status(), { persistent: true, lastWriteFailed: true });
    assert.equal(errors.length, 1);
});

test('missing or unavailable storage degrades to in-view state', () => {
    const inMemory = openStore('markdown-editor', null);
    assert.equal(inMemory.isPersisted(), false);
    inMemory.save({ title: 'In memory', content: '# kept' });
    assert.equal(inMemory.content().content, '# kept', 'the page view keeps the change');
    assert.deepEqual(inMemory.status(), { persistent: false, lastWriteFailed: false });
    assert.equal(inMemory.save({ content: '# more' }).persisted, false);

    const broken = memoryStorage();
    broken.setItem = () => {
        throw new Error('SecurityError');
    };
    const unavailable = openStore('template', broken);
    assert.equal(unavailable.isPersisted(), false);
    unavailable.save({ title: 'Still usable', content: 'body' });
    assert.equal(unavailable.content().content, 'body');
});

test('a corrupted stored document does not break the page', () => {
    const storage = memoryStorage();
    storage.setItem(sessionKey('template'), 'not-json');
    const store = openStore('template', storage);
    assert.deepEqual(store.get(), { title: '', kind: 'template', versions: [] });
});

test('stored versions are normalized and capped when read back', () => {
    const storage = memoryStorage();
    storage.setItem(sessionKey('template'), JSON.stringify({
        title: 'Legacy',
        kind: 'template',
        versions: [
            { updatedDate: 'a', content: '1' },
            { nope: true },
            { updatedDate: 'b', content: '2' },
            { updatedDate: 'c', content: '3' },
            { updatedDate: 'd', content: '4' },
        ],
    }));

    const store = openStore('template', storage);
    assert.deepEqual(store.get().versions.map((version) => version.content), ['2', '3', '4']);
});
