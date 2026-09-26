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

test('batch updates variables via PATCH with object format', async () => {
    const session = await api('/api/template/sessions', { method: 'POST' });
    const sessionPath = `/api/template/${session.id}`;

    await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({
            text: 'Hello @[firstName] @[lastName]!',
            syncVariables: true,
        }),
    });

    const res = await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({
            variables: {
                firstName: 'Grace',
                lastName: 'Hopper',
            },
        }),
    });

    assert.deepEqual(res.variables, [
        { key: 'firstName', value: 'Grace' },
        { key: 'lastName', value: 'Hopper' },
    ]);
    assert.equal(res.rendered, 'Hello Grace Hopper!');
});

test('batch updates variables via PUT /variables with array format', async () => {
    const session = await api('/api/template/sessions', { method: 'POST' });
    const sessionPath = `/api/template/${session.id}`;

    await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({
            text: '@[role] in @[dept]',
            syncVariables: true,
        }),
    });

    const res = await api(`${sessionPath}/variables`, {
        method: 'PUT',
        body: JSON.stringify({
            variables: [
                { key: 'role', value: 'Engineer' },
                { key: 'dept', value: 'Platform' },
            ],
        }),
    });

    assert.deepEqual(res.variables, [
        { key: 'role', value: 'Engineer' },
        { key: 'dept', value: 'Platform' },
    ]);
    assert.equal(res.rendered, 'Engineer in Platform');
});

test('preserves empty variables and unassigned tokens in rendered output', async () => {
    const session = await api('/api/template/sessions', { method: 'POST' });
    const sessionPath = `/api/template/${session.id}`;

    const res = await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({
            text: '@[greeting] @[title] @[name]',
            syncVariables: true,
            variables: {
                greeting: 'Hello',
                title: '',
            },
        }),
    });

    assert.deepEqual(res.variables, [
        { key: 'greeting', value: 'Hello' },
        { key: 'title', value: '' },
        { key: 'name', value: '' },
    ]);
    assert.equal(res.rendered, 'Hello @[title] @[name]');
});

test('synchronizing preserves existing variable values and ignores invalid token formats', async () => {
    const session = await api('/api/template/sessions', { method: 'POST' });
    const sessionPath = `/api/template/${session.id}`;

    await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({
            text: '@[existing] and @[invalid name] and @[bad.key]',
            syncVariables: true,
            variables: { existing: 'Kept' },
        }),
    });

    const updated = await api(sessionPath, {
        method: 'PATCH',
        body: JSON.stringify({
            text: '@[existing] and @[newVar] and @[another]',
            syncVariables: true,
        }),
    });

    assert.deepEqual(updated.variables, [
        { key: 'existing', value: 'Kept' },
        { key: 'newVar', value: '' },
        { key: 'another', value: '' },
    ]);
    assert.equal(updated.rendered, 'Kept and @[newVar] and @[another]');
});
