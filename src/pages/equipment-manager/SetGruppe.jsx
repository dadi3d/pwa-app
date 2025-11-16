import React, { useState, useEffect } from "react";
import { MAIN_VARIABLES } from "../../config";
import { authenticatedFetch } from "../services/auth";
import { Button } from '@headlessui/react';
import { PlusIcon, PencilIcon, TrashIcon, ArrowPathIcon, Cog6ToothIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import { Badge } from "../../styles/catalyst/badge";

const API_URL = `${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`;

const SetGruppe = () => {
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
  const [availableSetNames, setAvailableSetNames] = useState([]);
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedSetName, setSelectedSetName] = useState("");
  const [setModalError, setSetModalError] = useState("");

  // Nutzer-Modal States
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedAssignmentForUsers, setSelectedAssignmentForUsers] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [usersWithAssignment, setUsersWithAssignment] = useState([]);
  const [usersWithoutAssignment, setUsersWithoutAssignment] = useState([]);
  const [userModalError, setUserModalError] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");

  // Separate Filter States für Bestand und Verfügbare Sets
  const [filteredAssignedSets, setFilteredAssignedSets] = useState([]);
  const [assignedManufacturerFilter, setAssignedManufacturerFilter] = useState("");
  const [assignedSetNameFilter, setAssignedSetNameFilter] = useState("");
  const [availableManufacturerFilter, setAvailableManufacturerFilter] = useState("");
  const [availableSetNameFilter, setAvailableSetNameFilter] = useState("");

  // Set-Gruppen Kopieren States
  const [showCopyFromAssignmentSection, setShowCopyFromAssignmentSection] = useState(false);
  const [otherAssignments, setOtherAssignments] = useState([]);
  const [selectedSourceAssignment, setSelectedSourceAssignment] = useState("");
  const [setsFromSourceAssignment, setSetsFromSourceAssignment] = useState([]);
  const [selectedSetsForCopy, setSelectedSetsForCopy] = useState([]);

  // Alle SetGruppen laden
  const loadSetAssignments = async () => {
    try {
        const response = await authenticatedFetch(API_URL);
        if (!response.ok) throw new Error("Fehler beim Laden der SetGruppen");
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
      console.log("Sets geladen:", data.length, "Sets");
      setAllSets(data);
      
      // Unique Hersteller und Set-Namen extrahieren
      const uniqueManufacturers = [...new Set(data.map(set => set.manufacturer?.name).filter(Boolean))];
      const uniqueSetNames = [...new Set(data.map(set => set.set_name?.name?.de || set.set_name?.name).filter(Boolean))];
      
      setManufacturers(uniqueManufacturers.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })));
      setSetNames(uniqueSetNames.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })));
      console.log("Hersteller:", uniqueManufacturers.length, "Set-Namen:", uniqueSetNames.length);
      
    } catch (error) {
      console.error("Fehler beim Laden der Sets:", error);
      setSetModalError("Fehler beim Laden der Sets: " + error.message);
    }
  };

  // Hilfsfunktion: Sets für Verfügbarkeit mit spezifischen Daten laden
  const loadSetsForAssignmentWithData = async (assignmentId, setsData) => {
    try {
      console.log("LoadSetsForAssignmentWithData - AssignmentId:", assignmentId, "Anzahl Sets:", setsData.length);

      // Alle Sets mit dieser Verfügbarkeit finden
      const setsWithAssignment = setsData.filter(set => {
        if (!set.set_assignment || set.set_assignment.length === 0) return false;
        
        // set_assignment ist ein Array von ObjectIds oder Strings
        const assignments = Array.isArray(set.set_assignment) ? set.set_assignment : [];
        
        // Prüfe sowohl auf direkte ID-Übereinstimmung als auch auf ObjectId-String-Vergleich
        const hasAssignment = assignments.some(assignment => {
          // Wenn assignment ein Objekt ist (populated), verwende die _id
          if (typeof assignment === 'object' && assignment._id) {
            return assignment._id === assignmentId || assignment._id.toString() === assignmentId;
          }
          // Wenn assignment ein String/ObjectId ist
          return assignment === assignmentId || assignment.toString() === assignmentId;
        });
        
        console.log(`Set ${set.set_number}: assignments=`, assignments, `hasAssignment=${hasAssignment} für ${assignmentId}`);
        return hasAssignment;
      });
      
      console.log("Zugeordnete Sets:", setsWithAssignment.length);
      
      // Alphabetisch sortieren nach Hersteller-Set-Name
      const sortedAssigned = setsWithAssignment.sort((a, b) => {
        const aName = `${a.manufacturer?.name || ''} - ${a.set_name?.name?.de || a.set_name?.name || ''}`;
        const bName = `${b.manufacturer?.name || ''} - ${b.set_name?.name?.de || b.set_name?.name || ''}`;
        return aName.localeCompare(bName, 'de', { sensitivity: 'base' });
      });
      
      setAssignedSets(sortedAssigned);
      setFilteredAssignedSets(sortedAssigned);
      
      // Verfügbare Sets (ohne diese Verfügbarkeit)
      const available = setsData.filter(set => {
        if (!set.set_assignment || set.set_assignment.length === 0) return true;
        
        // set_assignment ist ein Array von ObjectIds oder Strings
        const assignments = Array.isArray(set.set_assignment) ? set.set_assignment : [];
        
        // Prüfe ob diese Verfügbarkeit NICHT zugeordnet ist
        const hasAssignment = assignments.some(assignment => {
          // Wenn assignment ein Objekt ist (populated), verwende die _id
          if (typeof assignment === 'object' && assignment._id) {
            return assignment._id === assignmentId || assignment._id.toString() === assignmentId;
          }
          // Wenn assignment ein String/ObjectId ist
          return assignment === assignmentId || assignment.toString() === assignmentId;
        });
        
        return !hasAssignment;
      });
      
      console.log("Verfügbare Sets:", available.length);
      
      // Alphabetisch sortieren nach Hersteller-Set-Name
      const sortedAvailable = available.sort((a, b) => {
        const aName = `${a.manufacturer?.name || ''} - ${a.set_name?.name?.de || a.set_name?.name || ''}`;
        const bName = `${b.manufacturer?.name || ''} - ${b.set_name?.name?.de || b.set_name?.name || ''}`;
        return aName.localeCompare(bName, 'de', { sensitivity: 'base' });
      });
      
      setAvailableSets(sortedAvailable);
      setFilteredSets(sortedAvailable);
      
    } catch (error) {
      console.error("Fehler beim Laden der Set-Zuordnungen:", error);
      setSetModalError("Fehler beim Laden der Set-Zuordnungen: " + error.message);
    }
  };

  // Sets für Verfügbarkeit laden
  const loadSetsForAssignment = async (assignmentId) => {
    try {
      // Sicherstellen, dass allSets geladen sind
      let currentSets = allSets;
      if (currentSets.length === 0) {
        const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`);
        if (!response.ok) throw new Error("Fehler beim Laden der Sets");
        currentSets = await response.json();
        setAllSets(currentSets);
      }

      await loadSetsForAssignmentWithData(assignmentId, currentSets);
      
    } catch (error) {
      console.error("Fehler beim Laden der Set-Zuordnungen:", error);
      setSetModalError("Fehler beim Laden der Set-Zuordnungen: " + error.message);
    }
  };

  // Filter für zugeordnete Sets (Bestand)
  const applyAssignedFilters = () => {
    let filtered = assignedSets;
    
    if (assignedManufacturerFilter) {
      filtered = filtered.filter(set => set.manufacturer?.name === assignedManufacturerFilter);
    }
    
    if (assignedSetNameFilter) {
      filtered = filtered.filter(set => 
        (set.set_name?.name?.de || set.set_name?.name) === assignedSetNameFilter
      );
    }
    
    // Alphabetisch sortieren nach Hersteller-Set-Name
    filtered = filtered.sort((a, b) => {
      const aName = `${a.manufacturer?.name || ''} - ${a.set_name?.name?.de || a.set_name?.name || ''}`;
      const bName = `${b.manufacturer?.name || ''} - ${b.set_name?.name?.de || b.set_name?.name || ''}`;
      return aName.localeCompare(bName, 'de', { sensitivity: 'base' });
    });
    
    setFilteredAssignedSets(filtered);
  };

  // Filter für verfügbare Sets
  const applyAvailableFilters = () => {
    let filtered = availableSets;
    
    if (availableManufacturerFilter) {
      filtered = filtered.filter(set => set.manufacturer?.name === availableManufacturerFilter);
      
      // Verfügbare Set-Namen für den ausgewählten Hersteller aktualisieren
      const manufacturerSetNames = [...new Set(filtered.map(set => set.set_name?.name?.de || set.set_name?.name).filter(Boolean))];
      setAvailableSetNames(manufacturerSetNames.sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' })));
      
      // Wenn der aktuelle Set-Name nicht mehr verfügbar ist, zurücksetzen
      if (availableSetNameFilter && !manufacturerSetNames.includes(availableSetNameFilter)) {
        setAvailableSetNameFilter("");
      }
    } else {
      // Alle Set-Namen verfügbar wenn kein Hersteller ausgewählt
      setAvailableSetNames(setNames);
    }
    
    if (availableSetNameFilter) {
      filtered = filtered.filter(set => 
        (set.set_name?.name?.de || set.set_name?.name) === availableSetNameFilter
      );
    }
    
    // Alphabetisch sortieren nach Hersteller-Set-Name
    filtered = filtered.sort((a, b) => {
      const aName = `${a.manufacturer?.name || ''} - ${a.set_name?.name?.de || a.set_name?.name || ''}`;
      const bName = `${b.manufacturer?.name || ''} - ${b.set_name?.name?.de || b.set_name?.name || ''}`;
      return aName.localeCompare(bName, 'de', { sensitivity: 'base' });
    });
    
    setFilteredSets(filtered);
  };

  // Neue SetGruppe hinzufügen
  const addSetAssignment = async () => {
        if (!newAssignment.trim()) return;
        try {
            const response = await authenticatedFetch(API_URL, {
                method: "POST",
                body: JSON.stringify({ name: { de: newAssignment.trim() } }),
            });
            if (response.status === 409) {
                setError("SetGruppe existiert bereits");
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

  // SetGruppe aktualisieren
  const updateSetAssignment = async (id) => {
        if (!editName.trim()) return;
        try {
            const response = await authenticatedFetch(`${API_URL}/${id}`, {
                method: "PUT",
                body: JSON.stringify({ name: { de: editName.trim() } }),
            });
            if (response.status === 409) {
                setError("SetGruppe existiert bereits");
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

  // SetGruppe löschen
  const deleteSetAssignment = async (id, name) => {
        // Erste Bestätigung
        if (!window.confirm(`Soll die SetGruppe "${name}" wirklich gelöscht werden?\n\nHinweis: Diese Aktion entfernt auch alle Referenzen in Sets und Benutzern.`)) return;
        
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
                alert(`SetGruppe "${name}" wurde erfolgreich gelöscht.\n\nEntfernt aus:\n- ${result.removedFromSets} Set(s)\n- ${result.removedFromUsers} Benutzer(n)`);
            }
            
            loadSetAssignments();
        } catch (error) {
            setError("Fehler beim Löschen");
        }
    };

  // Set zu SetGruppe hinzufügen
  const addSetToAssignment = async (setId) => {
    try {
      const set = allSets.find(s => s._id === setId);
      if (!set) return;

      // Aktuelle Set-Gruppen des Sets laden
      const currentAssignments = set.set_assignment ? 
        (Array.isArray(set.set_assignment) ? set.set_assignment : []) : [];
      
      // IDs extrahieren (falls populated objects)
      const currentAssignmentIds = currentAssignments.map(assignment => {
        return typeof assignment === 'object' && assignment._id ? assignment._id : assignment;
      });
      
      // Neue Assignment hinzufügen (nur wenn noch nicht vorhanden)
      if (!currentAssignmentIds.includes(selectedAssignmentId)) {
        const updatedAssignments = [...currentAssignmentIds, selectedAssignmentId];
        
        console.log(`Adding assignment ${selectedAssignmentId} to set ${set.set_number}. Current:`, currentAssignmentIds, "Updated:", updatedAssignments);

        // Set aktualisieren
        const formData = new FormData();
        formData.append('set_assignment', JSON.stringify(updatedAssignments));

        const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`, {
          method: "PUT",
          body: formData
        });

        if (!response.ok) throw new Error("Fehler beim Hinzufügen des Sets");

        // Listen aktualisieren - direkt die neuen Daten holen
        const setsResponse = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`);
        if (setsResponse.ok) {
          const updatedSets = await setsResponse.json();
          setAllSets(updatedSets);
          
          // Mit den aktualisierten Daten die Zuordnungen neu laden
          await loadSetsForAssignmentWithData(selectedAssignmentId, updatedSets);
        }
        setSetModalError("");
      }

    } catch (error) {
      setSetModalError("Fehler beim Hinzufügen: " + error.message);
    }
  };

  // Set von SetGruppe entfernen
  const removeSetFromAssignment = async (setId) => {
    try {
      const set = allSets.find(s => s._id === setId);
      if (!set) return;

      // Aktuelle Set-Gruppen des Sets laden
      const currentAssignments = set.set_assignment ? 
        (Array.isArray(set.set_assignment) ? set.set_assignment : []) : [];
      
      // IDs extrahieren (falls populated objects)
      const currentAssignmentIds = currentAssignments.map(assignment => {
        return typeof assignment === 'object' && assignment._id ? assignment._id : assignment;
      });
      
      // Assignment entfernen
      const updatedAssignments = currentAssignmentIds.filter(id => id !== selectedAssignmentId && id.toString() !== selectedAssignmentId);
      
      console.log(`Removing assignment ${selectedAssignmentId} from set ${set.set_number}. Current:`, currentAssignmentIds, "Updated:", updatedAssignments);

      // Set aktualisieren
      const formData = new FormData();
      formData.append('set_assignment', JSON.stringify(updatedAssignments));

      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`, {
        method: "PUT",
        body: formData
      });

      if (!response.ok) throw new Error("Fehler beim Entfernen des Sets");

      // Listen aktualisieren - direkt die neuen Daten holen
      const setsResponse2 = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`);
      if (setsResponse2.ok) {
        const updatedSets = await setsResponse2.json();
        setAllSets(updatedSets);
        
        // Mit den aktualisierten Daten die Zuordnungen neu laden
        await loadSetsForAssignmentWithData(selectedAssignmentId, updatedSets);
      }
      setSetModalError("");

    } catch (error) {
      setSetModalError("Fehler beim Entfernen: " + error.message);
    }
  };

  // Multiple Sets hinzufügen (gefilterte Auswahl)
  const addFilteredSets = async () => {
    if (filteredSets.length === 0) return;
    
    if (!window.confirm(`Sollen alle ${filteredSets.length} gefilterten Sets zu dieser SetGruppe hinzugefügt werden?`)) return;

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
    setAvailableSetNames([]);
    
    // Copy-Bereich States zurücksetzen
    setShowCopyFromAssignmentSection(false);
    setSelectedSourceAssignment("");
    setSetsFromSourceAssignment([]);
    setSelectedSetsForCopy([]);
    
    try {
      // Sets immer neu laden um sicherzustellen, dass die neuesten Daten verwendet werden
      await loadAllSets();
      // Dann die Zuordnungen laden
      await loadSetsForAssignment(assignmentId);
      // Andere Set-Gruppen für Copy-Funktion laden
      loadOtherAssignments(assignmentId);
    } catch (error) {
      setSetModalError("Fehler beim Öffnen des Modals: " + error.message);
    }
  };

  // Set-Modal schließen
  const closeSetModal = () => {
    setShowSetModal(false);
    setSelectedAssignmentId(null);
    setAssignedSets([]);
    setFilteredAssignedSets([]);
    setAvailableSets([]);
    setFilteredSets([]);
    setSetModalError("");
    setSelectedManufacturer("");
    setSelectedSetName("");
    setAvailableSetNames([]);
    // Reset separate filters
    setAssignedManufacturerFilter("");
    setAssignedSetNameFilter("");
    setAvailableManufacturerFilter("");
    setAvailableSetNameFilter("");
    // Reset copy states
    setShowCopyFromAssignmentSection(false);
    setOtherAssignments([]);
    setSelectedSourceAssignment("");
    setSetsFromSourceAssignment([]);
    setSelectedSetsForCopy([]);
  };

  // Alle Nutzer laden
  const loadAllUsers = async () => {
    try {
      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`);
      if (!response.ok) throw new Error("Fehler beim Laden der Nutzer");
      const data = await response.json();
      console.log("Nutzer geladen:", data.length, "Nutzer");
      setAllUsers(data);
      return data;
    } catch (error) {
      console.error("Fehler beim Laden der Nutzer:", error);
      setUserModalError("Fehler beim Laden der Nutzer: " + error.message);
      return [];
    }
  };

  // Nutzer für Set-Gruppe filtern
  const filterUsersForAssignment = (users, assignmentId) => {
    const withAssignment = users.filter(user => 
      user.set_assignments && user.set_assignments.some(assignment => 
        assignment._id === assignmentId || assignment === assignmentId
      )
    );

    const withoutAssignment = users.filter(user => 
      !user.set_assignments || !user.set_assignments.some(assignment => 
        assignment._id === assignmentId || assignment === assignmentId
      )
    );

    // Alphabetisch sortieren
    const sortUsers = (userList) => {
      return userList.sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.id;
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.id;
        return nameA.localeCompare(nameB, 'de', { sensitivity: 'base' });
      });
    };

    setUsersWithAssignment(sortUsers([...withAssignment]));
    setUsersWithoutAssignment(sortUsers([...withoutAssignment]));
  };

  // Nutzer zu Set-Gruppe hinzufügen
  const addUserToAssignment = async (userId) => {
    try {
      const user = allUsers.find(u => u.id === userId);
      if (!user) return;

      const currentAssignments = user.set_assignments ? [...user.set_assignments] : [];
      const assignmentIds = currentAssignments.map(assignment => 
        typeof assignment === 'object' ? assignment._id : assignment
      );

      if (!assignmentIds.includes(selectedAssignmentForUsers)) {
        const updatedAssignments = [...assignmentIds, selectedAssignmentForUsers];

        const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/${userId}`, {
          method: "PUT",
          body: JSON.stringify({ set_assignments: updatedAssignments }),
        });

        if (!response.ok) throw new Error("Fehler beim Hinzufügen des Nutzers");

        // Nutzer-Listen aktualisieren
        const updatedUsers = await loadAllUsers();
        filterUsersForAssignment(updatedUsers, selectedAssignmentForUsers);
        setUserModalError("");
      }
    } catch (error) {
      setUserModalError("Fehler beim Hinzufügen: " + error.message);
    }
  };

  // Nutzer von Set-Gruppe entfernen
  const removeUserFromAssignment = async (userId) => {
    try {
      const user = allUsers.find(u => u.id === userId);
      if (!user) return;

      const currentAssignments = user.set_assignments ? [...user.set_assignments] : [];
      const assignmentIds = currentAssignments.map(assignment => 
        typeof assignment === 'object' ? assignment._id : assignment
      );

      const updatedAssignments = assignmentIds.filter(id => 
        id !== selectedAssignmentForUsers && id.toString() !== selectedAssignmentForUsers
      );

      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/${userId}`, {
        method: "PUT",
        body: JSON.stringify({ set_assignments: updatedAssignments }),
      });

      if (!response.ok) throw new Error("Fehler beim Entfernen des Nutzers");

      // Nutzer-Listen aktualisieren
      const updatedUsers = await loadAllUsers();
      filterUsersForAssignment(updatedUsers, selectedAssignmentForUsers);
      setUserModalError("");
    } catch (error) {
      setUserModalError("Fehler beim Entfernen: " + error.message);
    }
  };

  // Nutzer-Modal öffnen
  const openUserModal = async (assignmentId) => {
    setSelectedAssignmentForUsers(assignmentId);
    setShowUserModal(true);
    setUserModalError("");
    setUserSearchTerm("");
    setUserRoleFilter("");
    
    try {
      const users = await loadAllUsers();
      filterUsersForAssignment(users, assignmentId);
    } catch (error) {
      setUserModalError("Fehler beim Öffnen des Nutzer-Modals: " + error.message);
    }
  };

  // Nutzer-Modal schließen
  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedAssignmentForUsers(null);
    setAllUsers([]);
    setUsersWithAssignment([]);
    setUsersWithoutAssignment([]);
    setUserModalError("");
    setUserSearchTerm("");
    setUserRoleFilter("");
  };

  // Gefilterte Nutzer (mit Suche und Rollenfilter)
  const getFilteredUsers = (userList) => {
    let filtered = [...userList];

    // Suchfilter
    if (userSearchTerm) {
      const searchLower = userSearchTerm.toLowerCase();
      filtered = filtered.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
        const userId = (user.id || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(searchLower) || userId.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Rollenfilter
    if (userRoleFilter) {
      filtered = filtered.filter(user => user.role === userRoleFilter);
    }

    return filtered;
  };

  // Andere Set-Gruppen für Copy-Funktion laden
  const loadOtherAssignments = (currentAssignmentId) => {
    const others = setAssignments.filter(assignment => assignment._id !== currentAssignmentId);
    setOtherAssignments(others);
  };

  // Sets aus ausgewählter Quell-Set-Gruppe laden
  const loadSetsFromSourceAssignment = async (sourceAssignmentId) => {
    try {
      if (!sourceAssignmentId) {
        setSetsFromSourceAssignment([]);
        setSelectedSetsForCopy([]);
        return;
      }

      // Alle Sets mit der ausgewählten Quell-Assignment finden
      const setsWithSourceAssignment = allSets.filter(set => {
        if (!set.set_assignment || set.set_assignment.length === 0) return false;
        
        const assignments = Array.isArray(set.set_assignment) ? set.set_assignment : [];
        return assignments.some(assignment => {
          if (typeof assignment === 'object' && assignment._id) {
            return assignment._id === sourceAssignmentId || assignment._id.toString() === sourceAssignmentId;
          }
          return assignment === sourceAssignmentId || assignment.toString() === sourceAssignmentId;
        });
      });

      // Alphabetisch sortieren
      const sortedSets = setsWithSourceAssignment.sort((a, b) => {
        const aName = `${a.manufacturer?.name || ''} - ${a.set_name?.name?.de || a.set_name?.name || ''}`;
        const bName = `${b.manufacturer?.name || ''} - ${b.set_name?.name?.de || b.set_name?.name || ''}`;
        return aName.localeCompare(bName, 'de', { sensitivity: 'base' });
      });

      setSetsFromSourceAssignment(sortedSets);
      setSelectedSetsForCopy([]);
    } catch (error) {
      console.error("Fehler beim Laden der Sets aus Quell-Assignment:", error);
      setSetModalError("Fehler beim Laden der Sets: " + error.message);
    }
  };

  // Set für Copy auswählen/abwählen
  const toggleSetForCopy = (setId) => {
    setSelectedSetsForCopy(prev => 
      prev.includes(setId) 
        ? prev.filter(id => id !== setId)
        : [...prev, setId]
    );
  };

  // Alle Sets für Copy auswählen/abwählen
  const toggleAllSetsForCopy = () => {
    if (selectedSetsForCopy.length === setsFromSourceAssignment.length) {
      setSelectedSetsForCopy([]);
    } else {
      setSelectedSetsForCopy(setsFromSourceAssignment.map(set => set._id));
    }
  };

  // Ausgewählte Sets kopieren
  const copySelectedSets = async () => {
    if (selectedSetsForCopy.length === 0) return;

    const sourceAssignmentName = setAssignments.find(a => a._id === selectedSourceAssignment)?.name?.de;
    const targetAssignmentName = setAssignments.find(a => a._id === selectedAssignmentId)?.name?.de;

    if (!window.confirm(`Sollen ${selectedSetsForCopy.length} Sets von "${sourceAssignmentName}" zu "${targetAssignmentName}" kopiert werden?`)) return;

    try {
      let successCount = 0;
      for (const setId of selectedSetsForCopy) {
        await addSetToAssignment(setId);
        successCount++;
      }
      
      alert(`${successCount} Sets wurden erfolgreich von "${sourceAssignmentName}" zu "${targetAssignmentName}" kopiert.`);
      
      // Copy-Bereich schließen und zurücksetzen
      setShowCopyFromAssignmentSection(false);
      setSelectedSourceAssignment("");
      setSetsFromSourceAssignment([]);
      setSelectedSetsForCopy([]);
    } catch (error) {
      setSetModalError("Fehler beim Kopieren der Sets: " + error.message);
    }
  };

    useEffect(() => {
        loadSetAssignments();
    }, []);

    // Filter Effects
    useEffect(() => {
        if (showSetModal && assignedSets.length > 0) {
            applyAssignedFilters();
        }
    }, [assignedManufacturerFilter, assignedSetNameFilter, assignedSets]);

    useEffect(() => {
        if (showSetModal && availableSets.length > 0) {
            applyAvailableFilters();
        }
    }, [availableManufacturerFilter, availableSetNameFilter, availableSets]);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6">Set-Gruppen verwalten</h1>
                    
                    {/* Add new assignment form */}
                    <div className="flex gap-3 items-center mb-4">
                        <input
                            value={newAssignment}
                            onChange={e => setNewAssignment(e.target.value)}
                            placeholder="Neue SetGruppe"
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
                            Vorhandene SetGruppen ({setAssignments.length})
                        </h2>
                        
                        {setAssignments.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">
                                Keine SetGruppen vorhanden
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
                                                        onClick={() => openUserModal(_id)}
                                                        className="bg-purple-500 hover:bg-purple-600 text-black p-2 rounded-md transition-colors"
                                                        title="Nutzer verwalten"
                                                    >
                                                        <UserIcon className="h-4 w-4" />
                                                    </Button>
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

                                {/* Copy from other Set-Groups Section */}
                                <div className="mb-6">
                                    <Button 
                                        onClick={() => setShowCopyFromAssignmentSection(!showCopyFromAssignmentSection)}
                                        className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-md transition-colors"
                                    >
                                        {showCopyFromAssignmentSection ? 'Ausblenden' : 'Von anderer Set-Gruppe kopieren'}
                                    </Button>
                                </div>

                                {showCopyFromAssignmentSection && (
                                    <div className="bg-indigo-50 rounded-lg p-4 mb-6 border border-indigo-200">
                                        <h4 className="text-lg font-semibold text-indigo-900 mb-4">Sets von anderer Set-Gruppe kopieren</h4>
                                        
                                        {/* Quell-Set-Gruppe auswählen */}
                                        <div className="mb-4">
                                            <label className="block text-sm font-medium text-indigo-800 mb-2">Quell-Set-Gruppe auswählen:</label>
                                            <select
                                                value={selectedSourceAssignment}
                                                onChange={(e) => {
                                                    setSelectedSourceAssignment(e.target.value);
                                                    loadSetsFromSourceAssignment(e.target.value);
                                                }}
                                                className="w-full px-3 py-2 border border-indigo-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                            >
                                                <option value="">Bitte auswählen...</option>
                                                {otherAssignments.map(assignment => (
                                                    <option key={assignment._id} value={assignment._id}>
                                                        {assignment.name?.de || assignment.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Sets aus Quell-Assignment anzeigen */}
                                        {selectedSourceAssignment && (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <h5 className="text-sm font-semibold text-indigo-800">
                                                        Verfügbare Sets ({setsFromSourceAssignment.length})
                                                    </h5>
                                                    <div className="flex gap-2">
                                                        <Button 
                                                            onClick={toggleAllSetsForCopy}
                                                            className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-1 rounded text-xs transition-colors"
                                                        >
                                                            {selectedSetsForCopy.length === setsFromSourceAssignment.length ? 'Alle abwählen' : 'Alle auswählen'}
                                                        </Button>
                                                        <Button 
                                                            onClick={copySelectedSets}
                                                            disabled={selectedSetsForCopy.length === 0}
                                                            className={`px-3 py-1 text-xs rounded transition-colors ${
                                                                selectedSetsForCopy.length > 0 
                                                                    ? 'bg-orange-500 hover:bg-orange-600 text-black' 
                                                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            }`}
                                                        >
                                                            {selectedSetsForCopy.length} Sets kopieren
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                                    {setsFromSourceAssignment.length === 0 ? (
                                                        <p className="text-indigo-600 text-center py-4">
                                                            Keine Sets in dieser Set-Gruppe gefunden
                                                        </p>
                                                    ) : (
                                                        setsFromSourceAssignment.map(set => (
                                                            <div key={set._id} className="flex items-center justify-between p-3 bg-white border border-indigo-200 rounded-lg">
                                                                <div className="flex items-center flex-1">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedSetsForCopy.includes(set._id)}
                                                                        onChange={() => toggleSetForCopy(set._id)}
                                                                        className="mr-3 h-4 w-4 text-indigo-500 border-indigo-300 rounded focus:ring-indigo-500"
                                                                    />
                                                                    <div>
                                                                        <div className="font-medium text-gray-900">
                                                                            {set.manufacturer?.name} - {set.set_name?.name?.de || set.set_name?.name}
                                                                        </div>
                                                                        <div className="text-sm text-gray-600">
                                                                            Set-Nr: {set.set_number} | Status: {set.state?.name?.de || set.state?.name}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Zugeordnete Sets */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Zugeordnete Sets ({assignedSets.length})
                                            </h3>
                                        </div>
                                        
                                        {/* Filter für zugeordnete Sets */}
                                        <div className="bg-green-50 rounded-lg p-3 mb-4 border border-green-200">
                                            <h4 className="text-sm font-semibold text-green-900 mb-3">Filter für Bestand</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-green-800 mb-1">Hersteller</label>
                                                    <select
                                                        value={assignedManufacturerFilter}
                                                        onChange={(e) => setAssignedManufacturerFilter(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                                    >
                                                        <option value="">Alle</option>
                                                        {manufacturers.map(manufacturer => (
                                                            <option key={manufacturer} value={manufacturer}>
                                                                {manufacturer}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-green-800 mb-1">Set-Name</label>
                                                    <select
                                                        value={assignedSetNameFilter}
                                                        onChange={(e) => setAssignedSetNameFilter(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-green-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                                                    >
                                                        <option value="">Alle</option>
                                                        {setNames.map(setName => (
                                                            <option key={setName} value={setName}>
                                                                {setName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>
                                            <p className="text-xs text-green-600 mt-2">
                                                {filteredAssignedSets.length} von {assignedSets.length} Sets angezeigt
                                            </p>
                                        </div>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {filteredAssignedSets.length === 0 ? (
                                                <p className="text-gray-500 text-center py-8">
                                                    {assignedSets.length === 0 ? 'Keine Sets zugeordnet' : 'Keine Sets entsprechen den Filterkriterien'}
                                                </p>
                                            ) : (
                                                filteredAssignedSets.map(set => (
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
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Verfügbare Sets ({availableSets.length})
                                            </h3>
                                        </div>
                                        
                                        {/* Filter für verfügbare Sets */}
                                        <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                                            <h4 className="text-sm font-semibold text-blue-900 mb-3">Filter für verfügbare Sets</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">Hersteller</label>
                                                    <select
                                                        value={availableManufacturerFilter}
                                                        onChange={(e) => setAvailableManufacturerFilter(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                    >
                                                        <option value="">Alle</option>
                                                        {manufacturers.map(manufacturer => (
                                                            <option key={manufacturer} value={manufacturer}>
                                                                {manufacturer}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-blue-800 mb-1">Set-Name</label>
                                                    <select
                                                        value={availableSetNameFilter}
                                                        onChange={(e) => setAvailableSetNameFilter(e.target.value)}
                                                        className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                                        disabled={availableManufacturerFilter && availableSetNames.length === 0}
                                                    >
                                                        <option value="">Alle</option>
                                                        {(availableManufacturerFilter ? availableSetNames : setNames).map(setName => (
                                                            <option key={setName} value={setName}>
                                                                {setName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {availableManufacturerFilter && availableSetNames.length === 0 && (
                                                        <p className="text-xs text-blue-600 mt-1">
                                                            Keine Set-Namen für diesen Hersteller verfügbar
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center mt-3">
                                                <p className="text-xs text-blue-600">
                                                    {filteredSets.length} von {availableSets.length} Sets angezeigt
                                                </p>
                                                <Button 
                                                    onClick={addFilteredSets}
                                                    disabled={filteredSets.length === 0}
                                                    className={`px-3 py-1 text-xs rounded transition-colors ${
                                                        filteredSets.length > 0 
                                                            ? 'bg-green-500 hover:bg-green-600 text-black' 
                                                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                    }`}
                                                >
                                                    Alle {filteredSets.length} hinzufügen
                                                </Button>
                                            </div>
                                        </div>
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

                {/* User Management Modal */}
                {showUserModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        Nutzer für "{setAssignments.find(a => a._id === selectedAssignmentForUsers)?.name?.de}" verwalten
                                    </h2>
                                    <Button 
                                        onClick={closeUserModal}
                                        className="bg-gray-500 hover:bg-gray-600 text-black p-2 rounded-md transition-colors"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                                {userModalError && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                                        {userModalError}
                                    </div>
                                )}

                                {/* Filter und Suche */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Filter und Suche</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Suche (Name, ID, E-Mail)</label>
                                            <input
                                                type="text"
                                                value={userSearchTerm}
                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                                placeholder="Suchbegriff eingeben..."
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">Rolle</label>
                                            <select
                                                value={userRoleFilter}
                                                onChange={(e) => setUserRoleFilter(e.target.value)}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            >
                                                <option value="">Alle Rollen</option>
                                                <option value="student">Student</option>
                                                <option value="teacher">Lehrer</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Zugeordnete Nutzer */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Zugeordnete Nutzer ({getFilteredUsers(usersWithAssignment).length})
                                            </h3>
                                        </div>
                                        
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {getFilteredUsers(usersWithAssignment).length === 0 ? (
                                                <p className="text-gray-500 text-center py-8">
                                                    {usersWithAssignment.length === 0 ? 'Keine Nutzer zugeordnet' : 'Keine Nutzer entsprechen den Filterkriterien'}
                                                </p>
                                            ) : (
                                                getFilteredUsers(usersWithAssignment).map(user => (
                                                    <div key={user.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900">
                                                                {user.first_name && user.last_name 
                                                                    ? `${user.first_name} ${user.last_name}` 
                                                                    : user.id
                                                                }
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                ID: {user.id} | Rolle: {user.role}
                                                                {user.email && ` | ${user.email}`}
                                                            </div>
                                                            {/* Set-Gruppen Badges */}
                                                            {user.set_assignments && user.set_assignments.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {user.set_assignments.map((assignment) => {
                                                                        const assignmentName = typeof assignment === 'object' 
                                                                            ? assignment.name?.de || assignment.name
                                                                            : setAssignments.find(sa => sa._id === assignment)?.name?.de;
                                                                        
                                                                        if (assignmentName) {
                                                                            return (
                                                                                <Badge key={assignment._id || assignment} color="blue" className="text-xs">
                                                                                    {assignmentName}
                                                                                </Badge>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button 
                                                            onClick={() => removeUserFromAssignment(user.id)}
                                                            className="bg-red-500 hover:bg-red-600 text-black px-3 py-1 rounded-md text-sm transition-colors ml-3"
                                                        >
                                                            Entfernen
                                                        </Button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Verfügbare Nutzer */}
                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                Verfügbare Nutzer ({getFilteredUsers(usersWithoutAssignment).length})
                                            </h3>
                                        </div>
                                        
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {getFilteredUsers(usersWithoutAssignment).length === 0 ? (
                                                <p className="text-gray-500 text-center py-8">
                                                    {usersWithoutAssignment.length === 0 ? 'Alle Nutzer bereits zugeordnet' : 'Keine Nutzer entsprechen den Filterkriterien'}
                                                </p>
                                            ) : (
                                                getFilteredUsers(usersWithoutAssignment).map(user => (
                                                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                                                        <div className="flex-1">
                                                            <div className="font-medium text-gray-900">
                                                                {user.first_name && user.last_name 
                                                                    ? `${user.first_name} ${user.last_name}` 
                                                                    : user.id
                                                                }
                                                            </div>
                                                            <div className="text-sm text-gray-600">
                                                                ID: {user.id} | Rolle: {user.role}
                                                                {user.email && ` | ${user.email}`}
                                                            </div>
                                                            {/* Set-Gruppen Badges */}
                                                            {user.set_assignments && user.set_assignments.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {user.set_assignments.map((assignment) => {
                                                                        const assignmentName = typeof assignment === 'object' 
                                                                            ? assignment.name?.de || assignment.name
                                                                            : setAssignments.find(sa => sa._id === assignment)?.name?.de;
                                                                        
                                                                        if (assignmentName) {
                                                                            return (
                                                                                <Badge key={assignment._id || assignment} color="gray" className="text-xs">
                                                                                    {assignmentName}
                                                                                </Badge>
                                                                            );
                                                                        }
                                                                        return null;
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <Button 
                                                            onClick={() => addUserToAssignment(user.id)}
                                                            className="bg-purple-500 hover:bg-purple-600 text-black px-3 py-1 rounded-md text-sm transition-colors ml-3"
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

export default SetGruppe;
