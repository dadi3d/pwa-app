import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAIN_VARIABLES } from '../config';
import { useAuth } from './services/auth';

const LoginUser = () => {
  const navigate = useNavigate();
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
      // Client-seitige Cookie-Prüfung
      let feUserCookie = getCookieValue('fe_user');
      
      if (!feUserCookie) {
        // Server-seitige Cookie-Abfrage
        feUserCookie = await getServerCookie();
      }
      
      if (feUserCookie && feUserCookie.length > 0) {
        setAutoLoginAttempted(true);
        await sendLoginRequest(feUserCookie);
      } else {
        // Schneller Redirect zur OTH-Login-Seite (500ms)
        setTimeout(() => {
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 500);
      }
    };

    if (!autoLoginAttempted) {
      checkForCookie();
    }
  }, [autoLoginAttempted]);

  const sendLoginRequest = async (feUserValue) => {
    try {
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
      
      if (response.ok && data.success && data.token) {
        // Token sowohl in localStorage als auch im Auth-State speichern
        localStorage.setItem('token', data.token);
        setAuth(data.token);
        
        setTimeout(() => {
          navigate('/home');
        }, 500);
      } else {
        // Bei Fehler schnell zur OTH-Login-Seite weiterleiten
        setTimeout(() => {
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 500);
      }
    } catch (error) {
      // Bei Netzwerk-Fehler schnell zur OTH-Login-Seite weiterleiten
      setTimeout(() => {
        window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Anmelden</h1>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    </div>
  );
};

export default LoginUser;
