import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';

export default function ProduktKategorien() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    async function loadCategories() {
        setLoading(true);
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`);
            const data = await res.json();
            data.sort((a, b) => a.name.localeCompare(b.name, 'de', { sensitivity: 'base' }));
            setCategories(data);
        } catch (err) {
            console.error('Fehler beim Laden der Produkt-Kategorien:', err);
        }
        setLoading(false);
    }

    async function addCategory(e) {
        e.preventDefault();
        const name = newCategory.trim();
        if (!name) {
            alert('Bitte einen Namen eingeben.');
            return;
        }
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (res.status === 409) {
                alert('Diese Produkt-Kategorie existiert bereits (auch in anderer Schreibweise).');
                return;
            }
            if (!res.ok) {
                alert('Fehler beim Speichern.');
                return;
            }
            setNewCategory('');
            loadCategories();
        } catch (err) {
            console.error('Fehler beim Hinzufügen der Produkt-Kategorie:', err);
        }
    }

    async function updateCategory(id, currentName) {
        const newName = prompt('Neuer Produkt-Kategoriename:', currentName);
        if (newName === null) return;
        const trimmed = newName.trim();
        if (!trimmed) {
            alert('Name darf nicht leer sein.');
            return;
        }
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed })
            });
            if (res.status === 409) {
                alert('Produkt-Kategorie existiert bereits (auch mit anderer Schreibweise).');
                return;
            }
            if (!res.ok) {
                alert('Fehler beim Aktualisieren.');
                return;
            }
            loadCategories();
        } catch (err) {
            console.error('Fehler beim Aktualisieren der Produkt-Kategorie:', err);
        }
    }

    async function deleteCategory(id) {
        try {
            const check = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories/${id}/check-usage`);
            const result = await check.json();
            if (result.used) {
                let msg = 'Diese Produkt-Kategorie wird in folgenden Produkten verwendet:\n\n';
                msg += result.products.map(p =>
                    `• ${(p.Type?.name || p.Type || '-')} – Seriennummer: ${p.SerialNumber || '-'}`
                ).join('\n');
                alert(msg + '\n\nLöschen nicht möglich.');
                return;
            }
            if (!window.confirm('Wirklich löschen?')) return;
            await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories/${id}`, { method: 'DELETE' });
            loadCategories();
        } catch (err) {
            console.error('Fehler beim Löschen der Produkt-Kategorie:', err);
        }
    }

    return (
        <div>
            <h2>Produkt-Kategorien</h2>
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
                                value={cat.name}
                                readOnly
                                id={`input-${cat._id}`}
                                style={{ marginRight: 8 }}
                            />
                            <button onClick={() => updateCategory(cat._id, cat.name)}>Bearbeiten</button>
                            <button onClick={() => deleteCategory(cat._id)}>Löschen</button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}