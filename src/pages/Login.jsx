import { useEffect, useState } from 'react';
import { useAuth } from './services/auth'; // Importiere useAuth
import { MAIN_VARIABLES } from '../config.js';


export default function Login() {
  const [kennung, setKennung] = useState('');
  const [passwort, setPasswort] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuth(state => state.setAuth); // Zugriff auf setAuth
  const logout = useAuth(state => state.logout); // Zugriff auf logout
  const token = useAuth(state => state.token); // Zugriff auf Token

  const [version, setVersion] = useState("Lade...");

  // Bereinige nur OTH Auth beim Laden der Login-Seite
  useEffect(() => {
    // Prüfe ob eine OTH Auth-Methode im localStorage vorhanden ist
    const authData = localStorage.getItem('me-auth');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        // Wenn ein Token vorhanden ist, prüfe die Auth-Methode über das Token
        if (parsed.state?.token) {
          // Versuche zu ermitteln ob es sich um OTH Auth handelt
          // Dazu prüfen wir das Token-Payload oder andere Indikatoren
          fetch(`${MAIN_VARIABLES.SERVER_URL}/api/jwt-payload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${parsed.state.token}`
            }
          })
          .then(response => response.json())
          .then(data => {
            // Prüfe ob das Token von OTH stammt (source: 'oth-api' oder authMethod)
            if (data.payload && (data.payload.source === 'oth-api' || data.payload.authMethod === 'oth')) {
              console.log('OTH Auth-Daten erkannt - bereinige für lokalen Login');
              logout();
              localStorage.removeItem('token');
            } else {
              console.log('Lokale Auth-Daten vorhanden - behalte bei');
            }
          })
          .catch(() => {
            // Bei Fehler (z.B. ungültiges Token) trotzdem bereinigen
            console.log('Ungültiges Token erkannt - bereinige Auth-Daten');
            logout();
            localStorage.removeItem('token');
          });
        }
      } catch (e) {
        // Falls JSON parsing fehlschlägt, lösche localStorage
        logout();
        localStorage.removeItem('token');
      }
    }
  }, [logout]);

    useEffect(() => {
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/version`)
            .then((response) => response.json())
            .then((data) => {
                setVersion(data.version + " " + data.buildDate);
            })
            .catch(() => {
                setVersion("Fehler");
            });
    }, []);

  // Entferne die automatische Weiterleitung bei vorhandenem Token
  // Diese Seite ist nur für lokalen Login gedacht

  const handleSubmit = async e => {
    e.preventDefault();
    if (!kennung || !passwort) {
      setError('Bitte Kennung und Passwort eingeben.');
      return;
    }
    setError('');
    
    try {
      // Token vom Server holen, Kennung und Passwort als Body senden
      const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: kennung, password: passwort })
      });
      if (!res.ok) throw new Error('Token konnte nicht abgerufen werden');
      const data = await res.json();
      console.log('Lokaler Login erfolgreich. Token:', data.token.substring(0, 20) + '...');
      setAuth(data.token); // Token speichern
      window.location.href = '/home';
    } catch (err) {
      setError('Fehler beim Login: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Medienausleihe</h1>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#1976d2' }}>Lokaler Admin-Login</h2>
      <h3 style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>{version}</h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Benutzer-ID / E-Mail
          <input
            type="text"
            value={kennung}
            onChange={e => setKennung(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 16 }}
            autoFocus
            autoComplete="username"
            required
            placeholder="Ihre Benutzer-ID oder E-Mail-Adresse"
          />
        </label>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Passwort
          <input
            type="password"
            value={passwort}
            onChange={e => setPasswort(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 16 }}
            autoComplete="current-password"
            required
            minLength={8}
            placeholder="Ihr Passwort"
          />
        </label>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: 10, background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4 }}>
          Anmelden
        </button>
      </form>
      <p style={{ fontSize: '0.9rem', color: '#888', marginTop: 24 }}>
        Durch die Nutzung des Dienstes stimmen Sie den Allgemeinen Geschäftsbedingungen und Datenschutzbestimmungen zu.
      </p>
    </div>
  );
}