async function fetchFiles(className, scopeName) {
    const noteTable = document.getElementById('noteTable');

    try {
        const response = await fetch(`/api/files?class=${className}&scope=${scopeName}`);
        const data = await response.json();

        if (data.success) {
            const scope = data.scopes.find(scope => scope.scopeName === scopeName);

            if (scope) {
                const classData = scope.classes.find(cls => cls.className === className);

                if (classData && Array.isArray(classData.files)) {
                    noteTable.innerHTML = '';

                    if (classData.files.length > 0) {
                        classData.files.forEach(file => {
                            const filePath = `/files/${scopeName}/${className}/${file.name}`;
                            const lastModified = new Date(file.lastModified).toLocaleDateString();
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                <td><a class="note-link" href="${filePath}" target="_blank">${file.name}</a></td>
                                <td>${lastModified}</td>
                                <td>
                                    <a class="download-link" href="${filePath}" download>Pobierz</a>
                                </td>
                            `;
                            noteTable.appendChild(row);
                        });
                    } else {
                        noteTable.innerHTML = '<tr><td colspan="3">Brak dostępnych plików dla tej klasy.</td></tr>';
                    }
                } else {
                    console.error('Błąd pobierania plików: nie znaleziono klasy lub plików.');
                    noteTable.innerHTML = '<tr><td colspan="3">Brak dostępnych plików.</td></tr>';
                }
            } else {
                console.error('Błąd pobierania plików: nie znaleziono zakresu.');
                noteTable.innerHTML = '<tr><td colspan="3">Brak dostępnych plików dla tego zakresu.</td></tr>';
            }
        } else {
            console.error('Błąd pobierania plików:', data.message);
        }
    } catch (error) {
        console.error('Błąd:', error);
        noteTable.innerHTML = '<tr><td colspan="3">Wystąpił błąd podczas pobierania plików.</td></tr>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const wrocBtn = document.getElementById('wrocBtn');
    const adminPanel = document.querySelector('.admin-panel');
    const className = adminPanel.getAttribute('data-class');
    const scopeName = adminPanel.getAttribute('data-scope');

    fetchFiles(className, scopeName);
    wrocBtn.addEventListener('click', function() {
        window.location.href = '/';
    });
});
