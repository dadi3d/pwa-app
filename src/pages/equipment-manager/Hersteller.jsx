import React, { useState, useEffect } from "react";
import { MAIN_VARIABLES } from "../../config";
import { authenticatedFetch } from "../services/auth";

const API_URL = `${MAIN_VARIABLES.SERVER_URL}/api/brands`;

const HerstellerManager = () => {
    const [brands, setBrands] = useState([]);
    const [newBrand, setNewBrand] = useState("");
    const [editId, setEditId] = useState(null);
    const [editName, setEditName] = useState("");
    const [error, setError] = useState("");

    // Alle Hersteller laden
    const loadBrands = async () => {
    try {
        const response = await authenticatedFetch(API_URL);
        if (!response.ok) throw new Error("Fehler beim Laden der Hersteller");
        const data = await response.json();
        // Alphabetisch nach name sortieren
        data.sort((a, b) => a.name.localeCompare(b.name, "de", { sensitivity: "base" }));
        setBrands(data);
    } catch (error) {
        setBrands([]);
        setError(error.message);
    }
};

    // Neuen Hersteller hinzufügen
    const addBrand = async () => {
        if (!newBrand.trim()) return;
        try {
            const response = await authenticatedFetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ name: newBrand.trim() }),
            });
            if (response.status === 409) {
                setError("Hersteller existiert bereits");
                return;
            }
            if (!response.ok) throw new Error("Fehler beim Hinzufügen");
            setNewBrand("");
            setError("");
            loadBrands();
        } catch (error) {
            setError(error.message);
        }
    };

    // Hersteller aktualisieren
    const updateBrand = async (id) => {
        if (!editName.trim()) return;
        try {
            const response = await authenticatedFetch(`${API_URL}/${id}`, {
                method: "PUT",
                body: JSON.stringify({ name: editName.trim() }),
            });
            if (response.status === 409) {
                setError("Hersteller existiert bereits");
                return;
            }
            if (!response.ok) throw new Error("Fehler beim Aktualisieren");
            setEditId(null);
            setEditName("");
            setError("");
            loadBrands();
        } catch (error) {
            setError(error.message);
        }
    };

    // Hersteller löschen
    const deleteBrand = async (id) => {
        if (!window.confirm("Soll der Hersteller wirklich gelöscht werden?")) return;
        try {
            const response = await authenticatedFetch(`${API_URL}/${id}`, { method: "DELETE" });
            if (response.status === 409) {
                setError("Hersteller wird noch verwendet und kann nicht gelöscht werden.");
                return;
            }
            if (!response.ok) throw new Error("Fehler beim Löschen");
            setError("");
            loadBrands();
        } catch (error) {
            setError("Fehler beim Löschen");
        }
    };

    useEffect(() => {
        loadBrands();
    }, []);

    return (
        <div style={{ fontFamily: "sans-serif", margin: "2rem" }}>
            <h1>Hersteller verwalten</h1>
            <div>
                <input
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                    placeholder="Neuer Hersteller"
                    style={{ marginRight: "1rem" }}
                />
                <button onClick={addBrand}>Hinzufügen</button>
            </div>
            {error && <div style={{ color: "red" }}>{error}</div>}
            <div style={{ marginTop: "2rem" }}>
                <button onClick={loadBrands}>Refresh Data</button>
                <ul>
                    {brands.map(({ _id, name }) => (
                        <li key={_id}>
                            {editId === _id ? (
                                <>
                                    <input
                                        value={editName}
                                        onChange={e => setEditName(e.target.value)}
                                        style={{ marginRight: "0.5rem" }}
                                    />
                                    <button onClick={() => updateBrand(_id)}>Speichern</button>
                                    <button onClick={() => { setEditId(null); setEditName(""); }}>Abbrechen</button>
                                </>
                            ) : (
                                <>
                                    {name}
                                    <button style={{ marginLeft: "1rem" }} onClick={() => { setEditId(_id); setEditName(name); }}>Bearbeiten</button>
                                    <button style={{ marginLeft: "0.5rem" }} onClick={() => deleteBrand(_id)}>Löschen</button>
                                </>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default HerstellerManager;