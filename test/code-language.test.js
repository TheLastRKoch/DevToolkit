const assert = require('node:assert/strict');
const test = require('node:test');

const { detectLanguage, LANGUAGES, MAX_SCAN, languageById, languageLabel } = require('../public/static/scripts/code-language.js');

const SAMPLES = {
    json: '{"name":"Ada","skills":["math","code"],"active":true}',
    javascript: "const greet = (name) => {\n  console.log('Hi', name);\n};\n\ngreet('Ada');",
    typescript: 'interface User {\n  id: number;\n}\n\nconst user: User = { id: 1 };\nconsole.log(user);',
    html: '<!DOCTYPE html>\n<html><body><h1>Hi</h1></body></html>',
    css: 'body {\n  color: #333;\n  margin: 0;\n}',
    markdown: '# Title\n\nSome **bold** text\n\n- one\n- two',
    python: 'def greet(name):\n    return f"Hi {name}"',
    sql: 'SELECT id, name\nFROM users\nWHERE active = 1;',
    xml: '<?xml version="1.0"?>\n<note><to>Tove</to><message>Hi</message></note>',
};

test('the language catalog lists every supported language once', () => {
    const ids = LANGUAGES.map((language) => language.id);
    assert.deepEqual(ids, [
        'plaintext', 'javascript', 'typescript', 'json', 'html', 'css',
        'markdown', 'python', 'sql', 'xml',
    ]);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(languageLabel('plaintext'), 'Plain Text');
    assert.equal(languageById('not-a-language').id, 'plaintext');
});

for (const [expected, sample] of Object.entries(SAMPLES)) {
    test(`detects ${expected} content`, () => {
        assert.equal(detectLanguage(sample), expected);
    });
}

test('detects each language when surrounded by whitespace', () => {
    for (const [expected, sample] of Object.entries(SAMPLES)) {
        assert.equal(detectLanguage(`\n\n  ${sample}\n\n`), expected, expected);
    }
});

test('prose and unrecognized content fall back to plain text', () => {
    assert.equal(detectLanguage('just some prose with no code markers at all'), 'plaintext');
    assert.equal(detectLanguage(''), 'plaintext');
    assert.equal(detectLanguage('   \n\t '), 'plaintext');
    assert.equal(detectLanguage(null), 'plaintext');
    assert.equal(detectLanguage(42), 'plaintext');
});

test('detection is bounded to the first part of large content', () => {
    const large = `const a = 1;\nconsole.log(a);\n${'// padding line\n'.repeat(4000)}`;
    assert.ok(large.length > MAX_SCAN, 'the fixture must exceed the scan window');
    assert.equal(detectLanguage(large), 'javascript', 'large content still detects from its prefix');

    const largeJson = `{"items":[${Array.from({ length: 3000 }, (_, index) => `{"id":${index}}`).join(',')}]}`;
    assert.ok(largeJson.length > MAX_SCAN);
    assert.equal(detectLanguage(largeJson), 'json', 'a large JSON document still detects');
});
