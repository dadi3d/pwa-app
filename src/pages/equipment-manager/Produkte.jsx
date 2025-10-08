import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';
import SetEdit from './SetEdit'; // 1. Import hinzufügen
import ProductEdit from './ProductEdit'; // Import für ProductEdit hinzufügen

export default function SetProdukte() {
    const [selectedSetId, setSelectedSetId] = useState(null); // 2. Modal-State
    const [selectedProductId, setSelectedProductId] = useState(null); // State für ProductEdit Modal
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sets, setSets] = useState([]);
    const [filters, setFilters] = useState({
        category: '',
        set: '',
        isActive: ''
    });

    useEffect(() => {
        loadFilters();
        loadProducts();
    }, []);

    async function loadFilters() {
        // Kategorien laden
        const categoryRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`);
        const categories = await categoryRes.json();
        setCategories(categories);

        // Sets laden
        const setRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`);
        const sets = await setRes.json();
        setSets(sets);
    }

    async function loadProducts() {
        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products`);
        const products = await res.json();
        setAllProducts(products);
    }

    function handleFilterChange(e) {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    }

    function filteredProducts() {
        return allProducts.filter(product => {
            // Kategorie kann entweder im Set (set.category._id) oder im Produkt (Designation._id) sein
            const matchesCategory =
                !filters.category ||
                product.set?.category?._id === filters.category ||
                product.Designation?._id === filters.category;
            const matchesSet = !filters.set || product.set?._id === filters.set;
            const matchesIsActive = !filters.isActive || String(product.IsActive) === filters.isActive;
            return matchesCategory && matchesSet && matchesIsActive;
        });
    }

    return (
    <div>
        <h2>Produkte</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <select name="category" value={filters.category} onChange={handleFilterChange} id="categoryFilter">
                <option value="">Alle Kategorien</option>
                {categories.map(cat => (
                    <option key={cat._id} value={cat._id}>
                        {cat.name?.de || cat.name}
                    </option>
                ))}
            </select>
            <select name="set" value={filters.set} onChange={handleFilterChange} id="setFilter">
                <option value="">Alle Sets</option>
                {sets.map(set => {
                    const brand = set.manufacturer?.name || '–';
                    const setName = set.set_name?.name?.de || set.set_name?.name || '–';
                    const setNr = set.set_number ?? '–';
                    return (
                        <option key={set._id} value={set._id}>
                            {`${brand} – ${setName} – Set-Nr: ${setNr}`}
                        </option>
                    );
                })}
            </select>
            <select name="isActive" value={filters.isActive} onChange={handleFilterChange} id="isActiveFilter">
                <option value="">Alle Prüfstatus</option>
                <option value="true">Elektrische Prüfung: Ja</option>
                <option value="false">Elektrische Prüfung: Nein</option>
            </select>
        </div>
        <div id="productList">
            {filteredProducts().map(p => {
                const set = p.set;
                const brand = set?.manufacturer?.name || '–';
                const setName = set?.set_name?.name?.de || set?.set_name?.name || '–';
                const setNr = set?.set_number ?? '–';
                const designation = p.Designation?.name?.de || p.Designation?.name || '–';
                const category = set?.category?.name?.de || set?.category?.name || '–';

                return (
                    <div key={p._id} className="set" style={{ border: '1px solid #ccc', marginBottom: '1rem', borderRadius: 4 }}>
                        <div
                            className="header"
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '0.5rem' }}
                            onClick={e => {
                                const details = e.currentTarget.nextSibling;
                                details.style.display = details.style.display === 'none' ? 'block' : 'none';
                            }}
                        >
                            <span>{`${p.Type} – SN: ${p.SerialNumber} – ID: ${p.ID}`}</span>
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    setSelectedSetId(set?._id); // Modal öffnen
                                }}
                                style={{ marginLeft: '1rem' }}
                            >
                                Set aufrufen
                            </button>
                        </div>
                        <div className="details" style={{ display: 'none', padding: '0.5rem' }}>
                            <p><strong>Set:</strong> {brand} – {setName} – Set-Nr: {setNr}</p>
                            <p><strong>Kategorie:</strong> {category}</p>
                            <p><strong>Bezeichnung:</strong> {designation}</p>
                            <p><strong>Hersteller:</strong> {p.Manufacturer?.name || '-'}</p>
                            <p><strong>Typ:</strong> {p.Type || '-'}</p>
                            <p><strong>Seriennummer:</strong> {p.SerialNumber || '-'}</p>
                            <p><strong>Kostenstelle:</strong> {p.CostCenter || '-'}</p>
                            <p><strong>Raumnummer:</strong> {typeof p.Department === 'object' ? (p.Department?.name || '-') : (p.Department || '-')}</p>
                            <p><strong>Bereichsnummer:</strong> {typeof p.CustomerID === 'object' ? (p.CustomerID?.name || '-') : (p.CustomerID || '-')}</p>
                            <p><strong>IVS-Nummer:</strong> {p.Various_1 ?? '-'}</p>
                            <p><strong>Status:</strong> {p.Status || '-'}</p>
                            <p><strong>Gerätetyp:</strong> {p.DeviceType || '-'}</p>
                            <p><strong>Elektrische Prüfung:</strong> {p.IsActive ? 'Ja' : 'Nein'}</p>
                            <p><strong>Prüfintervall:</strong> {p.TestingInterval ?? '-'} Monate</p>
                            <p><strong>ID:</strong> {p.ID ?? '-'}</p>
                            <p><strong>Zuletzt geprüft:</strong> {p.LastTestingDate ? new Date(p.LastTestingDate).toLocaleDateString() : '-'}</p>
                            <p><strong>Anmerkung:</strong> {p.Remark || '-'}</p>
                            <p><strong>Zustand:</strong> {typeof p.state === 'object' ? (p.state?.name || '-') : (p.state || '-')}</p>
                            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                                <button
                                    style={{
                                        background: "#1976d2",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 4,
                                        padding: "6px 16px",
                                        cursor: "pointer",
                                    }}
                                    onClick={() => {
                                        setSelectedProductId(p._id); // ProductEdit Modal öffnen
                                    }}
                                >
                                    Bearbeiten
                                </button>
                                <button
                                    style={{
                                        background: "#e74c3c",
                                        color: "#fff",
                                        border: "none",
                                        borderRadius: 4,
                                        padding: "6px 16px",
                                        cursor: "pointer",
                                    }}
                                    onClick={async () => {
                                        if (window.confirm(`Möchten Sie das Produkt "${p.Type}" mit der Seriennummer "${p.SerialNumber}" wirklich löschen?`)) {
                                            try {
                                                const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products/${p._id}`, { method: 'DELETE' });
                                                if (res.ok) {
                                                    alert('Produkt erfolgreich gelöscht.');
                                                    loadProducts();
                                                } else {
                                                    alert('Fehler beim Löschen des Produkts.');
                                                }
                                            } catch (err) {
                                                alert('Fehler beim Löschen des Produkts.');
                                            }
                                        }
                                    }}
                                >
                                    Löschen
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
        {selectedSetId && (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.45)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                onClick={() => setSelectedSetId(null)}
            >
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 10,
                        boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                        maxWidth: 800,
                        width: "90vw",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        position: "relative",
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        style={{
                            position: "absolute",
                            top: 12,
                            right: 18,
                            background: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "50%",
                            width: 32,
                            height: 32,
                            cursor: "pointer",
                            fontWeight: "bold",
                            color: "#d32f2f",
                            fontSize: "1.5rem",
                            zIndex: 2,
                        }}
                        onClick={() => setSelectedSetId(null)}
                        title="Schließen"
                    >
                        ×
                    </button>
                    <SetEdit setId={selectedSetId} />
                </div>
            </div>
        )}
        {selectedProductId && (
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100vw",
                    height: "100vh",
                    background: "rgba(0,0,0,0.45)",
                    zIndex: 9999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
                onClick={() => setSelectedProductId(null)}
            >
                <div
                    style={{
                        background: "#fff",
                        borderRadius: 10,
                        boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
                        maxWidth: 800,
                        width: "90vw",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        position: "relative",
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        style={{
                            position: "absolute",
                            top: 12,
                            right: 18,
                            background: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "50%",
                            width: 32,
                            height: 32,
                            cursor: "pointer",
                            fontWeight: "bold",
                            color: "#d32f2f",
                            fontSize: "1.5rem",
                            zIndex: 2,
                        }}
                        onClick={() => setSelectedProductId(null)}
                        title="Schließen"
                    >
                        ×
                    </button>
                    <ProductEdit 
                        productId={selectedProductId} 
                        onSave={() => {
                            loadProducts(); // Produktliste nach dem Speichern aktualisieren
                            setSelectedProductId(null); // Modal schließen
                        }}
                    />
                </div>
            </div>
        )}
    </div>
);
}