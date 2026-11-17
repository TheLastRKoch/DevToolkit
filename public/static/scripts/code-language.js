/**
 * Code language detection for the Code Editor page.
 *
 * Heuristic, dependency-free detection over a bounded prefix of the editor
 * content. Loaded as a classic script in the browser (global
 * `DevToolkitCodeLanguage`) and exported for Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.DevToolkitCodeLanguage = api;
    }
}(typeof globalThis === 'object' ? globalThis : this, function () {
    const MAX_SCAN = 20000;
    const MAX_SIGNALS = 3;

    /** Plain Text first, then the supported languages in label order. */
    const LANGUAGES = [
        { id: 'plaintext', label: 'Plain Text' },
        { id: 'c', label: 'C' },
        { id: 'csharp', label: 'C#' },
        { id: 'cpp', label: 'C++' },
        { id: 'css', label: 'CSS' },
        { id: 'go', label: 'Go' },
        { id: 'html', label: 'HTML' },
        { id: 'java', label: 'Java' },
        { id: 'javascript', label: 'JavaScript' },
        { id: 'json', label: 'JSON' },
        { id: 'kotlin', label: 'Kotlin' },
        { id: 'markdown', label: 'Markdown' },
        { id: 'php', label: 'PHP' },
        { id: 'python', label: 'Python' },
        { id: 'ruby', label: 'Ruby' },
        { id: 'rust', label: 'Rust' },
        { id: 'sql', label: 'SQL' },
        { id: 'shell', label: 'Shell' },
        { id: 'swift', label: 'Swift' },
        { id: 'typescript', label: 'TypeScript' },
        { id: 'xml', label: 'XML' },
    ];

    const HTML_TAGS = [
        'html', 'head', 'body', 'div', 'span', 'p', 'a', 'script', 'style',
        'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'form',
        'input', 'button', 'select', 'option', 'textarea', 'img', 'section',
        'article', 'header', 'footer', 'nav', 'main', 'h1', 'h2', 'h3', 'h4',
        'h5', 'h6', 'br', 'hr', 'label', 'meta', 'link', 'title',
    ];

    function byId(id) {
        for (const language of LANGUAGES) {
            if (language.id === id) {
                return language;
            }
        }
        return LANGUAGES[0];
    }

    function labelOf(id) {
        return byId(id).label;
    }

    function countSignals(text, patterns, limit) {
        let count = 0;
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                count += 1;
                if (count >= (limit || MAX_SIGNALS)) {
                    return count;
                }
            }
        }
        return count;
    }

    function looksLikePhp(trimmed) {
        return /^<\?php\b/i.test(trimmed) || /^<\?=/.test(trimmed);
    }

    function looksLikeJson(text, sample) {
        const head = sample.trim();
        if (head[0] !== '{' && head[0] !== '[') {
            return false;
        }
        const tail = text.trimEnd().slice(-1);
        if (tail !== '}' && tail !== ']') {
            return false;
        }
        if (text.length <= MAX_SCAN) {
            try {
                JSON.parse(text.trim());
                return true;
            } catch (error) {
                return false;
            }
        }
        return /"[^"]+"\s*:/.test(head);
    }

    function looksLikeMarkup(trimmed) {
        if (trimmed[0] !== '<') {
            return false;
        }
        if (!/<\/?[a-zA-Z][\w:-]*(\s[^<>]*)?\/?>/.test(trimmed)) {
            return false;
        }
        if (/^<\?xml\b/i.test(trimmed)) {
            return 'xml';
        }
        if (/^<!doctype\s+html\b/i.test(trimmed)) {
            return 'html';
        }
        if (/^<!doctype\b/i.test(trimmed)) {
            return 'xml';
        }
        const root = trimmed.match(/^<([a-zA-Z][\w:-]*)/);
        if (root) {
            const tag = root[1].toLowerCase();
            return HTML_TAGS.includes(tag) ? 'html' : 'xml';
        }
        return 'html';
    }

    const CSS_CODE_MARKERS = /=>|\b(function|const|let|return|interface|require|console|def|fn)\b|\b(import|export)\s+(?!url\()/;
    const CSS_PROPERTIES = /\b(color|margin|padding|display|background|font|width|height|border|position|flex|grid|gap|align|justify|overflow|opacity|z-index|transform|transition|box-shadow|text-align|line-height|max-width|min-width|max-height|min-height|top|left|right|bottom|cursor|content)\s*:/;

    function looksLikeCss(sample) {
        if (CSS_CODE_MARKERS.test(sample)) {
            return false;
        }
        if (!/[^{}<>]+\{[^{}]*:[^{}]*;?[^{}]*\}/.test(sample)) {
            return false;
        }
        return CSS_PROPERTIES.test(sample)
            || /@(media|supports|keyframes|font-face)\b/.test(sample)
            || /(^|\n)\s*[.#][\w-]+\s*(\{|,)/.test(sample)
            || /:root\s*\{/.test(sample);
    }

    function looksLikeMarkdown(sample) {
        const signals = countSignals(sample, [
            /^#{1,6}\s+\S/m,
            /^\s*[-*+]\s+\S/m,
            /^\s*\d+\.\s+\S/m,
            /^```/m,
            /\[[^\]]+\]\([^)]+\)/,
            /(^|\s)(\*\*|__)[^\s*_]+/,
            /^>\s+\S/m,
        ]);
        return signals >= 2;
    }

    function looksLikeShell(trimmed, sample) {
        if (/^#!\s*\S*\b(node|python|ruby|perl)\b/.test(trimmed)) {
            return false;
        }
        if (/^#!\s*(?:\S*\/)?(?:env\s+)?[a-z]*sh\b/.test(trimmed)) {
            return true;
        }
        const signals = countSignals(sample, [
            /^\s*(if|elif|while|for)\b[^\n]*\b(then|do)\b/m,
            /^\s*(fi|done|esac)\s*$/m,
            /\$\{?[A-Za-z_]\w*\}?/,
            /\$\(/,
            /^\s*[A-Za-z_]\w*=/m,
            /\becho\s+/,
            /\bset\s+-[eux]+\b/,
            /\bexit\s+\d+/,
        ]);
        return signals >= 2 && (/\$\{?[A-Za-z_]\w*\}?/.test(sample) || /^\s*[A-Za-z_]\w*=/m.test(sample));
    }

    function looksLikeSql(trimmed) {
        if (!/^\s*(--[^\n]*\n\s*)*(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(trimmed)) {
            return false;
        }
        return /\b(FROM|INTO|SET|TABLE|WHERE|VALUES|JOIN|GROUP\s+BY|ORDER\s+BY)\b/i.test(trimmed);
    }

    function looksLikePython(sample) {
        const signature = countSignals(sample, [
            /^\s*(def|class)\s+\w+.*:\s*$/m,
            /^\s*(import|from)\s+[A-Za-z_][\w.]*\s*(import\s+[A-Za-z_*][\w, ]*)?$/m,
            /^\s*(if|elif|else|for|while|try|except|with)\b[^\n]*:\s*$/m,
            /^\s*print\(/m,
            /f["'][^"']*\{[^}]+\}/,
        ]);
        return signature >= 2 || /^\s*def\s+\w+\(.*\)\s*:/m.test(sample);
    }

    function looksLikeRust(sample) {
        return countSignals(sample, [
            /\bfn\s+[A-Za-z_]\w*\s*[<(]/,
            /\blet\s+mut\b/,
            /\bprintln!\s*\(/,
            /\buse\s+std::/,
            /\bimpl\b/,
            /\bpub\s+(fn|struct|enum)\b/,
            /(->\s*(Self|Option|Result|Vec|String|\())|&str\b/,
        ]) >= 2;
    }

    function looksLikeGo(sample) {
        const hasPackage = /^\s*package\s+\w+/m.test(sample);
        const hasFunc = /\bfunc\s+(\([^)]*\)\s*)?[A-Za-z_]\w*\s*\(/.test(sample);
        if (hasPackage && hasFunc) {
            return true;
        }
        return countSignals(sample, [
            /^\s*package\s+\w+/m,
            /\bfunc\s+(\([^)]*\)\s*)?[A-Za-z_]\w*\s*\(/,
            /\bfmt\.\w+\(/,
            /:=/,
            /^\s*import\s+"/m,
            /\bchan\s+/,
        ]) >= 3;
    }

    function looksLikeRuby(sample) {
        if (!/^\s*end\s*$/m.test(sample)) {
            return false;
        }
        return countSignals(sample, [
            /^\s*def\s+[A-Za-z_]\w*[?!]?\s*(\([^)]*\))?\s*$/m,
            /^\s*require\s+['"]/m,
            /\bputs\s+/,
            /\bdo\s*\|/,
            /\battr_(reader|writer|accessor)\b/,
            /\.each\s+do\b/,
        ]) >= 2;
    }

    function looksLikeKotlin(sample) {
        if (!/\bfun\s+[A-Za-z_]\w*\s*\(/.test(sample)) {
            return false;
        }
        return countSignals(sample, [
            /\bfun\s+[A-Za-z_]\w*\s*\(/,
            /\bval\s+/,
            /\bvar\s+/,
            /\bprintln\s*\(/,
            /\bdata\s+class\b/,
            /\?:/,
            /\blistOf\s*\(/,
            /\bwhen\s*\(/,
        ]) >= 2;
    }

    function looksLikeSwift(sample) {
        if (/\bimport\s+(Foundation|UIKit|SwiftUI)\b/.test(sample)) {
            return true;
        }
        return countSignals(sample, [
            /\bfunc\s+[A-Za-z_]\w*\s*\([^)]*\)\s*->/,
            /\bguard\s+let\b/,
            /\bprint\s*\(/,
            /\blet\s+[A-Za-z_]\w*\s*:/,
            /\bvar\s+[A-Za-z_]\w*\s*:/,
        ]) >= 2;
    }

    function looksLikeCSharp(sample) {
        if (/^\s*using\s+System(\.\w+)*\s*;/m.test(sample)) {
            return true;
        }
        if (/\bConsole\.[A-Za-z]\w*\s*\(/.test(sample)) {
            return true;
        }
        if (/\{\s*(?:get|set)[^}]*;\s*\}/.test(sample)) {
            return true;
        }
        return countSignals(sample, [
            /\bnamespace\s+[A-Za-z_]\w*/,
            /\bpublic\s+(?:class|record|struct|enum|interface)\s+\w+/,
            /\bstring\[\]\s+args\b/,
        ]) >= 2;
    }

    function looksLikeJava(sample) {
        return countSignals(sample, [
            /^\s*import\s+java\./m,
            /\bSystem\.(out|err)\b/,
            /\bpublic\s+static\s+void\s+main\s*\(/,
            /@Override\b/,
            /\b(public|private|protected)\s+static\s+final\b/,
            /\bthrows\s+[A-Z]\w*/,
        ]) >= 2;
    }

    function looksLikeCpp(sample) {
        return countSignals(sample, [
            /#include\s*<(iostream|string|vector|map|memory|algorithm|sstream|utility|cstdio)>/,
            /\bstd::/,
            /\b(cout|cin|cerr)\s*<</,
            /\btemplate\s*</,
            /\busing\s+namespace\s+std\b/,
            /\bnullptr\b/,
            /\bclass\s+\w+\s*:\s*(public|private|protected)\b/,
        ]) >= 2;
    }

    function looksLikeC(sample) {
        return countSignals(sample, [
            /#include\s*<(stdio|stdlib|string|math|time|ctype|errno|assert|stddef|stdint)\.h>/,
            /\bprintf\s*\(/,
            /\bint\s+main\s*\(/,
            /\b(malloc|free|sizeof)\b/,
            /\bstruct\s+\w+\s*\{/,
        ]) >= 2;
    }

    function looksLikeTypeScript(sample) {
        return countSignals(sample, [
            /\binterface\s+[A-Za-z_$][\w$]*\s*(<[^>]*>)?\s*\{/,
            /\btype\s+[A-Za-z_$][\w$]*\s*=/,
            /\b(enum|namespace|declare)\s+[A-Za-z_$][\w$]*/,
            /:\s*(string|number|boolean|any|void|unknown|never|object|bigint|symbol)\b/,
            /\bas\s+(const|[A-Z][\w$]*)\b/,
            /\b(public|private|protected|readonly)\s+[A-Za-z_$][\w$]*\s*[:?]/,
        ], 1) > 0;
    }

    function looksLikeJavaScript(sample) {
        return countSignals(sample, [
            /\bfunction\s*[A-Za-z_$]*\s*\(/,
            /=>/,
            /\b(const|let|var)\s+[A-Za-z_$][\w$]*\s*=/,
            /\bconsole\.\w+\(/,
            /\b(document|window)\.\w+/,
            /\brequire\(['"]/,
            /\bimport\s+.*\bfrom\s+['"]/,
            /\bmodule\.exports\b/,
            /\baddEventListener\(/,
            /^#!.*\bnode\b/,
        ], 1) > 0;
    }

    /**
     * Returns the id of the most likely language for `text`, falling back to
     * `plaintext` when nothing matches. Only the first `MAX_SCAN` characters
     * are scored, so large documents stay cheap to detect.
     */
    function detectLanguage(text) {
        if (typeof text !== 'string' || text.trim() === '') {
            return 'plaintext';
        }
        const sample = text.slice(0, MAX_SCAN);
        const trimmed = sample.trim();

        if (looksLikePhp(trimmed)) {
            return 'php';
        }

        if (looksLikeJson(text, sample)) {
            return 'json';
        }

        const markup = looksLikeMarkup(trimmed);
        if (markup) {
            return markup;
        }

        if (looksLikeCss(sample)) {
            return 'css';
        }

        if (looksLikeMarkdown(sample)) {
            return 'markdown';
        }

        if (looksLikeShell(trimmed, sample)) {
            return 'shell';
        }

        if (looksLikeSql(trimmed)) {
            return 'sql';
        }

        if (looksLikePython(sample)) {
            return 'python';
        }

        if (looksLikeRust(sample)) {
            return 'rust';
        }

        if (looksLikeGo(sample)) {
            return 'go';
        }

        if (looksLikeRuby(sample)) {
            return 'ruby';
        }

        if (looksLikeKotlin(sample)) {
            return 'kotlin';
        }

        if (looksLikeSwift(sample)) {
            return 'swift';
        }

        if (looksLikeCSharp(sample)) {
            return 'csharp';
        }

        if (looksLikeJava(sample)) {
            return 'java';
        }

        if (looksLikeCpp(sample)) {
            return 'cpp';
        }

        if (looksLikeC(sample)) {
            return 'c';
        }

        if (looksLikeTypeScript(sample) && looksLikeJavaScript(sample)) {
            return 'typescript';
        }

        if (looksLikeJavaScript(sample)) {
            return 'javascript';
        }

        return 'plaintext';
    }

    return {
        detectLanguage,
        LANGUAGES,
        MAX_SCAN,
        languageById: byId,
        languageLabel: labelOf,
    };
}));
