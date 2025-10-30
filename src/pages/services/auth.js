import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MAIN_VARIABLES } from '../../config';

export const useAuth = create(persist(
  (set) => ({
    token: null,
    setAuth: (token) => set({ token }),
    logout: () => set({ token: null }),
  }),
  {
    name: 'me-auth', // localStorage key
  }
));

/**
 * Leitet auf die Login-Seite weiter
 */
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    // Keine Weiterleitung, wenn bereits auf Login-Seiten
    const loginPaths = ['/login', '/', '/admin', '/loginUser'];
    if (!loginPaths.includes(currentPath)) {
      console.log('Weiterleitung zu Login von:', currentPath);
      // Je nach aktueller Seite zur entsprechenden Login-Seite weiterleiten
      // Für Admin-Bereich zur lokalen Login-Seite, sonst zu MyOTH
      if (currentPath.startsWith('/admin') || currentPath.includes('admin')) {
        window.location.href = '/admin';
      } else {
        window.location.href = '/login';
      }
    } else {
      console.log('Bereits auf Login-Seite, keine Weiterleitung nötig');
    }
  }
}

/**
 * Initialisiert die Authentifizierung, prüft ob ein Token vorhanden ist.
 * @returns {Promise<void>}
 */
export async function initAuth() {
  const { token } = useAuth.getState();
  if (!token) {
    console.log('Kein Token vorhanden. Bitte anmelden.');
    // Keine automatische Weiterleitung von /admin Seite
    if (window.location.pathname !== '/admin') {
      redirectToLogin();
    }
  }
}

/**
 * Überprüft, ob ein gültiges Token im localStorage unter dem Key 'me-auth' vorhanden ist.
 * @returns {boolean}
 */
export function checkToken() {
  try {
    const data = localStorage.getItem('me-auth');
    if (!data) return false;
    const parsed = JSON.parse(data);
    return !!parsed.state?.token;
  } catch (e) {
    return false;
  }
}

export async function fetchUserData() {
  const { token } = useAuth.getState();
  if (!token) {
    console.log('Kein Token vorhanden');
    // Keine automatische Weiterleitung von /admin Seite
    if (window.location.pathname !== '/admin') {
      redirectToLogin();
    }
    return null;
  }
  try {
    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/jwt-payload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log('Benutzerdaten erfolgreich abgerufen:', data.payload?.id);
      return data.payload;
    }
    // Wenn die Antwort nicht ok ist (z.B. 401 Unauthorized), zur Login-Seite weiterleiten
    console.log('Token ungültig oder abgelaufen, Status:', res.status);
    useAuth.getState().logout();
    // Keine automatische Weiterleitung von /admin Seite
    if (window.location.pathname !== '/admin') {
      redirectToLogin();
    }
    return null;
  } catch (err) {
    console.error('Fehler beim Abrufen der Benutzerdaten:', err);
    // Bei Netzwerkfehlern nicht automatisch zur Login-Seite weiterleiten
    // redirectToLogin();
    return null;
  }
}

