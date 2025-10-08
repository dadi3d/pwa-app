import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';

export default function SetBezeichnungen() {
    const [sets, setSets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');

    useEffect(() => {
        loadSetNames();
        // eslint-disable-next-line
    }, []);

    async function loadSetNames() {
        setLoading(true);
        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`);
        const data = await res.json();
        // Sortiere nach deutschem Namen
        data.sort((a, b) => a.name.de.localeCompare(b.name.de, 'de', { sensitivity: 'base' }));
        setSets(data);
        setLoading(false);
    }

    async function addSetName(e) {
        e.preventDefault();
        const name = newName.trim();
        if (!name) return;

        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: { de: name } })
        });

        if (res.status === 409) {
            alert('Diese Bezeichnung existiert bereits.');
            return;
        }
        if (!res.ok) {
            alert('Fehler beim Speichern.');
            return;
        }
        setNewName('');
        loadSetNames();
    }

    async function updateSetName(id, currentValue) {
        const newNameInput = prompt('Neue Set-Bezeichnung:', currentValue);
        if (newNameInput === null) return;
        const trimmed = newNameInput.trim();
        if (!trimmed) {
            alert('Name darf nicht leer sein.');
            return;
        }

        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: { de: trimmed } })
        });

        if (res.status === 409) {
            alert('Diese Bezeichnung existiert bereits.');
            return;
        }
        if (!res.ok) {
            alert('Fehler beim Aktualisieren.');
            return;
        }
        loadSetNames();
    }

    async function deleteSetName(id, val) {
        const check = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names/${id}/check-usage`);
        const result = await check.json();

        if (result.used) {
            let msg = 'Diese Set-Bezeichnung wird in folgenden Produkten verwendet:\n\n';
            msg += result.products.map(p =>
                `• ${val} Hersteller: ${p.manufacturer?.name || '-'} – Set-Nr: ${p.set ?? '-'}`
            ).join('\n');
            alert(msg + '\n\nLöschen nicht möglich.');
            return;
        }

        if (!window.confirm('Wirklich löschen?')) return;

        await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names/${id}`, { method: 'DELETE' });
        loadSetNames();
    }

    return (
        <div>
            <h2>Set-Bezeichnungen</h2>
            <form onSubmit={addSetName}>
                <input
                    id="newSetName"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Neue Set-Bezeichnung"
                />
                <button type="submit">Hinzufügen</button>
            </form>
            {loading ? (
                <p>Lade...</p>
            ) : (
                <ul id="setNameList">
                    {sets.map(set => (
                        <li key={set._id}>
                            <input
                                value={set.name.de}
                                readOnly
                                id={`input-${set._id}`}
                                style={{ marginRight: 8 }}
                            />
                            <button onClick={() => updateSetName(set._id, set.name.de)}>Bearbeiten</button>
                            <button onClick={() => deleteSetName(set._id, set.name.de)}>Löschen</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}