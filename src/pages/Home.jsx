import { useEffect, useState } from 'react';
import { useAuth, fetchUserData, authenticatedFetch } from './services/auth';
import SettingsService from './services/Settings.js';
import { MAIN_VARIABLES } from '../config';

export default function Home() {
  const [homePageText, setHomePageText] = useState('');
  const [isLoadingText, setIsLoadingText] = useState(true);
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('student');
  const token = useAuth(state => state.token);
  
  // API Test State
  const [authorizedSets, setAuthorizedSets] = useState(null);
  const [isLoadingApi, setIsLoadingApi] = useState(false);
  const [apiError, setApiError] = useState(null);

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

  // API Test Funktion
  async function testAuthorizedSetsApi() {
    setIsLoadingApi(true);
    setApiError(null);
    try {
      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/authorized`);
      const data = await response.json();
      setAuthorizedSets(data);
      console.log('Authorized Sets API Response:', data);
    } catch (error) {
      console.error('Fehler beim Testen der API:', error);
      setApiError(error.message);
    }
    setIsLoadingApi(false);
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

        {/* API Test Infofeld */}
        {userId && (
          <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-lg w-full overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-orange-800">API Test: Berechtigte Sets</h3>
              <button
                onClick={testAuthorizedSetsApi}
                disabled={isLoadingApi}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-md text-sm font-medium transition-colors"
              >
                {isLoadingApi ? 'Lädt...' : 'API Testen'}
              </button>
            </div>
            
            {apiError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md">
                <div className="text-red-800 text-sm font-medium">Fehler:</div>
                <div className="text-red-700 text-sm">{apiError}</div>
              </div>
            )}
            
            {authorizedSets && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-white rounded-md border">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{authorizedSets.totalCount}</div>
                    <div className="text-sm text-gray-600">Berechtigte Sets</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{authorizedSets.userInfo?.set_assignments?.length || 0}</div>
                    <div className="text-sm text-gray-600">Zuordnungen</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{authorizedSets.userInfo?.role || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Rolle</div>
                  </div>
                </div>
                
                {authorizedSets.userInfo?.set_assignments?.length > 0 && (
                  <div className="p-3 bg-white rounded-md border">
                    <div className="text-sm font-medium text-gray-800 mb-2">Ihre Zuordnungen:</div>
                    <div className="flex flex-wrap gap-2">
                      {authorizedSets.userInfo.set_assignments.map((assignment, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                        >
                          {
                            typeof assignment.name === 'object' && assignment.name !== null
                              ? (assignment.name.de || assignment.name.en || Object.values(assignment.name)[0] || 'N/A')
                              : (assignment.name || 'N/A')
                          }
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {authorizedSets.sets?.length > 0 && (
                  <div className="p-3 bg-white rounded-md border max-h-48 overflow-y-auto">
                    <div className="text-sm font-medium text-gray-800 mb-2">Berechtigte Sets (erste 5):</div>
                    <div className="space-y-2">
                      {authorizedSets.sets.slice(0, 5).map((set, index) => (
                        <div key={index} className="flex justify-between items-center text-xs p-2 bg-gray-50 rounded">
                          <div className="font-medium">
                            {
                              typeof set.manufacturer?.name === 'object' && set.manufacturer.name !== null
                                ? (set.manufacturer.name.de || set.manufacturer.name.en || Object.values(set.manufacturer.name)[0] || 'N/A')
                                : (set.manufacturer?.name || 'N/A')
                            } - {
                              typeof set.set_name?.name === 'object' && set.set_name.name !== null
                                ? (set.set_name.name.de || set.set_name.name.en || Object.values(set.set_name.name)[0] || 'N/A')
                                : (set.set_name?.name || 'N/A')
                            }
                          </div>
                          <div className="text-gray-500">
                            #{set.set_number}
                          </div>
                        </div>
                      ))}
                      {authorizedSets.sets.length > 5 && (
                        <div className="text-xs text-gray-500 text-center pt-2">
                          ... und {authorizedSets.sets.length - 5} weitere
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}