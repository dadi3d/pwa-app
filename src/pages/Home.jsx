import { useEffect, useState } from 'react';
import { useAuth, fetchUserData } from './services/auth';
import SettingsService from './services/Settings.js';

export default function Home() {
  const [homePageText, setHomePageText] = useState('');
  const [isLoadingText, setIsLoadingText] = useState(true);
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('student');
  const token = useAuth(state => state.token);

  // Prüfe Token beim Mount
  useEffect(() => {
    console.log('Home.jsx - Token Status:', token ? 'vorhanden' : 'nicht vorhanden');
    if (token) {
      loadHomePageText();
      fetchUserId();
    } else {
      // Prüfe ob Token im localStorage vorhanden ist
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        console.log('Token im localStorage gefunden, setze Auth-State');
        useAuth.getState().setAuth(storedToken);
      }
    }
  }, [token]);

  // Benutzer-ID aus JWT holen
  async function fetchUserId() {
    try {
      const userData = await fetchUserData();
      if(userData) {
        setUserId(userData.id); // oder userData.name, je nach Backend
        if(userData.role) {
          setUserRole(userData.role);
        }
      }
    } catch (err) {
      setUserId('');
    }
  }

  // Editierbaren HTML-Text von den Einstellungen laden
  async function loadHomePageText() {
    setIsLoadingText(true);
    try {
      const text = await SettingsService.getHomePageText();
      setHomePageText(text);
    } catch (error) {
      console.error('Fehler beim Laden des Startseiten-Textes:', error);
      setHomePageText('<p>Willkommen zur Medienausleihe! Hier können Sie Equipment für Ihre Projekte ausleihen.</p>');
    }
    setIsLoadingText(false);
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-8 fade-in overflow-x-hidden">
      <div className="mb-8 w-full">
        {/* <h1 className="text-3xl font-semibold text-gray-900 mb-6">Neuigkeiten</h1> */}
        
        {/* Benutzer-Begrüßung */}
        {userId && (
          <div className="mb-6 p-2 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg w-full overflow-hidden">
            <div className="text-blue-800 font-semibold break-words text-sm sm:text-base hyphens-auto">
              Willkommen, {userId}{' '}
              <span className="text-blue-600 font-normal">({userRole})</span>!
            </div>
          </div>
        )}
        
        {/* Editierbarer HTML-Text aus den Einstellungen */}
        <div className="mb-8 p-0 bg-gray-50 border border-gray-200 rounded-lg w-full overflow-hidden">
          {isLoadingText ? (
            <div className="text-gray-500 p-0 text-sm sm:text-base">Lädt Informationen...</div>
          ) : (
            <div 
              className="prose prose-blue max-w-none w-full overflow-hidden break-words hyphens-auto text-sm sm:text-base leading-relaxed p-0"
              dangerouslySetInnerHTML={{ __html: homePageText }}
            />
          )}
        </div>
      </div>
    </div>
  );
}