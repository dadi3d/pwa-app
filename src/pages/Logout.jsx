import { useAuth } from './services/auth';
import { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../config';
import '../styles/globals.css';

export default function Logout() {
    const logout = useAuth(state => state.logout);
    const token = useAuth(state => state.token);
    const [isLoggingOut, setIsLoggingOut] = useState(true);
    const [logoutComplete, setLogoutComplete] = useState(false);

    useEffect(() => {
        performLogout();
    }, [logout]);

    const performLogout = async () => {
        setIsLoggingOut(true);
        
        try {
            // Prüfe ob es sich um einen OTH-User handelt
            if (token) {
                try {
                    const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/jwt-payload`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        
                        // Wenn es ein OTH-User ist, auch bei OTH abmelden
                        if (data.payload && (data.payload.source === 'oth-api' || data.payload.authMethod === 'oth')) {
                            console.log('OTH-User erkannt - öffne OTH-Logout in verstecktem iframe');
                            
                            // Erstelle verstecktes iframe für OTH-Logout (damit Cookies gesendet werden)
                            const iframe = document.createElement('iframe');
                            iframe.style.display = 'none';
                            iframe.style.width = '0';
                            iframe.style.height = '0';
                            iframe.src = 'https://www.oth-aw.de/login/?logintype=logout';
                            
                            // Füge iframe zum DOM hinzu
                            document.body.appendChild(iframe);
                            
                            // Entferne iframe nach 3 Sekunden
                            setTimeout(() => {
                                if (iframe && iframe.parentNode) {
                                    iframe.parentNode.removeChild(iframe);
                                }
                                console.log('OTH-Logout iframe entfernt');
                            }, 3000);
                        }
                    }
                } catch (error) {
                    // Wenn JWT-Check fehlschlägt, trotzdem weitermachen
                    console.log('JWT-Check fehlgeschlagen, fahre mit lokalem Logout fort');
                }
            }
            
            // Lokaler Logout mit der Auth-Store Funktion
            logout();
            
            // Kurz warten für bessere UX
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setIsLoggingOut(false);
            setLogoutComplete(true);
            
        } catch (error) {
            console.error('Fehler beim Logout:', error);
            // Bei Fehler trotzdem lokalen Logout durchführen
            logout();
            setIsLoggingOut(false);
            setLogoutComplete(true);
        }
    };

    if (isLoggingOut) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow">
                    <h1 className="text-2xl font-bold text-gray-900 text-center py-6">Abmelden...</h1>
                </header>
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                </main>
            </div>
        );
    }

    if (logoutComplete) {
        return (
            <div className="min-h-screen bg-gray-50">
                <header className="bg-white shadow">
                    <h1 className="text-2xl font-bold text-gray-900 text-center py-6">Erfolgreich abgemeldet</h1>
                </header>
                <main className="container mx-auto px-4 py-8">
                    <div className="text-center">
                        <button
                            style={{
                                backgroundColor: 'var(--color-primary)',
                                color: 'white',
                                padding: 'var(--spacing-md) var(--spacing-lg)',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                fontSize: '1rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-1)',
                                transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'var(--color-primary-dark)';
                                e.target.style.boxShadow = 'var(--shadow-2)';
                            }}
                            onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'var(--color-primary)';
                                e.target.style.boxShadow = 'var(--shadow-1)';
                            }}
                            onClick={() => (window.location.href = "/login")}
                        >
                            Anmelden
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return null;
}
