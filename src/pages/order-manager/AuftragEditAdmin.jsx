import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';
import { useAuth } from '../services/auth';

// Stift-Icon als Komponente (SVG)
const EditIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" style={{ verticalAlign: 'middle' }}>
    <path d="M14.85 2.85a1.2 1.2 0 0 1 1.7 1.7l-1.1 1.1-1.7-1.7 1.1-1.1zm-2 2 1.7 1.7-8.1 8.1c-.1.1-.2.2-.3.3l-2.1.7c-.3.1-.6-.2-.5-.5l.7-2.1c.1-.1.2-.2.3-.3l8.1-8.1z" fill="#444"/>
  </svg>
);

function AuftragEditAdmin({ orderId, onSuccess }) {
  const { objectID } = useParams();
  const navigate = useNavigate();
  
  // Verwende orderId Prop wenn vorhanden, sonst useParams
  const currentOrderId = orderId || objectID;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [types, setTypes] = useState([]);
  const [states, setStates] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editFields, setEditFields] = useState({});
  const [thumbnailUrls, setThumbnailUrls] = useState({}); // Cache für Thumbnail-URLs
  const token = useAuth(s => s.token);

  function getId(val) {
    return val?._id || val;
  }

  useEffect(() => {
    async function fetchOrder() {
      setLoading(true);
      try {
        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orders?`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const orders = await res.json();
        const found = orders.find(o => o._id === currentOrderId);
        setOrder(found || null);
        
        // Thumbnail-URLs für Sets laden
        if (found && found.sets && found.sets.length > 0) {
          const thumbnails = {};
          for (const set of found.sets) {
            try {
              const thumbnailRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${set._id}`);
              const thumbnailData = await thumbnailRes.json();
              thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}${thumbnailData.path}`;
            } catch (err) {
              console.error(`Fehler beim Laden des Thumbnails für Set ${set._id}:`, err);
              thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
            }
          }
          setThumbnailUrls(thumbnails);
        }
      } catch {
        setOrder(null);
      }
      setLoading(false);
    }
    if (currentOrderId && token) fetchOrder();
  }, [currentOrderId, token]);

  useEffect(() => {
    async function fetchDropdowns() {
      const [typesRes, statesRes, teachersRes] = await Promise.all([
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orderTypes`).then(r => r.json()),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orderStates`).then(r => r.json()),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users?role=teacher`).then(r => r.json())
      ]);
      setTypes(typesRes);
      setStates(statesRes);
      setTeachers(teachersRes);
    }
    fetchDropdowns();
  }, []);

  function handleChange(e) {
    const { name, value } = e.target;
    setOrder(order => ({ ...order, [name]: value }));
  }

  function handleSelectChange(e) {
    const { name, value } = e.target;
    setOrder(order => ({ ...order, [name]: value }));
  }

  function toggleEditField(field) {
    setEditFields(f => ({ ...f, [field]: !f[field] }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: order.name,
        rent_start: order.rent_start,
        rent_end: order.rent_end,
        type: getId(order.type),
        assigned_teacher: getId(order.assigned_teacher),
        location: order.location,
        notes: order.notes,
        phone: order.phone,
        sets: order.sets.map(set => set._id),
        state: getId(order.state),
      };
      const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orders/${objectID}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error || 'Fehler beim Speichern');
      } else {
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/order-manager');
        }
      }
    } catch (err) {
      setError('Fehler beim Speichern');
    }
    setSaving(false);
  }

  if (loading) return <div>Lade...</div>;
  if (!order) return <div>Auftrag nicht gefunden.</div>;

  return (
    <form onSubmit={handleSave} style={{ padding: '2rem' }}>
      <h2>Auftrag Editieren (Admin)</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {/* Name */}
      <label>
        <b>Name:</b>
        {editFields.name ? (
          <>
            <input name="name" value={order.name || ''} onChange={handleChange} style={{ width: 300 }} />
            <button type="button" onClick={() => toggleEditField('name')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>{order.name}</span>
            <button type="button" onClick={() => toggleEditField('name')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      {/* Zeitraum */}
      <label>
        <b>Zeitraum:</b>
        {editFields.zeitraum ? (
          <>
            <input
              type="datetime-local"
              name="rent_start"
              value={order.rent_start ? new Date(order.rent_start).toISOString().slice(0, 16) : ''}
              onChange={handleChange}
            />
            {' – '}
            <input
              type="datetime-local"
              name="rent_end"
              value={order.rent_end ? new Date(order.rent_end).toISOString().slice(0, 16) : ''}
              onChange={handleChange}
            />
            <button type="button" onClick={() => toggleEditField('zeitraum')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>
              {order.rent_start && new Date(order.rent_start).toLocaleString()} – {order.rent_end && new Date(order.rent_end).toLocaleString()}
            </span>
            <button type="button" onClick={() => toggleEditField('zeitraum')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      {/* Typ */}
      <label>
        <b>Typ:</b>
        {editFields.type ? (
          <>
            <select name="type" value={getId(order.type) || ''} onChange={handleSelectChange}>
              <option value="">Bitte wählen</option>
              {types.map(t => (
                <option key={t._id} value={t._id}>{t.name?.de || t.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => toggleEditField('type')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>{order.type?.name?.de || order.type?.name}</span>
            <button type="button" onClick={() => toggleEditField('type')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      {/* Status */}
      <label>
        <b>Status:</b>
        {editFields.state ? (
          <>
            <select name="state" value={getId(order.state) || ''} onChange={handleSelectChange}>
              <option value="">Bitte wählen</option>
              {states.map(s => (
                <option key={s._id} value={s._id}>{s.name?.de || s.name}</option>
              ))}
            </select>
            <button type="button" onClick={() => toggleEditField('state')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>{order.state?.name?.de || order.state?.name}</span>
            <button type="button" onClick={() => toggleEditField('state')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      {/* Lehrkraft */}
      <label>
        <b>Lehrkraft:</b>
        {editFields.assigned_teacher ? (
          <>
            <select name="assigned_teacher" value={getId(order.assigned_teacher) || ''} onChange={handleSelectChange}>
              <option value="">Bitte wählen</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
              ))}
            </select>
            <button type="button" onClick={() => toggleEditField('assigned_teacher')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>{order.assigned_teacher?.name} ({order.assigned_teacher?.email})</span>
            <button type="button" onClick={() => toggleEditField('assigned_teacher')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      {/* Ort */}
      <label>
        <b>Ort:</b>
        {editFields.location ? (
          <>
            <input name="location" value={order.location || ''} onChange={handleChange} />
            <button type="button" onClick={() => toggleEditField('location')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>{order.location}</span>
            <button type="button" onClick={() => toggleEditField('location')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      {/* Telefon */}
      <label>
        <b>Telefon:</b>
        {editFields.phone ? (
          <>
            <input name="phone" value={order.phone || ''} onChange={handleChange} />
            <button type="button" onClick={() => toggleEditField('phone')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>{order.phone}</span>
            <button type="button" onClick={() => toggleEditField('phone')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      {/* Notizen */}
      <label>
        <b>Notizen:</b>
        {editFields.notes ? (
          <>
            <textarea name="notes" value={order.notes || ''} onChange={handleChange} style={{ width: 300 }} />
            <button type="button" onClick={() => toggleEditField('notes')}>Fertig</button>
          </>
        ) : (
          <>
            <span style={{ marginLeft: 8 }}>{order.notes}</span>
            <button type="button" onClick={() => toggleEditField('notes')} title="Bearbeiten" style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 6 }}>
              <EditIcon />
            </button>
          </>
        )}
      </label>
      <br />

      <label>
        <b>User:</b> {order.user?.name} ({order.user?.email})
      </label>
      <h3>Sets im Auftrag:</h3>
      {order.sets && order.sets.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
          {order.sets.map((set, idx) => (
            <div key={set._id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, minWidth: 260 }}>
              <img
                src={thumbnailUrls[set._id] || `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`}
                alt="Set-Thumbnail"
                style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
              />
              <div><b>Hersteller:</b> {set.manufacturer?.name}</div>
              <div><b>Set-Name:</b> {set.set_name?.name?.de || set.set_name?.name}</div>
              <div><b>Kategorie:</b> {set.category?.name?.de || set.category?.name}</div>
              <div><b>Set-Nr:</b> {set.set_number}</div>
              <div><b>Status:</b> {set.state?.name?.de || set.state?.name}</div>
              <div>
                <b>Öffentliche Anmerkung:</b>
                <span style={{ marginLeft: 8 }}>{set.note_public}</span>
              </div>
              <div>
                <b>Interne Anmerkung:</b>
                <span style={{ marginLeft: 8 }}>{set.note_private}</span>
              </div>
              <div>
                <b>Versicherungswert:</b>
                <span style={{ marginLeft: 8 }}>{set.insurance_value} €</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>Keine Sets im Auftrag.</div>
      )}
      <br />
      <button type="submit" disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</button>
    </form>
  );
}

export default AuftragEditAdmin;