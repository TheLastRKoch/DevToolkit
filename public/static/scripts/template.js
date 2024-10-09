// Add event listener for the Execute button
document.getElementById('textbox').addEventListener('keypress', function() {
    alert('Execute button clicked!');
    // Add your execution logic here
});

// Set the current year in the footer
document.getElementById('currentYear').textContent = new Date().getFullYear();