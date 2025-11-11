import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../config';
import { useAuth, fetchUserData, authenticatedFetch } from './services/auth';
import { Heading, Subheading } from '../styles/catalyst/heading';
import { Input } from '../styles/catalyst/input';
import { Select } from '../styles/catalyst/select';
import { Badge } from '../styles/catalyst/badge';
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from '../styles/catalyst/dropdown';
import { ChevronDownIcon } from '@heroicons/react/16/solid';

export default function Nutzer() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatedUserId, setUpdatedUserId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // Suchbegriff
    const [selectedRole, setSelectedRole] = useState(''); // Rollenfilter

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
        const name = (user.name || '').toLowerCase();
        const email = (user.email || '').toLowerCase();
        const role = (user.role || '').toLowerCase();
        
        return id.includes(searchLower) || 
               name.includes(searchLower) || 
               email.includes(searchLower) ||
               role.includes(searchLower);
    }).sort((a, b) => {
        // Sortierung: Local-Benutzer zuerst, dann OTH-Benutzer alphabetisch nach Nachname
        
        // 1. Local-Benutzer immer vor OTH-Benutzern
        if (a.authMethod === 'local' && b.authMethod !== 'local') return -1;
        if (a.authMethod !== 'local' && b.authMethod === 'local') return 1;
        
        // 2. Innerhalb der Gruppen nach Nachname sortieren
        const getLastName = (user) => {
            if (!user.name) return user.id.toLowerCase();
            // Name-Format ist "Vorname Nachname", extrahiere Nachname
            const nameParts = user.name.trim().split(/\s+/);
            return nameParts[nameParts.length - 1].toLowerCase();
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
                    <p className="text-sm text-gray-600 mb-4">
                        Gesamt: <strong>{users.length}</strong> Benutzer
                        {(searchTerm || selectedRole) && ` • Angezeigt: `}
                        {(searchTerm || selectedRole) && <strong>{filteredUsers.length}</strong>}
                    </p>
                    
                    <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                        {/* Suchfeld */}
                        <div className="flex-1 w-full">
                            <Input
                                type="text"
                                placeholder="Nach ID, Name, E-Mail oder Rolle suchen..."
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
                                                    {user.name ? user.name.charAt(0).toUpperCase() : user.id.charAt(0).toUpperCase()}
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
                                                    {user.name && (
                                                        <p className="text-sm text-gray-700 truncate">
                                                            {user.name}
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
                                        
                                        {/* Rollenauswahl */}
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
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}