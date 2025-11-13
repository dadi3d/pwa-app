import React, { useEffect, useState } from 'react';
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

    // Modal-States für Benutzer hinzufügen
    const [showAddModal, setShowAddModal] = useState(false);
    const [newUser, setNewUser] = useState({
        id: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'student'
    });
    const [addModalMessage, setAddModalMessage] = useState('');
    const [addModalLoading, setAddModalLoading] = useState(false);

    const [userId, setUserId] = useState('');
    const [userRole, setUserRole] = useState('student');
    const token = useAuth(state => state.token);

    useEffect(() => {
        const loadUsers = async () => {
            try {
                const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`);
                const data = await res.json();
                setUsers(data);
                setLoading(false);
            } catch (error) {
                console.error('Fehler beim Laden der Nutzer:', error);
                setLoading(false);
            }
        };
        
        loadUsers();
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

    const handleRoleChange = async (id, newRole) => {
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
                    authMethod: 'local'
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
                    authMethod: 'local'
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
                    role: 'student'
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
                                className="bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-xl hover:border-orange-500 transition-all duration-200 overflow-hidden h-[100px]"
                            >
                                <div className="p-5 h-full">
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 h-full">
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
                                            role: 'student'
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
                                            role: 'student'
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
        </div>
    );
}