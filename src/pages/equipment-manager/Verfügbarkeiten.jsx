import React, { useState, useEffect } from "react";
import { MAIN_VARIABLES } from "../../config";
import { authenticatedFetch } from "../services/auth";
import { Button } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, Cog6ToothIcon, XMarkIcon } from '@heroicons/react/24/outline';

const API_URL = `${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`;

const Verfügbarkeiten = () => {
  const [setAssignments, setSetAssignments] = useState([]);
  const [newAssignment, setNewAssignment] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");
  
  // Set-Management States
  const [showSetModal, setShowSetModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [allSets, setAllSets] = useState([]);
  const [filteredSets, setFilteredSets] = useState([]);
  const [assignedSets, setAssignedSets] = useState([]);
  const [availableSets, setAvailableSets] = useState([]);
  
  // Filter States
  const [manufacturers, setManufacturers] = useState([]);
  const [setNames, setSetNames] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedSetName, setSelectedSetName] = useState("");
  const [setModalError, setSetModalError] = useState("");

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

  // Alle Sets laden
  const loadAllSets = async () => {
    try {
      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`);
      if (!response.ok) throw new Error("Fehler beim Laden der Sets");
      const data = await response.json();
      setAllSets(data);
      
      // Unique Hersteller und Set-Namen extrahieren
      const uniqueManufacturers = [...new Set(data.map(set => set.manufacturer?.name).filter(Boolean))];
      const uniqueSetNames = [...new Set(data.map(set => set.set_name?.name?.de || set.set_name?.name).filter(Boolean))];
      
      setManufacturers(uniqueManufacturers.sort());
      setSetNames(uniqueSetNames.sort());
      
    } catch (error) {
      setSetModalError("Fehler beim Laden der Sets: " + error.message);
    }
  };

  // Sets für Verfügbarkeit laden
  const loadSetsForAssignment = async (assignmentId) => {
    try {
      // Alle Sets mit dieser Verfügbarkeit finden
      const setsWithAssignment = allSets.filter(set => {
        if (!set.set_assignment) return false;
        const assignments = Array.isArray(set.set_assignment) ? set.set_assignment : JSON.parse(set.set_assignment || '[]');
        return assignments.includes(assignmentId);
      });
      
      setAssignedSets(setsWithAssignment);
      
      // Verfügbare Sets (ohne diese Verfügbarkeit)
      const available = allSets.filter(set => {
        if (!set.set_assignment) return true;
        const assignments = Array.isArray(set.set_assignment) ? set.set_assignment : JSON.parse(set.set_assignment || '[]');
        return !assignments.includes(assignmentId);
      });
      
      setAvailableSets(available);
      setFilteredSets(available);
      
    } catch (error) {
      setSetModalError("Fehler beim Laden der Set-Zuordnungen: " + error.message);
    }
  };

  // Filter anwenden
  const applyFilters = () => {
    let filtered = availableSets;
    
    if (selectedManufacturer) {
      filtered = filtered.filter(set => set.manufacturer?.name === selectedManufacturer);
    }
    
    if (selectedSetName) {
      filtered = filtered.filter(set => 
        (set.set_name?.name?.de || set.set_name?.name) === selectedSetName
      );
    }
    
    setFilteredSets(filtered);
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

  // Set zu Verfügbarkeit hinzufügen
  const addSetToAssignment = async (setId) => {
    try {
      const set = allSets.find(s => s._id === setId);
      if (!set) return;

      // Aktuelle Set-Assignments des Sets laden
      const currentAssignments = set.set_assignment ? 
        (Array.isArray(set.set_assignment) ? set.set_assignment : JSON.parse(set.set_assignment)) : [];
      
      // Neue Assignment hinzufügen
      const updatedAssignments = [...currentAssignments, selectedAssignmentId];

      // Set aktualisieren
      const formData = new FormData();
      formData.append('set_assignment', JSON.stringify(updatedAssignments));

      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`, {
        method: "PUT",
        body: formData
      });

      if (!response.ok) throw new Error("Fehler beim Hinzufügen des Sets");

      // Listen aktualisieren
      await loadAllSets();
      await loadSetsForAssignment(selectedAssignmentId);
      setSetModalError("");

    } catch (error) {
      setSetModalError("Fehler beim Hinzufügen: " + error.message);
    }
  };

  // Set von Verfügbarkeit entfernen
  const removeSetFromAssignment = async (setId) => {
    try {
      const set = allSets.find(s => s._id === setId);
      if (!set) return;

      // Aktuelle Set-Assignments des Sets laden
      const currentAssignments = set.set_assignment ? 
        (Array.isArray(set.set_assignment) ? set.set_assignment : JSON.parse(set.set_assignment)) : [];
      
      // Assignment entfernen
      const updatedAssignments = currentAssignments.filter(id => id !== selectedAssignmentId);

      // Set aktualisieren
      const formData = new FormData();
      formData.append('set_assignment', JSON.stringify(updatedAssignments));

      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`, {
        method: "PUT",
        body: formData
      });

      if (!response.ok) throw new Error("Fehler beim Entfernen des Sets");

      // Listen aktualisieren
      await loadAllSets();
      await loadSetsForAssignment(selectedAssignmentId);
      setSetModalError("");

    } catch (error) {
      setSetModalError("Fehler beim Entfernen: " + error.message);
    }
  };

  // Multiple Sets hinzufügen (gefilterte Auswahl)
  const addFilteredSets = async () => {
    if (filteredSets.length === 0) return;
    
    if (!window.confirm(`Sollen alle ${filteredSets.length} gefilterten Sets zu dieser Verfügbarkeit hinzugefügt werden?`)) return;

    try {
      for (const set of filteredSets) {
        await addSetToAssignment(set._id);
      }
      alert(`${filteredSets.length} Sets wurden erfolgreich hinzugefügt.`);
    } catch (error) {
      setSetModalError("Fehler beim Hinzufügen der Sets: " + error.message);
    }
  };

  // Set-Modal öffnen
  const openSetModal = async (assignmentId) => {
    setSelectedAssignmentId(assignmentId);
    setShowSetModal(true);
    setSetModalError("");
    setSelectedManufacturer("");
    setSelectedSetName("");
    
    if (allSets.length === 0) {
      await loadAllSets();
    }
    await loadSetsForAssignment(assignmentId);
  };

  // Set-Modal schließen
  const closeSetModal = () => {
    setShowSetModal(false);
    setSelectedAssignmentId(null);
    setAssignedSets([]);
    setAvailableSets([]);
    setFilteredSets([]);
    setSetModalError("");
    setSelectedManufacturer("");
    setSelectedSetName("");
  };

    useEffect(() => {
        loadSetAssignments();
    }, []);

    // Filter Effect
    useEffect(() => {
        if (showSetModal) {
            applyFilters();
        }
    }, [selectedManufacturer, selectedSetName, availableSets]);

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
                                                        onClick={() => openSetModal(_id)}
                                                        className="bg-blue-500 hover:bg-blue-600 text-black p-2 rounded-md transition-colors"
                                                        title="Sets verwalten"
                                                    >
                                                        <Cog6ToothIcon className="h-4 w-4" />
                                                    </Button>
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

                {/* Set Management Modal */}
                {showSetModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Sets für "{setAssignments.find(a => a._id === selectedAssignmentId)?.name?.de}" verwalten
                                    </h2>
                                    <Button 
                                        onClick={closeSetModal}
                                        className="bg-gray-500 hover:bg-gray-600 text-black p-2 rounded-md transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                                {setModalError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                                        {setModalError}
                                    </div>
                                )}

                                {/* Filter Section */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Filter für verfügbare Sets</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Hersteller</label>
                                            <select
                                                value={selectedManufacturer}
                                                onChange={(e) => setSelectedManufacturer(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            >
                                                <option value="">Alle Hersteller</option>
                                                {manufacturers.map(manufacturer => (
                                                    <option key={manufacturer} value={manufacturer}>
                                                        {manufacturer}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Set-Name</label>
                                            <select
                                                value={selectedSetName}
                                                onChange={(e) => setSelectedSetName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            >
                                                <option value="">Alle Set-Namen</option>
                                                {setNames.map(setName => (
                                                    <option key={setName} value={setName}>
                                                        {setName}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-end">
                                            <Button 
                                                onClick={addFilteredSets}
                                                disabled={filteredSets.length === 0}
                                                className={`w-full px-4 py-2 rounded-md transition-colors ${
                                                    filteredSets.length > 0 
                                                        ? 'bg-green-500 hover:bg-green-600 text-black' 
                                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                }`}
                                            >
                                                Alle {filteredSets.length} Sets hinzufügen
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Zugeordnete Sets */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            Zugeordnete Sets ({assignedSets.length})
                                        </h3>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {assignedSets.length === 0 ? (
                                                <p className="text-gray-500 text-center py-8">
                                                    Keine Sets zugeordnet
                                                </p>
                                            ) : (
                                                assignedSets.map(set => (
                                                    <div key={set._id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {set.manufacturer?.name} - {set.set_name?.name?.de || set.set_name?.name}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                Set-Nr: {set.set_number} | Status: {set.state?.name?.de || set.state?.name}
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            onClick={() => removeSetFromAssignment(set._id)}
                                                            className="bg-red-500 hover:bg-red-600 text-black px-3 py-1 rounded-md text-sm transition-colors"
                                                        >
                                                            Entfernen
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Verfügbare Sets */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            Verfügbare Sets ({filteredSets.length})
                                        </h3>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredSets.length === 0 ? (
                                                <p className="text-gray-500 text-center py-8">
                                                    {availableSets.length === 0 ? 'Alle Sets bereits zugeordnet' : 'Keine Sets entsprechen den Filterkriterien'}
                                                </p>
                                            ) : (
                                                filteredSets.map(set => (
                                                    <div key={set._id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {set.manufacturer?.name} - {set.set_name?.name?.de || set.set_name?.name}
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                Set-Nr: {set.set_number} | Status: {set.state?.name?.de || set.state?.name}
                                                            </div>
                                                        </div>
                                                        <Button 
                                                            onClick={() => addSetToAssignment(set._id)}
                                                            className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-1 rounded-md text-sm transition-colors"
                                                        >
                                                            Hinzufügen
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Verfügbarkeiten;
