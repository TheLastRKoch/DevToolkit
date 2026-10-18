const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { initPageHeader, isValidTitle, DEFAULT_TITLE, TITLE_PLACEHOLDER } = require('../public/static/scripts/page-header.js');
const { createDom } = require('./helpers/mock-dom.js');

const headerScriptPath = path.join(__dirname, '../public/static/scripts/page-header.js');
const headerScript = fs.readFileSync(headerScriptPath, 'utf8');

function openHeader(overrides) {
    const dom = createDom(['pageHeader']);
    const header = initPageHeader(Object.assign({
        document: dom.document,
        mount: dom.document.getElementById('pageHeader'),
        title: '',
        options: [],
    }, overrides || {}));
    return { dom, header, input: dom.document.getElementById('pageTitleInput') };
}

function type(input, value) {
    input.value = value;
    input.dispatch('input', {});
}

test('the header renders the options dropdown and title in one row without a breadcrumb', () => {
    const { dom } = openHeader({
        options: [{ id: 'clear-all', label: 'Clear all', run: () => {} }],
    });

    const row = dom.document.getElementById('pageHeader').children[0];
    assert.equal(row.getAttribute('class'), 'row mt-3 align-items-center', 'the header is one row');
    assert.equal(row.children.length, 4, 'leading spacer, dropdown, title, and status area');
    assert.ok(!headerScript.includes('breadcrumb'), 'the header no longer renders a breadcrumb');

    const [leadingColumn, dropdownColumn, titleColumn, statusColumn] = row.children;
    assert.match(leadingColumn.getAttribute('class'), /d-none/);
    assert.match(leadingColumn.getAttribute('class'), /d-md-block/);
    assert.match(leadingColumn.getAttribute('class'), /order-md-1/);
    assert.match(dropdownColumn.getAttribute('class'), /col-md-4/);
    assert.match(dropdownColumn.getAttribute('class'), /order-2/);
    assert.match(dropdownColumn.getAttribute('class'), /justify-content-center/);
    assert.equal(dropdownColumn.children[0].getAttribute('class'), 'dropdown');
    assert.match(titleColumn.getAttribute('class'), /col-md-4/);
    assert.match(titleColumn.getAttribute('class'), /order-1/);
    assert.match(titleColumn.getAttribute('class'), /ms-auto/);
    assert.match(titleColumn.getAttribute('class'), /ms-md-0/);
    assert.match(titleColumn.getAttribute('class'), /justify-content-md-end/);
    assert.equal(titleColumn.children[0].getAttribute('id'), 'pageTitleInput');
    assert.match(statusColumn.getAttribute('class'), /order-3/);
    assert.match(statusColumn.getAttribute('class'), /order-md-4/);

    const input = dom.document.getElementById('pageTitleInput');
    assert.equal(input.getAttribute('type'), 'text');
    assert.equal(input.getAttribute('placeholder'), TITLE_PLACEHOLDER, 'the title textbox shows the placeholder');
    assert.equal(dom.document.getElementById('pageOptionsToggle').textContent, 'Options');
});

test('the header renders only the options the page declares, in order', () => {
    const { dom, header } = openHeader({
        options: [
            { id: 'clear-variables', label: 'Clear variables', run: () => {} },
            { id: 'clear-all', label: 'Clear all', run: () => {} },
        ],
    });

    assert.deepEqual(header.optionIds, ['clear-variables', 'clear-all']);
    const labels = dom.document.getElementById('pageOptionsMenu').children.map((item) => item.children[0].textContent);
    assert.deepEqual(labels, ['Clear variables', 'Clear all']);

    const other = openHeader({ options: [{ id: 'clear-editor', label: 'Clear editor', run: () => {} }] });
    const otherLabels = other.dom.document.getElementById('pageOptionsMenu').children.map((item) => item.children[0].textContent);
    assert.deepEqual(otherLabels, ['Clear editor'], 'another page lists only its own options');
});

test('selecting an option runs its action once and closes the dropdown', () => {
    const { dom } = openHeader({
        options: [
            { id: 'clear-variables', label: 'Clear variables', run: () => { throw new Error('must not run'); } },
            { id: 'clear-editor', label: 'Clear editor', run: () => { calls += 1; } },
        ],
    });
    let calls = 0;

    dom.document.getElementById('pageOptionsToggle').dispatch('click', { preventDefault: () => {} });
    assert.equal(dom.document.getElementById('pageOptionsMenu').hidden, false, 'the dropdown opens');

    dom.document.getElementById('pageOptionsMenu').children[1].children[0].dispatch('click', {});
    assert.equal(calls, 1, 'only the selected option ran');
    assert.equal(dom.document.getElementById('pageOptionsMenu').hidden, true, 'the dropdown closes after selection');
});

test('the header owns the dropdown toggle without Bootstrap', () => {
    const { dom, header } = openHeader({ options: [] });
    const menu = dom.document.getElementById('pageOptionsMenu');
    const toggle = dom.document.getElementById('pageOptionsToggle');

    assert.equal(menu.hidden, true, 'the dropdown starts closed');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');

    toggle.dispatch('click', { preventDefault: () => {} });
    assert.equal(menu.hidden, false);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(header.isOpen(), true);

    toggle.dispatch('click', { preventDefault: () => {} });
    assert.equal(menu.hidden, true);
    assert.equal(header.isOpen(), false);

    toggle.dispatch('click', { preventDefault: () => {} });
    dom.document.dispatch('keydown', { key: 'Escape' });
    assert.equal(header.isOpen(), false, 'Escape closes the dropdown');

    assert.ok(!/bootstrap/i.test(headerScript), 'the shared header must not depend on Bootstrap JS');
});

test('typing a title updates the document title and reports each edit', () => {
    const changes = [];
    const { dom, input } = openHeader({ title: '', onTitleChange: (value) => changes.push(value) });

    assert.equal(dom.document.title, DEFAULT_TITLE, 'a page without a title keeps the default tab title');

    type(input, 'Release notes');
    assert.equal(dom.document.title, 'Release notes');
    assert.deepEqual(changes, ['Release notes']);
    assert.equal(input.disabled, false, 'the title stays editable while focused');

    type(input, 'Release notes v2');
    assert.equal(dom.document.title, 'Release notes v2');
    assert.deepEqual(changes, ['Release notes', 'Release notes v2']);
    assert.equal(input.disabled, false, 'a valid title does not lock the input while focused');
});

test('an empty, whitespace, or placeholder title falls back to the default', () => {
    const { dom, input, header } = openHeader();

    for (const value of ['', '   ', 'DevToolKit', 'devtoolkit', 'DEVTOOLKIT']) {
        type(input, value);
        assert.equal(dom.document.title, DEFAULT_TITLE, `"${value}" is not a title`);
        input.dispatch('blur', {});
        assert.equal(input.disabled, false, `"${value}" stays editable after focus loss`);
        assert.equal(header.isTitleLocked(), false);
    }

    type(input, 'Real title');
    assert.equal(dom.document.title, 'Real title');
});

test('a stored title is restored disabled, an invalid one opens empty', () => {
    const restored = openHeader({ title: 'Sprint plan' });
    assert.equal(restored.input.value, 'Sprint plan');
    assert.equal(restored.dom.document.title, 'Sprint plan');
    assert.equal(restored.header.isTitleLocked(), true, 'the stored title is immutable');
    assert.equal(restored.input.getAttribute('disabled'), 'true');

    const invalid = openHeader({ title: 'DevToolKit' });
    assert.equal(invalid.input.value, '', 'the placeholder is not a stored title');
    assert.equal(invalid.dom.document.title, DEFAULT_TITLE);
    assert.equal(invalid.header.isTitleLocked(), false);
});

test('the title becomes immutable when focus is lost', () => {
    const changes = [];
    const { header, input, dom } = openHeader({ onTitleChange: (value) => changes.push(value) });

    for (const value of ['M', 'My', 'My notes']) {
        type(input, value);
        assert.equal(input.disabled, false, 'the title stays editable while focused');
        assert.equal(header.isTitleLocked(), false);
    }
    assert.equal(dom.document.title, 'My notes');

    input.dispatch('blur', {});
    assert.equal(input.disabled, true);
    assert.equal(input.getAttribute('disabled'), 'true');
    assert.equal(header.isTitleLocked(), true);
    assert.equal(dom.document.title, 'My notes');

    type(input, 'Renamed');
    assert.equal(header.isTitleLocked(), true, 'the locked title cannot be edited');
    assert.deepEqual(changes, ['M', 'My', 'My notes'], 'a locked title reports no further edits');
    assert.equal(dom.document.title, 'My notes');
});

test('focus loss commits the trimmed title before locking', () => {
    const changes = [];
    const { header, input } = openHeader({ onTitleChange: (value) => changes.push(value) });

    type(input, '  My notes  ');
    input.dispatch('blur', {});

    assert.equal(input.value, 'My notes');
    assert.deepEqual(changes, ['  My notes  ', 'My notes']);
    assert.equal(header.isTitleLocked(), true);
});

test('an unpersisted page keeps the title editable after focus loss', () => {
    const { header, input } = openHeader({ persisted: false });

    type(input, 'Draft');
    input.dispatch('blur', {});

    assert.equal(input.disabled, false);
    assert.equal(header.isTitleLocked(), false);
});

test('the header reports unpersisted storage', () => {
    const { dom, header } = openHeader({ persisted: false });
    const status = dom.document.getElementById('pageHeaderStatus');
    assert.equal(status.hidden, false);
    assert.match(status.textContent, /not be persisted/);

    header.clearWarning();
    assert.equal(status.hidden, true);
    header.warn('Changes will not be persisted.');
    assert.equal(status.hidden, false);
    assert.equal(status.textContent, 'Changes will not be persisted.');
});

test('title validation matches the store', () => {
    const sessions = require('../public/static/scripts/browser-session.js');
    for (const value of ['Notes', 'devtoolkit notes', 'Title', '', '  ', 'DevToolKit', 'DEVTOOLKIT', null]) {
        assert.equal(isValidTitle(value), sessions.isValidTitle(value), `"${value}" is judged the same everywhere`);
    }
});
