import React, { useEffect, useState } from "react";
import { MAIN_VARIABLES } from "../../config";
import SetEdit from "./SetEdit"; // Import für Lightbox
import { useAuth, fetchUserData, authenticatedFetch } from '../services/auth';

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
    const [setValues, setSetValues] = useState({}); // Für Set-Werte
    const [expandedGroup, setExpandedGroup] = useState(null); // Für Gruppen-Flyout
    const [thumbnailUrls, setThumbnailUrls] = useState({}); // Cache für Thumbnail-URLs

    const [userId, setUserId] = useState('');
    const [userRole, setUserRole] = useState('student');
    const token = useAuth(state => state.token);

    useEffect(() => {
        async function loadFilters() {
            const brandRes = await authenticatedFetch(API_BRANDS);
            setBrands(await brandRes.json());
            const categoryRes = await authenticatedFetch(API_CATEGORIES);
            setCategories(await categoryRes.json());
        }
        loadFilters();
        fetchUserId();
    }, [token]);

    // Benutzer-ID aus JWT holen
    async function fetchUserId() {
        try {
            const userData = await fetchUserData();
            if(userData) {
                setUserId(userData.id);
                if(userData.role) {
                    setUserRole(userData.role);
                }
            }
        } catch (err) {
            setUserId('');
        }
    }

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

    // Funktion zum Laden aller Set-Werte
    const loadAllSetValues = async (sets) => {
        const valuePromises = sets.map(async (set) => {
            try {
                const res = await authenticatedFetch(API_SINGLE_PRODUCTS + set._id);
                if (!res.ok) throw new Error("Fehler beim Laden der Produkte");
                const products = await res.json();
                const setValue = calculateSetValue(products);
                return { setId: set._id, value: setValue };
            } catch {
                return { setId: set._id, value: 0 };
            }
        });

        const results = await Promise.all(valuePromises);
        const newSetValues = {};
        results.forEach(({ setId, value }) => {
            newSetValues[setId] = value;
        });
        setSetValues(newSetValues);
    };

    useEffect(() => {
        async function loadSets() {
            const res = await authenticatedFetch(API_SETS);
            const sets = await res.json();
            setAllSets(sets);

            // Alle Set-Werte laden
            await loadAllSetValues(sets);
            
            // Thumbnail-URLs für alle Sets laden
            const thumbnails = {};
            for (const set of sets) {
                try {
                    const thumbnailRes = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${set._id}`);
                    const thumbnailData = await thumbnailRes.json();
                    thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}${thumbnailData.path}`;
                } catch (err) {
                    console.error(`Fehler beim Laden des Thumbnails für Set ${set._id}:`, err);
                    thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
                }
            }
            setThumbnailUrls(thumbnails);

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

    // Funktion zum Berechnen des Set-Werts
    const calculateSetValue = (products) => {
        if (!products || products.length === 0) return 0;
        
        return products.reduce((total, product) => {
            // Nur ProductValue addieren, wenn es nicht null ist
            if (product.ProductValue !== null && product.ProductValue !== undefined) {
                return total + (parseFloat(product.ProductValue) || 0);
            }
            return total;
        }, 0);
    };

    const handleExpand = async (setId) => {
        setExpandedSetId(expandedSetId === setId ? null : setId);
        if (!productsBySet[setId]) {
            try {
                const res = await authenticatedFetch(API_SINGLE_PRODUCTS + setId);
                if (!res.ok) throw new Error("Fehler beim Laden der Produkte");
                const products = await res.json();
                setProductsBySet((prev) => ({ ...prev, [setId]: products }));
                
                // Set-Wert berechnen und speichern
                const setValue = calculateSetValue(products);
                setSetValues((prev) => ({ ...prev, [setId]: setValue }));
            } catch {
                setProductsBySet((prev) => ({ ...prev, [setId]: [] }));
                setSetValues((prev) => ({ ...prev, [setId]: 0 }));
            }
        }
    };

    const filteredSets = allSets.filter((set) => {
        const matchesBrand = !brandFilter || set.manufacturer?._id === brandFilter;
        const matchesCategory = !categoryFilter || set.category?._id === categoryFilter;
        return matchesBrand && matchesCategory;
    });

    // Sets nach Hersteller und Set-Name gruppieren
    const groupedSets = filteredSets.reduce((groups, set) => {
        const manufacturerName = set.manufacturer?.name || "–";
        const setName = set.set_name?.name?.de || "–";
        const groupKey = `${manufacturerName}-${setName}`;
        
        if (!groups[groupKey]) {
            groups[groupKey] = {
                manufacturerName,
                setName,
                sets: [],
                totalValue: 0
            };
        }
        
        groups[groupKey].sets.push(set);
        return groups;
    }, {});

    // Gruppen-Werte berechnen
    Object.keys(groupedSets).forEach(groupKey => {
        const group = groupedSets[groupKey];
        group.totalValue = group.sets.reduce((total, set) => {
            return total + (setValues[set._id] || 0);
        }, 0);
    });

    // Gruppen sortieren
    const sortedGroups = Object.entries(groupedSets).sort(([keyA, groupA], [keyB, groupB]) => {
        const nameA = `${groupA.manufacturerName} ${groupA.setName}`.toLowerCase();
        const nameB = `${groupB.manufacturerName} ${groupB.setName}`.toLowerCase();
        return nameA.localeCompare(nameB);
    });

    return (
        <div className="max-w-6xl mx-auto p-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">Sets Übersicht</h1>
            
            {/* Filter Section */}
            <div className="mb-6 flex flex-wrap gap-4">
                <select
                    id="brandFilter"
                    value={brandFilter}
                    onChange={(e) => setBrandFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
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
                <button 
                    onClick={() => { setBrandFilter(""); setCategoryFilter(""); }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 rounded-lg transition-colors duration-200"
                >
                    Filter zurücksetzen
                </button>
            </div>
            {/* Groups List */}
            <div className="space-y-4">
                {sortedGroups.length === 0 && (
                    <div className="text-center py-8 text-gray-500">Keine Sets gefunden.</div>
                )}
                {sortedGroups.map(([groupKey, group]) => {
                    // Thumbnail des ersten Sets in der Gruppe verwenden
                    const firstSet = group.sets[0];
                    const thumbnailUrl = thumbnailUrls[firstSet._id] || `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
                    
                    return (
                    <div key={groupKey} className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {/* Gruppen-Header */}
                        <div
                            className="border border-gray-300 bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors duration-200 flex items-center gap-4"
                            onClick={() => setExpandedGroup(expandedGroup === groupKey ? null : groupKey)}
                        >
                            <img
                                src={thumbnailUrl}
                                alt="Gruppen-Thumbnail"
                                className="w-20 h-20 object-cover rounded-lg bg-gray-200 flex-shrink-0"
                                loading="lazy"
                            />
                            <div className="flex-1">
                                <div className="text-lg font-bold text-gray-900">
                                    {group.manufacturerName} - {group.setName}
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm text-gray-600 font-medium">
                                    {group.sets.length} Set{group.sets.length !== 1 ? 's' : ''}
                                </span>
                                <span className="text-lg text-gray-700">
                                    {expandedGroup === groupKey ? '▼' : '▶'}
                                </span>
                            </div>
                        </div>

                        {/* Erweiterte Sets-Ansicht */}
                        {expandedGroup === groupKey && (
                            <div className="mt-2 ml-4 space-y-3">
                                {group.sets
                                    .sort((a, b) => (a.set_number || 0) - (b.set_number || 0))
                                    .map((p) => {
                                    const brand = p.manufacturer?.name || "–";
                                    const category = p.category?.name?.de || "–";
                                    const setName = p.set_name?.name?.de || "–";
                                    const setNr = p.set_number ?? "–";
                                    const thumbnailUrl = thumbnailUrls[p._id] || `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
                                    return (
                                        <div
                                            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 flex cursor-pointer"
                                            key={p._id}
                                            id={`set-${p._id}`}
                                            onClick={() => setSelectedSetId(p._id)}
                                        >
                                            <img
                                                src={thumbnailUrl}
                                                alt="Set-Thumbnail"
                                                className="w-32 h-32 object-cover rounded-lg m-3 bg-gray-200 flex-shrink-0"
                                                loading="lazy"
                                            />
                                            <div className="flex-1 flex flex-col">
                                                <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 rounded-t-lg">
                                                    <h3 className="font-bold text-gray-900">
                                                        {brand} {setName} - Set {setNr}
                                                    </h3>
                                                </div>
                                                <div className="p-4 flex-1">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <p className="text-sm">
                                                                <span className="font-semibold text-gray-700">Zugehörigkeit:</span>{" "}
                                                                <span className="text-gray-600">{p.set_relation?.name || "-"}</span>
                                                            </p>
                                                            <p className="text-sm">
                                                                <span className="font-semibold text-gray-700">Kategorie:</span>{" "}
                                                                <span className="text-gray-600">{category}</span>
                                                            </p>
                                                            <p className="text-sm">
                                                                <span className="font-semibold text-gray-700">Set-Nr:</span>{" "}
                                                                <span className="text-gray-600">{setNr}</span>
                                                            </p>
                                                            <p className="text-sm">
                                                                <span className="font-semibold text-gray-700">Set-Wert:</span>{" "}
                                                                <span className="text-green-600 font-medium">
                                                                    {setValues[p._id] !== undefined 
                                                                        ? (setValues[p._id] > 0 
                                                                            ? `${setValues[p._id].toFixed(2).replace('.', ',')} €` 
                                                                            : "0,00 €")
                                                                        : "Wird geladen..."
                                                                    }
                                                                </span>
                                                            </p>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <p className="text-sm">
                                                                <span className="font-semibold text-gray-700">Status:</span>{" "}
                                                                <span className="text-gray-600">{p.state?.name?.de ?? "-"}</span>
                                                            </p>
                                                            <p className="text-sm">
                                                                <span className="font-semibold text-gray-700">Öffentliche Anmerkung:</span>{" "}
                                                                <span className="text-gray-600">{p.note_public || "-"}</span>
                                                            </p>
                                                            <p className="text-sm">
                                                                <span className="font-semibold text-gray-700">Interne Anmerkung:</span>{" "}
                                                                <span className="text-gray-600">{p.note_private || "-"}</span>
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    );
                })}
            </div>

            {/* Lightbox/Modal für SetEdit */}
            {selectedSetId && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-45 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedSetId(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-3 right-4 bg-white hover:bg-gray-100 border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center font-bold text-red-600 text-xl z-10 transition-colors duration-200"
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