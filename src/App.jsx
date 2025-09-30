
import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Produkte from './pages/Produkte.jsx';
import Auftraege from './pages/Auftraege.jsx';
import AuftraegeAdmin from './pages/order-manager/AuftraegeAdmin.jsx';
import Login from './pages/Login.jsx';
import EquipmentManagerMenu from './pages/Equipment.jsx';
import Einstellungen from './pages/Einstellungen.jsx';
import Kalender from './pages/Kalender.jsx';
import Logout from './pages/Logout.jsx';
import Nutzer from './pages/Nutzer.jsx';
import { fetchUserData } from './pages/services/auth.js';
import './App.css';
import DebugMenu from './pages/services/debugMenu.jsx';
import HerstellerManager from './pages/equipment-manager/Hersteller.jsx';
import Sets from './pages/equipment-manager/Sets.jsx';
import SetKategorien from './pages/equipment-manager/SetKategorien.jsx';
import SetBezeichnungen from './pages/equipment-manager/SetBezeichnungen.jsx';
import SetAnlegen from './pages/equipment-manager/SetAnlegen.jsx';
import SetProdukte from './pages/equipment-manager/Produkte.jsx';
import ProduktKategorien from './pages/equipment-manager/ProduktKategorien.jsx';
import ProduktAnlegen from './pages/equipment-manager/ProduktAnlegen.jsx';
import AuftragAnlegenAdmin from './pages/order-manager/AuftragAnlegenAdmin.jsx';
import AuftragAnlegen from './pages/AuftragAnlegen.jsx';
import AuftragEditAdmin from './pages/order-manager/AuftragEditAdmin.jsx';
import FileManager from './pages/FileManager.jsx';
import SetEdit from './pages/equipment-manager/SetEdit.jsx';
import SetCopy from './pages/equipment-manager/SetKopieren.jsx';
const iconStyle = { fontSize: '1.5rem', marginBottom: '0.2rem' };



// Menü-Konfigurationen für verschiedene Rollen
const menuConfig = {
  admin: [
    { to: '/kalender', label: 'Kalender', icon: 'fa-calendar' },
    { to: '/equipment', label: 'Equipment', icon: 'fa-tools' },
    { to: '/auftraege-admin', label: 'Aufträge', icon: 'fa-clipboard-list' },
    { to: '/nutzer', label: 'Nutzer', icon: 'fa-users' },
    { to: '/einstellungen', label: 'Einstellungen', icon: 'fa-cog' },
    { to: '/logout', label: 'Logout', icon: 'fa-sign-out-alt', logout: true },
  ],
  student: [
    { to: '/home', label: 'Home', icon: 'fa-home' },
    { to: '/produkte', label: 'Equipment', icon: 'fa-box' },
    { to: '/auftraege', label: 'Aufträge', icon: 'fa-clipboard-list' },
    { to: '/logout', label: 'Logout', icon: 'fa-sign-out-alt', logout: true },
  ],
  teacher: [
    { to: '/home', label: 'Home', icon: 'fa-home' },
    { to: '/produkte', label: 'Equipment', icon: 'fa-box' },
    { to: '/auftraege', label: 'Auftraege', icon: 'fa-clipboard-list' },
    { to: '/logout', label: 'Logout', icon: 'fa-sign-out-alt', logout: true },
  ],
  employee: [
    { to: '/home', label: 'Home', icon: 'fa-home' },
    { to: '/logout', label: 'Logout', icon: 'fa-sign-out-alt', logout: true },
  ]
};

function MobileMenu({ userRole }) {
  const location = useLocation();

  if (location.pathname === '/') {
    return null;
  }

  // Fallback: student-Menü, falls Rolle unbekannt
  const menu = menuConfig[userRole] || menuConfig['student'];

  return (
    <nav className="mobile-menu">
      {menu.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className={location.pathname === item.to ? 'active' : ''}
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.7rem 0',
            color: location.pathname === item.to ? '#1976d2' : '#333',
            textDecoration: 'none'
          }}
        >
          <i className={`fas ${item.icon}`} style={iconStyle}></i>
          <div className="menu-text" style={{ fontSize: '0.9rem' }}>{item.label}</div>
        </Link>
      ))}
    </nav>
  );
}

function App() {
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function getUserRole() {
      try {
        const user = await fetchUserData();
        setUserRole(user?.role || null);
      } catch {
        setUserRole(null);
      }
    }
    getUserRole();
  }, []);

  return (
    <Router>
      {/* Font Awesome CDN */}
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
      />
      <div style={{ paddingBottom: '4.5rem' }}>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/produkte" element={<Produkte />} />
          <Route path="/auftraege" element={<Auftraege />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/auftrag-anlegen" element={<AuftragAnlegen />} />
          
          {/* System Settings und Equipment nur für admin und employee */}
          {(userRole === 'admin' || userRole === 'employee') && (
            <>
              <Route path="/einstellungen" element={<Einstellungen />} />
              <Route path="/equipment" element={<EquipmentManagerMenu />} />
              <Route path="/kalender" element={<Kalender />} />
              <Route path="/nutzer" element={<Nutzer />} />
              <Route path="/hersteller" element={<HerstellerManager />} />
              <Route path="/sets" element={<Sets />} />
              <Route path="/kategorien" element={<SetKategorien />} />
              <Route path="/set-bezeichnungen" element={<SetBezeichnungen />} />
              <Route path="/set-anlegen" element={<SetAnlegen />} />
              <Route path="/set-produkte" element={<SetProdukte />} />
              <Route path="/produkt-kategorien" element={<ProduktKategorien />} />
              <Route path="/produkt-anlegen" element={<ProduktAnlegen />} />
              <Route path="/auftraege-admin" element={<AuftraegeAdmin />} />
              <Route path="/auftrag-anlegen-admin" element={<AuftragAnlegenAdmin />} />
              <Route path="/orderEdit/:objectID" element={<AuftragEditAdmin />} />
              <Route path="/file-manager" element={<FileManager />} />
              <Route path="/set-edit/:setId" element={<SetEdit />} />
              <Route path="/set-copy/:set" element={<SetCopy />} />
            </>
          )}
        </Routes>
      </div>
      <DebugMenu />
      <MobileMenu userRole={userRole} />
    </Router>
  );
}

export default App;