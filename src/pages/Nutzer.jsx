import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../config';
import { useAuth, fetchUserData } from './services/auth';

export default function Nutzer() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [updatedUserId, setUpdatedUserId] = useState(null);
    const [filter, setFilter] = useState(''); // Filter-Status

    const [userId, setUserId] = useState('');
    const [userRole, setUserRole] = useState('student');
    const token = useAuth(state => state.token);

    useEffect(() => {
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`)
            .then(res => res.json())
            .then(data => {
                setUsers(data);
                setLoading(false);
            });
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
        await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        });
        setUsers(users => users.map(u => u.id === id ? { ...u, role: newRole } : u));
        setUpdatedUserId(id);
        setTimeout(() => setUpdatedUserId(null), 2000);
    };

    if (loading) return <div>Lade Nutzer...</div>;

    // Filter-Logik: Zeige nur Nutzer, deren ID den Filter enthält
    const filteredUsers = users.filter(user =>
        user.id.toString().toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div style={{ maxWidth: 700, margin: '2rem auto', padding: '1rem' }}>
            <h1>Nutzer</h1>
            <input
                type="text"
                placeholder="Nach ID filtern..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{
                    marginBottom: '1rem',
                    padding: '0.5rem',
                    borderRadius: 4,
                    border: '1px solid #bbb',
                    width: '100%',
                    fontSize: 16
                }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {filteredUsers.map(user => (
                    <div key={user.id} style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: 8,
                        padding: '0.7rem 1rem',
                        background: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        minHeight: 48
                    }}>
                        <span style={{ color: '#333', fontWeight: 600, fontSize: 16 }}>ID: {user.id}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <select
                                value={user.role || ''}
                                onChange={e => handleRoleChange(user.id, e.target.value)}
                                style={{
                                    padding: '0.2rem 0.7rem',
                                    borderRadius: 4,
                                    border: '1px solid #bbb',
                                    background: '#fafafa',
                                    fontSize: 14
                                }}
                            >
                                {!user.role && <option value="">Keine</option>}
                                <option value="admin">Admin</option>
                                <option value="user">User</option>
                                <option value="teacher">Lehrer</option>
                            </select>
                            {updatedUserId === user.id && (
                                <span style={{ color: 'green', fontWeight: 'bold', fontSize: 18 }}>✓</span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}