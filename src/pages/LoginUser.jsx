import React, { useState, useEffect } from 'react';
import { MAIN_VARIABLES } from '../config';

const LoginUser = () => {
  const [status, setStatus] = useState('Anmeldung wird geprüft...');
  const [response, setResponse] = useState(null);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

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
      if (autoLoginAttempted) return; // Verhindert mehrfache Ausführung
      
      setStatus('Anmeldung wird geprüft...');
      setAutoLoginAttempted(true); // Sofort setzen um weitere Versuche zu verhindern
      
      // Client-seitige Cookie-Prüfung
      let feUserCookie = getCookieValue('fe_user');
      
      if (!feUserCookie) {
        // Server-seitige Cookie-Abfrage
        feUserCookie = await getServerCookie();
        
        if (!feUserCookie) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          feUserCookie = getCookieValue('fe_user') || await getServerCookie();
          
          if (!feUserCookie) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            feUserCookie = getCookieValue('fe_user') || await getServerCookie();
          }
        }
      }
      
      if (feUserCookie && feUserCookie.length > 0) {
        setStatus('Anmeldung erfolgreich...');
        await sendLoginRequest(feUserCookie);
      } else {
        setStatus('Weiterleitung zur OTH-Anmeldung...');
        
        // Nach 2 Sekunden zur OTH-Login-Seite weiterleiten
        setTimeout(() => {
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 2000);
      }
    };

    checkForCookie();
  }, []); // Leeres Dependency Array - läuft nur beim ersten Mount

  const sendLoginRequest = async (feUserValue) => {
    try {
      setStatus('Anmeldung läuft...');
      
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
        setStatus('Anmeldung erfolgreich!');
        setResponse(data);
        
        // Bei erfolgreichem Login zu /home weiterleiten
        if (data.success && data.token) {
          localStorage.setItem('token', data.token);
          setTimeout(() => {
            window.location.href = '/home';
          }, 1500);
        }
      } else {
        setStatus('Weiterleitung zur OTH-Anmeldung...');
        setResponse(data);
        
        // Nach 3 Sekunden zur OTH-Login-Seite weiterleiten
        setTimeout(() => {
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 3000);
      }
    } catch (error) {
      setStatus('Weiterleitung zur OTH-Anmeldung...');
      
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
            <p className="text-gray-600">Authentifizierung läuft...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginUser;
