import React, { useState, useEffect } from "react";
import { MAIN_VARIABLES } from "../../config";
import { authenticatedFetch } from "../services/auth";
import { Button } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const API_URL = `${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`;

const Verfügbarkeiten = () => {
  const [setAssignments, setSetAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  // Alle Verfügbarkeiten laden
  const loadSetAssignments = async () => {
    try {
        const response = await authenticatedFetch(API_URL);
        if (!response.ok) throw new Error("Fehler beim Laden der Verfügbarkeiten");
        const data = await response.json();
        // Alphabetisch nach name sortieren
        data.sort((a, b) => (a.name?.de || a.name || "").localeCompare(b.name?.de || b.name || "", "de", { sensitivity: "base" }));
        setSetAssignments(data);
    } catch (error) {
        setSetAssignments([]);
        setError(error.message);
    }
};

  // Neue Verfügbarkeit hinzufügen
  const addSetAssignment = async () => {
        if (!newAssignment.trim()) return;
        try {
            const response = await authenticatedFetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ name: { de: newAssignment.trim() } }),
            });
            if (response.status === 409) {
                setError("Verfügbarkeit existiert bereits");
                return;
            }
            if (!response.ok) throw new Error("Fehler beim Hinzufügen");
            setNewAssignment("");
            setError("");
            loadSetAssignments();
        } catch (error) {
            setError(error.message);
        }
    };

  // Verfügbarkeit aktualisieren
  const updateSetAssignment = async (id) => {
        if (!editName.trim()) return;
        try {
            const response = await authenticatedFetch(`${API_URL}/${id}`, {
                method: "PUT",
                body: JSON.stringify({ name: { de: editName.trim() } }),
            });
            if (response.status === 409) {
                setError("Verfügbarkeit existiert bereits");
                return;
            }
            if (!response.ok) throw new Error("Fehler beim Aktualisieren");
            setEditId(null);
            setEditName("");
            setError("");
            loadSetAssignments();
        } catch (error) {
            setError(error.message);
        }
    };

  // Verfügbarkeit löschen
  const deleteSetAssignment = async (id, name) => {
        // Erste Bestätigung
        if (!window.confirm(`Soll die Verfügbarkeit "${name}" wirklich gelöscht werden?\n\nHinweis: Diese Aktion entfernt auch alle Referenzen in Sets und Benutzern.`)) return;
        
        try {
            const response = await authenticatedFetch(`${API_URL}/${id}`, { method: "DELETE" });
            if (!response.ok) {
                const errorData = await response.json();
                setError(errorData.error || "Fehler beim Löschen");
                return;
            }
            
            const result = await response.json();
            setError("");
            
            // Erfolgs-Nachricht anzeigen
            if (result.removedFromSets > 0 || result.removedFromUsers > 0) {
                alert(`Verfügbarkeit "${name}" wurde erfolgreich gelöscht.\n\nEntfernt aus:\n- ${result.removedFromSets} Set(s)\n- ${result.removedFromUsers} Benutzer(n)`);
            }
            
            loadSetAssignments();
        } catch (error) {
            setError("Fehler beim Löschen");
        }
    };

    useEffect(() => {
        loadSetAssignments();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Verfügbarkeiten verwalten</h1>
                    
                    {/* Add new assignment form */}
                    <div className="flex gap-3 items-center mb-4">
                        <input
                            value={newAssignment}
                            onChange={e => setNewAssignment(e.target.value)}
                            placeholder="Neue Verfügbarkeit"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                        <Button 
                            onClick={addSetAssignment}
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
                        onClick={loadSetAssignments}
                        className="bg-black hover:bg-gray-800 text-orange-500 px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
                    >
                        <ArrowPathIcon className="h-5 w-5" />
                        Refresh Data
                    </Button>
                </div>

                {/* Assignments list */}
                <div className="bg-white rounded-lg shadow-sm">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Vorhandene Verfügbarkeiten ({setAssignments.length})
                        </h2>
                        
                        {setAssignments.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                Keine Verfügbarkeiten vorhanden
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {setAssignments.map(({ _id, name }) => (
                                    <div key={_id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                        {editId === _id ? (
                                            <div className="flex items-center gap-3 w-full">
                                                <input
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                                <Button 
                                                    onClick={() => updateSetAssignment(_id)}
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
                                                <span className="text-lg font-medium text-gray-900">
                                                    {name?.de || name || "Unbenannt"}
                                                </span>
                                                <div className="flex gap-2">
                                                    <Button 
                                                        onClick={() => { setEditId(_id); setEditName(name?.de || name || ""); }}
                                                        className="bg-orange-500 hover:bg-orange-600 text-black p-2 rounded-md transition-colors"
                                                        title="Bearbeiten"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        onClick={() => deleteSetAssignment(_id, name?.de || name || "Unbenannt")}
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

export default Verfügbarkeiten;
