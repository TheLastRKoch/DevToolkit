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
    const MAX_PARSE = 1000000;
    const MAX_SIGNALS = 3;

    const LANGUAGES = [
        { id: 'plaintext', label: 'Plain Text' },
        { id: 'javascript', label: 'JavaScript' },
        { id: 'typescript', label: 'TypeScript' },
        { id: 'json', label: 'JSON' },
        { id: 'html', label: 'HTML' },
        { id: 'css', label: 'CSS' },
        { id: 'markdown', label: 'Markdown' },
        { id: 'python', label: 'Python' },
        { id: 'sql', label: 'SQL' },
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

    function looksLikeJson(trimmed) {
        if (trimmed[0] !== '{' && trimmed[0] !== '[') {
            return false;
        }
        const last = trimmed[trimmed.length - 1];
        if (last !== '}' && last !== ']') {
            return false;
        }
        if (trimmed.length <= MAX_PARSE) {
            try {
                JSON.parse(trimmed);
                return true;
            } catch (error) {
                return false;
            }
        }
        return /"[^"]+"\s*:/.test(trimmed);
    }

    function looksLikeMarkup(sample, trimmed) {
        if (trimmed[0] !== '<') {
            return false;
        }
        if (!/<\/?[a-zA-Z][\w:-]*(\s[^<>]*)?\/?>/.test(sample)) {
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

    const CSS_KEYWORDS = /\b(interface|type|enum|namespace|const|let|var|function|class|extends|implements|import|export|return|async|await)\b/;
    const CSS_PROPERTIES = /\b(color|margin|padding|display|background|font|width|height|border|position|flex|grid|gap|align|justify|overflow|opacity|z-index|transform|transition|box-shadow|text-align|line-height|max-width|min-width|max-height|min-height|top|left|right|bottom|cursor|content)\s*:/;

    function looksLikeCss(sample) {
        if (CSS_KEYWORDS.test(sample)) {
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
     * `plaintext` when nothing matches.
     */
    function detectLanguage(text) {
        if (typeof text !== 'string' || text.trim() === '') {
            return 'plaintext';
        }
        const sample = text.slice(0, MAX_SCAN);
        const trimmed = sample.trim();

        if (looksLikeJson(text.trim())) {
            return 'json';
        }

        const markup = looksLikeMarkup(sample, trimmed);
        if (markup) {
            return markup;
        }

        if (looksLikeCss(sample)) {
            return 'css';
        }

        if (looksLikeMarkdown(sample)) {
            return 'markdown';
        }

        if (looksLikeSql(trimmed)) {
            return 'sql';
        }

        if (looksLikePython(sample)) {
            return 'python';
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
