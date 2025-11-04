import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAIN_VARIABLES } from '../config';

const LoginUser = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState('Anmeldung wird überprüft...');
  const [isLoading, setIsLoading] = useState(true);

  // Funktion zum Abrufen des fe_user Cookies
  const getCookieValue = (cookieName) => {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i].trim();
      if (cookie.indexOf(cookieName + '=') === 0) {
        return decodeURIComponent(cookie.substring(cookieName.length + 1));
      }
    }
    return null;
  };

  // Automatischer Login-Prozess
  useEffect(() => {
    const performLogin = async () => {
      try {
        setStatus('Sitzung wird überprüft...');
        
        // Cookie suchen mit mehreren Versuchen
        let feUserCookie = getCookieValue('fe_user');
        
        if (!feUserCookie) {
          // Kurz warten und nochmal versuchen
          await new Promise(resolve => setTimeout(resolve, 1000));
          feUserCookie = getCookieValue('fe_user');
        }
        
        if (!feUserCookie) {
          // Noch ein Versuch nach weiterer Wartezeit
          await new Promise(resolve => setTimeout(resolve, 2000));
          feUserCookie = getCookieValue('fe_user');
        }

        if (feUserCookie) {
          setStatus('Anmeldung läuft...');
          
          const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/myoth-login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fe_user: feUserCookie
            })
          });

          const data = await response.json();
          
          if (response.ok && data.success && data.token) {
            setStatus('Anmeldung erfolgreich! Weiterleitung...');
            localStorage.setItem('token', data.token);
            setTimeout(() => {
              navigate('/home');
            }, 1000);
          } else {
            setStatus('Anmeldung fehlgeschlagen. Weiterleitung zum Login...');
            setTimeout(() => {
              window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
            }, 2000);
          }
        } else {
          setStatus('Keine gültige Sitzung gefunden. Weiterleitung zum Login...');
          setTimeout(() => {
            window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
          }, 2000);
        }
      } catch (error) {
        setStatus('Verbindungsfehler. Weiterleitung zum Login...');
        setTimeout(() => {
          window.location.href = 'https://www.oth-aw.de/login/?redirect_url=https://medienausleihe.oth-aw.de&title=Medienausleihe';
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    };

    performLogin();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-graduation-cap text-2xl text-blue-600"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Medienausleihe</h2>
            <p className="text-gray-600 mt-2">OTH Amberg-Weiden</p>
          </div>
          
          <div className="mb-6">
            {isLoading && (
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}
            <p className="text-gray-700">{status}</p>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>Automatische Anmeldung über MyOTH</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginUser;
