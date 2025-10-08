import { useState, useEffect } from 'react';
import { useAuth } from './auth';
import { MAIN_VARIABLES } from '../../config';

export const DebugMenu = () => {
  const [open, setOpen] = useState(false);
  const [keyToRemove, setKeyToRemove] = useState('');
  const [localStorageKeys, setLocalStorageKeys] = useState([]);
  const token = useAuth(state => state.token);

  // Funktion zum Aktualisieren der Keys
  const updateKeys = () => {
    setLocalStorageKeys(Object.keys(localStorage));
  };

  useEffect(() => {
    if (open) updateKeys();
  }, [open]);

  const clearLocalStorage = () => {
    localStorage.clear();
    alert('Local Storage wurde komplett gelöscht.');
    updateKeys();
  };

  const handleShowJWTPayload = async () => {
    if (!token) {
      alert('Kein Token vorhanden.');
      return;
    }
    try {
      const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/jwt-payload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
        // kein body nötig, da Token im Header
      });
      if (!res.ok) throw new Error('Fehler beim Abrufen des Payloads');
      const data = await res.json();
      alert(JSON.stringify(data, null, 2));
    } catch (err) {
      alert('Fehler: ' + err.message);
    }
  };

  const removeLocalStorageKey = () => {
    if (keyToRemove.trim() === '') {
      alert('Bitte einen Key angeben.');
      return;
    }
    if (localStorage.getItem(keyToRemove) !== null) {
      localStorage.removeItem(keyToRemove);
      alert(`Key "${keyToRemove}" wurde entfernt.`);
      updateKeys();
    } else {
      alert(`Key "${keyToRemove}" nicht gefunden.`);
    }
    setKeyToRemove('');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      zIndex: 9999,
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: 6,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: open ? 16 : 0,
      minWidth: 40,
      transition: 'padding 0.2s'
    }}>
      <button
        style={{
          background: '#222',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '4px 8px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
        onClick={() => setOpen(o => !o)}
        aria-label="Debug Menü öffnen"
      >
        ⚙️
      </button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <div><b>Debug-Menü</b></div>
          <hr />
          <button onClick={() => window.location.reload()}>Seite neu laden</button>
          <br /><br />
          <button onClick={handleShowJWTPayload} style={{ marginBottom: '2rem' }}>
            JWT-Payload anzeigen
          </button>
          <br />
          <button onClick={clearLocalStorage}>Local Storage komplett löschen</button>
          <br /><br />
          <input
            type="text"
            placeholder="Key zum Entfernen"
            value={keyToRemove}
            onChange={e => setKeyToRemove(e.target.value)}
            style={{ width: '80%', marginRight: 4 }}
          />
          <button onClick={removeLocalStorageKey}>Key löschen</button>
          <br /><br />
          <div>
            <b>Aktuelle Local Storage Keys & Werte:</b>
            <ul style={{ maxHeight: 100, overflowY: 'auto', paddingLeft: 18 }}>
              {localStorageKeys.length === 0 && <li><i>Keine Einträge</i></li>}
              {localStorageKeys.map(key => (
                <li key={key}>
                  <b>{key}:</b> <span style={{ wordBreak: 'break-all' }}>{String(localStorage.getItem(key))}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugMenu;