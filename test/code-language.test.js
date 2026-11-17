const assert = require('node:assert/strict');
const test = require('node:test');

const {
    detectLanguage,
    LANGUAGES,
    MAX_SCAN,
    languageById,
    languageLabel,
} = require('../public/static/scripts/code-language.js');

const SAMPLES = {
    php: '<?php\nfunction greet($name) {\n    echo "Hi $name";\n}',
    json: '{"name":"Ada","skills":["math","code"],"active":true}',
    html: '<!DOCTYPE html>\n<html><body><h1>Hi</h1></body></html>',
    xml: '<?xml version="1.0"?>\n<note><to>Tove</to><message>Hi</message></note>',
    css: 'body {\n  color: #333;\n  margin: 0;\n}',
    markdown: '# Title\n\nSome **bold** text\n\n- one\n- two',
    shell: '#!/bin/bash\nset -e\nfor file in *.txt; do\n  echo "$file"\ndone',
    sql: 'SELECT id, name\nFROM users\nWHERE active = 1;',
    python: 'def greet(name):\n    return f"Hi {name}"',
    rust: 'use std::collections::HashMap;\n\nfn main() {\n    let mut scores = HashMap::new();\n    println!("{:?}", scores);\n}',
    go: 'package main\n\nimport "fmt"\n\nfunc main() {\n    name := "Ada"\n    fmt.Println(name)\n}',
    ruby: "require 'json'\n\ndef greet(name)\n  puts \"Hi #{name}\"\nend\n\nattr_reader :name",
    kotlin: 'fun main() {\n    val items = listOf("a", "b")\n    items.forEach { println(it) }\n}',
    swift: 'import Foundation\n\nfunc greet(name: String) -> String {\n    guard let name = name else { return "" }\n    return "Hi \\(name)"\n}',
    csharp: 'using System;\n\nnamespace Demo {\n    public class Person {\n        public string Name { get; set; }\n        public void Say() {\n            Console.WriteLine("Hi");\n        }\n    }\n}',
    java: 'import java.util.List;\n\npublic class Main {\n    public static void main(String[] args) {\n        List<String> names = List.of("Ada");\n        System.out.println(names);\n    }\n}',
    cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello" << std::endl;\n    return 0;\n}',
    c: '#include <stdio.h>\n\nint main(void) {\n    printf("Hello, world!\\n");\n    return 0;\n}',
    typescript: 'interface User {\n  id: number;\n}\n\nconst user: User = { id: 1 };\nconsole.log(user);',
    javascript: "const greet = (name) => {\n  console.log('Hi', name);\n};\n\ngreet('Ada');",
};

const EXPECTED_IDS = [
    'plaintext', 'c', 'csharp', 'cpp', 'css', 'go', 'html', 'java',
    'javascript', 'json', 'kotlin', 'markdown', 'php', 'python', 'ruby',
    'rust', 'sql', 'shell', 'swift', 'typescript', 'xml',
];

test('the language catalog lists Plain Text and the 20 supported languages once', () => {
    const ids = LANGUAGES.map((language) => language.id);
    assert.deepEqual(ids, EXPECTED_IDS);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(languageLabel('plaintext'), 'Plain Text');
    assert.equal(languageLabel('csharp'), 'C#');
    assert.equal(languageById('not-a-language').id, 'plaintext');
});

test('every supported language has a sample that detects as that language', () => {
    assert.deepEqual(
        Object.keys(SAMPLES).sort(),
        EXPECTED_IDS.filter((id) => id !== 'plaintext').sort(),
    );
    for (const [expected, sample] of Object.entries(SAMPLES)) {
        assert.equal(detectLanguage(sample), expected, expected);
    }
});

test('detects each language when surrounded by whitespace', () => {
    for (const [expected, sample] of Object.entries(SAMPLES)) {
        assert.equal(detectLanguage(`\n\n  ${sample}\n\n`), expected, expected);
    }
});

test('the C family maps to C, C++, C#, Java, and Kotlin in the intended order', () => {
    assert.equal(detectLanguage(SAMPLES.c), 'c', 'standard headers are not read as C++');
    assert.equal(detectLanguage(SAMPLES.cpp), 'cpp');
    assert.equal(detectLanguage(SAMPLES.csharp), 'csharp', 'using System is not read as Java');
    assert.equal(detectLanguage(SAMPLES.java), 'java', 'System.out is not read as C#');
    assert.equal(detectLanguage(SAMPLES.kotlin), 'kotlin');

    assert.equal(
        detectLanguage('#include <stdio.h>\nusing System;\nint main() { printf("x"); }'),
        'csharp',
        'a C# marker wins over the C header when both are present',
    );
});

test('prose and unrecognized content fall back to plain text', () => {
    assert.equal(detectLanguage('just some prose with no code markers at all'), 'plaintext');
    assert.equal(detectLanguage('hello world 123'), 'plaintext');
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

    const lateMarker = `${'padding line\n'.repeat(2000)}#include <stdio.h>\nprintf("x");`;
    assert.ok(lateMarker.length > MAX_SCAN);
    assert.equal(detectLanguage(lateMarker), 'plaintext', 'markers past the scan window are ignored');
});

test('shebangs and CSS markers are classified the way developers expect', () => {
    assert.equal(detectLanguage('#!/usr/bin/env bash\necho "$HOME"'), 'shell');
    assert.equal(detectLanguage('#!/bin/zsh\nfor f in *; do echo $f; done'), 'shell');
    assert.equal(detectLanguage('#!/usr/bin/env node\nconsole.log("hi")'), 'javascript');

    assert.equal(detectLanguage('@import url("theme.css");\n\nbody {\n  color: red;\n}'), 'css');
    assert.equal(detectLanguage(':root {\n  --brand: #333;\n}\n\n.button {\n  color: var(--brand);\n}'), 'css');
    assert.equal(detectLanguage("import { readFile } from 'node:fs';\nconst data = readFile('x');"), 'javascript');
});

test('returns stable ids rather than labels', () => {
    const ids = LANGUAGES.map((language) => language.id);
    for (const [expected, sample] of Object.entries(SAMPLES)) {
        const detected = detectLanguage(sample);
        assert.ok(ids.includes(detected), detected);
        assert.equal(detected, expected);
    }
});
