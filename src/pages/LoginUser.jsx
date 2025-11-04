import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAIN_VARIABLES } from '../config';
import { useAuth } from './services/auth';

const LoginUser = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Suche nach fe_user Cookie...');
  const [response, setResponse] = useState(null);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);
  const { setAuth } = useAuth();

  // Funktion zum Abrufen des fe_user Cookies
  const getCookieValue = (cookieName) => {
    // Standard Cookie-Parsing
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(cookieName + '=') === 0) {
        const value = cookie.substring(cookieName.length + 1);
        return decodeURIComponent(value);
      }
    }
    
    // RegEx-basierte Suche (für Edge Cases)
    const regex = new RegExp('(^|;)\\s*' + cookieName + '\\s*=\\s*([^;]+)');
    const match = document.cookie.match(regex);
    if (match) {
      const value = decodeURIComponent(match[2]);
      return value;
    }
    
    return null;
  };

  // Server-seitige Cookie-Abfrage
  const getServerCookie = async () => {
    try {
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/check-myoth-cookie`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.fe_user) {
        return data.fe_user;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  };

  // Automatischer Cookie-Check beim Laden der Komponente
  useEffect(() => {
    const checkForCookie = async () => {
      setStatus('🔍 Suche nach fe_user Cookie...');
      
      // Client-seitige Cookie-Prüfung
      let feUserCookie = getCookieValue('fe_user');
      
      if (!feUserCookie) {
        setStatus('⏳ Client-seitig nicht gefunden, versuche server-seitige Abfrage...');
        
        // Server-seitige Cookie-Abfrage
        feUserCookie = await getServerCookie();
        
        if (!feUserCookie) {
          setStatus('⏳ Warte 2 Sekunden und versuche erneut...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
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
        setAutoLoginAttempted(true);
        await sendLoginRequest(feUserCookie);
      } else {
        setStatus('❌ fe_user Cookie nicht gefunden. Weiterleitung zur OTH-Login-Seite...');
        
        // Nach 2 Sekunden zur OTH-Login-Seite weiterleiten
        setTimeout(() => {
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 2000);
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
          // Token sowohl in localStorage als auch im Auth-State speichern
          localStorage.setItem('token', data.token);
          
          // WICHTIG: Token auch im Auth-State speichern
          setAuth(data.token);
          
          console.log('Token gespeichert:', data.token.substring(0, 50) + '...');
          
          setTimeout(() => {
            navigate('/home');
          }, 1500);
        }
      } else {
        setStatus(`❌ Fehler: ${data.error || 'Unbekannter Fehler'}`);
        setResponse(data);
        
        // Nach 3 Sekunden zur OTH-Login-Seite weiterleiten
        setTimeout(() => {
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 3000);
      }
    } catch (error) {
      setStatus(`❌ Netzwerk-Fehler: ${error.message}`);
      
      // Nach 3 Sekunden zur OTH-Login-Seite weiterleiten
      setTimeout(() => {
        window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
      }, 3000);
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

          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Prüfe Cookies und versuche automatischen Login...</p>
          </div>

          {response && (
            <div className="mb-4">
              <h3 className="font-medium mb-2">Server-Antwort:</h3>
              <pre className="text-xs bg-green-50 p-3 rounded overflow-auto">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-medium mb-2">🤖 Automatischer Login-Prozess:</h3>
          <p className="text-sm">Die App versucht automatisch den fe_user Cookie zu finden und einen Login durchzuführen:</p>
          <ul className="text-xs mt-2 space-y-1">
            <li>• Sofortige Prüfung beim Laden</li>
            <li>• Zweite Prüfung nach 2 Sekunden</li>
            <li>• Dritte Prüfung nach weiteren 3 Sekunden</li>
            <li>• Bei Erfolg: Weiterleitung zu /home</li>
            <li>• Bei Fehler: Weiterleitung zur OTH-Login-Seite</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoginUser;
