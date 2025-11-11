import { useEffect, useState, useRef } from 'react';
import { useAuth, fetchUserData, authenticatedFetch } from './services/auth';
import { MAIN_VARIABLES } from '../config';
import AuftragEditAdmin from './order-manager/AuftragEditAdmin';

// Hilfsfunktion: Gibt die Anzahl der Tage im Monat zurück
function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

// Hilfsfunktion: Gibt alle Monate des Jahres als Array [{month, daysInMonth}]
function getMonthsOfYear(year) {
  return Array.from({ length: 12 }, (_, m) => ({
    month: m,
    daysInMonth: getDaysInMonth(year, m)
  }));
}

// Liefert alle Stripes (Aufträge) für das Jahr, mit fixer Row
function getOrderStripesForYear(orders, currentYear) {
  return orders
    .map((order, idx) => {
      if (!order.rent_start || !order.rent_end) return null;
      const startDate = new Date(order.rent_start);
      const endDate = new Date(order.rent_end);
      return {
        id: order.id || idx,
        label: order.name || order.title || `Auftrag ${idx + 1}`,
        startDate,
        endDate,
        color: `hsl(${(idx * 60) % 360}, 80%, 80%)`,
        order,
        row: idx // feste Zeile für das ganze Jahr
      };
    })
    .filter(Boolean);
}

// Für einen Monat: Liefert alle Stripes, die in diesem Monat sichtbar sind, mit Start/Ende im Monat
function getOrderStripesForMonth(stripes, currentYear, month, daysInMonth) {
  return stripes.map(stripe => {
    if (
      stripe.endDate < new Date(currentYear, month, 1) ||
      stripe.startDate > new Date(currentYear, month + 1, 0)
    ) {
      return null;
    }
    const stripeStart = stripe.startDate < new Date(currentYear, month, 1) ? 0 : stripe.startDate.getDate() - 1;
    const stripeEnd = stripe.endDate > new Date(currentYear, month + 1, 0) ? daysInMonth - 1 : stripe.endDate.getDate() - 1;
    return {
      ...stripe,
      start: stripeStart,
      end: stripeEnd
    };
  });
}

// Popup-Komponente für Order-Details
function OrderModal({ order, onClose, getUserDisplay }) {
  const [teacherName, setTeacherName] = useState('-');
  const [userName, setUserName] = useState('-');

  useEffect(() => {
    let active = true;
    async function loadNames() {
      setTeacherName('-');
      setUserName('-');
      if (order?.assigned_teacher?._id) {
        const name = await getUserDisplay(order.assigned_teacher._id);
        if (active) setTeacherName(name);
      }
      if (order?.user?._id) {
        const name = await getUserDisplay(order.user._id);
        if (active) setUserName(name);
      }
    }
    if (order) loadNames();
    return () => { active = false; };
  }, [order, getUserDisplay]);

  if (!order) return null;
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 8px 32px #0003',
        maxWidth: 480,
        width: '100%',
        padding: 32,
        position: 'relative'
      }}>
        <button
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 28,
            color: '#888',
            cursor: 'pointer'
          }}
          onClick={onClose}
          aria-label="Schließen"
        >
          &times;
        </button>
        <h2 style={{ fontSize: 26, fontWeight: 700, marginBottom: 18 }}>{order.name}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div><b>Zeitraum:</b> {new Date(order.rent_start).toLocaleDateString()} - {new Date(order.rent_end).toLocaleDateString()}</div>
          <div><b>Ort:</b> {order.location}</div>
          <div><b>Telefon:</b> {order.phone}</div>
          <div><b>Lehrkraft:</b> {teacherName}</div>
          <div><b>Status:</b> {order.state?.name?.de}</div>
          <div><b>Typ:</b> {order.type?.name?.de}</div>
          <div><b>Notizen:</b> {order.notes}</div>
          <div><b>Sets:</b> {Array.isArray(order.sets) ? order.sets.length : 0}</div>
          <div><b>User:</b> {userName}</div>
          <div><b>Order-ID:</b> {order._id}</div>
        </div>
      </div>
    </div>
  );
}

export default function Kalender() {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [availableStatuses, setAvailableStatuses] = useState([]);
  const token = useAuth(state => state.token);

  const [userCache, setUserCache] = useState({});
  const scrollRef = useRef(null);

  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('student');

  // Hilfsfunktion: Userdaten nachladen und cachen (per ObjectID)
  const getUserDisplay = async (objectId) => {
    if (!objectId) return '-';
    if (userCache[objectId]) {
      return userCache[objectId].id;
    }
    try {
      const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users/byObjectId/${objectId}`);
      if (!res.ok) throw new Error('User nicht gefunden');
      const user = await res.json();
      setUserCache(prev => ({ ...prev, [objectId]: user }));
      return user.id;
    } catch (error) {
      console.error('Fehler beim Laden der Userdaten:', error);
      return '-';
    }
  };

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      setError(null);
      try {
        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/orders`);
        
        if (!res.ok) {
          throw new Error(`Fehler beim Laden der Aufträge: ${res.status} ${res.statusText}`);
        }
        
        const myOrders = await res.json();
        const ordersArray = Array.isArray(myOrders) ? myOrders : [];
        setOrders(ordersArray);
        
        // Verfügbare Status sammeln
        const statuses = [...new Set(ordersArray
          .map(order => order.state?.name?.de)
          .filter(Boolean)
        )];
        setAvailableStatuses(statuses);
        
      } catch (error) {
        console.error('Fehler beim Laden der Aufträge:', error);
        setError(error.message);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    if (token) {
      loadOrders();
      fetchUserId();
    }
  }, [token, currentYear]);

  // Benutzer-ID aus JWT holen
  async function fetchUserId() {
    try {
      const userData = await fetchUserData();
      if(userData) {
        setUserId(userData.id);
        if(userData.role) {
          setUserRole(userData.role);
        }
      }
    } catch (err) {
      setUserId('');
    }
  }

  // Filter-Effekt
  useEffect(() => {
    let filtered = orders;
    
    // Textsuche
    if (searchTerm) {
      filtered = filtered.filter(order => 
        (order.name && order.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.location && order.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (order.notes && order.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Status-Filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.state?.name?.de === statusFilter);
    }
    
    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    if (!loading && scrollRef.current) {
      // Warte einen kurzen Moment, damit der DOM vollständig gerendert ist
      setTimeout(() => {
        if (scrollRef.current) {
          const monthIndex = today.getMonth();
          const monthColumn = scrollRef.current.querySelector(`[data-month="${monthIndex}"]`);
          if (monthColumn) {
            const dayWidth = window.innerWidth < 768 ? 45 : 60;
            const offset = Math.max(0, (today.getDate() - 4)) * dayWidth;
            const scrollPosition = monthColumn.offsetLeft + offset - scrollRef.current.clientWidth / 2 + 250;
            scrollRef.current.scrollLeft = scrollPosition;
          }
        }
      }, 100);
    }
  }, [loading, currentYear, filteredOrders]); // filteredOrders hinzugefügt für bessere Reaktivität

  // Zusätzlicher Effect für den ersten Seitenaufruf - springt immer zu "heute"
  useEffect(() => {
    // Setze das Jahr auf das aktuelle Jahr, falls es abweicht
    const currentYearValue = today.getFullYear();
    if (currentYear !== currentYearValue) {
      setCurrentYear(currentYearValue);
    }
  }, []); // Läuft nur beim ersten Mount

  const months = getMonthsOfYear(currentYear);

  // Stripes für das ganze Jahr mit fixer Row - verwende gefilterte Aufträge
  const yearStripes = getOrderStripesForYear(filteredOrders, currentYear);
  const maxRows = yearStripes.length;

  function prevYear() {
    setCurrentYear(y => y - 1);
  }
  function nextYear() {
    setCurrentYear(y => y + 1);
  }
  function goToToday() {
    const today = new Date();
    setCurrentYear(today.getFullYear());
    // Nach dem Rendern zum aktuellen Monat scrollen
    setTimeout(() => {
      if (scrollRef.current) {
        const monthIndex = today.getMonth();
        const monthColumn = scrollRef.current.querySelector(`[data-month="${monthIndex}"]`);
        if (monthColumn) {
          const dayWidth = window.innerWidth < 768 ? 45 : 60;
          const offset = Math.max(0, (today.getDate() - 4)) * dayWidth;
          const scrollPosition = monthColumn.offsetLeft + offset - scrollRef.current.clientWidth / 2 + 250;
          scrollRef.current.scrollLeft = scrollPosition;
        }
      }
    }, 150); // Etwas länger warten für bessere Zuverlässigkeit
  }
  function scrollToMonth(monthIndex) {
    if (scrollRef.current) {
      const monthColumn = scrollRef.current.querySelector(`[data-month="${monthIndex}"]`);
      if (monthColumn) {
        scrollRef.current.scrollLeft = monthColumn.offsetLeft - 100;
      }
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Sticky Header mit Navigation und Filtern */}
      <div style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 100, 
        background: '#fff', 
        borderBottom: '2px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        padding: '10px 0'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          {/* Hauptnavigation */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <button 
              onClick={prevYear}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: '2px solid #007acc',
                background: '#fff',
                color: '#007acc',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '80px'
              }}
              onMouseOver={(e) => { e.target.style.background = '#007acc'; e.target.style.color = '#fff'; }}
              onMouseOut={(e) => { e.target.style.background = '#fff'; e.target.style.color = '#007acc'; }}
            >
              ← {currentYear - 1}
            </button>
            <h1 style={{ textAlign: 'center', margin: 0, fontSize: 'clamp(18px, 4vw, 24px)', fontWeight: '600' }}>
              Kalender {currentYear}
            </h1>
            <button 
              onClick={nextYear}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                border: '2px solid #007acc',
                background: '#fff',
                color: '#007acc',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '80px'
              }}
              onMouseOver={(e) => { e.target.style.background = '#007acc'; e.target.style.color = '#fff'; }}
              onMouseOut={(e) => { e.target.style.background = '#fff'; e.target.style.color = '#007acc'; }}
            >
              {currentYear + 1} →
            </button>
          </div>
          
          {/* Heute-Button */}
          <button 
            onClick={goToToday}
            style={{
              padding: '10px 20px',
              fontSize: 'clamp(14px, 3vw, 16px)',
              border: 'none',
              background: '#28a745',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 2px 4px rgba(40, 167, 69, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { e.target.style.background = '#218838'; e.target.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.target.style.background = '#28a745'; e.target.style.transform = 'translateY(0)'; }}
          >
            📅 Zu heute springen
          </button>
          
          {/* Monatsnavigation */}
          <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '95vw', padding: '0 10px' }}>
            {months.map(({ month }) => {
              const monthName = new Date(currentYear, month).toLocaleString('de-DE', { month: 'short' });
              const isCurrentMonth = currentYear === today.getFullYear() && month === today.getMonth();
              return (
                <button
                  key={month}
                  onClick={() => scrollToMonth(month)}
                  style={{
                    padding: '4px 8px',
                    fontSize: 'clamp(11px, 2.5vw, 14px)',
                    border: isCurrentMonth ? '2px solid #28a745' : '1px solid #ddd',
                    background: isCurrentMonth ? '#e8f5e8' : '#fff',
                    color: isCurrentMonth ? '#28a745' : '#666',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: isCurrentMonth ? '600' : '400',
                    transition: 'all 0.2s ease',
                    minWidth: '40px'
                  }}
                  onMouseOver={(e) => { 
                    if (!isCurrentMonth) {
                      e.target.style.background = '#f8f9fa'; 
                      e.target.style.borderColor = '#007acc';
                    }
                  }}
                  onMouseOut={(e) => { 
                    if (!isCurrentMonth) {
                      e.target.style.background = '#fff'; 
                      e.target.style.borderColor = '#ddd';
                    }
                  }}
                >
                  {monthName}
                </button>
              );
            })}
          </div>
          
          {/* Filter und Suche */}
          <div style={{ 
            display: 'flex', 
            flexDirection: window.innerWidth < 768 ? 'column' : 'row',
            gap: '12px', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexWrap: 'wrap',
            maxWidth: '95vw',
            padding: '10px'
          }}>
            {/* Suchfeld */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>🔍 Suche:</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, Ort oder Notizen..."
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '200px'
                }}
              />
            </div>
            
            {/* Status-Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '14px', fontWeight: '500' }}>📊 Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minWidth: '120px'
                }}
              >
                <option value="all">Alle Status</option>
                {availableStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            
            {/* Ergebnisse Anzeige */}
            <div style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>
              {filteredOrders.length} von {orders.length} Aufträgen
            </div>
          </div>
        </div>
      </div>

      {/* Scrollbarer Kalender-Bereich */}
      <div 
        style={{ 
          flex: 1, 
          overflowX: 'auto', 
          overflowY: 'auto',
          padding: '20px 0'
        }} 
        ref={scrollRef}
      >
        {loading ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: '60px 20px',
            gap: '20px'
          }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid #f3f3f3',
              borderTop: '5px solid #007acc',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            <div style={{ fontSize: '18px', color: '#666' }}>Lade Aufträge...</div>
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            gap: '20px'
          }}>
            <div style={{ fontSize: '48px' }}>⚠️</div>
            <div style={{ fontSize: '18px', color: '#dc3545', textAlign: 'center' }}>
              Fehler beim Laden der Aufträge:
            </div>
            <div style={{ fontSize: '16px', color: '#666', textAlign: 'center' }}>
              {error}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px',
                fontSize: '16px',
                border: 'none',
                background: '#007acc',
                color: '#fff',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Seite neu laden
            </button>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            gap: '20px'
          }}>
            <div style={{ fontSize: '48px' }}>📅</div>
            <div style={{ fontSize: '18px', color: '#666', textAlign: 'center' }}>
              {orders.length === 0 
                ? 'Keine Aufträge für dieses Jahr gefunden'
                : `Keine Aufträge entsprechen den Filterkriterien${searchTerm ? ` "${searchTerm}"` : ''}${statusFilter !== 'all' ? ` (Status: ${statusFilter})` : ''}`
              }
            </div>
            {(searchTerm || statusFilter !== 'all') && (
              <button
                onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  border: '1px solid #007acc',
                  background: '#fff',
                  color: '#007acc',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Filter zurücksetzen
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'row', gap: 0, minWidth: 12 * 500 }}>
            {months.map(({ month, daysInMonth }) => {
              const monthStripes = getOrderStripesForMonth(yearStripes, currentYear, month, daysInMonth);
              const dayWidth = window.innerWidth < 768 ? 45 : 60; // Responsive Tagesbreite
              return (
                <div
                  key={month}
                  data-month={month}
                  style={{ 
                    minWidth: daysInMonth * dayWidth, 
                    borderTop: '6px solid #bbb', 
                    padding: '0 0 0 0',
                    marginRight: '8px'
                  }}
                >
                  <div style={{
                    fontWeight: 'bold',
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    marginBottom: 10,
                    marginTop: 16,
                    color: '#444',
                    borderBottom: '2px solid #bbb',
                    paddingBottom: 4,
                    letterSpacing: 1,
                    textAlign: 'center'
                  }}>
                    {new Date(currentYear, month).toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
                  </div>
                  {/* Wochentage Kopfzeile */}
                  <div
                    className="horizontal-weekdays"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${daysInMonth}, ${dayWidth}px)`,
                      gap: 2,
                      marginBottom: 2
                    }}
                  >
                    {[...Array(daysInMonth)].map((_, i) => {
                      const date = new Date(currentYear, month, i + 1);
                      const wd = date.toLocaleDateString('de-DE', { weekday: 'short' });
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <div 
                          key={i} 
                          className="horizontal-weekday"
                          style={{
                            background: isWeekend ? '#ffe6e6' : '#f0f0f0',
                            color: isWeekend ? '#d63384' : '#888',
                            fontSize: 'clamp(10px, 2vw, 13px)',
                            width: `${dayWidth}px`,
                            minWidth: `${dayWidth}px`
                          }}
                        >
                          {wd}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="horizontal-days"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${daysInMonth}, ${dayWidth}px)`,
                      gap: 2,
                      marginBottom: 8
                    }}
                  >
                    {[...Array(daysInMonth)].map((_, i) => {
                      const date = new Date(currentYear, month, i + 1);
                      const isToday = date.toDateString() === today.toDateString();
                      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                      return (
                        <div 
                          key={i} 
                          className="horizontal-day"
                          style={{
                            background: isToday ? '#007acc' : isWeekend ? '#ffe6e6' : '#f5f5f5',
                            color: isToday ? '#fff' : isWeekend ? '#d63384' : '#333',
                            fontWeight: isToday ? 'bold' : isWeekend ? '600' : 'bold',
                            border: isToday ? '2px solid #005a9e' : 'none',
                            transform: isToday ? 'scale(1.1)' : 'scale(1)',
                            zIndex: isToday ? 10 : 1,
                            position: 'relative',
                            boxShadow: isToday ? '0 2px 8px rgba(0, 122, 204, 0.4)' : 'none',
                            fontSize: 'clamp(11px, 2.5vw, 14px)',
                            width: `${dayWidth}px`,
                            minWidth: `${dayWidth}px`
                          }}
                        >
                          {i + 1}
                        </div>
                      );
                    })}
                  </div>
                  <div
                    className="stripes-container"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${daysInMonth}, ${dayWidth}px)`,
                      gridTemplateRows: `repeat(${maxRows}, 28px)`,
                      rowGap: 8,
                      columnGap: 2
                    }}
                  >
                    {yearStripes.map((stripe, rowIdx) => {
                      const monthStripe = monthStripes[rowIdx];
                      if (monthStripe) {
                        const start = monthStripe.start;
                        const end = monthStripe.end;
                        const isFirstMonth = month === 0 || stripe.startDate.getMonth() === month;
                        const isLastMonth = month === 11 || stripe.endDate.getMonth() === month;
                        return (
                          <div
                            key={stripe.id}
                            className="order-stripe cursor-pointer"
                            style={{
                              gridColumn: `${start + 1} / ${end + 2}`,
                              gridRow: rowIdx + 1,
                              background: stripe.color,
                              borderTopLeftRadius: isFirstMonth && start === 0 ? 6 : 0,
                              borderBottomLeftRadius: isFirstMonth && start === 0 ? 6 : 0,
                              borderTopRightRadius: isLastMonth && end === daysInMonth - 1 ? 6 : 0,
                              borderBottomRightRadius: isLastMonth && end === daysInMonth - 1 ? 6 : 0
                            }}
                            title={stripe.label}
                            onClick={() => setSelectedOrderForEdit(stripe.order)}
                          >
                            {stripe.label}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`empty-${stripe.id}`}
                          style={{
                            gridColumn: `1 / -1`,
                            gridRow: rowIdx + 1,
                            background: 'transparent',
                            height: 28
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} getUserDisplay={getUserDisplay} />
      
      {/* Edit-Popup für Aufträge */}
      {selectedOrderForEdit && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setSelectedOrderForEdit(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 4px 32px rgba(0,0,0,0.18)',
              maxWidth: '90vw',
              width: '800px',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              style={{
                position: 'absolute',
                top: 12,
                right: 18,
                background: '#fff',
                border: '1px solid #ccc',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontWeight: 'bold',
                color: '#d32f2f',
                fontSize: '1.5rem',
                zIndex: 2,
              }}
              onClick={() => setSelectedOrderForEdit(null)}
              title="Schließen"
            >
              ×
            </button>
            <AuftragEditAdmin 
              orderId={selectedOrderForEdit._id} 
              onSuccess={() => {
                setSelectedOrderForEdit(null);
                // Optional: Daten neu laden
                window.location.reload();
              }}
            />
          </div>
        </div>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .horizontal-weekdays {
            display: grid;
            gap: 2px;
            margin-bottom: 2px;
          }
          .horizontal-weekday {
            text-align: center;
            font-size: 13px;
            color: #888;
            background: #f0f0f0;
            border-radius: 2px;
            min-width: 60px;
            padding: 2px 0;
            transition: all 0.2s ease;
          }
          .horizontal-weekday:hover {
            background: #e0e0e0;
            transform: translateY(-1px);
          }
          .horizontal-days {
            display: grid;
            gap: 2px;
            margin-bottom: 8px;
          }
          .horizontal-day {
            text-align: center;
            font-weight: bold;
            padding: 4px 0;
            background: #f5f5f5;
            border-radius: 2px;
            font-size: 14px;
            min-width: 60px;
            transition: all 0.3s ease;
            cursor: pointer;
          }
          .horizontal-day:hover {
            background: #e8f4fd;
            transform: translateY(-1px);
            box-shadow: 0 2px 4px rgba(0, 122, 204, 0.2);
          }
          .stripes-container {
            display: grid;
            row-gap: 2px;
            column-gap: 0;
          }
          .order-stripe {
            height: 28px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            padding-left: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 1px 2px #0001;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
          }
          .order-stripe:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 5;
          }
          .order-stripe:hover::after {
            content: attr(title);
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background: #333;
            color: #fff;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            z-index: 1000;
            margin-bottom: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          }
          .order-stripe:hover::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 5px solid transparent;
            border-top-color: #333;
            margin-bottom: 0px;
            z-index: 1000;
          }
          
          /* Scroll-Indikator */
          .calendar-container {
            position: relative;
          }
          .calendar-container::after {
            content: '← Horizontal scrollen →';
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 122, 204, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 100;
            animation: fadeInOut 3s ease-in-out;
          }
          
          @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
          
          /* Responsive Verbesserungen */
          @media (max-width: 768px) {
            .horizontal-weekday, .horizontal-day {
              font-size: 11px;
              padding: 2px 0;
            }
            .order-stripe {
              font-size: 12px;
              height: 24px;
            }
          }
          
          /* Touch-freundliche Verbesserungen */
          @media (max-width: 768px) {
            .order-stripe {
              min-height: 32px;
              height: 32px;
            }
            button {
              min-height: 44px;
            }
          }
        `}
      </style>
    </div>
  );
}