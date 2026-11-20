const assert = require('node:assert/strict');
const test = require('node:test');

const {
    openCodeEditorPage,
    readPage,
    readScript,
    sessionsModule,
    seedSession,
} = require('./helpers/pages.js');

const codeEditorHtml = readPage('code-editor.html');
const codeEditorScript = readScript('code-editor.js');
const surfaceScript = readScript('code-editor-surface.js');

function latestVersion(page) {
    const session = page.storedSession();
    return session ? session.versions[session.versions.length - 1] : null;
}

const INDENTED = 'function add(a, b) {\n\treturn a + b;\n}\n';

test('the code editor mounts the shared header with its own options', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());

    assert.deepEqual(
        page.optionItems().map((item) => item.textContent),
        ['Change language format', 'Toggle margins', 'Clear editor'],
    );
    assert.equal(page.titleInput().getAttribute('placeholder'), 'DevToolKit');
    assert.equal(page.document.title, 'Devtoolkit');
});

test('margins are off by default and toggle without touching the code', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    const workspace = page.element('codeEditorWorkspace');

    assert.equal(workspace.classList.contains('editor-margins-enabled'), false, 'margins are disabled on load');

    page.typeCode(INDENTED);
    page.typeTitle('Notes');

    page.openOptions();
    page.selectOption(1);
    assert.equal(workspace.classList.contains('editor-margins-enabled'), true, 'the first selection enables margins');

    page.openOptions();
    page.selectOption(1);
    assert.equal(workspace.classList.contains('editor-margins-enabled'), false, 'the second selection disables margins');
    assert.equal(page.surface.getValue(), INDENTED, 'the code is unchanged');
    assert.equal(page.titleInput().value, 'Notes', 'the title is unchanged');
    assert.equal(latestVersion(page).content, INDENTED, 'the stored content is unchanged');
});

test('the code editor creates the surface on its mount element', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    assert.equal(page.surface.config.parent, page.element('codeEditorMount'));
    assert.equal(page.surface.config.doc, '');
});

test('typed code and title are stored on the browser session', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openCodeEditorPage(storage);

    page.typeCode(INDENTED);
    assert.equal(sessionsModule.listAll(storage).length, 0, 'untitled work is not stored');

    page.typeTitle('Snippet');
    assert.equal(page.document.title, 'Snippet');
    page.blurTitle();
    assert.equal(page.titleInput().getAttribute('disabled'), 'true');

    const session = page.storedSession();
    assert.equal(session.kind, 'code-editor');
    assert.equal(session.title, 'Snippet');
    assert.equal(latestVersion(page).content, INDENTED, 'whitespace and newlines are preserved exactly');
    assert.ok(!('variables' in latestVersion(page)), 'code editor versions carry no variables');
    assert.equal(page.url(), '/code-editor/1', 'the URL reflects the saved session');
});

test('stored content and title are restored without re-persisting', () => {
    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'code-editor', { title: 'Saved', content: INDENTED });
    const before = JSON.parse(storage.getItem(sessionsModule.sessionKey('code-editor', 1)));

    const page = openCodeEditorPage(storage, { sessionId: 1 });

    assert.equal(page.surface.config.doc, INDENTED, 'the stored code is the editor document');
    assert.equal(page.titleInput().value, 'Saved');
    assert.deepEqual(
        JSON.parse(storage.getItem(sessionsModule.sessionKey('code-editor', 1))),
        before,
        'restoring does not write the session again',
    );
});

test('Clear editor empties the content and keeps the title', () => {
    const storage = sessionsModule.memoryStorage();
    const page = openCodeEditorPage(storage);
    page.typeCode(INDENTED);
    page.typeTitle('Keep me');

    page.openOptions();
    page.selectOption(2);

    assert.equal(page.surface.getValue(), '', 'the editor is emptied');
    assert.equal(page.surface.writes.at(-1).silent, true, 'clearing does not count as a user edit');
    page.hide();
    assert.equal(latestVersion(page).content, '', 'the cleared content is versioned');
    assert.equal(page.titleInput().value, 'Keep me', 'the title is kept');
});

test('leaving the page snapshots changed content and skips unchanged content', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    page.typeCode('const first = 1;');
    page.typeTitle('Notes');
    assert.equal(page.storedSession().versions.length, 1);

    page.hide();
    assert.equal(page.storedSession().versions.length, 1, 'unchanged content is not snapshotted twice');

    page.typeCode('const second = 2;');
    page.unload();
    assert.equal(latestVersion(page).content, 'const second = 2;');

    page.typeCode('const third = 3;');
    page.hide();
    assert.equal(page.storedSession().versions.length, 3, 'three snapshots are kept');
});

test('an untitled code editor session with changes is confirmed, a titled one is not', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    assert.equal(page.beforeUnloadProbe(), false, 'an untouched untitled page does not warn');

    page.typeCode('draft');
    assert.equal(page.beforeUnloadProbe(), true, 'an untitled session with changes warns');

    page.typeTitle('Notes');
    page.typeCode('saved');
    assert.equal(page.beforeUnloadProbe(), false, 'a titled session is auto-versioned instead');
});

test('the status bar shows the detected language and character count', async () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage(), {
        title: 'Data',
        content: '{"id":1,"name":"Ada"}',
    });

    assert.equal(page.surface.languages.at(-1), 'json');
    assert.equal(page.languageLabel(), 'Auto: JSON');
    assert.equal(page.charCount(), String('{"id":1,"name":"Ada"}'.length));

    page.typeCode('const a = 1;\nconsole.log(a);');
    assert.equal(page.charCount(), String('const a = 1;\nconsole.log(a);'.length), 'the count updates immediately');
    await page.waitForDetection();
    assert.equal(page.languageLabel(), 'Auto: JavaScript');
    assert.equal(page.surface.languages.at(-1), 'javascript');
});

test('clearing cancels a pending detection so the language resets to plain text', async () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    page.typeCode('{"pending":true}');
    page.openOptions();
    page.selectOption(2);
    await page.waitForDetection();

    assert.equal(page.languageLabel(), 'Auto: Plain Text');
    assert.equal(page.surface.languages.at(-1), 'plaintext');
});

test('the language dialog offers Auto, Plain Text, and the 20 languages', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    page.openLanguageDialog();

    assert.equal(page.isLanguageDialogOpen(), true, 'the option opens the modal');
    const labels = page.languageLabels();
    assert.deepEqual(labels.slice(0, 3), ['Auto', 'Plain Text', 'C']);
    assert.equal(labels.length, 22, 'Auto, Plain Text, and the 20 languages');
    assert.equal(new Set(labels).size, labels.length, 'every option is listed once');
    for (const label of [
        'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 'Rust',
        'PHP', 'Ruby', 'SQL', 'Kotlin', 'Swift', 'Shell', 'HTML', 'CSS', 'JSON',
        'XML', 'Markdown',
    ]) {
        assert.ok(labels.includes(label), label);
    }
    assert.equal(page.languageSelection(), 'auto', 'auto mode is preselected');
});

test('cancelling the language dialog leaves the language unchanged', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage(), {
        title: 'Snippet',
        content: 'const a = 1;\nconsole.log(a);',
    });
    assert.equal(page.languageLabel(), 'Auto: JavaScript');

    page.openLanguageDialog();
    page.chooseLanguage('JSON');
    page.cancelLanguage();
    assert.equal(page.isLanguageDialogOpen(), false, 'Cancel closes the modal');
    assert.equal(page.languageLabel(), 'Auto: JavaScript', 'Cancel keeps the language');
    assert.notEqual(page.surface.languages.at(-1), 'json');

    page.openLanguageDialog();
    page.chooseLanguage('JSON');
    page.escapeLanguageDialog();
    assert.equal(page.isLanguageDialogOpen(), false, 'Escape closes the modal');
    assert.equal(page.languageLabel(), 'Auto: JavaScript');

    page.openLanguageDialog();
    page.chooseLanguage('JSON');
    page.backdropClickLanguageDialog();
    assert.equal(page.isLanguageDialogOpen(), false, 'a backdrop click closes the modal');
    assert.equal(page.languageLabel(), 'Auto: JavaScript');
});

test('a manual language overrides detection and auto resumes it', async () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage(), {
        title: 'Snippet',
        content: 'const a = 1;\nconsole.log(a);',
    });
    assert.equal(page.languageLabel(), 'Auto: JavaScript');

    page.openLanguageDialog();
    page.chooseLanguage('JSON');
    page.applyLanguage();
    assert.equal(page.isLanguageDialogOpen(), false, 'Apply closes the modal');
    assert.equal(page.languageLabel(), 'JSON');
    assert.equal(page.surface.languages.at(-1), 'json');

    page.typeCode('SELECT id FROM users;');
    await page.waitForDetection();
    assert.equal(page.languageLabel(), 'JSON', 'editing keeps the manual selection');

    page.openLanguageDialog();
    assert.equal(page.languageSelection(), 'json', 'reopening preselects the manual choice');
    page.chooseLanguage('Auto');
    page.applyLanguage();
    assert.equal(page.languageLabel(), 'Auto: SQL', 'Auto resumes detection');
    assert.equal(page.surface.languages.at(-1), 'sql');
});

test('an untitled session cleared with Clear editor is not left dirty', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    page.typeCode(INDENTED);
    assert.equal(page.beforeUnloadProbe(), true, 'unsaved code is protected');

    page.openOptions();
    page.selectOption(2);
    assert.equal(page.surface.getValue(), '');
    assert.equal(page.beforeUnloadProbe(), false, 'clearing is not an unsaved change');
});

test('unrecognized code reports plain text', async () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage());
    page.typeCode('just some prose without markers');
    await page.waitForDetection();
    assert.equal(page.languageLabel(), 'Auto: Plain Text');
    assert.equal(page.surface.languages.at(-1), 'plaintext');
});

test('the code editor keeps its session isolated from other page kinds', () => {
    const storage = sessionsModule.memoryStorage();
    seedSession(storage, 'raw-text-editor', { title: 'Prose', content: '<p>Hello</p>' });
    const prose = storage.getItem(sessionsModule.sessionKey('raw-text-editor', 1));

    const page = openCodeEditorPage(storage);
    page.typeCode(INDENTED);
    page.typeTitle('Code');
    page.blurTitle();

    assert.equal(storage.getItem(sessionsModule.sessionKey('raw-text-editor', 1)), prose);
    assert.deepEqual(
        sessionsModule.listAll(storage).map((session) => session.kind).sort(),
        ['code-editor', 'raw-text-editor'],
    );
});

test('a missing editor module leaves the page usable with a warning', () => {
    const page = openCodeEditorPage(sessionsModule.memoryStorage(), { withoutSurface: true });
    page.document.dispatch('DOMContentLoaded');

    assert.equal(page.element('pageHeaderStatus').hidden, false, 'the warning is visible');
    assert.match(page.element('pageHeaderStatus').textContent, /could not be loaded/);
    assert.equal(page.charCount(), '0', 'the status bar still renders');
    assert.deepEqual(
        page.optionItems().map((item) => item.textContent),
        ['Change language format', 'Toggle margins', 'Clear editor'],
    );
});

test('the status bar language label and modal are built without Bootstrap JS', () => {
    assert.ok(!codeEditorHtml.includes('bootstrap.bundle'), 'the page must not need Bootstrap JS');
    assert.ok(codeEditorScript.includes('DevToolkitCodeLanguage'), 'the page script uses the detector');
    assert.ok(!/innerHTML\s*=/.test(codeEditorScript), 'the page must not render content as markup');
    assert.ok(codeEditorHtml.includes('<span id="languageLabel"'), 'the language is a text label');
    assert.ok(!codeEditorHtml.includes('languageButton'), 'the status bar offers no language control');
    assert.match(codeEditorHtml, /<div id="languageDialog"[^>]*hidden/);
    assert.ok(codeEditorHtml.includes('id="languageSelect"'));
    assert.ok(codeEditorHtml.includes('id="languageApply"'));
    assert.ok(codeEditorHtml.includes('id="languageCancel"'));
});

test('the page loads CodeMirror 6 as pinned ES modules', () => {
    assert.ok(codeEditorHtml.includes('id="pageHeader"'), 'the page mounts the shared header');
    assert.ok(codeEditorHtml.includes('browser-session.js'), 'the page loads the session store');
    assert.ok(codeEditorHtml.includes('editor-margins.js'), 'the page loads the shared margin module');
    assert.ok(codeEditorHtml.indexOf('editor-margins.js') < codeEditorHtml.indexOf('code-editor.js'), 'the margin module loads before the page script');
    assert.match(codeEditorHtml, /@media\s*\(\s*min-width:\s*768px\s*\)\s*\{[\s\S]*?#codeEditorWorkspace\.editor-margins-enabled\s*\{[\s\S]*?margin-left:\s*200px[\s\S]*?margin-right:\s*200px/, 'enabled margins inset the workspace by 200px on wide viewports');
    assert.ok(codeEditorHtml.includes('page-header.js'), 'the page loads the shared header');
    assert.ok(codeEditorHtml.includes('code-language.js'), 'the page loads the detector');
    assert.ok(codeEditorHtml.includes('code-editor.js'), 'the page loads its wire-up script');
    assert.ok(codeEditorHtml.includes('type="module"'), 'the surface loads as a module');
    assert.ok(codeEditorHtml.includes('code-editor-surface.js'), 'the page loads the surface module');
    assert.ok(codeEditorHtml.includes('type="importmap"'), 'bare CodeMirror imports are mapped');
    assert.ok(codeEditorHtml.includes('https://esm.sh/codemirror@6.0.2'), 'the CodeMirror bundle is pinned');
    assert.ok(!codeEditorHtml.includes('quill'), 'the format bar and rich-text surface are gone');

    assert.ok(surfaceScript.includes("from 'codemirror'"));
    assert.ok(surfaceScript.includes('basicSetup'));
    assert.ok(surfaceScript.includes('Compartment'));
    assert.ok(surfaceScript.includes("import('@codemirror/lang-json')"));

    for (const pkg of ['lang-java', 'lang-cpp', 'lang-php', 'lang-rust', 'lang-go']) {
        assert.ok(
            codeEditorHtml.includes(`@codemirror/${pkg}@`),
            `${pkg} is pinned in the import map`,
        );
        assert.ok(surfaceScript.includes(`import('@codemirror/${pkg}')`), `${pkg} loads lazily`);
    }
    assert.ok(
        codeEditorHtml.includes('"@codemirror/legacy-modes/": "https://esm.sh/@codemirror/legacy-modes@6.5.5/"'),
        'the legacy mode prefix mapping is pinned',
    );
    for (const mode of ["clike', 'c'", "clike', 'csharp'", "clike', 'kotlin'", "ruby', 'ruby'", "shell', 'shell'", "swift', 'swift'"]) {
        assert.ok(surfaceScript.includes(mode), `the ${mode} stream mode is loaded`);
    }

    assert.ok(
        surfaceScript.includes("keymap.of([{ key: 'Tab', run: insertTab, shift: indentLess }])"),
        'Tab inserts or indents and Shift+Tab outdents',
    );
    assert.ok(surfaceScript.includes('Prec.highest('), 'the Tab binding outranks the basic setup keymap');
    assert.ok(surfaceScript.includes("indentUnit.of('\\t')"), 'one indentation unit is a tab');
    assert.ok(surfaceScript.includes("from '@codemirror/commands'"), 'the indentation commands come from CodeMirror');
    assert.ok(codeEditorHtml.includes('"@codemirror/commands"'), 'the commands package is pinned in the import map');
});
