function mapClassName(className) {
    switch (className) {
        case 'klasaI': return 'Klasa 1';
        case 'klasaII': return 'Klasa 2';
        case 'klasaIII': return 'Klasa 3';
        case 'klasaIV': return 'Klasa 4';
        default: return className;
    }
}

function mapScopeName(scopeName) {
    switch (scopeName) {
        case 'podstawa': return 'Podstawowy';
        case 'rozszerzenie': return 'Rozszerzenie';
        default: return scopeName;
    }
}

async function fetchFiles() {
    const noteTable = document.getElementById('noteTable');

    try {
        const response = await fetch('/api/files');
        const data = await response.json();

        if (data.success) {
            noteTable.innerHTML = '';

            data.scopes.forEach(scope => {
                scope.classes.forEach(classObj => {
                    classObj.files.forEach(file => {
                        const filePath = `/files/${scope.scopeName}/${classObj.className}/${file.name}`;
                        const fileName = `${file.name}`;
                        const lastModified = new Date(file.lastModified).toLocaleDateString();

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><a class="note-link" href="${filePath}" target="_blank">${file.name}</a></td> <!-- Zmiana: 'file.name' -->
                            <td>${mapClassName(classObj.className)}</td>
                            <td>${mapScopeName(scope.scopeName)}</td>
                            <td>${lastModified}</td>
                            <td>
                                <button class="delete-btn" data-file-path="${filePath}" data-file-name="${fileName}">Usuń</button>
                            </td>
                        `;
                        noteTable.appendChild(row);
                    });
                });
            });

            document.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const filePath = this.getAttribute('data-file-path');
                    const fileName = this.getAttribute('data-file-name');
                    openDeleteModal(filePath, fileName);
                });
            });
        } else {
            console.error('Błąd pobierania plików:', data.message);
        }
    } catch (error) {
        console.error('Błąd:', error);
    }
}

function openDeleteModal(filePath,fileName) {
    const deleteModal = document.getElementById('deleteModal');
    const fileNameToDelete = document.getElementById('fileNameToDelete');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const adminPanel = document.querySelector('.admin-panel');

    fileNameToDelete.textContent = `Plik: ${fileName}`;
    deleteModal.style.display = 'flex';
    adminPanel.classList.add('blur');

    confirmDeleteBtn.onclick = function() {
        deleteFile(filePath);
    };
}

function deleteFile(filePath) {
    fetch(`/admin-panel/delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Plik został usunięty!');
            window.location.reload();
        } else {
            alert('Błąd przy usuwaniu pliku!');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}
async function fetchUsername() {
    try {
        const response = await fetch('/admin-panel/user-info', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.displayname) {
            const footer = document.querySelector('.author');
            footer.textContent = `Zalogowano jako: ${data.displayname}`;
        }
    } catch (error) {
        console.error('Błąd podczas pobierania danych użytkownika:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    fetchUsername();
    fetchFiles();
    const logoutBtn = document.getElementById('logoutBtn');
    const addNoteBtn = document.getElementById('addNoteBtn');
    const noteModal = document.getElementById('noteModal');
    const closeModal = document.getElementById('closeModal');
    const noteForm = document.getElementById('noteForm');
    const classSelect = document.getElementById('classSelect');
    const scopeSelect = document.getElementById('scopeSelect');
    const adminPanel = document.querySelector('.admin-panel');

    logoutBtn.addEventListener('click', function() {
        window.location.href = '/logout';
    });

    addNoteBtn.addEventListener('click', function() {
        noteModal.style.display = 'flex';
        adminPanel.classList.add('blur');
    });

    closeModal.addEventListener('click', function() {
        noteModal.style.display = 'none';
        adminPanel.classList.remove('blur');
    });

    window.onclick = function(event) {
        if (event.target === noteModal) {
            noteModal.style.display = 'none';
            adminPanel.classList.remove('blur');
        }
    };

    classSelect.addEventListener('change', function() {
        if (classSelect.value === 'IV') {
            scopeSelect.value = 'Rozszerzony';
            scopeSelect.disabled = true;
        } else {
            scopeSelect.disabled = false;
        }
    });

    noteForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(noteForm);
        fetch('/admin-panel/upload', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Notatka dodana pomyślnie!');
                window.location.reload();
            } else {
                alert('Błąd przy dodawaniu notatki!');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    document.getElementById('closeDeleteModal').addEventListener('click', function() {
        const deleteModal = document.getElementById('deleteModal');
        deleteModal.style.display = 'none';
        document.querySelector('.admin-panel').classList.remove('blur');
    });

    document.getElementById('cancelDeleteBtn').addEventListener('click', function() {
        const deleteModal = document.getElementById('deleteModal');
        deleteModal.style.display = 'none';
        document.querySelector('.admin-panel').classList.remove('blur');
    });
});
