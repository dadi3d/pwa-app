import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAIN_VARIABLES } from "../../config";
import { useAuth, fetchUserData, authenticatedFetch } from "../services/auth";

export default function AuftragAnlegen() {
  const [sets, setSets] = useState([]);
  const [orderTypes, setOrderTypes] = useState([]);
  const [orderStates, setOrderStates] = useState([]);
  const [users, setUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    rent_start: "",
    rent_start_time: "",
    rent_end: "",
    rent_end_time: "",
    type: "",
    assigned_teacher: "",
    location: "",
    notes: "",
    phone: "",
    sets: [],
    state: "",
    user: "",
  });
  const [message, setMessage] = useState("");
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();

  useEffect(() => {
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`)
      .then((r) => r.json())
      .then(setSets);
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/orderTypes`)
      .then((r) => r.json())
      .then(setOrderTypes);
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/orderStates`)
      .then((r) => r.json())
      .then(setOrderStates);
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users`)
      .then((r) => r.json())
      .then(setUsers);
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/users?role=teacher`)
      .then((r) => r.json())
      .then(setTeachers);
  }, []);

  function handleChange(e) {
    const { name, value, type, selectedOptions } = e.target;
    if (type === "select-multiple") {
      setForm((f) => ({
        ...f,
        [name]: Array.from(selectedOptions, (opt) => opt.value),
      }));
    } else {
      setForm((f) => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    if (!form.user) {
      setMessage("Bitte einen Nutzer auswählen.");
      return;
    }
    if (!form.phone) {
      setMessage("Telefon ist erforderlich.");
      return;
    }
    if (!form.location) {
      setMessage("Ort ist erforderlich.");
      return;
    }
    let rent_start = form.rent_start;
    let rent_end = form.rent_end;
    if (form.rent_start && form.rent_start_time) {
      rent_start = `${form.rent_start}T${form.rent_start_time}`;
    }
    if (form.rent_end && form.rent_end_time) {
      rent_end = `${form.rent_end}T${form.rent_end_time}`;
    }
    const payload = {
      ...form,
      rent_start,
      rent_end,
      user: form.user,
    };

    const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/orders`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMessage("Auftrag erfolgreich angelegt.");
      setTimeout(() => navigate("/auftraege-admin"), 1200);
    } else {
      const err = await res.json();
      setMessage(err.error || "Fehler beim Anlegen.");
    }
  }

  return (
    <div
      style={{
        maxWidth: 500,
        margin: "3rem auto",
        padding: 32,
        borderRadius: 16,
        background: "#fff",
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: 32, color: "#1a237e" }}>
        Neuen Auftrag anlegen (Admin)
      </h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Nutzer auswählen:</label>
          <select
            name="user"
            value={form.user}
            onChange={handleChange}
            required
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
            }}
          >
            <option value="">Bitte wählen</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.id} {u.email ? `(${u.email})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Lehrkraft zuweisen:</label>
          <select
            name="assigned_teacher"
            value={form.assigned_teacher}
            onChange={handleChange}
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
            }}
          >
            <option value="">Bitte wählen</option>
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.id} {t.email ? `(${t.email})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Name/Titel:</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontWeight: 500 }}>Zeitraum von:</label>
            <input
              type="date"
              name="rent_start"
              value={form.rent_start}
              onChange={handleChange}
              required
              style={{
                padding: 10,
                borderRadius: 6,
                border: "1px solid #bdbdbd",
                fontSize: 16,
              }}
            />
            <input
              type="time"
              name="rent_start_time"
              value={form.rent_start_time}
              onChange={handleChange}
              style={{
                marginTop: 4,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #bdbdbd",
                fontSize: 16,
              }}
              placeholder="Uhrzeit (optional)"
            />
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontWeight: 500 }}>bis:</label>
            <input
              type="date"
              name="rent_end"
              value={form.rent_end}
              onChange={handleChange}
              required
              style={{
                padding: 10,
                borderRadius: 6,
                border: "1px solid #bdbdbd",
                fontSize: 16,
              }}
            />
            <input
              type="time"
              name="rent_end_time"
              value={form.rent_end_time}
              onChange={handleChange}
              style={{
                marginTop: 4,
                padding: 10,
                borderRadius: 6,
                border: "1px solid #bdbdbd",
                fontSize: 16,
              }}
              placeholder="Uhrzeit (optional)"
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Typ:</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            required
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
            }}
          >
            <option value="">Bitte wählen</option>
            {orderTypes.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name?.de || t.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Status:</label>
          <select
            name="state"
            value={form.state}
            onChange={handleChange}
            required
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
            }}
          >
            <option value="">Bitte wählen</option>
            {orderStates.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name?.de}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Sets:</label>
          <div
            style={{
              border: "1px solid #bdbdbd",
              borderRadius: 6,
              padding: 10,
              minHeight: 80,
              maxHeight: 180,
              overflowY: "auto",
              background: "#fafafa",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {sets.map((set) => (
              <label key={set._id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  name="sets"
                  value={set._id}
                  checked={form.sets.includes(set._id)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((f) => ({
                      ...f,
                      sets: checked
                        ? [...f.sets, set._id]
                        : f.sets.filter((id) => id !== set._id),
                    }));
                  }}
                />
                {"Set " + set.set_number}: {set.set_name?.name?.de || set._id}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Ort:</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            required
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Telefon:</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Bemerkung:</label>
          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            style={{
              padding: 10,
              borderRadius: 6,
              border: "1px solid #bdbdbd",
              fontSize: 16,
              minHeight: 60,
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            marginTop: 12,
            padding: "12px 0",
            borderRadius: 8,
            border: "none",
            background: "#1a237e",
            color: "#fff",
            fontWeight: 600,
            fontSize: 18,
            cursor: "pointer",
            transition: "background 0.2s",
          }}
        >
          Anlegen
        </button>
      </form>
      <div
        style={{
          color: message === "Auftrag erfolgreich angelegt." ? "green" : "red",
          marginTop: 24,
          textAlign: "center",
          fontWeight: 500,
          minHeight: 28,
        }}
      >
        {message}
      </div>
    </div>
  );
}