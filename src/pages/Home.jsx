import { useEffect, useState } from 'react';
import { useAuth, fetchUserData } from './services/auth';
import { MAIN_VARIABLES } from '../config.js';

const mockNews = [
  {
    id: 1,
    title: 'Willkommen zur Medienausleihe!',
    date: '2025-05-20',
    content: 'Die neue App ist jetzt online. Viel Spaß beim Ausleihen!'
  },
  {
    id: 2,
    title: 'Neue Geräte verfügbar',
    date: '2025-05-18',
    content: 'Ab sofort stehen neue Kameras und Mikrofone zur Verfügung.'
  }
];

export default function Home() {
  const [news, setNews] = useState([]);
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('student');
  const token = useAuth(state => state.token);
  const setAuth = useAuth(state => state.setAuth);

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
    setNews(mockNews);
    fetchUserId();
  }, [token]);

  // Benutzer-ID aus JWT holen
    async function fetchUserId() {
      try {
        const userData = await fetchUserData();
        if(userData) {
          setUserId(userData.id); // oder userData.name, je nach Backend
          if(userData.role) {
            setUserRole(userData.role);
          }
        }
      } catch (err) {
        setUserId('');
      }
    }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '1rem' }}>
      <h1>Neuigkeiten</h1>
        {userId && (
          <div style={{ marginBottom: '1.5rem', fontWeight: 'bold', color: '#1976d2' }}>
            Willkommen, {userId} <span style={{ color: '#555', fontWeight: 'normal' }}>({userRole})</span>!
          </div>
        )}
      {news.length === 0 ? (
        <p>Keine News vorhanden.</p>
      ) : (
        news.map(item => (
          <div key={item.id} style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>{item.title}</h2>
            <small style={{ color: '#888' }}>{item.date}</small>
            <p>{item.content}</p>
          </div>
        ))
      )}
    </div>
  );
}