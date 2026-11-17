/**
 * CodeMirror 6 surface for the Code Editor page.
 *
 * Loaded as an ES module because CodeMirror 6 is ESM-only. It exposes a small
 * adapter on `window.DevToolkitCodeEditorSurface` so the page wiring can stay a
 * classic, testable script, then starts the page once both sides are ready.
 */
import { EditorView, basicSetup } from 'codemirror';
import { Compartment } from '@codemirror/state';

const languageLoaders = {
    javascript: () => import('@codemirror/lang-javascript').then((mod) => mod.javascript()),
    typescript: () => import('@codemirror/lang-javascript').then((mod) => mod.javascript({ typescript: true })),
    json: () => import('@codemirror/lang-json').then((mod) => mod.json()),
    html: () => import('@codemirror/lang-html').then((mod) => mod.html()),
    css: () => import('@codemirror/lang-css').then((mod) => mod.css()),
    markdown: () => import('@codemirror/lang-markdown').then((mod) => mod.markdown()),
    python: () => import('@codemirror/lang-python').then((mod) => mod.python()),
    sql: () => import('@codemirror/lang-sql').then((mod) => mod.sql()),
    xml: () => import('@codemirror/lang-xml').then((mod) => mod.xml()),
};

const loadedLanguages = new Map();

async function loadLanguage(id) {
    if (!languageLoaders[id]) {
        return null;
    }
    if (!loadedLanguages.has(id)) {
        loadedLanguages.set(id, languageLoaders[id]());
    }
    try {
        return await loadedLanguages.get(id);
    } catch (error) {
        loadedLanguages.delete(id);
        throw error;
    }
}

const editorTheme = EditorView.theme({
    '&': { height: '100%' },
    '&.cm-focused': { outline: 'none' },
});

function create(config) {
    const settings = config || {};
    const parent = settings.parent;
    if (!parent) {
        throw new Error('The code editor surface requires a parent element');
    }
    const onChange = typeof settings.onChange === 'function' ? settings.onChange : null;
    const onError = typeof settings.onError === 'function' ? settings.onError : null;

    const languageCompartment = new Compartment();
    let suppressChanges = 0;
    let destroyed = false;
    let languageRequest = 0;

    const updateListener = EditorView.updateListener.of((update) => {
        if (!update.docChanged || suppressChanges > 0 || !onChange) {
            return;
        }
        onChange(update.state.doc.toString());
    });

    const view = new EditorView({
        doc: typeof settings.doc === 'string' ? settings.doc : '',
        extensions: [
            basicSetup,
            editorTheme,
            languageCompartment.of([]),
            updateListener,
        ],
        parent,
    });

    function getValue() {
        return view.state.doc.toString();
    }

    function getLength() {
        return view.state.doc.length;
    }

    /** Replaces the whole document, optionally without reporting a change. */
    function setValue(value, options) {
        const next = typeof value === 'string' ? value : '';
        const current = getValue();
        if (next === current) {
            return;
        }
        const silent = Boolean(options && options.silent);
        if (silent) {
            suppressChanges += 1;
        }
        try {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: next },
            });
        } finally {
            if (silent) {
                suppressChanges -= 1;
            }
        }
    }

    /**
     * Applies the language support for `id`. Unknown ids and plain text clear
     * the language extension. Import failures fall back to plain text and are
     * reported through `onError`.
     */
    function setLanguage(id) {
        if (destroyed) {
            return Promise.resolve();
        }
        const request = ++languageRequest;
        if (!id || id === 'plaintext') {
            view.dispatch({ effects: languageCompartment.reconfigure([]) });
            return Promise.resolve();
        }
        return loadLanguage(id).then((extension) => {
            if (destroyed || request !== languageRequest) {
                return;
            }
            view.dispatch({ effects: languageCompartment.reconfigure(extension || []) });
        }).catch((error) => {
            if (destroyed || request !== languageRequest) {
                return;
            }
            view.dispatch({ effects: languageCompartment.reconfigure([]) });
            if (onError) {
                onError(error, id);
            }
        });
    }

    function focus() {
        view.focus();
    }

    function destroy() {
        destroyed = true;
        view.destroy();
    }

    return {
        getValue,
        getLength,
        setValue,
        setLanguage,
        focus,
        destroy,
        view,
    };
}

const surface = { create, languageLoaders };
window.DevToolkitCodeEditorSurface = surface;

if (window.DevToolkitCodeEditor && typeof window.DevToolkitCodeEditor.start === 'function') {
    window.DevToolkitCodeEditor.start();
}
