/**
 * Minimal DOM stand-in for page script tests.
 *
 * The repository has no jsdom dependency, so page scripts are exercised the same
 * way test/markdown-editor.test.js does it: the script source runs inside a
 * `new Function` sandbox with mock `document` and `window` objects. This helper
 * builds those mocks with just enough behavior for the shared page header, the
 * gallery, and the page scripts (elements, attributes, classes, events, parent
 * links, and dispatching).
 */
'use strict';

function matchesSelector(element, selector) {
    if (selector.startsWith('.')) {
        return element.classList.contains(selector.slice(1));
    }
    if (selector.startsWith('#')) {
        return element.getAttribute('id') === selector.slice(1);
    }
    if (selector.startsWith('[') && selector.endsWith(']')) {
        const name = selector.slice(1, -1).split('=')[0];
        return element.getAttribute(name) !== null;
    }
    return element.tagName === selector.toUpperCase();
}

function createElement(tag, registry) {
    const classes = new Set();
    const attributes = {};
    const listeners = {};
    const element = {
        tagName: String(tag).toUpperCase(),
        children: [],
        parentNode: null,
        textContent: '',
        hidden: false,
        disabled: false,
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
            child.parentNode = element;
            element.children.push(child);
            return child;
        },
        removeChild: (child) => {
            const index = element.children.indexOf(child);
            if (index >= 0) {
                element.children.splice(index, 1);
                child.parentNode = null;
            }
            return child;
        },
        replaceChildren: (...children) => {
            element.children = [];
            children.forEach((child) => element.appendChild(child));
        },
        addEventListener: (type, handler) => {
            listeners[type] = listeners[type] || [];
            listeners[type].push(handler);
        },
        dispatch: (type, event) => {
            const detail = event || {};
            detail.target = detail.target || element;
            let node = element;
            while (node) {
                (node.__listeners && node.__listeners[type] ? node.__listeners[type] : [])
                    .forEach((handler) => handler(detail));
                node = node.parentNode;
            }
        },
        contains: (node) => node === element || element.children.some((child) => child.contains(node)),
        closest: (selector) => {
            let node = element;
            while (node) {
                if (matchesSelector(node, selector)) {
                    return node;
                }
                node = node.parentNode;
            }
            return null;
        },
    };
    element.__listeners = listeners;
    return element;
}

function createDom(ids) {
    const registry = new Map();
    const documentListeners = {};
    const document = {
        title: '',
        visibilityState: 'visible',
        body: createElement('body', registry),
        createElement: (tag) => createElement(tag, registry),
        getElementById: (id) => registry.get(String(id)) || null,
        createDocumentFragment: () => createElement('fragment', registry),
        addEventListener: (type, handler) => {
            documentListeners[type] = documentListeners[type] || [];
            documentListeners[type].push(handler);
        },
        dispatch: (type, event) => {
            const detail = event || {};
            detail.target = detail.target || document;
            (documentListeners[type] || []).forEach((handler) => handler(detail));
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
    const location = { pathname };
    const history = {
        replaceState: (state, title, url) => {
            if (typeof url === 'string' && url.startsWith('/')) {
                location.pathname = url;
            }
        },
    };
    return {
        location,
        history,
        opened,
        addEventListener: (type, handler) => {
            listeners[type] = listeners[type] || [];
            listeners[type].push(handler);
        },
        dispatch: (type, event) => {
            const detail = event || { preventDefault() {} };
            detail.target = detail.target || null;
            (listeners[type] || []).forEach((handler) => handler(detail));
        },
        open: (url) => {
            opened.push(url);
            return { focus() {} };
        },
    };
}

function runScript(source, { document, window, globals, sandbox }) {
    const names = Object.keys(globals || {});
    const fn = new Function('document', 'window', 'globalThis', ...names, source);
    fn(document, window, sandbox || {}, ...names.map((name) => globals[name]));
    return fn;
}

/**
 * Binds the page header's browser global to the sandbox document, because a
 * module required by Node resolves `document` from its own scope, not the
 * sandbox's.
 */
function withDocument(api, document) {
    if (typeof api.initPageHeader === 'function') {
        return Object.assign({}, api, {
            initPageHeader: (config) => api.initPageHeader(Object.assign({ document }, config)),
        });
    }
    return api;
}

module.exports = { createDom, createElement, createWindow, runScript, withDocument };
