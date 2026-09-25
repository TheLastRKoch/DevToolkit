const express = require('express');
const path = require('path');

const app = express();
const PORT = 8080;
const TOKEN_PATTERN = /@\[([a-zA-Z0-9_-]+)\]/g;
const sessions = new Map();
let nextSessionId = 1;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function newVariables() {
    return Object.create(null);
}

function createSession() {
    const id = nextSessionId++;
    sessions.set(id, { id, title: 'Devtoolkit', text: '', variables: newVariables() });
    return sessions.get(id);
}

function getSession(id) {
    if (!Number.isSafeInteger(id) || id < 1) {
        return null;
    }
    if (!sessions.has(id)) {
        sessions.set(id, { id, title: 'Devtoolkit', text: '', variables: newVariables() });
    }
    return sessions.get(id);
}

function extractTokens(text) {
    const tokens = [];
    const seen = new Set();
    for (const match of text.matchAll(TOKEN_PATTERN)) {
        const token = match[1];
        if (!seen.has(token)) {
            seen.add(token);
            tokens.push(token);
        }
    }
    return tokens;
}

function syncVariables(session) {
    for (const token of extractTokens(session.text)) {
        if (!Object.prototype.hasOwnProperty.call(session.variables, token)) {
            session.variables[token] = '';
        }
    }
}

function render(session) {
    return session.text.replace(TOKEN_PATTERN, (rawToken, token) => {
        const value = session.variables[token];
        return value ? value : rawToken;
    });
}

function serializeSession(session) {
    const all = Object.entries(session.variables).map(([key, value]) => ({ key, value }));
    return {
        id: session.id,
        title: session.title,
        text: session.text,
        variables: all,
        filledVariables: all.filter((variable) => variable.value !== ''),
        emptyVariables: all.filter((variable) => variable.value === ''),
        rendered: render(session),
    };
}

function parseSessionId(value) {
    if (!/^[1-9][0-9]*$/.test(value)) {
        return null;
    }
    const id = Number(value);
    return Number.isSafeInteger(id) ? id : null;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/template', (req, res) => {
    if (!sessions.has(1)) {
        getSession(1);
        nextSessionId = Math.max(nextSessionId, 2);
    }
    res.redirect('/template/1');
});

app.get('/template/:sessionId', (req, res) => {
    const id = parseSessionId(req.params.sessionId);
    if (id === null) {
        return res.status(400).send('Invalid template session id');
    }
    getSession(id);
    return res.sendFile(path.join(__dirname, 'public', 'template.html'));
});

app.get('/editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'editor.html'));
});

app.post('/api/template/sessions', (req, res) => {
    const session = createSession();
    res.status(201).json({ id: session.id, path: `/template/${session.id}` });
});

app.get('/api/template/:sessionId', (req, res) => {
    const id = parseSessionId(req.params.sessionId);
    const session = id === null ? null : getSession(id);
    if (!session) {
        return res.status(400).json({ error: 'Invalid template session id' });
    }
    return res.json(serializeSession(session));
});

app.patch('/api/template/:sessionId', (req, res) => {
    const id = parseSessionId(req.params.sessionId);
    const session = id === null ? null : getSession(id);
    if (!session) {
        return res.status(400).json({ error: 'Invalid template session id' });
    }
    if (typeof req.body.text === 'string') {
        session.text = req.body.text;
    }
    if (req.body.syncVariables === true) {
        syncVariables(session);
    }
    if (typeof req.body.title === 'string') {
        session.title = req.body.title;
    }
    return res.json(serializeSession(session));
});

app.put('/api/template/:sessionId/variables/:variable', (req, res) => {
    const id = parseSessionId(req.params.sessionId);
    const variable = req.params.variable;
    const session = id === null ? null : getSession(id);
    if (!session || !/^[a-zA-Z0-9_-]+$/.test(variable)) {
        return res.status(400).json({ error: 'Invalid template variable' });
    }
    if (typeof req.body.value !== 'string') {
        return res.status(400).json({ error: 'Variable value must be a string' });
    }
    session.variables[variable] = req.body.value;
    return res.json(serializeSession(session));
});

app.delete('/api/template/:sessionId/variables/:variable', (req, res) => {
    const id = parseSessionId(req.params.sessionId);
    const session = id === null ? null : getSession(id);
    if (!session || !/^[a-zA-Z0-9_-]+$/.test(req.params.variable)) {
        return res.status(400).json({ error: 'Invalid template variable' });
    }
    delete session.variables[req.params.variable];
    return res.json(serializeSession(session));
});

app.post('/api/template/:sessionId/clear-variables', (req, res) => {
    const id = parseSessionId(req.params.sessionId);
    const session = id === null ? null : getSession(id);
    if (!session) {
        return res.status(400).json({ error: 'Invalid template session id' });
    }
    session.variables = newVariables();
    return res.json(serializeSession(session));
});

app.post('/api/template/:sessionId/clear-all', (req, res) => {
    const id = parseSessionId(req.params.sessionId);
    const session = id === null ? null : getSession(id);
    if (!session) {
        return res.status(400).json({ error: 'Invalid template session id' });
    }
    session.text = '';
    session.variables = newVariables();
    return res.json(serializeSession(session));
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running at http://localhost:${PORT}`);
    });
}

module.exports = { app, extractTokens, render, sessions };
