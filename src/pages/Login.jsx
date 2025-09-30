import { useEffect, useState } from 'react';
import { useAuth } from './services/auth'; // Importiere useAuth
import { MAIN_VARIABLES } from '../config.js';


export default function Login() {
  const [kennung, setKennung] = useState('');
  const [passwort, setPasswort] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuth(state => state.setAuth); // Zugriff auf setAuth
  const token = useAuth(state => state.token); // Zugriff auf Token

  const [version, setVersion] = useState("Lade...");

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

  useEffect(() => {
    if (token) {
      // Optional: Token validieren, z.B. durch einen API-Call
      setAuth(token);
      window.location.href = '/home';
    }
  }, [setAuth, token]);

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
      console.log('Token:', data.token);
      setAuth(data.token); // Token speichern
      window.location.href = '/home';
    } catch (err) {
      setError('Fehler beim Login: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', padding: '2rem', border: '1px solid #ddd', borderRadius: 8, background: '#fff' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>Medienausleihe</h1>
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#1976d2' }}>Am System anmelden</h2>
      <h3 style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1.5rem' }}>{version}</h3>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          E-Mail-Adresse
          <input
            type="email"
            value={kennung}
            onChange={e => setKennung(e.target.value)}
            style={{ width: '100%', padding: 8, marginTop: 4, marginBottom: 16 }}
            autoFocus
            autoComplete="username email"
            required
            placeholder="Ihre E-Mail-Adresse"
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