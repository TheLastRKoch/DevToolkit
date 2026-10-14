/**
 * Minimal DOM stand-in for page script tests.
 *
 * The repository has no jsdom dependency, so page scripts are exercised the same
 * way test/markdown-editor.test.js does it: the script source runs inside a
 * `new Function` sandbox with mock `document` and `window` objects. This helper
 * builds those mocks with just enough behavior for the shared page header and
 * the page scripts (elements, attributes, classes, events, and dispatching).
 */
'use strict';

function createElement(tag, registry) {
    const classes = new Set();
    const attributes = {};
    const listeners = {};
    const element = {
        tagName: String(tag).toUpperCase(),
        children: [],
        textContent: '',
        hidden: false,
        value: '',
        classList: {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            contains: (name) => classes.has(name),
            toggle: (name, force) => {
                const wanted = force === undefined ? !classes.has(name) : Boolean(force);
                if (wanted) {
                    classes.add(name);
                } else {
                    classes.delete(name);
                }
                return wanted;
            },
        },
        setAttribute: (name, value) => {
            attributes[name] = String(value);
            if (name === 'id' && registry) {
                registry.set(String(value), element);
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
            (listeners[type] || []).forEach((handler) => handler(event || { preventDefault() {} }));
        },
        contains: (node) => node === element || element.children.some((child) => child.contains(node)),
    };
    return element;
}

function createDom(ids) {
    const registry = new Map();
    const documentListeners = {};
    const document = {
        title: '',
        createElement: (tag) => createElement(tag, registry),
        getElementById: (id) => registry.get(String(id)) || null,
        addEventListener: (type, handler) => {
            documentListeners[type] = documentListeners[type] || [];
            documentListeners[type].push(handler);
        },
        dispatch: (type, event) => {
            (documentListeners[type] || []).forEach((handler) => handler(event || {}));
        },
    };

    for (const id of ids || []) {
        const element = createElement('div', registry);
        element.setAttribute('id', id);
    }

    return { document, registry };
}

function createWindow(pathname) {
    const listeners = {};
    const opened = [];
    return {
        location: { pathname },
        opened,
        addEventListener: (type, handler) => {
            listeners[type] = listeners[type] || [];
            listeners[type].push(handler);
        },
        dispatch: (type, event) => {
            (listeners[type] || []).forEach((handler) => handler(event || { preventDefault() {} }));
        },
        open: (url) => {
            opened.push(url);
            return { focus() {} };
        },
    };
}

function runScript(source, { document, window, globals }) {
    const names = Object.keys(globals);
    const fn = new Function('document', 'window', ...names, source);
    fn(document, window, ...names.map((name) => globals[name]));
    return fn;
}

/**
 * Binds a page script's browser global to the sandbox document, because a module
 * required by Node resolves `document` from its own scope, not the sandbox's.
 */
function withDocument(api, document) {
    return Object.assign({}, api, {
        init: (config) => api.init(Object.assign({ document }, config)),
    });
}

module.exports = { createDom, createElement, createWindow, runScript, withDocument };
