const assert = require('node:assert/strict');
const test = require('node:test');
const { extractTokens, render } = require('../server');

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
