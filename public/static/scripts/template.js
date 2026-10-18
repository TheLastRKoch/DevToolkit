/**
 * Template page – DevToolkit
 *
 * The page owns one browser-side session (`devtoolkit:sessions:template`) holding
 * the template text and its variable values. Nothing is written to storage until
 * the user provides a valid title; the session then keeps the last three content
 * snapshots, recorded when the user navigates away from the page.
 */
(function () {
    const input = document.getElementById('txtInput');
    const output = document.getElementById('txtOutput');
    const variablesPanel = document.getElementById('variablesPanel');
    const txtVariables = document.getElementById('txtVariables');
    const templateTab = document.getElementById('templateTab');
    const variablesTab = document.getElementById('variablesTab');
    const templatePanel = document.getElementById('templatePanel');
    const currentYear = document.getElementById('currentYear');
    const VARIABLE_LINE_PATTERN = /^@\[([a-zA-Z0-9_-]+)\]=(.*)$/;
    const VARIABLE_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
    const TOKEN_PATTERN = /@\[([a-zA-Z0-9_-]+)\]/g;

    let header = null;
    let dirty = false;
    let variables = Object.create(null);

    const store = DevToolkitSessions.openStore('template', DevToolkitSessions.browserStorage(), {
        onWriteError: () => {
            if (header) {
                header.warn('Changes will not be persisted in this browser.');
            }
        },
    });
    const session = store.get();
    const stored = store.content();

    function readVariables(source) {
        const map = Object.create(null);
        if (source && typeof source === 'object') {
            for (const [key, value] of Object.entries(source)) {
                if (VARIABLE_NAME_PATTERN.test(key) && typeof value === 'string') {
                    Object.defineProperty(map, key, { value, enumerable: true, writable: true, configurable: true });
                }
            }
        }
        return map;
    }

    function snapshotVariables() {
        const plain = {};
        for (const [key, value] of Object.entries(variables)) {
            Object.defineProperty(plain, key, { value, enumerable: true, writable: true, configurable: true });
        }
        return plain;
    }

    function serializeVariables() {
        return Object.entries(variables).map(([key, value]) => `@[${key}]=${value}`).join('\n');
    }

    function parseVariables(text) {
        const parsed = Object.create(null);
        if (!text) {
            return parsed;
        }
        for (const line of text.split(/\r?\n/)) {
            const match = line.match(VARIABLE_LINE_PATTERN);
            if (match) {
                Object.defineProperty(parsed, match[1], {
                    value: match[2],
                    enumerable: true,
                    writable: true,
                    configurable: true,
                });
            }
        }
        return parsed;
    }

    function detectTokens(text) {
        const tokens = [];
        const seen = new Set();
        for (const match of text.matchAll(TOKEN_PATTERN)) {
            if (!seen.has(match[1])) {
                seen.add(match[1]);
                tokens.push(match[1]);
            }
        }
        return tokens;
    }

    function syncTokens() {
        for (const token of detectTokens(input.value)) {
            if (!Object.prototype.hasOwnProperty.call(variables, token)) {
                Object.defineProperty(variables, token, {
                    value: '',
                    enumerable: true,
                    writable: true,
                    configurable: true,
                });
            }
        }
    }

    function renderVariables() {
        txtVariables.value = serializeVariables();
    }

    function renderOutput() {
        output.value = input.value.replace(TOKEN_PATTERN, (rawToken, token) => variables[token] || rawToken);
    }

    /** Stages the page's state in the session; a titled session writes through. */
    function persistContent() {
        dirty = true;
        store.save({ content: input.value, variables: snapshotVariables() });
    }

    /** Records the current content as a version when it changed. */
    function snapshot() {
        if (store.isTitled()) {
            store.snapshot();
        }
    }

    function onTitleChange(value) {
        dirty = true;
        store.save({ title: value });
        if (!store.isTitled()) {
            return;
        }
        snapshot();
    }

    function protectUnsavedWork(event) {
        if (store.isTitled()) {
            snapshot();
            if (store.isPersisted()) {
                return;
            }
        } else if (!dirty) {
            return;
        }
        if (event) {
            event.preventDefault();
            event.returnValue = '';
        }
    }

    function selectTab(tab) {
        const showVariables = tab === 'variables';
        templateTab.classList.toggle('active', !showVariables);
        variablesTab.classList.toggle('active', showVariables);
        templateTab.setAttribute('aria-selected', String(!showVariables));
        variablesTab.setAttribute('aria-selected', String(showVariables));
        templatePanel.classList.toggle('active', !showVariables);
        templatePanel.classList.toggle('show', !showVariables);
        variablesPanel.classList.toggle('active', showVariables);
        variablesPanel.classList.toggle('show', showVariables);
        templatePanel.hidden = showVariables;
        variablesPanel.hidden = !showVariables;
    }

    function clearVariables() {
        variables = readVariables({});
        renderVariables();
        persistContent();
        dirty = input.value !== '';
    }

    function clearAll() {
        variables = readVariables({});
        input.value = '';
        output.value = '';
        renderVariables();
        persistContent();
        dirty = false;
    }

    header = DevToolkitPageHeader.initPageHeader({
        mount: document.getElementById('pageHeader'),
        title: session.title,
        persisted: store.isPersisted(),
        onTitleChange,
        options: [
            { id: 'clear-variables', label: 'Clear variables', run: clearVariables },
            { id: 'clear-all', label: 'Clear all', run: clearAll },
        ],
    });

    input.value = stored.content || '';
    variables = readVariables(stored.variables);
    renderVariables();
    output.value = '';

    input.addEventListener('input', persistContent);

    input.addEventListener('blur', () => {
        syncTokens();
        renderVariables();
        persistContent();
    });

    txtVariables.addEventListener('input', () => {
        variables = parseVariables(txtVariables.value);
        persistContent();
    });

    txtVariables.addEventListener('blur', () => {
        variables = parseVariables(txtVariables.value);
        renderVariables();
        persistContent();
    });

    output.addEventListener('focus', renderOutput);

    templateTab.addEventListener('click', () => {
        selectTab('template');
    });

    variablesTab.addEventListener('click', () => {
        if (variablesTab.classList.contains('active')) {
            return;
        }
        syncTokens();
        renderVariables();
        persistContent();
        selectTab('variables');
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            snapshot();
        }
    });

    window.addEventListener('pagehide', snapshot);
    window.addEventListener('beforeunload', protectUnsavedWork);

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }
}());
