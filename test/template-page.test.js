const assert = require('node:assert/strict');
const test = require('node:test');

const { openTemplatePage, readPage, readScript, sessionsModule } = require('./helpers/pages.js');

const templateScript = readScript('template.js');
const templateHtml = readPage('template.html');

function latestVersion(page) {
    const session = page.storedSession();
    return session ? session.versions[session.versions.length - 1] : null;
}

test('the template page declares the shared header with its own options', () => {
    const page = openTemplatePage(sessionsModule.memoryStorage());

    assert.deepEqual(page.optionItems().map((item) => item.textContent), ['Clear variables', 'Clear all']);
    assert.equal(page.titleInput().getAttribute('placeholder'), 'DevToolKit');
    assert.equal(page.titleInput().value, '');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('template text, variables, and title are stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);

    page.type('txtInput', 'Hello @[name]');
    assert.equal(sessionsModule.listAll(storage).length, 0, 'untitled work stays in the page view');

    page.typeTitle('Release notes');
    assert.equal(page.document.title, 'Release notes');
    assert.equal(page.titleInput().getAttribute('disabled'), null, 'the title stays editable while focused');
    page.blurTitle();
    assert.equal(page.titleInput().getAttribute('disabled'), 'true', 'the title locks when focus is lost');

    let session = page.storedSession();
    assert.equal(session.kind, 'template');
    assert.equal(session.title, 'Release notes');
    assert.equal(session.versions.length, 1, 'the content typed before the title is snapshotted');
    assert.equal(session.versions[0].content, 'Hello @[name]');
    assert.deepEqual(session.versions[0].variables, {});
    assert.ok(session.versions[0].updatedDate, 'a version carries an ISO timestamp');

    page.type('txtVariables', '@[name]=Ada');
    page.element('txtInput').dispatch('blur', {});
    page.hide();
    session = page.storedSession();
    assert.equal(session.versions.length, 2);
    assert.equal(latestVersion(page).content, 'Hello @[name]');
    assert.deepEqual(latestVersion(page).variables, { name: 'Ada' });
});

test('a later page load restores the stored template session', () => {
    const storage = sessionsModule.memoryStorage();
    const first = openTemplatePage(storage);
    first.type('txtInput', 'Hello @[name]');
    first.type('txtVariables', '@[name]=Ada');
    first.typeTitle('Release notes');
    first.hide();

    const reloaded = openTemplatePage(storage, { sessionId: first.sessionId() });
    assert.equal(reloaded.element('txtInput').value, 'Hello @[name]');
    assert.equal(reloaded.element('txtVariables').value, '@[name]=Ada');
    assert.equal(reloaded.titleInput().value, 'Release notes');
    assert.equal(reloaded.titleInput().getAttribute('disabled'), 'true');
    assert.equal(reloaded.document.title, 'Release notes');

    reloaded.element('txtOutput').dispatch('focus', {});
    assert.equal(reloaded.element('txtOutput').value, 'Hello Ada');
});

test('tokens typed in the template are added when leaving the template text', () => {
    const page = openTemplatePage(sessionsModule.memoryStorage());

    page.type('txtInput', 'Hi @[name] and @[city]');
    page.element('txtInput').dispatch('blur', {});
    assert.equal(page.element('txtVariables').value, '@[name]=\n@[city]=');
});

test('Clear variables keeps the text and Clear all empties the session', () => {
    const page = openTemplatePage(sessionsModule.memoryStorage());
    page.type('txtInput', 'Hello @[name]');
    page.element('txtInput').dispatch('blur', {});
    page.type('txtVariables', '@[name]=Ada');
    page.typeTitle('Invoice');
    page.hide();
    assert.deepEqual(latestVersion(page).variables, { name: 'Ada' });

    page.openOptions();
    page.selectOption(0);
    assert.equal(page.element('txtInput').value, 'Hello @[name]', 'the template text is preserved');
    assert.equal(page.element('txtVariables').value, '', 'the variables editor is emptied');
    page.hide();
    assert.equal(latestVersion(page).content, 'Hello @[name]');
    assert.deepEqual(latestVersion(page).variables, {}, 'variables are cleared');

    page.openOptions();
    page.selectOption(1);
    assert.equal(page.element('txtInput').value, '', 'Clear all empties the template text');
    assert.equal(page.element('txtOutput').value, '');
    page.hide();
    assert.equal(latestVersion(page).content, '', 'Clear all empties the template');
    assert.equal(page.titleInput().value, 'Invoice', 'the title is kept by both actions');
});

test('leaving the page snapshots changed content and skips unchanged content', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openTemplatePage(storage);
    page.type('txtInput', 'first');
    page.typeTitle('Notes');
    assert.equal(page.storedSession().versions.length, 1);

    page.hide();
    assert.equal(page.storedSession().versions.length, 1, 'unchanged content is not snapshotted twice');

    page.type('txtInput', 'second');
    page.unload();
    assert.equal(page.storedSession().versions.length, 2, 'leaving the page records the change');
    assert.equal(latestVersion(page).content, 'second');

    page.type('txtInput', 'third');
    page.hide();
    page.unload();
    assert.equal(page.storedSession().versions.length, 3, 'a page unload is a snapshot point too');
});

test('an untitled session with changes is confirmed, a titled one is not', () => {
    const page = openTemplatePage(sessionsModule.memoryStorage());
    assert.equal(page.beforeUnloadProbe(), false, 'an untouched untitled page does not warn');

    page.type('txtInput', 'unsaved draft');
    assert.equal(page.beforeUnloadProbe(), true, 'an untitled session with changes warns');

    page.typeTitle('Notes');
    page.type('txtInput', 'saved draft');
    assert.equal(page.beforeUnloadProbe(), false, 'a titled session is auto-versioned instead');
    assert.equal(page.storedSession().versions[page.storedSession().versions.length - 1].content, 'saved draft');
});

test('the template page neither calls the server API nor owns header markup', () => {
    assert.ok(!/\/api\//.test(templateScript), 'the page must not call /api/ routes');
    assert.ok(!/fetch\(/.test(templateScript), 'the page must not fetch session state');

    assert.ok(templateHtml.includes('id="pageHeader"'), 'the page mounts the shared header');
    assert.ok(templateHtml.includes('browser-session.js'), 'the page loads the session store');
    assert.ok(templateHtml.includes('page-header.js'), 'the page loads the shared header');
    assert.ok(!templateHtml.includes('breadcrumb') && !templateScript.includes('breadcrumb'), 'the page must not include breadcrumb markup');
    assert.ok(!templateHtml.includes('titleInput'), 'the page must not duplicate the title textbox');
    assert.ok(!templateHtml.includes('btnNewSession'), 'the page must not own the session actions');
});
