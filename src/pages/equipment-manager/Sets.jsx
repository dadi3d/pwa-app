import React, { useEffect, useState } from "react";
import { MAIN_VARIABLES } from "../../config";
import SetEdit from "./SetEdit"; // Import für Lightbox

const API_SETS = `${MAIN_VARIABLES.SERVER_URL}/api/sets`;
const API_BRANDS = `${MAIN_VARIABLES.SERVER_URL}/api/brands`;
const API_CATEGORIES = `${MAIN_VARIABLES.SERVER_URL}/api/categories`;
const API_SINGLE_PRODUCTS = `${MAIN_VARIABLES.SERVER_URL}/api/single-products?set=`;

export default function Sets() {
    const [allSets, setAllSets] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [brandFilter, setBrandFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [expandedSetId, setExpandedSetId] = useState(null);
    const [productsBySet, setProductsBySet] = useState({});
    const [selectedSetId, setSelectedSetId] = useState(null); // Für Lightbox

    useEffect(() => {
        async function loadFilters() {
            const brandRes = await fetch(API_BRANDS);
            setBrands(await brandRes.json());
            const categoryRes = await fetch(API_CATEGORIES);
            setCategories(await categoryRes.json());
        }
        loadFilters();
    }, []);

    useEffect(() => {
        if (selectedSetId) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [selectedSetId]);

    useEffect(() => {
        async function loadSets() {
            const res = await fetch(API_SETS);
            const sets = await res.json();
            setAllSets(sets);

            const urlParams = new URLSearchParams(window.location.search);
            const brand = urlParams.get("manufacturer");
            const category = urlParams.get("category");
            const setName = urlParams.get("set_name");
            const setNum = urlParams.get("setNum");

            if (brand && category && setName && setNum) {
                const found = sets.find(
                    (p) =>
                        p.manufacturer?.name === brand &&
                        (p.category?.name?.de || p.category?.name) === category &&
                        p.set_name?.name?.de === setName &&
                        String(p.set_number) === String(setNum)
                );
                if (found) {
                    setExpandedSetId(found._id);
                    setTimeout(() => {
                        const el = document.getElementById(`set-${found._id}`);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                    }, 300);
                }
            }

            console.log("Sets geladen:", sets);
        }
        loadSets();
    }, []);

    const handleExpand = async (setId) => {
        setExpandedSetId(expandedSetId === setId ? null : setId);
        if (!productsBySet[setId]) {
            try {
                const res = await fetch(API_SINGLE_PRODUCTS + setId);
                if (!res.ok) throw new Error("Fehler beim Laden der Produkte");
                const products = await res.json();
                setProductsBySet((prev) => ({ ...prev, [setId]: products }));
            } catch {
                setProductsBySet((prev) => ({ ...prev, [setId]: [] }));
            }
        }
    };

    const filteredSets = allSets.filter((set) => {
        const matchesBrand = !brandFilter || set.manufacturer?._id === brandFilter;
        const matchesCategory = !categoryFilter || set.category?._id === categoryFilter;
        return matchesBrand && matchesCategory;
    });

    const sortedSets = [...filteredSets].sort((a, b) => {
        const brandA = a.manufacturer?.name?.toLowerCase() || "";
        const brandB = b.manufacturer?.name?.toLowerCase() || "";
        if (brandA !== brandB) {
            return brandA.localeCompare(brandB);
        }
        const nameA = a.set_name?.name?.de?.toLowerCase() || "";
        const nameB = b.set_name?.name?.de?.toLowerCase() || "";
        return nameA.localeCompare(nameB);
    });

    return (
        <div style={{ maxWidth: 900, margin: "2rem auto", padding: "1rem" }}>
            <h1>Sets Übersicht</h1>
            <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
                <select
                    id="brandFilter"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                >
                    <option value="">Alle Hersteller</option>
                    {brands
                        .slice()
                        .sort((a, b) => (a.name?.toLowerCase() || "").localeCompare(b.name?.toLowerCase() || ""))
                        .map((brand) => (
                            <option key={brand._id} value={brand._id}>
                                {brand.name}
                            </option>
                        ))}
                </select>
                <select
                    id="categoryFilter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="">Alle Kategorien</option>
                    {categories
                        .slice()
                        .sort((a, b) => (a.name?.de?.toLowerCase() || "").localeCompare(b.name?.de?.toLowerCase() || ""))
                        .map((cat) => (
                            <option key={cat._id} value={cat._id}>
                                {cat.name?.de || "–"}
                            </option>
                        ))}
                </select>
                <button onClick={() => { setBrandFilter(""); setCategoryFilter(""); }}>
                    Filter zurücksetzen
                </button>
            </div>
            <div id="setList">
                {sortedSets.length === 0 && <div>Keine Sets gefunden.</div>}
                {sortedSets.map((p) => {
                    const brand = p.manufacturer?.name || "–";
                    const category = p.category?.name?.de || "–";
                    const setName = p.set_name?.name?.de || "–";
                    const setNr = p.set_number ?? "–";
                    const thumbnailUrl = `${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${p._id}`;
                    return (
                        <div
                            className="set"
                            key={p._id}
                            id={`set-${p._id}`}
                            style={{
                                border: "1px solid #ddd",
                                borderRadius: 8,
                                marginBottom: 16,
                                background: "#fff",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                                display: "flex",
                                alignItems: "flex-start",
                                cursor: "pointer",
                            }}
                            onClick={() => setSelectedSetId(p._id)} // Lightbox statt window.open
                        >
                            <img
                                src={thumbnailUrl}
                                alt="Set-Thumbnail"
                                style={{
                                    width: 150,
                                    height: 150,
                                    objectFit: "cover",
                                    borderRadius: 8,
                                    margin: 16,
                                    background: "#eee",
                                    flexShrink: 0,
                                }}
                                loading="lazy"
                            />
                            <div style={{ flex: 1 }}>
                                <div
                                    className="header"
                                    style={{
                                        fontWeight: "bold",
                                        fontSize: "1.1rem",
                                        padding: "0.7rem 1rem",
                                        background: "#f7f7f7",
                                        borderBottom: "1px solid #eee",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <span>
                                        {brand} {setName}
                                    </span>
                                </div>
                                <div
                                    className="details"
                                    style={{
                                        padding: "1rem",
                                    }}
                                >
                                    <div style={{
                                        display: "grid",
                                        gridTemplateColumns: "1fr 1fr",
                                        gap: "1rem",
                                    }}>
                                        <div style={{ textAlign: "left" }}>
                                            <p>
                                                <strong>Zugehörigkeit:</strong> {p.set_relation?.name || "-"}
                                            </p>
                                            <p>
                                                <strong>Kategorie:</strong> {category}
                                            </p>
                                            <p>
                                                <strong>Set-Nr:</strong> {setNr}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: "left" }}>
                                            <p>
                                                <strong>Status:</strong> {p.state?.name?.de ?? "-"}
                                            </p>
                                            <p>
                                                <strong>Öffentliche Anmerkung:</strong> {p.note_public || "-"}
                                            </p>
                                            <p>
                                                <strong>Interne Anmerkung:</strong> {p.note_private || "-"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Lightbox/Modal für SetEdit */}
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
        </div>
    );
}