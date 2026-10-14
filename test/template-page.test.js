const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const sessionsModule = require('../public/static/scripts/browser-session.js');
const { openTemplatePage } = require('./helpers/pages.js');

const templateScript = fs.readFileSync(path.join(__dirname, '../public/static/scripts/template.js'), 'utf8');
const templateHtml = fs.readFileSync(path.join(__dirname, '../public/template.html'), 'utf8');

function beforeUnloadProbe(window) {
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
}

test('the template page declares the shared header with its own options', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);

    const header = page.element('pageHeader').children[0];
    assert.equal(header.getAttribute('class'), 'row mt-3');
    assert.deepEqual(page.optionItems().map((item) => item.textContent), [
        'New session',
        'Clear variables',
        'Clear all',
    ]);

    const breadcrumb = header.children[0].children[0].children[0];
    assert.equal(breadcrumb.children[1].textContent, 'Template');
    assert.equal(page.element('pageNameInput').value, 'Devtoolkit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('editing the template text and variables is stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);

    page.element('txtInput').value = 'Hello @[name]';
    page.element('txtInput').dispatch('input', {});
    assert.equal(page.storedSession().data.text, 'Hello @[name]');

    page.element('txtVariables').value = '@[name]=Ada';
    page.element('txtVariables').dispatch('input', {});
    assert.deepEqual(page.storedSession().data.variables, { name: 'Ada' });

    page.element('pageNameInput').value = 'Release notes';
    page.element('pageNameInput').dispatch('input', {});
    assert.equal(page.storedSession().name, 'Release notes');
    assert.equal(page.document.title, 'Release notes');
});

test('a later page load restores the stored template session', () => {
    const storage = sessionsModule.memoryStorage();
    const first = openTemplatePage(storage);
    first.element('txtInput').value = 'Hello @[name]';
    first.element('txtInput').dispatch('input', {});
    first.element('txtVariables').value = '@[name]=Ada';
    first.element('txtVariables').dispatch('input', {});
    first.element('pageNameInput').value = 'Release notes';
    first.element('pageNameInput').dispatch('input', {});

    const reloaded = openTemplatePage(storage);
    assert.equal(reloaded.element('txtInput').value, 'Hello @[name]');
    assert.equal(reloaded.element('txtVariables').value, '@[name]=Ada');
    assert.equal(reloaded.element('pageNameInput').value, 'Release notes');
    assert.equal(reloaded.document.title, 'Release notes');

    reloaded.element('txtOutput').dispatch('focus', {});
    assert.equal(reloaded.element('txtOutput').value, 'Hello Ada');
});

test('tokens typed in the template are added when leaving the template text', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);

    page.element('txtInput').value = 'Hi @[name] and @[city]';
    page.element('txtInput').dispatch('blur', {});
    assert.deepEqual(page.storedSession().data.variables, { name: '', city: '' });
    assert.equal(page.element('txtVariables').value, '@[name]=\n@[city]=');
});

test('New session opens the next browser session for the page', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);

    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[0].dispatch('click', {});
    assert.deepEqual(page.window.opened, ['/template/2']);

    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[0].dispatch('click', {});
    assert.deepEqual(page.window.opened, ['/template/2', '/template/3']);
});

test('Clear variables keeps the text and Clear all empties the session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);
    page.element('txtInput').value = 'Hello @[name]';
    page.element('txtInput').dispatch('blur', {});
    page.element('txtVariables').value = '@[name]=Ada';
    page.element('txtVariables').dispatch('blur', {});

    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[1].dispatch('click', {});
    assert.deepEqual(page.storedSession().data.variables, {}, 'variables are cleared');
    assert.equal(page.storedSession().data.text, 'Hello @[name]', 'the template text is preserved');

    page.element('pageOptionsToggle').dispatch('click', { preventDefault() {} });
    page.optionItems()[2].dispatch('click', {});
    assert.equal(page.storedSession().data.text, '', 'Clear all empties the template');
    assert.deepEqual(page.storedSession().data.variables, {});
    assert.equal(page.element('txtOutput').value, '');
});

test('leaving the page is only confirmed while changes are unpersisted', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);

    page.element('txtInput').value = 'Saving works';
    page.element('txtInput').dispatch('input', {});
    assert.equal(beforeUnloadProbe(page.window), false, 'a persisted edit does not warn');

    storage.setItem = () => {
        throw new Error('QuotaExceededError');
    };
    page.element('txtInput').value = 'Cannot be saved';
    page.element('txtInput').dispatch('input', {});
    assert.equal(beforeUnloadProbe(page.window), true, 'an unpersisted edit warns');
    assert.equal(page.element('pageHeaderStatus').hidden, false, 'the page reports the unpersisted change');
});

test('the template page neither calls the server API nor owns header markup', () => {
    assert.ok(!/\/api\//.test(templateScript), 'the page must not call /api/ routes');
    assert.ok(!/fetch\(/.test(templateScript), 'the page must not fetch session state');

    assert.ok(templateHtml.includes('id="pageHeader"'), 'the page mounts the shared header');
    assert.ok(templateHtml.includes('browser-session.js'), 'the page loads the session store');
    assert.ok(templateHtml.includes('page-header.js'), 'the page loads the shared header');
    assert.ok(!templateHtml.includes('breadcrumb'), 'the page must not duplicate the breadcrumb');
    assert.ok(!templateHtml.includes('titleInput'), 'the page must not duplicate the page name textbox');
    assert.ok(!templateHtml.includes('btnNewSession'), 'the page must not own the session actions');
});
