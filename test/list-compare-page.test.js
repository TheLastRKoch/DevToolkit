const assert = require('node:assert/strict');
const test = require('node:test');

const { app } = require('../server');
const {
    openGalleryPage,
    openListComparePage,
    readPage,
    readScript,
    seedSession,
    sessionsModule,
} = require('./helpers/pages.js');

const listCompareHtml = readPage('list-compare.html');
const listCompareScript = readScript('list-compare.js');
const DATE = Date.UTC(2026, 9, 23, 12, 0, 0);
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

function latestVersion(page) {
    const session = page.storedSession();
    return session ? session.versions[session.versions.length - 1] : null;
}

function click(page, id) {
    page.element(id).dispatch('click', {});
}

function cardOf(card) {
    const body = card.children[0].children[0];
    const text = body.children[0];
    const title = text.children[0];
    const link = title.children[0];
    return {
        title: link.textContent,
        titleHref: link.getAttribute('href'),
        kind: card.children[0].getAttribute('data-kind'),
    };
}

test('the list compare routes serve the page and reject non-numeric IDs', async () => {
    for (const path of ['/list-compare', '/list-compare/2']) {
        const res = await fetch(`${baseUrl}${path}`);
        assert.equal(res.status, 200, `${path} should resolve`);
        const body = await res.text();
        assert.ok(body.includes('id="pageHeader"'), `${path} mounts the shared header`);
        assert.ok(body.includes('id="inputA"'), `${path} includes List A`);
        assert.ok(body.includes('id="inputB"'), `${path} includes List B`);
    }

    const invalid = await fetch(`${baseUrl}/list-compare/invalid`);
    assert.equal(invalid.status, 404);
});

test('the page separates structure from script logic', () => {
    assert.ok(listCompareHtml.includes('src="/static/scripts/list-compare.js"'), 'loads its external script');
    assert.ok(listCompareHtml.includes('src="/static/scripts/browser-session.js"'), 'loads the session store');
    assert.ok(listCompareHtml.includes('src="/static/scripts/page-header.js"'), 'loads the shared header');
    assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/i.test(listCompareHtml), 'has no inline script logic');
    assert.ok(!/\son[a-z]+=/i.test(listCompareHtml), 'has no inline event handlers');
    assert.ok(!/\bfunction\s+\w+\s*\(/.test(listCompareHtml), 'contains no JavaScript functions');
    assert.ok(!/document\.getElementById/.test(listCompareHtml), 'contains no DOM logic');
});

test('the list compare page mounts the shared header with Clear all', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());

    assert.deepEqual(page.optionItems().map((item) => item.textContent), ['Clear all']);
    assert.equal(page.titleInput().getAttribute('placeholder'), 'DevToolKit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('comparing two distinct lists partitions only-A, only-B, and both', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.type('inputA', 'alpha\nbeta');
    page.type('inputB', 'beta\ngamma');

    click(page, 'compareBtn');

    assert.equal(page.element('outputOnlyA').value, 'alpha');
    assert.equal(page.element('outputOnlyB').value, 'gamma');
    assert.equal(page.element('outputInBoth').value, 'beta');
    assert.equal(page.element('statOnlyA').textContent, '1');
    assert.equal(page.element('statOnlyB').textContent, '1');
    assert.equal(page.element('statInBoth').textContent, '1');
    assert.equal(page.element('statInA').textContent, '2');
    assert.equal(page.element('statInB').textContent, '2');
    assert.equal(page.element('statDiff').textContent, '0');
    assert.equal(page.element('resultsSection').hidden, false);
});

test('comparison deduplicates repeated lines inside each list', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.type('inputA', 'one\none\ntwo');
    page.type('inputB', 'two\nthree\nthree');

    click(page, 'compareBtn');

    assert.equal(page.element('inputA').value, 'one\ntwo');
    assert.equal(page.element('inputB').value, 'two\nthree');
    assert.equal(page.element('badgeA').textContent, '2 items');
    assert.equal(page.element('outputInBoth').value, 'two');
});

test('the case-insensitive toggle treats differently cased items as equal', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.element('caseInsensitive').checked = true;
    page.type('inputA', 'APPLE');
    page.type('inputB', 'apple');

    click(page, 'compareBtn');

    assert.equal(page.element('outputInBoth').value, 'APPLE');
    assert.equal(page.element('outputOnlyA').value, '');
    assert.equal(page.element('outputOnlyB').value, '');
});

test('the trim whitespace toggle trims lines and excludes empty lines', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.element('trimWhitespace').checked = true;
    page.type('inputA', ' one \n\n two ');
    page.type('inputB', 'two\none');

    click(page, 'compareBtn');

    assert.equal(page.element('inputA').value, 'one\ntwo');
    assert.equal(page.element('outputInBoth').value, 'one\ntwo');
    assert.equal(page.element('outputOnlyA').value, '');
});

test('typed lists and the title are stored and restored from the session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openListComparePage(storage, { clock });
    page.type('inputA', 'one\ntwo');
    page.type('inputB', 'two\nthree');
    assert.equal(sessionsModule.listAll(storage).length, 0, 'untitled work is not stored');

    page.typeTitle('Release lists');
    page.blurTitle();
    page.hide();

    const stored = JSON.parse(latestVersion(page).content);
    assert.deepEqual(stored, { listA: 'one\ntwo', listB: 'two\nthree' });

    const reopened = openListComparePage(storage, { sessionId: page.sessionId() });
    assert.equal(reopened.titleInput().value, 'Release lists');
    assert.equal(reopened.element('inputA').value, 'one\ntwo');
    assert.equal(reopened.element('inputB').value, 'two\nthree');
});

test('an unreadable stored payload restores empty lists', () => {
    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'list-compare', { title: 'Corrupt', content: 'not-json' }, clock);
    const page = openListComparePage(storage, { sessionId: 1 });

    assert.equal(page.element('inputA').value, '');
    assert.equal(page.element('inputB').value, '');
});

test('leaving the page snapshots changed lists and keeps the last three versions', () => {
    const page = openListComparePage(sessionsModule.memoryStorage(), { clock });
    page.typeTitle('Snapshots');
    page.type('inputA', 'v1');
    page.hide();
    assert.equal(page.storedSession().versions.length, 1);

    page.show();
    page.type('inputA', 'v1');
    page.hide();
    assert.equal(page.storedSession().versions.length, 1, 'unchanged content is not duplicated');

    for (const content of ['v2', 'v3', 'v4']) {
        page.show();
        page.type('inputA', content);
        page.hide();
    }
    const versions = page.storedSession().versions;
    assert.equal(versions.length, 3, 'only the last three versions are kept');
    assert.deepEqual(versions.map((version) => JSON.parse(version.content).listA), ['v2', 'v3', 'v4']);
});

test('an untitled session with changes warns before unload', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    assert.equal(page.beforeUnloadProbe(), false, 'an untouched untitled page does not warn');

    page.type('inputA', 'draft');
    assert.equal(page.beforeUnloadProbe(), true, 'an untitled session with changes warns');

    page.typeTitle('Saved lists');
    page.type('inputA', 'stored');
    assert.equal(page.beforeUnloadProbe(), false, 'a titled session is auto-versioned instead');
});

test('Clear all empties the lists and results while keeping the title', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.type('inputA', 'alpha\nbeta');
    page.type('inputB', 'beta\ngamma');
    page.typeTitle('Keep me');
    click(page, 'compareBtn');
    assert.equal(page.element('resultsSection').hidden, false);

    page.openOptions();
    page.selectOption(0);

    assert.equal(page.element('inputA').value, '');
    assert.equal(page.element('inputB').value, '');
    assert.equal(page.element('badgeA').textContent, '0 items');
    assert.equal(page.element('badgeB').textContent, '0 items');
    assert.equal(page.element('outputOnlyA').value, '');
    assert.equal(page.element('outputOnlyB').value, '');
    assert.equal(page.element('outputInBoth').value, '');
    assert.equal(page.element('resultsSection').hidden, true);
    assert.equal(page.titleInput().value, 'Keep me', 'the title is preserved');

    page.hide();
    assert.deepEqual(JSON.parse(latestVersion(page).content), { listA: '', listB: '' });
});

test('the replacement tool replaces text in both lists', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.type('inputA', 'foo bar');
    page.type('inputB', 'foo baz');
    page.type('replaceSearch', 'foo');
    page.element('replaceWith').value = 'qux';

    click(page, 'applyReplacement');

    assert.equal(page.element('inputA').value, 'qux bar');
    assert.equal(page.element('inputB').value, 'qux baz');
});

test('the replacement tool supports regular expressions and reports invalid ones', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.element('replaceRegex').checked = true;
    page.type('inputA', 'item 1\nitem 2');
    page.type('inputB', 'item 3');
    page.type('replaceSearch', '\\d+');
    page.element('replaceWith').value = '#';

    click(page, 'applyReplacement');
    assert.equal(page.element('inputA').value, 'item #\nitem #');
    assert.equal(page.element('inputB').value, 'item #');

    page.type('replaceSearch', '[');
    click(page, 'applyReplacement');
    assert.equal(page.element('replaceError').hidden, false);
    assert.match(page.element('replaceError').textContent, /Invalid regular expression/);
    assert.equal(page.element('inputA').value, 'item #\nitem #', 'invalid patterns leave the lists untouched');
});

test('categorized results can be exported as text', () => {
    const page = openListComparePage(sessionsModule.memoryStorage());
    page.type('inputA', 'alpha\nbeta');
    page.type('inputB', 'beta\ngamma');
    click(page, 'compareBtn');

    const exported = page.window.DevToolkitListCompare.categoryExport('inBoth');
    assert.equal(exported.filename, 'in-both-lists.txt');
    assert.equal(exported.content, 'beta');
    assert.equal(page.window.DevToolkitListCompare.categoryExport('onlyA').content, 'alpha');
});

test('the home page offers List Compare and the gallery lists its sessions', async () => {
    const res = await fetch(`${baseUrl}/`);
    const home = await res.text();
    assert.ok(home.includes('href="/list-compare"'), 'the New menu links to /list-compare');

    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'list-compare', {
        title: 'Monday diff',
        content: JSON.stringify({ listA: 'a\nb', listB: 'b\nc' }),
    }, clock);

    const gallery = openGalleryPage(storage);
    const cards = gallery.cards().map(cardOf);
    assert.deepEqual(cards, [{
        title: 'Monday diff',
        titleHref: '/list-compare/1',
        kind: 'list-compare',
    }]);
    assert.ok(gallery.filterButtons().map((button) => button.textContent).includes('list-compare'));

    gallery.clickFilter('list-compare');
    assert.equal(gallery.cards().length, 1);
});

test('opening a gallery list compare session restores both lists', () => {
    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'list-compare', {
        title: 'Monday diff',
        content: JSON.stringify({ listA: 'a\nb', listB: 'b\nc' }),
    }, clock);

    const page = openListComparePage(storage, { sessionId: 1 });
    assert.equal(page.titleInput().value, 'Monday diff');
    assert.equal(page.element('inputA').value, 'a\nb');
    assert.equal(page.element('inputB').value, 'b\nc');
});

test('the list compare page does not call server APIs', () => {
    assert.ok(!/\/api\//.test(listCompareScript), 'the page must not call /api/ routes');
});
