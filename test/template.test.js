const assert = require('node:assert/strict');
const test = require('node:test');
const { app, extractTokens, render } = require('../server');

let server;
let baseUrl;

test.before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => {
    server.close();
});

async function api(path, options) {
    const response = await fetch(`${baseUrl}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const body = await response.text();
    assert.equal(response.ok, true, body);
    return JSON.parse(body);
}

test('extracts unique valid tokens case-sensitively', () => {
    assert.deepEqual(
        extractTokens('@[Person] @[person] @[Person] @[bad name] @[bad.value]'),
        ['Person', 'person'],
    );
});

test('renders every filled occurrence and preserves empty tokens', () => {
    const variables = Object.create(null);
    variables.Person = 'Ada';
    variables.unassigned = '';
    assert.equal(
        render({ text: '@[Person], @[Person], @[unassigned]', variables }),
        'Ada, Ada, @[unassigned]',
    );
});

test('supports variable names that overlap object prototype names', () => {
    const variables = Object.create(null);
    Object.defineProperty(variables, '__proto__', { value: 'safe', enumerable: true });
    assert.equal(
        render({ text: '@[__proto__]', variables }),
        'safe',
    );
});

test('only synchronizes newly detected variables when explicitly requested', async () => {
    const session = await api('/api/template/sessions', { method: 'POST' });
    const sessionPath = `/api/template/${session.id}`;

    assert.deepEqual((await api(sessionPath)).variables, []);
    assert.deepEqual(
        (await api(sessionPath, {
            method: 'PATCH',
            body: JSON.stringify({ text: '@[name] and @[bad name]' }),
        })).variables,
        [],
    );

    const synchronized = await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({ syncVariables: true }),
    });
    assert.deepEqual(synchronized.variables, [{ key: 'name', value: '' }]);

    await api(`${sessionPath}/variables/name`, {
        method: 'PUT',
        body: JSON.stringify({ value: 'Ada' }),
    });
    const repeated = await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({ syncVariables: true }),
    });
    assert.deepEqual(repeated.variables, [{ key: 'name', value: 'Ada' }]);
});
