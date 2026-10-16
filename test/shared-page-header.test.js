const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { init, DEFAULT_TITLE } = require('../public/static/scripts/page-header.js');

const headerScriptPath = path.join(__dirname, '../public/static/scripts/page-header.js');

function createDom() {
    const byId = new Map();
    const documentListeners = {};

    function createElement(tag) {
        const classes = new Set();
        const attributes = {};
        const listeners = {};
        const element = {
            tagName: tag.toUpperCase(),
            children: [],
            textContent: '',
            hidden: false,
            value: '',
            classList: {
                add: (...names) => names.forEach((name) => classes.add(name)),
                remove: (...names) => names.forEach((name) => classes.delete(name)),
                contains: (name) => classes.has(name),
            },
            setAttribute: (name, value) => {
                attributes[name] = String(value);
                if (name === 'id') {
                    byId.set(String(value), element);
                }
            },
            getAttribute: (name) => (name in attributes ? attributes[name] : null),
            appendChild: (child) => {
                element.children.push(child);
                return child;
            },
            addEventListener: (type, handler) => {
                listeners[type] = listeners[type] || [];
                listeners[type].push(handler);
            },
            dispatch: (type, event) => {
                (listeners[type] || []).forEach((handler) => handler(event));
            },
            contains: (node) => {
                if (node === element) {
                    return true;
                }
                return element.children.some((child) => child.contains(node));
            },
        };
        return element;
    }

    const mount = createElement('div');
    mount.setAttribute('id', 'pageHeader');

    const document = {
        title: '',
        createElement,
        getElementById: (id) => byId.get(String(id)) || null,
        addEventListener: (type, handler) => {
            documentListeners[type] = documentListeners[type] || [];
            documentListeners[type].push(handler);
        },
        dispatch: (type, event) => {
            (documentListeners[type] || []).forEach((handler) => handler(event));
        },
    };

    return { document, mount, byId, createElement };
}

function defaultConfig(dom, overrides) {
    return Object.assign({
        document: dom.document,
        mount: dom.mount,
        breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Template' }],
        pageName: '',
        options: [],
    }, overrides || {});
}

test('the header renders the breadcrumb, dropdown, and page name in one row', () => {
    const dom = createDom();
    init(defaultConfig(dom, {
        options: [{ id: 'clear-all', label: 'Clear all', run: () => {} }],
    }));

    const row = dom.mount.children[0];
    assert.equal(row.getAttribute('class'), 'row mt-3', 'the header is one row');
    assert.equal(row.children.length, 3, 'breadcrumb column, controls column, and status area');

    const [breadcrumbColumn, controlsColumn] = row.children;
    assert.equal(breadcrumbColumn.getAttribute('class'), 'col-md-6');

    const nav = breadcrumbColumn.children[0];
    assert.equal(nav.getAttribute('aria-label'), 'breadcrumb');
    const list = nav.children[0];
    assert.equal(list.getAttribute('class'), 'breadcrumb');
    assert.equal(list.children.length, 2, 'a two item breadcrumb renders two entries');

    const [home, current] = list.children;
    assert.equal(home.getAttribute('class'), 'breadcrumb-item');
    assert.equal(home.children[0].tagName, 'A');
    assert.equal(home.children[0].getAttribute('href'), '/');
    assert.equal(home.children[0].textContent, 'Home');
    assert.equal(current.getAttribute('class'), 'breadcrumb-item active');
    assert.equal(current.getAttribute('aria-current'), 'page');
    assert.equal(current.textContent, 'Template');

    assert.match(controlsColumn.getAttribute('class'), /justify-content-end/);
    assert.ok(dom.byId.get('pageNameInput'), 'the page name textbox is rendered');
    assert.equal(dom.byId.get('pageNameInput').getAttribute('type'), 'text');
    assert.ok(dom.byId.get('pageOptionsToggle'), 'the options toggle is rendered');
    assert.equal(dom.byId.get('pageOptionsToggle').textContent, 'Options');
});

test('the header renders only the options the page declares, in order', () => {
    const dom = createDom();
    const header = init(defaultConfig(dom, {
        options: [
            { id: 'new-session', label: 'New session', run: () => {} },
            { id: 'clear-editor', label: 'Clear editor', run: () => {} },
        ],
    }));

    assert.deepEqual(header.optionIds, ['new-session', 'clear-editor']);
    const menu = dom.byId.get('pageOptionsMenu');
    const labels = menu.children.map((item) => item.children[0].textContent);
    assert.deepEqual(labels, ['New session', 'Clear editor']);

    const otherDom = createDom();
    init(defaultConfig(otherDom, {
        options: [{ id: 'clear-variables', label: 'Clear variables', run: () => {} }],
    }));
    const otherLabels = otherDom.byId.get('pageOptionsMenu').children.map((item) => item.children[0].textContent);
    assert.deepEqual(otherLabels, ['Clear variables'], 'another page lists only its own options');
});

test('selecting an option runs its action once and closes the dropdown', () => {
    const dom = createDom();
    let calls = 0;
    init(defaultConfig(dom, {
        options: [
            { id: 'new-session', label: 'New session', run: () => { calls += 100; } },
            { id: 'clear-editor', label: 'Clear editor', run: () => { calls += 1; } },
        ],
    }));

    dom.byId.get('pageOptionsToggle').dispatch('click', { preventDefault: () => {} });
    assert.equal(dom.byId.get('pageOptionsMenu').hidden, false, 'the dropdown opens');

    dom.byId.get('pageOptionsMenu').children[1].children[0].dispatch('click', {});
    assert.equal(calls, 1, 'only the selected option ran');
    assert.equal(dom.byId.get('pageOptionsMenu').hidden, true, 'the dropdown closes after selection');
});

test('the header owns the dropdown toggle without Bootstrap', () => {
    const dom = createDom();
    const header = init(defaultConfig(dom, { options: [] }));
    const menu = dom.byId.get('pageOptionsMenu');
    const toggle = dom.byId.get('pageOptionsToggle');

    assert.equal(menu.hidden, true, 'the dropdown starts closed');
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');

    toggle.dispatch('click', { preventDefault: () => {} });
    assert.equal(menu.hidden, false);
    assert.equal(menu.classList.contains('show'), true);
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(header.isOpen(), true);

    toggle.dispatch('click', { preventDefault: () => {} });
    assert.equal(menu.hidden, true);
    assert.equal(menu.classList.contains('show'), false);
    assert.equal(toggle.getAttribute('aria-expanded'), 'false');

    toggle.dispatch('click', { preventDefault: () => {} });
    dom.document.dispatch('keydown', { key: 'Escape' });
    assert.equal(header.isOpen(), false, 'Escape closes the dropdown');

    const script = fs.readFileSync(headerScriptPath, 'utf8');
    assert.ok(!/bootstrap/i.test(script), 'the shared header must not depend on Bootstrap JS');
});

test('the page name textbox updates the document title', () => {
    const dom = createDom();
    const changes = [];
    init(defaultConfig(dom, {
        pageName: 'Release notes',
        onPageNameChange: (value) => changes.push(value),
    }));

    const input = dom.byId.get('pageNameInput');
    assert.equal(input.value, 'Release notes', 'the stored page name is shown');
    assert.equal(dom.document.title, 'Release notes');

    input.value = 'Sprint plan';
    input.dispatch('input', {});
    assert.equal(dom.document.title, 'Sprint plan');
    assert.deepEqual(changes, ['Sprint plan']);

    input.value = '';
    input.dispatch('input', {});
    assert.equal(dom.document.title, DEFAULT_TITLE, 'an empty page name falls back to the default title');
    assert.deepEqual(changes, ['Sprint plan', '']);
});

test('the header can rename the page and report unpersisted changes', () => {
    const dom = createDom();
    const header = init(defaultConfig(dom, { pageName: '' }));
    assert.equal(dom.document.title, DEFAULT_TITLE);

    header.setPageName('Notes');
    assert.equal(dom.byId.get('pageNameInput').value, 'Notes');
    assert.equal(dom.document.title, 'Notes');

    header.warn('Changes will not be persisted.');
    const status = dom.byId.get('pageHeaderStatus');
    assert.equal(status.hidden, false);
    assert.equal(status.textContent, 'Changes will not be persisted.');
    header.clearWarning();
    assert.equal(status.hidden, true);
});

test('a page that reports unpersisted storage is told at load', () => {
    const dom = createDom();
    init(defaultConfig(dom, { persisted: false }));
    const status = dom.byId.get('pageHeaderStatus');
    assert.equal(status.hidden, false);
    assert.match(status.textContent, /not be persisted/);
});
