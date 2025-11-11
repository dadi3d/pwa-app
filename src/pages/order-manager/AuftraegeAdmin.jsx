import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserData, useAuth, authenticatedFetch } from '../services/auth';
import { MAIN_VARIABLES } from '../../config';

export default function Auftraege() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [orderStates, setOrderStates] = useState([]);
  const token = useAuth(state => state.token);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      const user = await fetchUserData();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id || user._id);

      const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/orders`);
      let myOrders;
      try {
        myOrders = await res.json();
      } catch {
        myOrders = [];
      }
      setOrders(Array.isArray(myOrders) ? myOrders : []);
      setLoading(false);
    }
    async function loadOrderStates() {
      try {
        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/orderStates`);
        const data = await res.json();
        setOrderStates(Array.isArray(data) ? data : []);
      } catch {
        setOrderStates([]);
      }
    }
    loadOrders();
    loadOrderStates();
  }, [token]);

  function StatusBadge({ status }) {
    let color = '#bbb';
    if (status === 'Bestätigt' || status === 'confirmed') color = '#4caf50';
    else if (status === 'Abgelehnt' || status === 'rejected') color = '#f44336';
    else if (status === 'Offen' || status === 'pending') color = '#ff9800';
    return (
      <span style={{
        background: color,
        color: '#fff',
        borderRadius: 12,
        padding: '2px 12px',
        fontSize: 13,
        fontWeight: 500,
        marginLeft: 4
      }}>
        {status}
      </span>
    );
  }

  // Gruppiert die Aufträge nach Status (_id)
  function groupOrdersByState(orders, orderStates) {
    const groups = {};
    orderStates.forEach(st => {
      groups[st._id] = [];
    });
    orders.forEach(order => {
      const stateId = order.state?._id;
      if (stateId && groups[stateId]) {
        groups[stateId].push(order);
      }
    });
    return groups;
  }

  if (loading) return <div style={{ textAlign: 'center', marginTop: 40 }}>Lade Bestellungen...</div>;
  if (!userId) return <div style={{ textAlign: 'center', marginTop: 40 }}>Keine Nutzerinformationen gefunden.</div>;

  const groupedOrders = groupOrdersByState(orders, orderStates);

  return (
    <div style={{ maxWidth: 700, margin: '2rem auto', padding: 8, position: 'relative' }}>
      <button
        onClick={() => navigate('/auftrag-anlegen-admin')}
        title="Neuen Auftrag anlegen"
        style={{
          position: 'absolute',
          right: 16,
          top: 16,
          background: '#1976d2',
          color: '#fff',
          border: 'none',
          borderRadius: '50%',
          width: 44,
          height: 44,
          fontSize: 28,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2
        }}
      >
        +
      </button>
      <h2 style={{ textAlign: 'center', marginBottom: 32 }}>Laufende Aufträge</h2>
      {orderStates.length === 0 ? (
        <div style={{
          background: '#f5f5f5',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          color: '#888'
        }}>
          Keine Statusinformationen gefunden.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {orderStates.map(st => (
            <div key={st._id}>
              <h3 style={{ margin: '24px 0 12px 0', color: '#1976d2', fontWeight: 700, fontSize: 20 }}>
                {st.name?.de || st.name || st._id}
              </h3>
              {groupedOrders[st._id] && groupedOrders[st._id].length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {groupedOrders[st._id].map(order => (
                    <div
                      key={order._id}
                      style={{
                        background: '#fff',
                        borderRadius: 14,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                        padding: 24,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        borderLeft: '6px solid #1976d2',
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                      onClick={() => navigate(`/orderEdit/${order._id}`)}
                      title="Auftrag bearbeiten"
                    >
                      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
                        {order.name || '–'}
                      </div>
                      <div style={{ color: '#555', fontSize: 15 }}>
                        <span style={{ fontWeight: 500 }}>Zeitraum:</span>{' '}
                        {order.rent_start ? new Date(order.rent_start).toLocaleDateString() : ''} –{' '}
                        {order.rent_end ? new Date(order.rent_end).toLocaleDateString() : ''}
                      </div>
                      <div style={{ color: '#555', fontSize: 15 }}>
                        <span style={{ fontWeight: 500 }}>Status:</span>
                        <StatusBadge status={order.state?.name?.de || order.state?.name || '-'} />
                      </div>
                      {/* Button-Container */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 16,
                          right: 16,
                          display: 'flex',
                          gap: 10,
                          zIndex: 1
                        }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={async () => {
                            if (!window.confirm('Diesen Auftrag wirklich löschen?')) return;
                            try {
                              const res = await authenticatedFetch(
                                `${MAIN_VARIABLES.SERVER_URL}/api/orders/${order._id}`,
                                {
                                  method: 'DELETE'
                                }
                              );
                              if (res.ok) {
                                setOrders(orders => orders.filter(o => o._id !== order._id));
                              } else {
                                const err = await res.json();
                                alert(err.error || 'Fehler beim Löschen.');
                              }
                            } catch (e) {
                              alert('Fehler beim Löschen.');
                            }
                          }}
                          style={{
                            background: '#f44336',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 8,
                            padding: '4px 12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: 15
                          }}
                          title="Auftrag löschen"
                        >
                          Löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: '#f5f5f5',
                  borderRadius: 12,
                  padding: 24,
                  textAlign: 'center',
                  color: '#aaa',
                  fontSize: 15
                }}>
                  Keine Aufträge in diesem Status.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}