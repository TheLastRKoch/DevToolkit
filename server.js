const express = require('express');
const path = require('path');

const app = express();
const PORT = 9000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint to render the HTML file
app.get('/template', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'template.html'));
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});