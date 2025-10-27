import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAIN_VARIABLES } from '../config';

const LoginUser = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Suche nach fe_user Cookie...');
  const [cookieValue, setCookieValue] = useState('');
  const [response, setResponse] = useState(null);
  const [manualCookieInput, setManualCookieInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  // Funktion zum Abrufen des fe_user Cookies
  const getCookieValue = (cookieName) => {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(cookieName + '=') === 0) {
        return cookie.substring(cookieName.length + 1);
      }
    }
    return null;
  };

  // Automatischer Cookie-Check beim Laden der Komponente
  useEffect(() => {
    const checkForCookie = async () => {
      setStatus('🔍 Suche nach fe_user Cookie...');
      
      const feUserCookie = getCookieValue('fe_user');
      
      if (feUserCookie && feUserCookie.length > 0) {
        setStatus('✅ fe_user Cookie gefunden! Versuche automatischen Login...');
        setCookieValue(feUserCookie);
        setAutoLoginAttempted(true);
        await sendLoginRequest(feUserCookie);
      } else {
        setStatus('❌ Kein fe_user Cookie gefunden. Bitte geben Sie den Cookie-Wert manuell ein.');
        setShowManualInput(true);
      }
    };

    if (!autoLoginAttempted) {
      checkForCookie();
    }
  }, [autoLoginAttempted]);

  const sendLoginRequest = async (feUserValue) => {
    try {
      setStatus('Sende Anfrage an Server...');
      
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/myoth-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fe_user: feUserValue
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setStatus('✅ Login erfolgreich! Weiterleitung...');
        setResponse(data);
        
        // Bei erfolgreichem Login zu /home weiterleiten
        if (data.success && data.token) {
          console.log('MyOTH Login erfolgreich, leite zu /home weiter');
          // Optional: Token speichern (falls Auth-System vorhanden)
          localStorage.setItem('token', data.token);
          setTimeout(() => {
            navigate('/home');
          }, 1500); // Kurze Verzögerung um Success-Message zu zeigen
        }
      } else {
        setStatus(`❌ Fehler: ${data.error || 'Unbekannter Fehler'}`);
        setResponse(data);
        // Bei Fehler auch manuelle Eingabe anzeigen
        setShowManualInput(true);
      }
    } catch (error) {
      setStatus(`❌ Netzwerk-Fehler: ${error.message}`);
      console.error('Login-Fehler:', error);
      // Bei Fehler auch manuelle Eingabe anzeigen
      setShowManualInput(true);
    }
  };

  const handleCookieSubmit = () => {
    const trimmedCookie = manualCookieInput.trim();
    if (!trimmedCookie) {
      setStatus('❌ Bitte geben Sie einen Cookie-Wert ein');
      return;
    }
    
    setCookieValue(trimmedCookie);
    setStatus(`🍪 Cookie eingegeben (${trimmedCookie.length} Zeichen)`);
    sendLoginRequest(trimmedCookie);
  };

  const handleReset = () => {
    setManualCookieInput('');
    setCookieValue('');
    setResponse(null);
    setShowManualInput(false);
    setAutoLoginAttempted(false);
    setStatus('🔄 Neustart... Suche nach Cookie...');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-lg w-full space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">🎓 MyOTH Login</h2>
          <p className="text-gray-600">Cookie-basierte Authentifizierung</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Status:</h3>
            <p className="text-sm p-2 rounded bg-blue-50 text-blue-700">{status}</p>
          </div>

          {showManualInput && (
            <>
              <div className="mb-4">
                <label className="block text-lg font-medium mb-2">🍪 fe_user Cookie:</label>
                <textarea
                  value={manualCookieInput}
                  onChange={(e) => setManualCookieInput(e.target.value)}
                  placeholder="Fügen Sie hier Ihren fe_user Cookie-Wert ein..."
                  className="w-full px-3 py-2 border rounded text-sm font-mono"
                  rows="4"
                />
                <p className="text-xs text-gray-500 mt-1">Zeichen: {manualCookieInput.length}</p>
              </div>

              <div className="flex gap-3 mb-4">
                <button
                  onClick={handleCookieSubmit}
                  disabled={!manualCookieInput.trim()}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                >
                  🚀 Cookie senden
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  🔄 Erneut versuchen
                </button>
              </div>
            </>
          )}

          {!showManualInput && !response && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-gray-600">Prüfe Cookies...</p>
            </div>
          )}

          {cookieValue && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Gesendeter Cookie:</h3>
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs font-mono break-all">{cookieValue}</p>
              </div>
            </div>
          )}

          {response && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Server-Antwort:</h3>
              <pre className="text-xs bg-green-50 p-3 rounded overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {showManualInput && (
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-medium mb-2">💡 Anleitung für manuellen Cookie:</h3>
            <ol className="text-sm space-y-1">
              <li>1. Besuchen Sie https://www.oth-aw.de/myoth/ und melden Sie sich an</li>
              <li>2. Öffnen Sie die Browser-Entwicklertools (F12)</li>
              <li>3. Gehen Sie zu Application → Cookies → https://www.oth-aw.de</li>
              <li>4. Kopieren Sie den Wert des "fe_user" Cookies</li>
              <li>5. Fügen Sie ihn oben ein und klicken Sie "Cookie senden"</li>
            </ol>
          </div>
        )}

        {!showManualInput && !response && (
          <div className="bg-green-50 p-4 rounded">
            <h3 className="font-medium mb-2">🤖 Automatischer Login:</h3>
            <p className="text-sm">Die Anwendung sucht automatisch nach dem fe_user Cookie. Wenn Sie bereits bei MyOTH angemeldet sind, erfolgt der Login automatisch.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginUser;
