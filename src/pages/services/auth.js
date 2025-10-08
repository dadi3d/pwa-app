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
 * Initialisiert die Authentifizierung, prüft ob ein Token vorhanden ist.
 * @returns {Promise<void>}
 */
export async function initAuth() {
  const { token } = useAuth.getState();
  if (!token) {
    console.log('Kein Token vorhanden. Bitte anmelden.');
    // Hier könntest du ggf. auf die Login-Seite weiterleiten
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
  if (!token) return null;
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
    return null;
  } catch (err) {
    return null;
  }
}

