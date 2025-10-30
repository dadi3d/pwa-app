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
 * Leitet auf die entsprechende Login-Seite weiter basierend auf authMethod
 */
function redirectToLogin(authMethod = null) {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    // Keine Weiterleitung, wenn bereits auf Login-Seiten
    const loginPaths = ['/login', '/', '/admin', '/loginUser'];
    if (!loginPaths.includes(currentPath)) {
      console.log('Weiterleitung zu Login von:', currentPath);
      
      // Prüfe authMethod oder aktuellen Pfad um zu entscheiden wohin weitergeleitet wird
      if (authMethod === 'local' || currentPath.startsWith('/admin') || currentPath.includes('admin')) {
        console.log('Weiterleitung zur Admin-Login-Seite (/admin)');
        window.location.href = '/admin';
      } else {
        console.log('Weiterleitung zur MyOTH-Login-Seite (/login)');
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
      console.log('Benutzerdaten erfolgreich abgerufen:', data.payload?.id, 'authMethod:', data.payload?.authMethod);
      
      // Prüfe ob der Benutzertyp zur aktuellen Seite passt
      const currentPath = window.location.pathname;
      const isAdminPath = currentPath === '/admin' || currentPath.startsWith('/equipment') || 
                         currentPath.startsWith('/hersteller') || currentPath.startsWith('/sets') || 
                         currentPath.startsWith('/kategorien') || currentPath.startsWith('/nutzer') || 
                         currentPath.startsWith('/einstellungen') || currentPath.startsWith('/kalender') ||
                         currentPath.startsWith('/file-manager') || currentPath.startsWith('/produkt') ||
                         currentPath.startsWith('/set-') || currentPath.startsWith('/auftraege-admin');
      const isOthUser = data.payload?.authMethod === 'oth';
      const isLocalUser = data.payload?.authMethod === 'local';
      
      // OTH-User sollten nicht auf Admin-Seiten zugreifen können
      if (isAdminPath && isOthUser) {
        console.log('OTH-User versucht Admin-Seite zu erreichen - Weiterleitung zu /login');
        useAuth.getState().logout();
        window.location.href = '/login';
        return null;
      }
      
      // Lokale User sollten nur auf Admin-Seiten zugreifen können
      if (!isAdminPath && isLocalUser) {
        console.log('Lokaler Admin-User außerhalb Admin-Bereich - Weiterleitung zu /equipment');
        window.location.href = '/equipment';
        return null;
      }
      
      return data.payload;
    }
    // Wenn die Antwort nicht ok ist (z.B. 401 Unauthorized), zur entsprechenden Login-Seite weiterleiten
    console.log('Token ungültig oder abgelaufen, Status:', res.status);
    useAuth.getState().logout();
    
    // Basiere Weiterleitung auf aktueller Seite
    const currentPath = window.location.pathname;
    if (currentPath === '/admin' || currentPath.startsWith('/admin')) {
      // Bleib auf Admin-Login
      return null;
    } else {
      redirectToLogin();
      return null;
    }
  } catch (err) {
    console.error('Fehler beim Abrufen der Benutzerdaten:', err);
    // Bei Netzwerkfehlern nicht automatisch zur Login-Seite weiterleiten
    return null;
  }
}

