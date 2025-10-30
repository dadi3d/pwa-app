import { useAuth} from './services/auth';
import { useEffect } from 'react';

export default function Logout() {
    const setAuth = useAuth(state => state.setAuth);

    useEffect(() => {
        setAuth(null);
        localStorage.removeItem('token');
        
        // Lösche den fe_user Cookie für www.oth-aw.de
        document.cookie = 'fe_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.oth-aw.de; Secure; SameSite=None';
        // Lösche auch lokal, falls vorhanden
        document.cookie = 'fe_user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        
        window.location.href = '/';
    }, [setAuth]);

    return null;
}
