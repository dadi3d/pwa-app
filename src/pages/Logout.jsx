import { useAuth } from './services/auth';
import { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../config';

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
            <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
                <div className="max-w-lg w-full space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900">Abmelden...</h2>
                        <p className="text-gray-600 mt-2">Sie werden abgemeldet</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                            <p className="text-gray-600">Melde ab...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (logoutComplete) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
                <div className="max-w-lg w-full space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-green-600">✅ Erfolgreich ausgeloggt</h2>
                        <p className="text-gray-600 mt-2">Sie wurden erfolgreich abgemeldet</p>
                    </div>
                    
                    <div className="bg-white p-6 rounded-lg shadow">
                        <div className="text-center">
                            <div className="text-green-600 mb-4">
                                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-gray-600 mb-4">Sie wurden erfolgreich abgemeldet.</p>
                            <a 
                                href="/" 
                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                                Zur Startseite
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
