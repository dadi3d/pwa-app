import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';

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
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`);
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
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
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
            const check = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories/${id}/check-usage`);
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
            await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories/${id}`, { method: 'DELETE' });
            loadCategories();
        } catch (err) {
            console.error('Fehler beim Löschen der Kategorie:', err);
        }
    }

    return (
        <div>
            <h2>Kategorien</h2>
            <form onSubmit={addCategory} style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    placeholder="Neue Kategorie"
                    id="newCategoryName"
                />
                <button type="submit">Hinzufügen</button>
            </form>
            {loading ? (
                <div>Lade Kategorien...</div>
            ) : (
                <ul id="categoryList">
                    {categories.map(cat => (
                        <li key={cat._id}>
                            <input
                                value={cat.name?.de || ''}
                                readOnly
                                id={`input-${cat._id}`}
                                style={{ marginRight: 8 }}
                            />
                            <button onClick={() => updateCategory(cat._id, cat.name?.de || '')}>Bearbeiten</button>
                            <button onClick={() => deleteCategory(cat._id)}>Löschen</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}