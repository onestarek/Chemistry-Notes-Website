document.querySelector('.login-btn').addEventListener('click', () => {
    document.getElementById('login-modal').style.display = 'flex';
    document.querySelector('.container').classList.add('blurred');
});

document.querySelector('.close-btn').addEventListener('click', closeModal);
document.getElementById('login-modal').addEventListener('click', function(event) {
    if (event.target === this) {
        closeModal();
    }
});

function closeModal() {
    document.getElementById('login-modal').style.display = 'none';
    document.querySelector('.container').classList.remove('blurred');
    document.getElementById('error-message').style.display = 'none';
}

document.getElementById('login-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            window.location.href = '/admin-panel';
        } else {
            document.getElementById('error-message').style.display = 'block';
            document.getElementById('login-form').reset();
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
});

