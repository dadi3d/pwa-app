import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';
import { authenticatedFetch } from '../services/auth';
import { Button } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function SetKategorien() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    async function loadCategories() {
        setLoading(true);
        try {
            const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`);
            const cats = await res.json();

            cats.sort((a, b) => {
                const aName = a.name?.de || '';
                const bName = b.name?.de || '';
                return aName.localeCompare(bName, 'de', { sensitivity: 'base' });
            });

            setCategories(cats);
        } catch (err) {
            console.error('Fehler beim Laden der Kategorien:', err);
        } finally {
            setLoading(false);
        }
    }

    async function addCategory(e) {
        e.preventDefault();
        const name = newCategory.trim();
        if (!name) {
            alert('Bitte einen Namen eingeben.');
            return;
        }
        try {
            const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`, {
                method: 'POST',
                body: JSON.stringify({ name: { de: name } })
            });
            if (res.status === 409) {
                alert('Diese Kategorie existiert bereits (auch in anderer Schreibweise).');
                return;
            }
            if (!res.ok) {
                alert('Fehler beim Speichern.');
                return;
            }
            setNewCategory('');
            loadCategories();
        } catch (err) {
            console.error('Fehler beim Hinzufügen der Kategorie:', err);
        }
    }

    async function updateCategory(id, currentValue) {
        const newName = prompt('Neuer Kategoriename:', currentValue);
        if (newName === null) return;
        const trimmed = newName.trim();
        if (!trimmed) {
            alert('Name darf nicht leer sein.');
            return;
        }
        try {
            const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name: { de: trimmed } })
            });
            if (res.status === 409) {
                alert('Kategorie existiert bereits (auch mit anderer Schreibweise).');
                return;
            }
            if (!res.ok) {
                alert('Fehler beim Aktualisieren.');
                return;
            }
            loadCategories();
        } catch (err) {
            console.error('Fehler beim Aktualisieren der Kategorie:', err);
        }
    }

    async function deleteCategory(id) {
        try {
            const check = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories/${id}/check-usage`);
            const result = await check.json();
            if (result.used) {
                let msg = 'Diese Kategorie wird in folgenden Produkten verwendet:\n\n';
                msg += result.products.map(p =>
                    `• ${p.set_name?.name || '-'} – Set-Nr: ${p.set_number ?? '-'}`
                ).join('\n');
                alert(msg + '\n\nLöschen nicht möglich.');
                return;
            }
            if (!window.confirm('Wirklich löschen?')) return;
            await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories/${id}`, { method: 'DELETE' });
            loadCategories();
        } catch (err) {
            console.error('Fehler beim Löschen der Kategorie:', err);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Kategorien verwalten</h1>
                    
                    {/* Add new category form */}
                    <form onSubmit={addCategory} className="flex gap-3 items-center">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            placeholder="Neue Kategorie"
                            id="newCategoryName"
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

                {/* Categories list */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Vorhandene Kategorien ({categories.length})
                        </h2>
                        
                        {loading ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500">Lade Kategorien...</p>
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                Keine Kategorien vorhanden
                            </p>
                        ) : (
                            <div className="space-y-3" id="categoryList">
                                {categories.map(cat => (
                                    <div key={cat._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        <span className="text-lg font-medium text-gray-900">{cat.name?.de || ''}</span>
                                        <div className="flex gap-2">
                                            <Button 
                                                onClick={() => updateCategory(cat._id, cat.name?.de || '')}
                                                className="bg-orange-500 hover:bg-orange-600 text-black p-2 rounded-md transition-colors"
                                                title="Bearbeiten"
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                onClick={() => deleteCategory(cat._id)}
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