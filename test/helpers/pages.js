/**
 * Page harnesses for the DevToolkit pages.
 *
 * Each harness builds a mock DOM for the page's elements, runs the page script in
 * the sandbox provided by helpers/mock-dom.js, and exposes the elements, the
 * shared header, the session store, and the navigate-away events so tests can
 * assert browser-stored state.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const sessionsModule = require('../../public/static/scripts/browser-session.js');
const pageHeaderModule = require('../../public/static/scripts/page-header.js');
const { createDom, createWindow, runScript, withDocument } = require('./mock-dom.js');

const root = path.join(__dirname, '../..');

function readScript(file) {
    return fs.readFileSync(path.join(root, 'public/static/scripts', file), 'utf8');
}

function readPage(file) {
    return fs.readFileSync(path.join(root, 'public', file), 'utf8');
}

function sessionGlobals({ storage, clock }) {
    return Object.assign({}, sessionsModule, {
        browserStorage: () => storage,
        openStore: (kind, target, options) => sessionsModule.openStore(
            kind,
            target,
            Object.assign({}, options, clock ? { now: clock } : {}),
        ),
    });
}

function storedSession(storage, kind) {
    const raw = storage.getItem(sessionsModule.sessionKey(kind));
    return raw ? JSON.parse(raw) : null;
}

/** Seeds a stored, titled session so a page load can restore it. */
function seedSession(storage, kind, { title, content, variables }, clock) {
    const store = sessionsModule.openStore(kind, storage, clock ? { now: clock } : {});
    store.save({ title, content, variables });
    store.snapshot();
    return store;
}

function pageHarness({ dom, window, kind, storage }) {
    const headerElement = () => dom.document.getElementById('pageHeader').children[0];

    return {
        document: dom.document,
        element: (id) => dom.document.getElementById(id),
        headerElement,
        titleInput: () => dom.document.getElementById('pageTitleInput'),
        optionItems: () => dom.document.getElementById('pageOptionsMenu').children.map((item) => item.children[0]),
        openOptions: () => dom.document.getElementById('pageOptionsToggle').dispatch('click', { preventDefault() {} }),
        selectOption: (index) => dom.document.getElementById('pageOptionsMenu').children[index].children[0].dispatch('click', {}),
        /** Types into an element and fires its input event, like a user would. */
        type: (id, value) => {
            const element = dom.document.getElementById(id);
            element.value = value;
            element.dispatch('input', {});
        },
        /** Types a title into the shared header's textbox. */
        typeTitle: (value) => {
            const input = dom.document.getElementById('pageTitleInput');
            input.value = value;
            input.dispatch('input', {});
        },
        blurTitle: () => {
            dom.document.getElementById('pageTitleInput').dispatch('blur', {});
        },
        /** Leaves the tab: the visibility change a page snapshots on. */
        hide: () => {
            dom.document.visibilityState = 'hidden';
            dom.document.dispatch('visibilitychange', {});
        },
        show: () => {
            dom.document.visibilityState = 'visible';
            dom.document.dispatch('visibilitychange', {});
        },
        unload: () => window.dispatch('pagehide', {}),
        beforeUnloadProbe: () => {
            let prevented = false;
            window.dispatch('beforeunload', {
                preventDefault() {
                    prevented = true;
                },
                set returnValue(value) {
                    prevented = true;
                },
            });
            return prevented;
        },
        storedSession: () => storedSession(storage, kind),
    };
}

function buildHarness({ ids, script, globals, storage, kind, clock }) {
    const dom = createDom(ids.concat(['pageHeader']));
    const window = createWindow('/' + kind);
    window.requestAnimationFrame = (cb) => cb();
    runScript(script, {
        document: dom.document,
        window,
        globals: Object.assign({}, globals, {
            DevToolkitSessions: sessionGlobals({ storage, clock }),
            DevToolkitPageHeader: withDocument(pageHeaderModule, dom.document),
        }),
    });
    return pageHarness({ dom, window, kind, storage });
}

function openTemplatePage(storage, { clock } = {}) {
    return buildHarness({
        ids: ['txtInput', 'txtOutput', 'txtVariables', 'variablesPanel', 'templatePanel', 'templateTab', 'variablesTab', 'currentYear'],
        script: readScript('template.js'),
        storage,
        clock,
        kind: 'template',
        globals: {},
    });
}

function openMarkdownPage(storage, { clock } = {}) {
    return buildHarness({
        ids: ['mdInput', 'mdPreview', 'charCount', 'btnExpandEditor', 'btnExpandPreview', 'rawPane', 'previewPane', 'paneDivider', 'paneDividerMobile', 'currentYear'],
        script: readScript('markdown-editor.js'),
        storage,
        clock,
        kind: 'markdown-editor',
        globals: { marked: { parse: (text) => `<p>${text}</p>` } },
    });
}

function createQuillStub() {
    const conversions = [];
    const instances = [];
    function Quill(selector, options) {
        const instance = {
            selector,
            options,
            contents: null,
            appliedSource: null,
            handlers: {},
            root: { innerHTML: '' },
            clipboard: {
                convert: ({ html }) => {
                    conversions.push(html);
                    return { ops: [{ insert: html === '' ? '\n' : html }] };
                },
            },
            setContents: (delta, source) => {
                instance.contents = delta;
                instance.appliedSource = source;
            },
            on: (type, handler) => {
                instance.handlers[type] = handler;
            },
            emit: (type, ...args) => {
                (instance.handlers[type] || [])(...args);
            },
        };
        instances.push(instance);
        return instance;
    }
    return { Quill, instances, conversions };
}

function openTextEditorPage(storage, { clock, initialHtml, title } = {}) {
    const seeded = title || initialHtml !== undefined ? { title: title || 'Restored session', content: initialHtml || '' } : null;
    if (seeded) {
        seedSession(storage, 'text-editor', seeded, clock);
    }
    const quillStub = createQuillStub();
    const page = buildHarness({
        ids: ['txtOutput', 'currentYear'],
        script: readScript('text-editor.js'),
        storage,
        clock,
        kind: 'text-editor',
        globals: { Quill: quillStub.Quill },
    });
    page.quill = quillStub.instances[0];
    page.conversions = quillStub.conversions;
    return page;
}

function openGalleryPage(storage, { clock } = {}) {
    const dom = createDom(['filters', 'search', 'gallery', 'resultCount', 'emptyState', 'resetFilters', 'currentYear']);
    const window = createWindow('/');
    const sandbox = {};
    runScript(readScript('gallery.js'), {
        document: dom.document,
        window,
        sandbox,
        globals: {
            DevToolkitSessions: sessionGlobals({ storage, clock }),
        },
    });
    return {
        render: () => sandbox.DevToolkitGallery && sandbox.DevToolkitGallery.init({ document: dom.document }),
        window,
        document: dom.document,
        element: (id) => dom.document.getElementById(id),
        cards: () => dom.document.getElementById('gallery').children,
        filterButtons: () => dom.document.getElementById('filters').children,
        clickFilter: (label) => {
            const button = dom.document.getElementById('filters').children.find((item) => item.textContent === label);
            if (!button) {
                throw new Error(`No filter button labelled ${label}`);
            }
            button.dispatch('click', { target: button });
        },
        search: (query) => {
            const input = dom.document.getElementById('search');
            input.value = query;
            input.dispatch('input', {});
        },
        removeCard: (index) => {
            const target = findRemoveButton(dom.document.getElementById('gallery').children[index]);
            assertRemoveButton(target);
            target.dispatch('click', { target });
        },
        storedKinds: () => sessionsModule.listAll(storage).map((session) => session.kind),
    };
}

function assertRemoveButton(button) {
    if (!button) {
        throw new Error('No remove button found on the card');
    }
}

function findRemoveButton(node) {
    for (const child of node.children) {
        if (child.getAttribute && child.getAttribute('class') && child.getAttribute('class').includes('remove-btn')) {
            return child;
        }
        const nested = findRemoveButton(child);
        if (nested) {
            return nested;
        }
    }
    return null;
}

module.exports = {
    openTemplatePage,
    openMarkdownPage,
    openTextEditorPage,
    openGalleryPage,
    seedSession,
    storedSession,
    readPage,
    readScript,
    sessionsModule,
    pageHeaderModule,
};
