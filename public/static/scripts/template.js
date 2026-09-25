(function () {
    const sessionId = window.location.pathname.match(/^\/template\/([1-9][0-9]*)$/)?.[1];
    if (!sessionId) {
        return;
    }

    const input = document.getElementById('txtInput');
    const output = document.getElementById('txtOutput');
    const title = document.getElementById('titleInput');
    const variablesPanel = document.getElementById('variablesPanel');
    const variablesError = document.getElementById('variablesError');
    const templateTab = document.getElementById('templateTab');
    const variablesTab = document.getElementById('variablesTab');
    const templatePanel = document.getElementById('templatePanel');
    let dirty = false;
    let state;

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

    function renderVariables() {
        const fields = variablesPanel.firstElementChild;
        fields.replaceChildren();
        state.variables.forEach((variable) => {
            const wrapper = document.createElement('div');
            const label = document.createElement('label');
            label.className = 'form-label small mb-1';
            label.textContent = `@[${variable.key}]`;
            label.htmlFor = `variable-${variable.key}`;
            const field = document.createElement('input');
            field.className = 'form-control form-control-sm';
            field.id = `variable-${variable.key}`;
            field.type = 'text';
            field.value = variable.value;
            field.addEventListener('input', async () => {
                markDirty();
                state = await request(`/api/template/${sessionId}/variables/${encodeURIComponent(variable.key)}`, {
                    method: 'PUT',
                    body: JSON.stringify({ value: field.value }),
                });
                render();
            });
            wrapper.append(label, field);
            fields.append(wrapper);
        });
    }

    function render() {
        input.value = state.text;
        title.value = state.title;
        output.value = state.rendered;
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

    input.addEventListener('input', async () => {
        markDirty();
        state = await request(`/api/template/${sessionId}`, {
            method: 'PATCH',
            body: JSON.stringify({ text: input.value }),
        });
        render();
    });

    templateTab.addEventListener('click', () => {
        selectTab('template');
    });

    variablesTab.addEventListener('click', async () => {
        if (variablesTab.classList.contains('active')) {
            return;
        }
        clearVariablesError();
        try {
            state = await request(`/api/template/${sessionId}`, {
                method: 'PATCH',
                body: JSON.stringify({ syncVariables: true }),
            });
            render();
            selectTab('variables');
        } catch (error) {
            showVariablesError(error);
        }
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
        state = await request(`/api/template/${sessionId}/clear-variables`, { method: 'POST' });
        render();
    });

    document.getElementById('btnClearAll').addEventListener('click', async () => {
        markDirty();
        state = await request(`/api/template/${sessionId}/clear-all`, { method: 'POST' });
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
