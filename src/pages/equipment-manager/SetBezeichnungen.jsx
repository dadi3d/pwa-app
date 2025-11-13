import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';
import { authenticatedFetch } from '../services/auth';
import { Button } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

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
        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`);
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

        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`, {
            method: 'POST',
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

        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names/${id}`, {
            method: 'PUT',
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
        const check = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names/${id}/check-usage`);
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

        await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names/${id}`, { method: 'DELETE' });
        loadSetNames();
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Set-Bezeichnungen verwalten</h1>
                    
                    {/* Add new set name form */}
                    <form onSubmit={addSetName} className="flex gap-3 items-center">
                        <input
                            id="newSetName"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            placeholder="Neue Set-Bezeichnung"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <Button 
                            type="submit"
                            className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Hinzufügen
                        </Button>
                    </form>
                </div>

                {/* Set names list */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Vorhandene Set-Bezeichnungen ({sets.length})
                        </h2>
                        
                        {loading ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">Lade...</p>
                            </div>
                        ) : sets.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                Keine Set-Bezeichnungen vorhanden
                            </p>
                        ) : (
                            <div className="space-y-3" id="setNameList">
                                {sets.map(set => (
                                    <div key={set._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <span className="text-lg font-medium text-gray-900">{set.name.de}</span>
                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={() => updateSetName(set._id, set.name.de)}
                                                className="bg-orange-500 hover:bg-orange-600 text-black p-2 rounded-md transition-colors"
                                                title="Bearbeiten"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                onClick={() => deleteSetName(set._id, set.name.de)}
                                                className="bg-red-500 hover:bg-red-600 text-black p-2 rounded-md transition-colors"
                                                title="Löschen"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}