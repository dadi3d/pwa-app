import React, { useState, useEffect } from "react";
import { MAIN_VARIABLES } from "../../config";
import { authenticatedFetch } from "../services/auth";
import { Button } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

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
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Hersteller verwalten</h1>
                    
                    {/* Add new brand form */}
                    <div className="flex gap-3 items-center mb-4">
                        <input
                            value={newBrand}
                            onChange={e => setNewBrand(e.target.value)}
                            placeholder="Neuer Hersteller"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <Button 
                            onClick={addBrand}
                            className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                        >
                            <PlusIcon className="h-5 w-5" />
                            Hinzufügen
                        </Button>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
                            {error}
                        </div>
                    )}

                    {/* Refresh button */}
                    <Button 
                        onClick={loadBrands}
                        className="bg-black hover:bg-gray-800 text-orange-500 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                        Refresh Data
                    </Button>
                </div>

                {/* Brands list */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Vorhandene Hersteller ({brands.length})
                        </h2>
                        
                        {brands.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                Keine Hersteller vorhanden
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {brands.map(({ _id, name }) => (
                                    <div key={_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        {editId === _id ? (
                                            <div className="flex items-center gap-3 w-full">
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                                <Button 
                                                    onClick={() => updateBrand(_id)}
                                                    className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-md transition-colors"
                                                >
                                                    Speichern
                                                </Button>
                                                <Button 
                                                    onClick={() => { setEditId(null); setEditName(""); }}
                                                    className="bg-black hover:bg-gray-800 text-orange-500 px-3 py-2 rounded-md transition-colors"
                                                >
                                                    Abbrechen
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-lg font-medium text-gray-900">{name}</span>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        onClick={() => { setEditId(_id); setEditName(name); }}
                                                        className="bg-orange-500 hover:bg-orange-600 text-black p-2 rounded-md transition-colors"
                                                        title="Bearbeiten"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        onClick={() => deleteBrand(_id)}
                                                        className="bg-red-500 hover:bg-red-600 text-black p-2 rounded-md transition-colors"
                                                        title="Löschen"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HerstellerManager;