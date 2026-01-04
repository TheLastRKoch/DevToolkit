const express = require('express');
const path = require('path');

const app = express();
const PORT = 9000;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/template', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'template.html'));
});

app.get('/text-editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'text_editor.html'));
});

app.get('/code-editor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'code_editor.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});