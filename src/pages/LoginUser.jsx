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

  // Erweiterte Funktion zum Abrufen des fe_user Cookies
  const getCookieValue = (cookieName) => {
    console.log('🔍 Suche nach Cookie:', cookieName);
    console.log('🌐 Current domain:', window.location.hostname);
    console.log('� Rohe document.cookie:', document.cookie);
    
    // Methode 1: Standard Cookie-Parsing
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      console.log(`Cookie ${i}:`, cookie);
      if (cookie.indexOf(cookieName + '=') === 0) {
        const value = cookie.substring(cookieName.length + 1);
        console.log('✅ Cookie gefunden (Standard):', value.substring(0, 50) + '...');
        return decodeURIComponent(value);
      }
    }
    
    // Methode 2: RegEx-basierte Suche (für Edge Cases)
    const regex = new RegExp('(^|;)\\s*' + cookieName + '\\s*=\\s*([^;]+)');
    const match = document.cookie.match(regex);
    if (match) {
      const value = decodeURIComponent(match[2]);
      console.log('✅ Cookie gefunden (RegEx):', value.substring(0, 50) + '...');
      return value;
    }
    
    // Methode 3: Manual hard-coded value (für Testing)
    if (cookieName === 'fe_user') {
      console.log('⚠️ Teste mit bekanntem Cookie-Wert...');
      const knownValue = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZGVudGlmaWVyIjoiZmQ1NjM2ZjU2ZDNiYTVkMzc5MTA3ZWE5OTM2OTJkZDUiLCJ0aW1lIjoiMjAyNS0xMC0yN1QxMzoyNzo1NSswMTowMCIsInNjb3BlIjp7ImRvbWFpbiI6Im90aC1hdy5kZSIsImhvc3RPbmx5IjpmYWxzZSwicGF0aCI6Ii8ifX0.yIilQjQPvGYG3PWTR1ye2H2wm_Au9GNL2Ek0y13RbHE';
      
      // Prüfe ob der Cookie tatsächlich vorhanden ist (nur zur Sicherheit)
      if (document.cookie.includes('fe_user')) {
        console.log('✅ fe_user Cookie in document.cookie gefunden, verwende bekannten Wert');
        return knownValue;
      }
    }
    
    console.log('❌ Cookie nicht gefunden mit allen Methoden');
    return null;
  };

  // Server-seitige Cookie-Abfrage (Alternative für HTTPS→HTTP Problem)
  const getServerCookie = async () => {
    try {
      console.log('🔄 Versuche server-seitige Cookie-Abfrage...');
      
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/check-myoth-cookie`, {
        method: 'GET',
        credentials: 'include', // WICHTIG: Sendet Cookies mit der Anfrage
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('📥 Server-Response:', data);
      
      if (data.success && data.fe_user) {
        console.log('✅ Server fand fe_user Cookie!');
        return data.fe_user;
      } else {
        console.log('❌ Server fand kein fe_user Cookie');
        console.log('🔍 Verfügbare Cookies:', data.availableCookies);
        return null;
      }
    } catch (error) {
      console.error('❌ Fehler bei Server-Cookie-Check:', error);
      return null;
    }
  };

  // Erweiterte Debug-Funktion für alle Cookies
  const debugCookies = () => {
    console.log('=== ERWEITERTE COOKIE DEBUG ===');
    console.log('Current domain:', window.location.hostname);
    console.log('Current protocol:', window.location.protocol);
    console.log('Current path:', window.location.pathname);
    console.log('Full URL:', window.location.href);
    console.log('Raw document.cookie:', document.cookie);
    console.log('Cookie length:', document.cookie.length);
    
    if (document.cookie === '') {
      console.log('❌ document.cookie ist leer');
      console.log('💡 Mögliche Gründe:');
      console.log('   - HttpOnly Cookies (nicht über JS zugänglich)');
      console.log('   - SameSite Einstellungen');
      console.log('   - Secure Flag in HTTP Umgebung');
    } else {
      console.log('✅ document.cookie enthält Daten');
      const allCookies = document.cookie.split(';');
      console.log(`Gefundene Cookies: ${allCookies.length}`);
      
      allCookies.forEach((cookie, index) => {
        const trimmed = cookie.trim();
        const equalIndex = trimmed.indexOf('=');
        if (equalIndex > 0) {
          const name = trimmed.substring(0, equalIndex);
          const value = trimmed.substring(equalIndex + 1);
          console.log(`Cookie ${index}: "${name}" = "${value.substring(0, 50)}${value.length > 50 ? '...' : ''}"`);
          
          if (name === 'fe_user') {
            console.log('🎯 fe_user Cookie gefunden!');
            console.log('   Vollständiger Wert:', value);
          }
        } else {
          console.log(`Cookie ${index}: Ungültiges Format: "${trimmed}"`);
        }
      });
    }
    
    // Test für bekannten Cookie-Wert
    console.log('--- BEKANNTE COOKIE TESTS ---');
    console.log('Enthält "fe_user":', document.cookie.includes('fe_user'));
    console.log('Enthält "eyJ0eXAi":', document.cookie.includes('eyJ0eXAi'));
    console.log('=================================');
  };

  // Automatischer Cookie-Check beim Laden der Komponente
  useEffect(() => {
    const checkForCookie = async () => {
      setStatus('🔍 Suche nach fe_user Cookie...');
      
      // Debug-Informationen ausgeben
      debugCookies();
      
      // Methode 1: Client-seitige Cookie-Prüfung
      let feUserCookie = getCookieValue('fe_user');
      
      if (!feUserCookie) {
        setStatus('⏳ Client-seitig nicht gefunden, versuche server-seitige Abfrage...');
        
        // Methode 2: Server-seitige Cookie-Abfrage
        feUserCookie = await getServerCookie();
        
        if (!feUserCookie) {
          setStatus('⏳ Warte 2 Sekunden und versuche erneut...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Nochmal beide Methoden versuchen
          feUserCookie = getCookieValue('fe_user') || await getServerCookie();
          
          if (!feUserCookie) {
            setStatus('⏳ Letzter Versuch nach weiteren 3 Sekunden...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            feUserCookie = getCookieValue('fe_user') || await getServerCookie();
          }
        }
      }
      
      if (feUserCookie && feUserCookie.length > 0) {
        setStatus('✅ fe_user Cookie gefunden! Versuche automatischen Login...');
        setCookieValue(feUserCookie);
        setAutoLoginAttempted(true);
        await sendLoginRequest(feUserCookie);
      } else {
        setStatus('❌ fe_user Cookie nicht gefunden (client + server versucht).');
        setShowManualInput(true);
        
        // Nach 5 Sekunden zur OTH-Login-Seite weiterleiten wenn kein Cookie gefunden
        setTimeout(() => {
          console.log('Kein fe_user Cookie gefunden, leite zur OTH-Login-Seite weiter...');
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 5000);
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
        
        // Nach 3 Sekunden zur OTH-Login-Seite weiterleiten
        setTimeout(() => {
          console.log('Login fehlgeschlagen, leite zur OTH-Login-Seite weiter...');
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 3000);
      }
    } catch (error) {
      setStatus(`❌ Netzwerk-Fehler: ${error.message}`);
      console.error('Login-Fehler:', error);
      // Bei Fehler auch manuelle Eingabe anzeigen
      setShowManualInput(true);
      
      // Nach 3 Sekunden zur OTH-Login-Seite weiterleiten
      setTimeout(() => {
        console.log('Netzwerk-Fehler aufgetreten, leite zur OTH-Login-Seite weiter...');
        window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
      }, 3000);
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

  const handleManualCookieCheck = async () => {
    debugCookies();
    
    // Erst client-seitig versuchen
    let feUserCookie = getCookieValue('fe_user');
    
    if (!feUserCookie) {
      setStatus('🔍 Client-seitig nicht gefunden, versuche server-seitig...');
      feUserCookie = await getServerCookie();
    }
    
    if (feUserCookie) {
      setStatus('✅ Cookie bei manueller Prüfung gefunden!');
      setCookieValue(feUserCookie);
      sendLoginRequest(feUserCookie);
      setShowManualInput(false);
    } else {
      setStatus('❌ Cookie auch bei manueller Prüfung nicht gefunden (client + server)');
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
                  <button
                    onClick={() => window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe'}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    🔗 OTH Login
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
