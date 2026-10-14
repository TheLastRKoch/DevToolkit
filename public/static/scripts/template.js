(function () {
    const sessionId = window.location.pathname.match(/^\/template\/([1-9][0-9]*)$/)?.[1];
    if (!sessionId) {
        return;
    }

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

    const store = DevToolkitSessions.openStore('template', DevToolkitSessions.browserStorage(), {
        onWriteError: () => {
            if (header) {
                header.warn('Changes will not be persisted in this browser.');
            }
        },
    });
    const session = store.ensure(sessionId, { text: '', variables: {} });
    let variables = readVariables(session.data.variables);

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

    function persist(patch) {
        dirty = true;
        store.save(sessionId, patch);
        dirty = !store.isPersisted();
    }

    function persistTemplate() {
        persist({ data: { text: input.value, variables: snapshotVariables() } });
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

    function newSession() {
        const id = store.allocateId();
        window.open(`/template/${id}`, '_blank', 'noopener');
    }

    function clearVariables() {
        variables = readVariables({});
        renderVariables();
        persistTemplate();
    }

    function clearAll() {
        variables = readVariables({});
        input.value = '';
        output.value = '';
        renderVariables();
        persistTemplate();
    }

    header = DevToolkitPageHeader.init({
        mount: document.getElementById('pageHeader'),
        breadcrumb: [{ label: 'Home', href: '/' }, { label: 'Template' }],
        pageName: session.name,
        persisted: store.isPersisted(),
        onPageNameChange: (name) => persist({ name }),
        options: [
            { id: 'new-session', label: 'New session', run: newSession },
            { id: 'clear-variables', label: 'Clear variables', run: clearVariables },
            { id: 'clear-all', label: 'Clear all', run: clearAll },
        ],
    });

    input.value = session.data.text || '';
    renderVariables();

    input.addEventListener('input', () => {
        persistTemplate();
    });

    input.addEventListener('blur', () => {
        syncTokens();
        renderVariables();
        persistTemplate();
    });

    txtVariables.addEventListener('input', () => {
        variables = parseVariables(txtVariables.value);
        persistTemplate();
    });

    txtVariables.addEventListener('blur', () => {
        variables = parseVariables(txtVariables.value);
        renderVariables();
        persistTemplate();
    });

    output.addEventListener('focus', () => {
        renderOutput();
    });

    templateTab.addEventListener('click', () => {
        selectTab('template');
    });

    variablesTab.addEventListener('click', () => {
        if (variablesTab.classList.contains('active')) {
            return;
        }
        syncTokens();
        renderVariables();
        persistTemplate();
        selectTab('variables');
    });

    window.addEventListener('beforeunload', (event) => {
        if (!dirty) {
            return;
        }
        event.preventDefault();
        event.returnValue = '';
    });

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }
}());
