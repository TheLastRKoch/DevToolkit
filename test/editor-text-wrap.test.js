const assert = require('node:assert/strict');
const test = require('node:test');

const editorTextWrap = require('../public/static/scripts/editor-text-wrap.js');
const { createElement } = require('./helpers/mock-dom.js');

function workspace() {
    const element = createElement('div', new Map());
    element.setAttribute('id', 'editorWorkspace');
    return element;
}

function fakeDocument() {
    const listeners = [];
    return {
        listeners,
        addEventListener: (type, handler) => {
            if (type === 'keydown') {
                listeners.push(handler);
            }
        },
        dispatch: (event) => {
            listeners.forEach((handler) => handler(event));
        },
    };
}

function press(document, overrides) {
    const event = Object.assign(
        {
            code: 'KeyZ',
            altKey: true,
            ctrlKey: false,
            metaKey: false,
            shiftKey: false,
            prevented: false,
            preventDefault() {
                this.prevented = true;
            },
        },
        overrides,
    );
    document.dispatch(event);
    return event;
}

test('text wrap starts disabled', () => {
    const element = workspace();
    const applied = [];
    const toggle = editorTextWrap.createTextWrapToggle({
        workspace: element,
        apply: (enabled) => applied.push(enabled),
        document: fakeDocument(),
    });

    assert.equal(toggle.isEnabled(), false, 'a fresh workspace has wrapping disabled');
    assert.equal(element.classList.contains(editorTextWrap.DISABLED_CLASS), true);
    assert.deepEqual(applied, [false], 'the surface is told about the initial state');
});

test('the first toggle enables wrapping and the second disables it', () => {
    const element = workspace();
    const applied = [];
    const toggle = editorTextWrap.createTextWrapToggle({
        workspace: element,
        apply: (enabled) => applied.push(enabled),
        document: fakeDocument(),
    });

    toggle.toggle();
    assert.equal(toggle.isEnabled(), true);
    assert.equal(element.classList.contains(editorTextWrap.DISABLED_CLASS), false);

    toggle.toggle();
    assert.equal(toggle.isEnabled(), false);
    assert.equal(element.classList.contains(editorTextWrap.DISABLED_CLASS), true);
    assert.deepEqual(applied, [false, true, false], 'apply receives every new state');
});

test('a KeyZ press without Alt or Option is ignored', () => {
    const element = workspace();
    const document = fakeDocument();
    const toggle = editorTextWrap.createTextWrapToggle({ workspace: element, document });

    const event = press(document, { altKey: false });

    assert.equal(event.prevented, false, 'plain z keeps its default behavior');
    assert.equal(toggle.isEnabled(), false, 'wrapping is unchanged');
});

test('Alt+KeyZ toggles wrapping and is default-prevented', () => {
    const element = workspace();
    const document = fakeDocument();
    const toggle = editorTextWrap.createTextWrapToggle({ workspace: element, document });

    const event = press(document);

    assert.equal(event.prevented, true, 'the page consumes the shortcut');
    assert.equal(toggle.isEnabled(), true, 'the shortcut enables wrapping');

    const second = press(document);
    assert.equal(second.prevented, true);
    assert.equal(toggle.isEnabled(), false, 'the shortcut disables wrapping again');
});

test('Alt+Shift+KeyZ toggles while Ctrl+Alt+KeyZ is ignored', () => {
    const element = workspace();
    const document = fakeDocument();
    const toggle = editorTextWrap.createTextWrapToggle({ workspace: element, document });

    const withShift = press(document, { shiftKey: true });
    assert.equal(withShift.prevented, true);
    assert.equal(toggle.isEnabled(), true, 'Shift is allowed by the modifier rule');

    const withCtrl = press(document, { ctrlKey: true });
    assert.equal(withCtrl.prevented, false);
    assert.equal(toggle.isEnabled(), true, 'Ctrl+Alt+Z is left to the browser');
});

test('Option+Z on macOS toggles even though it reports key Ω', () => {
    const element = workspace();
    const document = fakeDocument();
    const toggle = editorTextWrap.createTextWrapToggle({ workspace: element, document });

    const event = press(document, { key: 'Ω', altKey: true });

    assert.equal(event.prevented, true);
    assert.equal(toggle.isEnabled(), true, 'matching the physical key works on macOS');
});

test('run behaves like the Options-style toggle', () => {
    const element = workspace();
    const toggle = editorTextWrap.createTextWrapToggle({ workspace: element, document: fakeDocument() });

    toggle.run();
    assert.equal(toggle.isEnabled(), true);
    toggle.run();
    assert.equal(toggle.isEnabled(), false);
});

test('no workspace produces no toggle', () => {
    assert.equal(editorTextWrap.createTextWrapToggle(null), null);
    assert.equal(editorTextWrap.createTextWrapToggle({}), null);
});
