const assert = require('node:assert/strict');
const test = require('node:test');

const editorMargins = require('../public/static/scripts/editor-margins.js');
const { createElement } = require('./helpers/mock-dom.js');

function workspace() {
    const element = createElement('div', new Map());
    element.setAttribute('id', 'editorWorkspace');
    return element;
}

test('the margin toggle describes its dropdown option', () => {
    const option = editorMargins.createMarginToggle(workspace());

    assert.equal(option.id, 'toggle-margins');
    assert.equal(option.label, 'Toggle margins');
    assert.equal(typeof option.run, 'function');
    assert.equal(typeof option.isEnabled, 'function');
});

test('margins start disabled and toggle on and off', () => {
    const element = workspace();
    const option = editorMargins.createMarginToggle(element);

    assert.equal(option.isEnabled(), false, 'a fresh workspace has no margins');
    assert.equal(element.classList.contains(editorMargins.MARGIN_CLASS), false);

    option.run();
    assert.equal(option.isEnabled(), true, 'the first selection enables margins');
    assert.equal(element.classList.contains('editor-margins-enabled'), true);

    option.run();
    assert.equal(option.isEnabled(), false, 'the second selection removes them');
    assert.equal(element.classList.contains('editor-margins-enabled'), false);
});

test('no workspace produces no option', () => {
    assert.equal(editorMargins.createMarginToggle(null), null);
    assert.equal(editorMargins.createMarginToggle(undefined), null);
});
