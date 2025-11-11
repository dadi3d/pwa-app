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
 * Authenticated fetch wrapper - fügt automatisch Bearer Token hinzu
 */
export const authenticatedFetch = (url, options = {}) => {
  const token = useAuth.getState().token;
  
  if (!token) {
    redirectToLogin();
    return Promise.reject(new Error('Kein Token verfügbar'));
  }

  // Prüfe ob FormData gesendet wird
  const isFormData = options.body instanceof FormData;
  
  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    // Setze Content-Type nur wenn es kein FormData ist
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...options.headers
  };

  // Entferne Content-Type falls es auf undefined gesetzt wurde
  if (authHeaders['Content-Type'] === undefined) {
    delete authHeaders['Content-Type'];
  }

  return fetch(url, {
    ...options,
    headers: authHeaders
  });
};

/**
 * Leitet auf die Login-Seite weiter
 */
function redirectToLogin() {
  if (typeof window !== 'undefined') {
    const currentPath = window.location.pathname;
    // Keine Weiterleitung, wenn bereits auf Login-Seiten
    const loginPaths = ['/login', '/', '/admin', '/loginUser'];
    if (!loginPaths.includes(currentPath)) {
      window.location.href = '/login';
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
    redirectToLogin();
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
    redirectToLogin();
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
      return data.payload;
    }
    // Wenn die Antwort nicht ok ist (z.B. 401 Unauthorized), zur Login-Seite weiterleiten
    console.log('Token ungültig oder abgelaufen');
    useAuth.getState().logout();
    redirectToLogin();
    return null;
  } catch (err) {
    console.error('Fehler beim Abrufen der Benutzerdaten:', err);
    redirectToLogin();
    return null;
  }
}

