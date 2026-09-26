(function () {
    const sessionId = window.location.pathname.match(/^\/template\/([1-9][0-9]*)$/)?.[1];
    if (!sessionId) {
        return;
    }

    const input = document.getElementById('txtInput');
    const output = document.getElementById('txtOutput');
    const title = document.getElementById('titleInput');
    const variablesPanel = document.getElementById('variablesPanel');
    const txtVariables = document.getElementById('txtVariables');
    const variablesError = document.getElementById('variablesError');
    const templateTab = document.getElementById('templateTab');
    const variablesTab = document.getElementById('variablesTab');
    const templatePanel = document.getElementById('templatePanel');
    const VARIABLE_LINE_PATTERN = /^@\[([a-zA-Z0-9_-]+)\]=(.*)$/;
    let dirty = false;
    let state;
    let syncPromise = Promise.resolve();

    async function request(url, options) {
        const response = await fetch(url, {
            headers: { 'Content-Type': 'application/json' },
            ...options,
        });
        if (!response.ok) {
            throw new Error(await response.text());
        }
        return response.json();
    }

    function markDirty() {
        dirty = true;
    }

    function showVariablesError(error) {
        variablesError.textContent = `Unable to synchronize variables: ${error.message}`;
        variablesError.hidden = false;
    }

    function clearVariablesError() {
        variablesError.textContent = '';
        variablesError.hidden = true;
    }

    function serializeVariables(variables) {
        if (!variables) {
            return '';
        }
        const list = Array.isArray(variables)
            ? variables
            : Object.entries(variables).map(([key, value]) => ({ key, value }));
        return list.map((v) => `@[${v.key}]=${v.value ?? ''}`).join('\n');
    }

    function parseVariables(text) {
        const variables = Object.create(null);
        if (!text) {
            return variables;
        }
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
            const match = line.match(VARIABLE_LINE_PATTERN);
            if (match) {
                variables[match[1]] = match[2];
            }
        }
        return variables;
    }

    function renderVariables() {
        if (!txtVariables) {
            return;
        }
        txtVariables.value = serializeVariables(state?.variables);
    }

    function render() {
        input.value = state.text;
        title.value = state.title;
        document.title = state.title || 'Devtoolkit';
        renderVariables();
    }

    function selectTab(tab) {
        const showVariables = tab === 'variables';
        templateTab.classList.toggle('active', !showVariables);
        variablesTab.classList.toggle('active', showVariables);
        templateTab.setAttribute('aria-selected', String(!showVariables));
        variablesTab.setAttribute('aria-selected', String(showVariables));
        templatePanel.hidden = showVariables;
        variablesPanel.hidden = !showVariables;
    }

    input.addEventListener('input', () => {
        markDirty();
    });

    input.addEventListener('blur', async () => {
        markDirty();
        clearVariablesError();
        try {
            syncPromise = request(`/api/template/${sessionId}`, {
                method: 'PATCH',
                body: JSON.stringify({ text: input.value, syncVariables: true }),
            });
            state = await syncPromise;
            renderVariables();
        } catch (error) {
            showVariablesError(error);
        }
    });

    txtVariables.addEventListener('input', () => {
        markDirty();
    });

    txtVariables.addEventListener('blur', async () => {
        markDirty();
        clearVariablesError();
        const parsed = parseVariables(txtVariables.value);
        try {
            syncPromise = request(`/api/template/${sessionId}`, {
                method: 'PATCH',
                body: JSON.stringify({ variables: parsed }),
            });
            state = await syncPromise;
            renderVariables();
        } catch (error) {
            showVariablesError(error);
        }
    });

    output.addEventListener('focus', async () => {
        try {
            await syncPromise;
            state = await request(`/api/template/${sessionId}`);
            output.value = state.rendered;
        } catch (error) {
            if (state && typeof state.rendered === 'string') {
                output.value = state.rendered;
            } else {
                output.value = `Unable to render template: ${error.message}`;
            }
        }
    });

    templateTab.addEventListener('click', () => {
        selectTab('template');
    });

    variablesTab.addEventListener('click', () => {
        if (variablesTab.classList.contains('active')) {
            return;
        }
        clearVariablesError();
        selectTab('variables');
    });

    title.addEventListener('input', async () => {
        markDirty();
        state = await request(`/api/template/${sessionId}`, {
            method: 'PATCH',
            body: JSON.stringify({ title: title.value }),
        });
        document.title = title.value || 'Devtoolkit';
    });

    document.getElementById('btnClearVariables').addEventListener('click', async () => {
        markDirty();
        await syncPromise;
        state = await request(`/api/template/${sessionId}/clear-variables`, { method: 'POST' });
        render();
    });

    document.getElementById('btnClearAll').addEventListener('click', async () => {
        markDirty();
        await syncPromise;
        state = await request(`/api/template/${sessionId}/clear-all`, { method: 'POST' });
        output.value = '';
        render();
    });

    document.getElementById('btnNewSession').addEventListener('click', async () => {
        const newSession = await request('/api/template/sessions', { method: 'POST' });
        window.open(newSession.path, '_blank', 'noopener');
    });

    window.addEventListener('beforeunload', (event) => {
        if (dirty) {
            event.preventDefault();
            event.returnValue = '';
        }
    });

    document.getElementById('currentYear').textContent = new Date().getFullYear();
    request(`/api/template/${sessionId}`).then((loadedState) => {
        state = loadedState;
        render();
    }).catch((error) => {
        output.value = `Unable to load session: ${error.message}`;
    });
}());
