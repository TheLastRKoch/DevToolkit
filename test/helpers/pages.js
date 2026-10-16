/**
 * Page harnesses for the DevToolkit editing pages.
 *
 * Each harness builds a mock DOM for the page's elements, runs the page script in
 * the sandbox provided by helpers/mock-dom.js, and exposes the elements, the
 * shared header, and the session store so tests can assert stored state.
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

function sessionGlobals({ storage, clock }) {
    return Object.assign({}, sessionsModule, {
        browserStorage: () => storage,
        openStore: (pageType, target, options) => sessionsModule.openStore(
            pageType,
            target,
            Object.assign({}, options, clock ? { now: clock } : {}),
        ),
    });
}

function pageHarness({ dom, window }) {
    return {
        window,
        document: dom.document,
        element: (id) => dom.document.getElementById(id),
        optionItems: () => dom.document.getElementById('pageOptionsMenu').children.map((item) => item.children[0]),
        breadcrumbItems: () => {
            const list = dom.document.getElementById('pageHeader').children[0].children[0].children[0].children[0];
            return list.children.map((item) => item.textContent || (item.children[0] && item.children[0].textContent));
        },
        openOptions: () => dom.document.getElementById('pageOptionsToggle').dispatch('click', { preventDefault() {} }),
    };
}

function openTemplatePage(storage, { clock, pathname = '/template/1' } = {}) {
    const dom = createDom([
        'pageHeader', 'txtInput', 'txtOutput', 'txtVariables', 'variablesPanel',
        'templatePanel', 'templateTab', 'variablesTab', 'currentYear',
    ]);
    const window = createWindow(pathname);
    runScript(readScript('template.js'), {
        document: dom.document,
        window,
        globals: {
            DevToolkitSessions: sessionGlobals({ storage, clock }),
            DevToolkitPageHeader: withDocument(pageHeaderModule, dom.document),
        },
    });
    return Object.assign(pageHarness({ dom, window, pageType: 'template', sessionId: 1 }), {
        storedSession: (sessionId = 1) => sessionsModule.openStore('template', storage).get(sessionId),
    });
}

function openMarkdownPage(storage, { clock, pathname = '/markdown-editor/1' } = {}) {
    const dom = createDom([
        'pageHeader', 'mdInput', 'mdPreview', 'charCount', 'btnExpandEditor', 'btnExpandPreview',
        'rawPane', 'previewPane', 'paneDivider', 'paneDividerMobile', 'currentYear',
    ]);
    const window = createWindow(pathname);
    window.requestAnimationFrame = (cb) => cb();
    runScript(readScript('markdown-editor.js'), {
        document: dom.document,
        window,
        globals: {
            marked: { parse: (text) => `<p>${text}</p>` },
            DevToolkitSessions: sessionGlobals({ storage, clock }),
            DevToolkitPageHeader: withDocument(pageHeaderModule, dom.document),
        },
    });
    return Object.assign(pageHarness({ dom, window, pageType: 'markdown-editor', sessionId: 1 }), {
        storedSession: (sessionId = 1) => sessionsModule.openStore('markdown-editor', storage).get(sessionId),
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

function openTextEditorPage(storage, { clock, pathname = '/text-editor/1', sessionId = 1, initialHtml } = {}) {
    const dom = createDom(['pageHeader', 'txtOutput', 'currentYear']);
    const window = createWindow(pathname);
    const quillStub = createQuillStub();
    const store = sessionsModule.openStore('text-editor', storage);
    store.ensure(sessionId, { html: '' });
    if (initialHtml) {
        store.save(sessionId, { data: { html: initialHtml } });
    }

    runScript(readScript('text-editor.js'), {
        document: dom.document,
        window,
        globals: {
            Quill: quillStub.Quill,
            DevToolkitSessions: sessionGlobals({ storage, clock }),
            DevToolkitPageHeader: withDocument(pageHeaderModule, dom.document),
        },
    });

    return Object.assign(pageHarness({ dom, window, pageType: 'text-editor', sessionId }), {
        quill: quillStub.instances[0],
        conversions: quillStub.conversions,
        storedSession: (id = sessionId) => sessionsModule.openStore('text-editor', storage).get(id),
    });
}

const readPage = (file) => fs.readFileSync(path.join(root, 'public', file), 'utf8');

module.exports = {
    openTemplatePage,
    openMarkdownPage,
    openTextEditorPage,
    readPage,
    readScript,
    sessionsModule,
    pageHeaderModule,
};
