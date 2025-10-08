import { useAuth} from './services/auth';
import { useEffect } from 'react';

export default function Logout() {
    const setAuth = useAuth(state => state.setAuth);

    useEffect(() => {
        setAuth(null);
        localStorage.removeItem('token');
        window.location.href = '/';
    }, [setAuth]);

    return null;
}
