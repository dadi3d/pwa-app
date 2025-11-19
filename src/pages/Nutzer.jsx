import React, { useEffect, useState, useCallback } from 'react';
import { MAIN_VARIABLES } from '../config';
import { useAuth, fetchUserData, authenticatedFetch } from './services/auth';
import { Heading, Subheading } from '../styles/catalyst/heading';
import { Input } from '../styles/catalyst/input';
import { Select } from '../styles/catalyst/select';
import { Badge } from '../styles/catalyst/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '../styles/catalyst/dropdown';
import { ChevronDownIcon, PlusIcon, TrashIcon } from '@heroicons/react/16/solid';

export default function Nutzer() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatedUserId, setUpdatedUserId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // Suchbegriff
    const [selectedRole, setSelectedRole] = useState(''); // Rollenfilter
    const [setAssignments, setSetAssignments] = useState([]); // Verfügbare Set-Gruppen

    // Berechtigungen Modal States
    const [showPermissionsModal, setShowPermissionsModal] = useState(false);
    const [selectedUserForPermissions, setSelectedUserForPermissions] = useState(null);
    const [allSets, setAllSets] = useState([]);
    const [userSetAssignments, setUserSetAssignments] = useState([]);
    const [userIndividualSets, setUserIndividualSets] = useState([]);
    const [permissionsModalError, setPermissionsModalError] = useState('');
    
    // Filter States für Berechtigungen Modal
    const [setGroupFilter, setSetGroupFilter] = useState('');
    const [setSearchFilter, setSetSearchFilter] = useState('');
    const [filteredIndividualSets, setFilteredIndividualSets] = useState([]);

    // Modal-States für Benutzer hinzufügen
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({
        id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'student',
        set_assignments: []
    });
    const [addModalMessage, setAddModalMessage] = useState('');
    const [addModalLoading, setAddModalLoading] = useState(false);

    const [userId, setUserId] = useState('');
    const [userRole, setUserRole] = useState('student');
    const token = useAuth(state => state.token);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [usersRes, setAssignmentsRes, setsRes] = await Promise.all([
                    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`),
                    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`)
                        .catch(err => {
                            console.warn('Set-Gruppen konnten nicht geladen werden:', err);
                            return { json: () => [] }; // Fallback zu leerem Array
                        }),
                    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    }).catch(err => {
                        console.warn('Sets konnten nicht geladen werden:', err);
                        return { ok: false, json: () => [] }; // Fallback
                    })
                ]);
                
                const usersData = await usersRes.json();
                const setAssignmentsData = await setAssignmentsRes.json();
                
                console.log('Geladene Nutzer:', usersData.length);
                console.log('Geladene Set-Gruppen:', setAssignmentsData.length, setAssignmentsData);
                
                setUsers(usersData);
                setSetAssignments(Array.isArray(setAssignmentsData) ? setAssignmentsData : []);
                
                // Sets für die Badge-Anzeige laden
                if (setsRes.ok) {
                    const setsData = await setsRes.json();
                    console.log('Geladene Sets für Badge-Anzeige:', setsData.length);
                    setAllSets(setsData);
                }
                
                setLoading(false);
            } catch (error) {
                console.error('Fehler beim Laden der Daten:', error);
                // Lade zumindest die Nutzer wenn möglich
                try {
                    const usersRes = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`);
                    const usersData = await usersRes.json();
                    setUsers(usersData);
                    setSetAssignments([]); // Leer wenn Set-Gruppen nicht laden
                } catch (userError) {
                    console.error('Auch das Laden der Nutzer ist fehlgeschlagen:', userError);
                }
                setLoading(false);
            }
        };
        
        loadData();
        fetchUserId();
    }, [token]);

    // Filter für einzelne Sets anwenden (einfache Textsuche)
    const applyIndividualSetsFilter = useCallback((searchText) => {
        console.log('Applying simple filter:', { searchText, allSetsLength: allSets.length });
        
        let filtered = [...allSets]; // Kopie erstellen
        
        if (searchText && searchText.trim()) {
            const searchLower = searchText.toLowerCase();
            filtered = filtered.filter(set => {
                const manufacturerName = (set.manufacturer?.name || '').toLowerCase();
                const setName = (set.set_name?.name?.de || set.set_name?.name || '').toLowerCase();
                const combinedName = `${manufacturerName} ${setName}`.toLowerCase();
                
                return manufacturerName.includes(searchLower) || 
                       setName.includes(searchLower) || 
                       combinedName.includes(searchLower);
            });
            console.log('After text filter:', filtered.length);
        }
        
        // Alphabetisch sortieren nach Hersteller-Set-Name
        filtered = filtered.sort((a, b) => {
            const aName = `${a.manufacturer?.name || ''} - ${a.set_name?.name?.de || a.set_name?.name || ''}`;
            const bName = `${b.manufacturer?.name || ''} - ${b.set_name?.name?.de || b.set_name?.name || ''}`;
            return aName.localeCompare(bName, 'de', { sensitivity: 'base' });
        });
        
        console.log('Final filtered sets:', filtered.length);
        setFilteredIndividualSets(filtered);
    }, [allSets]);

    // Filter-Effekte für das Berechtigungen-Modal
    useEffect(() => {
        if (showPermissionsModal && allSets.length > 0) {
            console.log('Filter effect triggered, applying initial filter');
            applyIndividualSetsFilter(''); // Initial ohne Filter
        }
    }, [showPermissionsModal, applyIndividualSetsFilter]);

    // Benutzer-ID aus JWT holen
    async function fetchUserId() {
        try {
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/user-info`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setUserId(data.id);
                setUserRole(data.role);
            }
        } catch (err) {
            console.error('Fehler beim Laden der Benutzer-ID:', err);
        }
    }

    // Alle Sets laden für Berechtigungen Modal
    const loadAllSets = async () => {
        try {
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                console.log('Geladene Sets:', data.length, data.slice(0, 3)); // Debug log
                setAllSets(data);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Sets:', error);
        }
    };

    // Berechtigungen Modal öffnen
    const openPermissionsModal = async (user) => {
        setSelectedUserForPermissions(user);
        setPermissionsModalError('');
        
        // Lade alle Sets falls noch nicht geladen
        if (allSets.length === 0) {
            await loadAllSets();
        }
        
        // Separiere Set-Gruppen und einzelne Sets
        const setGroupIds = [];
        const individualSetIds = [];
        
        if (user.set_assignments && user.set_assignments.length > 0) {
            for (const assignmentId of user.set_assignments) {
                // Null-Check für assignmentId
                if (!assignmentId) {
                    console.warn('Null assignmentId found in user.set_assignments:', assignmentId);
                    continue;
                }
                
                // Prüfe ob es eine Set-Gruppe ist
                const isSetGroup = setAssignments.some(sg => sg._id === assignmentId);
                if (isSetGroup) {
                    setGroupIds.push(assignmentId);
                } else {
                    // Es ist ein einzelnes Set
                    individualSetIds.push(assignmentId);
                }
            }
        }
        
        setUserSetAssignments(setGroupIds);
        setUserIndividualSets(individualSetIds);
        
        // Reset Filter beim Öffnen
        setSetGroupFilter('');
        setSetSearchFilter('');
        
        // Initial Sets filtern
        setFilteredIndividualSets(allSets);
        
        // Initial Filter anwenden
        setTimeout(() => applyIndividualSetsFilter(''), 0);
        
        setShowPermissionsModal(true);
    };

    // Berechtigungen Modal schließen
    const closePermissionsModal = () => {
        setShowPermissionsModal(false);
        setSelectedUserForPermissions(null);
        setUserSetAssignments([]);
        setUserIndividualSets([]);
        setPermissionsModalError('');
        setSetGroupFilter('');
        setSetSearchFilter('');
        setFilteredIndividualSets([]);
    };

    // Set-Gruppe hinzufügen/entfernen
    const toggleSetGroup = (setGroupId) => {
        setUserSetAssignments(prev => 
            prev.includes(setGroupId) 
                ? prev.filter(id => id !== setGroupId)
                : [...prev, setGroupId]
        );
    };

    // Einzelnes Set hinzufügen/entfernen
    const toggleIndividualSet = (setId) => {
        setUserIndividualSets(prev => 
            prev.includes(setId) 
                ? prev.filter(id => id !== setId)
                : [...prev, setId]
        );
    };



    // Berechtigungen speichern
    const savePermissions = async () => {
        if (!selectedUserForPermissions) return;
        
        setPermissionsModalError('');
        
        try {
            const combinedAssignments = [...userSetAssignments, ...userIndividualSets];
            
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/${selectedUserForPermissions.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    set_assignments: combinedAssignments
                })
            });

            if (response.ok) {
                // Nutzer-Liste neu laden
                const updatedResponse = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (updatedResponse.ok) {
                    const updatedUsers = await updatedResponse.json();
                    setUsers(updatedUsers);
                }
                
                closePermissionsModal();
            } else {
                const errorData = await response.json();
                setPermissionsModalError(errorData.error || 'Fehler beim Speichern der Berechtigungen');
            }
        } catch (error) {
            console.error('Fehler beim Speichern der Berechtigungen:', error);
            setPermissionsModalError('Fehler beim Speichern der Berechtigungen');
        }
    };    const handleRoleChange = async (id, newRole) => {
        try {
            await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ role: newRole }),
            });
            setUsers(users => users.map(u => u.id === id ? { ...u, role: newRole } : u));
        } catch (error) {
            console.error('Fehler beim Ändern der Rolle:', error);
        }
        setUpdatedUserId(id);
        setTimeout(() => setUpdatedUserId(null), 2000);
    };



    const handleAddUser = async () => {
        setAddModalMessage('');
        setAddModalLoading(true);

        // Validierung
        if (!newUser.id.trim()) {
            setAddModalMessage('Benutzer-ID ist erforderlich');
            setAddModalLoading(false);
            return;
        }
        if (!newUser.password.trim()) {
            setAddModalMessage('Passwort ist erforderlich');
            setAddModalLoading(false);
            return;
        }
        if (newUser.password.length < 6) {
            setAddModalMessage('Passwort muss mindestens 6 Zeichen lang sein');
            setAddModalLoading(false);
            return;
        }

        try {
            const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`, {
                method: 'POST',
                body: JSON.stringify({
                    id: newUser.id.trim(),
                    password: newUser.password,
                    first_name: newUser.first_name.trim() || undefined,
                    last_name: newUser.last_name.trim() || undefined,
                    email: newUser.email.trim() || undefined,
                    role: newUser.role,
                    authMethod: 'local',
                    set_assignments: newUser.set_assignments || []
                }),
            });

            if (response.ok) {
                // Benutzer zur Liste hinzufügen
                const createdUser = {
                    id: newUser.id.trim(),
                    first_name: newUser.first_name.trim() || null,
                    last_name: newUser.last_name.trim() || null,
                    email: newUser.email.trim() || null,
                    role: newUser.role,
                    authMethod: 'local',
                    set_assignments: newUser.set_assignments ? 
                        newUser.set_assignments.map(id => setAssignments.find(sa => sa._id === id)).filter(Boolean) : []
                };
                setUsers(prev => [...prev, createdUser]);
                
                // Modal schließen und zurücksetzen
                setShowAddModal(false);
                setNewUser({
                    id: '',
                    first_name: '',
                    last_name: '',
                    email: '',
                    password: '',
                    role: 'student',
                    set_assignments: []
                });
                setAddModalMessage('');
            } else {
                const errorData = await response.json();
                setAddModalMessage(errorData.error || 'Fehler beim Erstellen des Benutzers');
            }
        } catch (error) {
            console.error('Fehler beim Erstellen des Benutzers:', error);
            setAddModalMessage('Netzwerkfehler beim Erstellen des Benutzers');
        }
        setAddModalLoading(false);
    };

    const handleDeleteUser = async (id) => {
        if (!confirm(`Möchten Sie den Benutzer "${id}" wirklich löschen?`)) {
            return;
        }

        try {
            const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setUsers(prev => prev.filter(user => user.id !== id));
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Fehler beim Löschen des Benutzers');
            }
        } catch (error) {
            console.error('Fehler beim Löschen des Benutzers:', error);
            alert('Netzwerkfehler beim Löschen des Benutzers');
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-zinc-500 dark:text-zinc-400">Lade Nutzer...</p>
            </div>
        </div>
    );

    // Filter-Logik: Zeige nur Nutzer, deren ID, Name, E-Mail oder Rolle den Filter enthält
    const filteredUsers = users.filter(user => {
        // Rollenfilter
        if (selectedRole && user.role !== selectedRole) {
            return false;
        }
        
        // Suchbegriff-Filter
        if (!searchTerm) return true;
        
        const searchLower = searchTerm.toLowerCase();
        const id = (user.id || '').toString().toLowerCase();
        const firstName = (user.first_name || '').toLowerCase();
        const lastName = (user.last_name || '').toLowerCase();
        const fullName = `${firstName} ${lastName}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        
        return id.includes(searchLower) || 
               firstName.includes(searchLower) || 
               lastName.includes(searchLower) ||
               fullName.includes(searchLower) ||
               email.includes(searchLower) ||
               role.includes(searchLower);
    }).sort((a, b) => {
        // Sortierung: Local-Benutzer zuerst, dann OTH-Benutzer alphabetisch nach Nachname
        
        // 1. Local-Benutzer immer vor OTH-Benutzern
        if (a.authMethod === 'local' && b.authMethod !== 'local') return -1;
        if (a.authMethod !== 'local' && b.authMethod === 'local') return 1;
        
        // 2. Innerhalb der Gruppen nach Nachname sortieren
        const getLastName = (user) => {
            if (user.last_name) return user.last_name.toLowerCase();
            if (user.first_name) return user.first_name.toLowerCase();
            return user.id.toLowerCase();
        };
        
        const lastNameA = getLastName(a);
        const lastNameB = getLastName(b);
        
        return lastNameA.localeCompare(lastNameB, 'de');
    });

    // Verfügbare Rollen für Filter
    const availableRoles = [
        { value: 'student', label: 'Student' },
        { value: 'teacher', label: 'Lehrer' },
        { value: 'admin', label: 'Admin' }
    ];

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-center text-3xl font-semibold text-gray-800 mb-8">Benutzerverwaltung</h1>
            
            {/* Filter und Suchbereich */}
            <div className="max-w-4xl mx-auto mb-8">
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                        <p className="text-sm text-gray-600">
                            Gesamt: <strong>{users.length}</strong> Benutzer
                            {(searchTerm || selectedRole) && ` • Angezeigt: `}
                            {(searchTerm || selectedRole) && <strong>{filteredUsers.length}</strong>}
                        </p>
                        
                        {/* Benutzer hinzufügen Button */}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black font-medium rounded-lg transition-colors duration-200 shadow-sm"
                        >
                            <PlusIcon className="size-4 mr-2" />
                            Benutzer hinzufügen
                        </button>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        {/* Suchfeld */}
                        <div className="flex-1 w-full">
                            <Input
                                type="text"
                                placeholder="Nach ID, Vor-/Nachname, E-Mail oder Rolle suchen..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        
                        {/* Rollen-Filter */}
                        <div className="flex-shrink-0 w-full sm:w-auto">
                            <Dropdown>
                                <DropdownButton outline className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full sm:w-auto">
                                    <span className="mr-2">
                                        {selectedRole ? availableRoles.find(r => r.value === selectedRole)?.label : "Alle Rollen"}
                                    </span>
                                    <ChevronDownIcon className="size-4" />
                                </DropdownButton>
                                <DropdownMenu className="border border-gray-200">
                                    <DropdownItem onClick={() => setSelectedRole('')}>
                                        Alle Rollen
                                    </DropdownItem>
                                    {availableRoles.map((role) => (
                                        <DropdownItem 
                                            key={role.value} 
                                            onClick={() => setSelectedRole(role.value)}
                                        >
                                            {role.label}
                                        </DropdownItem>
                                    ))}
                                </DropdownMenu>
                            </Dropdown>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benutzerliste */}
            <div className="max-w-4xl mx-auto">
                {filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-md p-12 border border-gray-200 text-center">
                        <p className="text-gray-500 text-lg">
                            {searchTerm || selectedRole 
                                ? 'Keine Benutzer für die gewählten Filter gefunden.' 
                                : 'Keine Benutzer gefunden.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredUsers.map(user => (
                            <div 
                                key={user.id} 
                                className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl hover:border-orange-500 transition-all duration-200 overflow-hidden"
                            >
                                <div className="p-5">
                                    <div className="flex flex-col gap-4">
                                        {/* Obere Zeile: Benutzerinformationen und Rolle */}
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            {/* Benutzerinformationen */}
                                            <div className="flex-1 min-w-0 flex items-center">
                                                <div className="flex items-center gap-3 w-full">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-md flex-shrink-0">
                                                        {user.first_name ? user.first_name.charAt(0).toUpperCase() : user.id.charAt(0).toUpperCase()}
                                                    </div>
                                                    
                                                    {/* Linke Spalte: Badge und ID */}
                                                    <div className="flex-shrink-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            {user.authMethod === 'oth' && (
                                                                <Badge color="blue">OTH</Badge>
                                                            )}
                                                            {user.authMethod === 'local' && (
                                                                <Badge color="purple">LOCAL</Badge>
                                                            )}
                                                        </div>
                                                        <span className="font-semibold text-gray-900 text-lg block">
                                                            {user.id}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Rechte Spalte: Name und Email */}
                                                    <div className="flex-1 min-w-0 ml-4">
                                                        {(user.first_name || user.last_name) && (
                                                            <p className="text-sm text-gray-700 truncate">
                                                                {[user.first_name, user.last_name].filter(Boolean).join(' ')}
                                                            </p>
                                                        )}
                                                        {user.email && (
                                                            <p className="text-xs text-gray-500 truncate">
                                                                {user.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Rollenauswahl und Aktionen */}
                                            <div className="flex items-center gap-3 lg:flex-shrink-0">
                                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:block">
                                                    Rolle:
                                                </label>
                                                <Select
                                                    value={user.role || 'student'}
                                                    onChange={e => handleRoleChange(user.id, e.target.value)}
                                                    className="w-full sm:w-40"
                                                >
                                                    <option value="student">Student</option>
                                                    <option value="teacher">Lehrer</option>
                                                    <option value="admin">Admin</option>
                                                </Select>
                                                {updatedUserId === user.id && (
                                                    <span className="text-green-600 text-2xl flex-shrink-0 animate-pulse">
                                                        ✓
                                                    </span>
                                                )}
                                                {/* Berechtigungen Button */}
                                                <button
                                                    onClick={() => openPermissionsModal(user)}
                                                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                                                    title="Berechtigungen verwalten"
                                                >
                                                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                    </svg>
                                                </button>
                                                {/* Löschen Button */}
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                                                    title="Benutzer löschen"
                                                >
                                                    <TrashIcon className="size-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Untere Zeile: Berechtigungen Anzeige */}
                                        <div className="border-t pt-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                                    Zugewiesene Berechtigungen:
                                                </label>
                                                <div className="flex-1">
                                                    <span className="text-sm text-gray-600">
                                                        {user.set_assignments && user.set_assignments.length > 0 
                                                            ? `${user.set_assignments.length} Berechtigung(en) zugewiesen`
                                                            : "Keine Berechtigungen zugewiesen"
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            {/* Anzeige der zugewiesenen Berechtigungen */}
                                            {user.set_assignments && user.set_assignments.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {user.set_assignments.map((assignmentId) => {
                                                        if (!assignmentId) return null;
                                                        
                                                        // Versuche zuerst als Set-Gruppe
                                                        const setGroup = setAssignments.find(sg => sg._id === assignmentId);
                                                        if (setGroup) {
                                                            return (
                                                                <Badge key={assignmentId} color="blue" className="text-xs">
                                                                    Gruppe: {setGroup.name?.de || setGroup.name || 'Unbekannte Gruppe'}
                                                                </Badge>
                                                            );
                                                        }
                                                        
                                                        // Dann als einzelnes Set
                                                        const individualSet = allSets.find(set => set._id === assignmentId);
                                                        if (individualSet) {
                                                            return (
                                                                <Badge key={assignmentId} color="green" className="text-xs">
                                                                    Set: {individualSet.set_name?.name?.de || 'Unbekanntes Set'}
                                                                </Badge>
                                                            );
                                                        }
                                                        
                                                        // Fallback für unbekannte IDs
                                                        return (
                                                            <Badge key={assignmentId} color="gray" className="text-xs">
                                                                Unbekannt: {assignmentId}
                                                            </Badge>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal für Benutzer hinzufügen */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Neuen Benutzer hinzufügen
                                </h2>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewUser({
                                            id: '',
                                            first_name: '',
                                            last_name: '',
                                            email: '',
                                            password: '',
                                            role: 'student',
                                            set_assignments: []
                                        });
                                        setAddModalMessage('');
                                    }}
                                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    <span className="sr-only">Schließen</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Benutzer-ID */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Benutzer-ID *
                                    </label>
                                    <Input
                                        type="text"
                                        value={newUser.id}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, id: e.target.value }))}
                                        placeholder="z.B. max.mustermann"
                                        className="w-full"
                                        disabled={addModalLoading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Eindeutige ID für den Benutzer (nur lokale Authentifizierung)
                                    </p>
                                </div>

                                {/* Passwort */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Passwort *
                                    </label>
                                    <Input
                                        type="password"
                                        value={newUser.password}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                                        placeholder="Mindestens 6 Zeichen"
                                        className="w-full"
                                        disabled={addModalLoading}
                                    />
                                </div>

                                {/* Vorname */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Vorname (optional)
                                    </label>
                                    <Input
                                        type="text"
                                        value={newUser.first_name}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, first_name: e.target.value }))}
                                        placeholder="Max"
                                        className="w-full"
                                        disabled={addModalLoading}
                                    />
                                </div>

                                {/* Nachname */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nachname (optional)
                                    </label>
                                    <Input
                                        type="text"
                                        value={newUser.last_name}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, last_name: e.target.value }))}
                                        placeholder="Mustermann"
                                        className="w-full"
                                        disabled={addModalLoading}
                                    />
                                </div>

                                {/* E-Mail */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        E-Mail (optional)
                                    </label>
                                    <Input
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="max.mustermann@example.com"
                                        className="w-full"
                                        disabled={addModalLoading}
                                    />
                                </div>

                                {/* Set-Gruppen */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Set-Gruppen Zuweisung (optional)
                                    </label>
                                    <div className="space-y-2">
                                        {/* Debug Info */}
                                        <p className="text-xs text-gray-400">
                                            {setAssignments.length === 0 
                                                ? "Keine Set-Gruppen verfügbar" 
                                                : `${setAssignments.length} Set-Gruppe(n) verfügbar`
                                            }
                                        </p>
                                        
                                        {setAssignments.length > 0 ? (
                                            <div className="border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                                                <div className="space-y-2">
                                                    {setAssignments.map((assignment) => {
                                                        const isSelected = newUser.set_assignments?.includes(assignment._id);
                                                        return (
                                                            <label 
                                                                key={assignment._id}
                                                                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        const currentAssignments = newUser.set_assignments || [];
                                                                        const newAssignments = e.target.checked 
                                                                            ? [...currentAssignments, assignment._id]
                                                                            : currentAssignments.filter(id => id !== assignment._id);
                                                                        setNewUser(prev => ({ ...prev, set_assignments: newAssignments }));
                                                                    }}
                                                                    disabled={addModalLoading}
                                                                    className="text-orange-500 focus:ring-orange-500"
                                                                />
                                                                <span className="text-sm text-gray-700">
                                                                    {assignment.name?.de || assignment.name}
                                                                </span>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-3">
                                                Keine Set-Gruppen verfügbar. Bitte erstellen Sie zuerst Set-Gruppen in der Equipment-Verwaltung.
                                            </div>
                                        )}
                                        
                                        {/* Anzeige der ausgewählten Sets */}
                                        {newUser.set_assignments && newUser.set_assignments.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {newUser.set_assignments.map((assignmentId) => {
                                                    const assignment = setAssignments.find(sa => sa._id === assignmentId);
                                                    return assignment && assignment.name ? (
                                                        <Badge key={assignmentId} color="green" className="text-xs">
                                                            {assignment.name?.de || assignment.name}
                                                        </Badge>
                                                    ) : null;
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Rolle */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rolle *
                                    </label>
                                    <Select
                                        value={newUser.role}
                                        onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                                        className="w-full"
                                        disabled={addModalLoading}
                                    >
                                        <option value="student">Student</option>
                                        <option value="teacher">Lehrer</option>
                                        <option value="admin">Admin</option>
                                    </Select>
                                </div>

                                {/* Fehlermeldung */}
                                {addModalMessage && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-600">{addModalMessage}</p>
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewUser({
                                            id: '',
                                            first_name: '',
                                            last_name: '',
                                            email: '',
                                            password: '',
                                            role: 'student',
                                            set_assignments: []
                                        });
                                        setAddModalMessage('');
                                    }}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                                    disabled={addModalLoading}
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={handleAddUser}
                                    disabled={addModalLoading || !newUser.id.trim() || !newUser.password.trim()}
                                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-black rounded-lg font-medium transition-colors duration-200 flex items-center justify-center"
                                >
                                    {addModalLoading ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Erstelle...
                                        </>
                                    ) : (
                                        'Benutzer erstellen'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Berechtigungen Modal */}
            {showPermissionsModal && selectedUserForPermissions && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-gray-900">
                                    Berechtigungen verwalten - {selectedUserForPermissions.id}
                                </h2>
                                <button
                                    onClick={closePermissionsModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                                >
                                    <span className="sr-only">Schließen</span>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {permissionsModalError && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{permissionsModalError}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Set-Gruppen Sektion */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                                        Set-Gruppen
                                    </h3>
                                    
                                    {/* Set-Gruppen Filter */}
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Set-Gruppen filtern..."
                                            value={setGroupFilter}
                                            onChange={(e) => setSetGroupFilter(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Set-Gruppen Liste */}
                                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                        {(() => {
                                            const filteredSetGroups = setAssignments.filter(sg => {
                                                if (!setGroupFilter) return true;
                                                const name = sg.name?.de || sg.name || '';
                                                return name.toLowerCase().includes(setGroupFilter.toLowerCase());
                                            });
                                            
                                            if (filteredSetGroups.length === 0) {
                                                return (
                                                    <div className="text-center py-8 text-gray-500">
                                                        <p>Keine Set-Gruppen gefunden</p>
                                                        {setGroupFilter && (
                                                            <p className="text-xs mt-1">Filter: "{setGroupFilter}"</p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            
                                            return filteredSetGroups.map(setGroup => {
                                                const isCurrentlySelected = userSetAssignments.includes(setGroup._id);
                                                const wasOriginallyAssigned = selectedUserForPermissions?.set_assignments?.some(
                                                    assignmentId => assignmentId === setGroup._id
                                                );
                                                
                                                return (
                                                    <div
                                                        key={setGroup._id}
                                                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                                            isCurrentlySelected
                                                                ? 'bg-blue-50 border-blue-400 shadow-sm'
                                                                : wasOriginallyAssigned
                                                                ? 'bg-orange-50 border-orange-400 hover:bg-orange-100'
                                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                        onClick={() => toggleSetGroup(setGroup._id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-medium">
                                                                    {setGroup.name?.de || setGroup.name || 'Unbekannte Set-Gruppe'}
                                                                </span>
                                                                {wasOriginallyAssigned && !isCurrentlySelected && (
                                                                    <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                                                        Aktuell zugewiesen
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isCurrentlySelected && (
                                                                    <span className="text-blue-600 font-bold text-lg">✓</span>
                                                                )}
                                                                {wasOriginallyAssigned && (
                                                                    <span className="text-orange-500 text-lg">●</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Einzelne Sets Sektion */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
                                        Einzelne Sets
                                    </h3>
                                    
                                    {/* Filter für einzelne Sets */}
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            placeholder="Sets durchsuchen (Hersteller oder Set-Name)..."
                                            value={setSearchFilter}
                                            onChange={(e) => {
                                                const searchText = e.target.value;
                                                setSetSearchFilter(searchText);
                                                applyIndividualSetsFilter(searchText);
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                        
                                        <div className="text-xs text-gray-500">
                                            {filteredIndividualSets.length} von {allSets.length} Sets gefunden
                                            {setSearchFilter && ` (Filter: "${setSearchFilter}")`}
                                        </div>
                                    </div>

                                    {/* Sets Liste */}
                                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
                                        {(() => {
                                            console.log('Filtered Sets:', filteredIndividualSets.length, {
                                                setSearchFilter,
                                                totalSets: allSets.length
                                            }); // Debug log
                                            
                                            if (filteredIndividualSets.length === 0) {
                                                return (
                                                    <div className="text-center py-8 text-gray-500">
                                                        <p>Keine Sets gefunden</p>
                                                        {setSearchFilter && (
                                                            <p className="text-xs mt-1">
                                                                Suchbegriff: "{setSearchFilter}"
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            
                                            return filteredIndividualSets.map(set => {
                                                const isCurrentlySelected = userIndividualSets.includes(set._id);
                                                const wasOriginallyAssigned = selectedUserForPermissions?.set_assignments?.some(
                                                    assignmentId => assignmentId === set._id
                                                );
                                                
                                                return (
                                                    <div
                                                        key={set._id}
                                                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                                                            isCurrentlySelected
                                                                ? 'bg-green-50 border-green-400 shadow-sm'
                                                                : wasOriginallyAssigned
                                                                ? 'bg-orange-50 border-orange-400 hover:bg-orange-100'
                                                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                                        }`}
                                                        onClick={() => toggleIndividualSet(set._id)}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <div className="font-medium">
                                                                        {(set.manufacturer?.name || 'Unbekannter Hersteller')} - {set.set_name?.name?.de || 'Unbekanntes Set'}
                                                                    </div>
                                                                    {wasOriginallyAssigned && !isCurrentlySelected && (
                                                                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                                                            Aktuell zugewiesen
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {isCurrentlySelected && (
                                                                    <span className="text-green-600 font-bold text-lg">✓</span>
                                                                )}
                                                                {wasOriginallyAssigned && (
                                                                    <span className="text-orange-500 text-lg">●</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Legende */}
                            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-3">Legende & Zusammenfassung</h4>
                                
                                {/* Legende */}
                                <div className="flex flex-wrap gap-4 mb-4 text-xs">
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-blue-50 border-2 border-blue-400 rounded"></div>
                                        <span>Neu ausgewählt</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 bg-orange-50 border-2 border-orange-400 rounded"></div>
                                        <span>Aktuell zugewiesen</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-blue-600 font-bold">✓</span>
                                        <span>Wird zugewiesen</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-orange-500">●</span>
                                        <span>Ursprünglich zugewiesen</span>
                                    </div>
                                </div>
                                
                                {/* Zusammenfassung */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm border-t pt-3">
                                    <div>
                                        <span className="font-medium">Set-Gruppen:</span>
                                        <span className="ml-2 text-blue-600 font-bold">{userSetAssignments.length}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium">Einzelne Sets:</span>
                                        <span className="ml-2 text-green-600 font-bold">{userIndividualSets.length}</span>
                                    </div>
                                    <div>
                                        <span className="font-medium">Gesamt:</span>
                                        <span className="ml-2 text-purple-600 font-bold">{userSetAssignments.length + userIndividualSets.length}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Aktionen */}
                            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                                <button
                                    onClick={closePermissionsModal}
                                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors duration-200"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={savePermissions}
                                    className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black rounded-md font-medium transition-colors"
                                >
                                    Berechtigungen speichern
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}