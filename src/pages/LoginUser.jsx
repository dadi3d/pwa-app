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
    console.log('🍪 Alle verfügbaren Cookies:', document.cookie);
    console.log('🔍 Suche nach Cookie:', cookieName);
    console.log('🌐 Current domain:', window.location.hostname);
    console.log('🌐 Cookie domain should be: .oth-aw.de');
    
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      console.log(`Cookie ${i}:`, cookie);
      if (cookie.indexOf(cookieName + '=') === 0) {
        const value = cookie.substring(cookieName.length + 1);
        console.log('✅ Cookie gefunden:', value.substring(0, 50) + '...');
        return value;
      }
    }
    console.log('❌ Cookie nicht gefunden');
    return null;
  };

  // Debug-Funktion für alle Cookies
  const debugCookies = () => {
    console.log('=== COOKIE DEBUG ===');
    console.log('Current domain:', window.location.hostname);
    console.log('Current protocol:', window.location.protocol);
    console.log('All cookies:', document.cookie);
    
    if (document.cookie === '') {
      console.log('❌ Keine Cookies verfügbar');
    } else {
      const allCookies = document.cookie.split(';');
      allCookies.forEach((cookie, index) => {
        const [name, value] = cookie.trim().split('=');
        console.log(`Cookie ${index}: ${name} = ${value?.substring(0, 50)}...`);
      });
    }
    console.log('==================');
  };

  // Automatischer Cookie-Check beim Laden der Komponente
  useEffect(() => {
    const checkForCookie = async () => {
      setStatus('🔍 Suche nach fe_user Cookie...');
      
      // Debug-Informationen ausgeben
      debugCookies();
      
      // Erste Prüfung
      let feUserCookie = getCookieValue('fe_user');
      
      // Falls Cookie nicht gefunden, mehrere Versuche mit Verzögerung
      if (!feUserCookie) {
        setStatus('⏳ Cookie nicht sofort gefunden, warte 2 Sekunden...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        feUserCookie = getCookieValue('fe_user');
        
        if (!feUserCookie) {
          setStatus('⏳ Zweiter Versuch nach weiteren 3 Sekunden...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          feUserCookie = getCookieValue('fe_user');
        }
      }
      
      if (feUserCookie && feUserCookie.length > 0) {
        setStatus('✅ fe_user Cookie gefunden! Versuche automatischen Login...');
        setCookieValue(feUserCookie);
        setAutoLoginAttempted(true);
        await sendLoginRequest(feUserCookie);
      } else {
        setStatus('❌ fe_user Cookie nach mehreren Versuchen nicht gefunden.');
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

  const handleManualCookieCheck = () => {
    debugCookies();
    const feUserCookie = getCookieValue('fe_user');
    if (feUserCookie) {
      setStatus('✅ Cookie bei manueller Prüfung gefunden!');
      setCookieValue(feUserCookie);
      sendLoginRequest(feUserCookie);
      setShowManualInput(false);
    } else {
      setStatus('❌ Cookie auch bei manueller Prüfung nicht gefunden');
    }
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
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={handleManualCookieCheck}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    🔍 Cookie erneut suchen
                  </button>
                  <button
                    onClick={debugCookies}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    🐛 Debug Cookies
                  </button>
                </div>
              </div>

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
              <button
                onClick={debugCookies}
                className="mt-2 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              >
                🐛 Debug Cookies
              </button>
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
          <div className="bg-yellow-50 p-4 rounded">
            <h3 className="font-medium mb-2">💡 Cookie auf medienausleihe.oth-aw.de</h3>
            <div className="text-sm space-y-2 mb-3">
              <p><strong>🌐 Same Domain:</strong> Da Sie auf medienausleihe.oth-aw.de sind, sollte der .oth-aw.de Cookie verfügbar sein.</p>
              <p><strong>⏱️ Timing:</strong> Möglicherweise wurde der Cookie zu früh gelesen. Versuchen Sie "Cookie erneut suchen".</p>
              <p><strong>� Debug:</strong> Verwenden Sie "Debug Cookies" um alle verfügbaren Cookies zu sehen.</p>
            </div>
            <h4 className="font-medium mb-2">📋 Falls manuell nötig:</h4>
            <ol className="text-sm space-y-1">
              <li>1. Besuchen Sie https://www.oth-aw.de/myoth/ und melden Sie sich an</li>
              <li>2. Kehren Sie zu dieser Seite zurück und klicken "Cookie erneut suchen"</li>
              <li>3. Falls immer noch nicht gefunden: F12 → Application → Cookies → .oth-aw.de</li>
              <li>4. Kopieren Sie den "fe_user" Cookie-Wert und fügen ihn unten ein</li>
            </ol>
          </div>
        )}

        {!showManualInput && !response && (
          <div className="bg-blue-50 p-4 rounded">
            <h3 className="font-medium mb-2">🤖 Automatischer Cookie-Check:</h3>
            <p className="text-sm">Da Sie auf medienausleihe.oth-aw.de sind, versucht die App mehrmals den fe_user Cookie zu finden:</p>
            <ul className="text-xs mt-2 space-y-1">
              <li>• Sofortige Prüfung beim Laden</li>
              <li>• Zweite Prüfung nach 2 Sekunden</li>
              <li>• Dritte Prüfung nach weiteren 3 Sekunden</li>
            </ul>
            <p className="text-xs text-gray-600 mt-2">Domain: {window.location.hostname}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginUser;
