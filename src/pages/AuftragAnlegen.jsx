import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAIN_VARIABLES } from "../config";
import { useAuth, fetchUserData } from "./services/auth";

export default function AuftragAnlegen() {
  const [sets, setSets] = useState([]);
  const [orderTypes, setOrderTypes] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({
    name: "",
    rent_start: "",
    rent_end: "",
    type: "",
    assigned_teacher: "",
    location: "",
    notes: "",
    phone: "",
    sets: [],
  });
  const [message, setMessage] = useState("");
  const token = useAuth((s) => s.token);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`)
      .then((r) => r.json())
      .then(setSets);
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orderTypes`)
      .then((r) => r.json())
      .then(setOrderTypes);
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users?role=teacher`)
      .then((r) => r.json())
      .then(setTeachers);

    // Einstellungen abrufen und speichern
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings`)
      .then((r) => r.json())
      .then((settings) => {
        setSettings(settings);
        console.log("Settings:", settings);
      });
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

  // Hilfsfunktion: Erlaubte Wochentage aus Settings extrahieren
  function getEnabledDays(obj) {
    if (!obj) return [];
    return Object.entries(obj)
      .filter(([_, v]) => v.enabled)
      .map(([day]) => day);
  }

  // Hilfsfunktion: Wochentag für ein Datum (yyyy-mm-dd) als String
  function getWeekday(dateStr) {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    return days[new Date(dateStr).getDay()];
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    // Pflichtfelder prüfen (außer notes)
    const requiredFields = [
      "name",
      "rent_start",
      "rent_end",
      "type",
      "assigned_teacher",
      "location",
      "phone",
      "sets",
    ];
    for (const field of requiredFields) {
      if (
        !form[field] ||
        (Array.isArray(form[field]) && form[field].length === 0)
      ) {
        setMessage("Bitte alle Felder ausfüllen (außer Bemerkung).");
        return;
      }
    }

    // Validierung: Nur erlaubte Ausleihe- und Rückgabetage
    if (settings) {
      const allowedIssueDays = getEnabledDays(settings.issue);
      const allowedReturnDays = getEnabledDays(settings.return);
      if (!allowedIssueDays.includes(getWeekday(form.rent_start))) {
        setMessage(
          "Das gewählte Ausleihdatum ist kein erlaubter Ausleihtag (" +
            allowedIssueDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") +
            ")."
        );
        return;
      }
      if (!allowedReturnDays.includes(getWeekday(form.rent_end))) {
        setMessage(
          "Das gewählte Rückgabedatum ist kein erlaubter Rückgabetag (" +
            allowedReturnDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") +
            ")."
        );
        return;
      }

      // Maximale Ausleihdauer prüfen
      if (settings.maxLoanDuration && form.rent_start && form.rent_end) {
        const start = new Date(form.rent_start);
        const end = new Date(form.rent_end);
        const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        if (diffDays + 1 > settings.maxLoanDuration) {
          setMessage(
            `Die maximale Ausleihdauer von ${settings.maxLoanDuration} Tagen wird überschritten.`
          );
          return;
        }
      }
    }

    const user = await fetchUserData();
    if (!user) {
      setMessage("Nicht eingeloggt.");
      return;
    }
    const payload = {
      ...form,
      user: user._id || user.id,
    };

    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setMessage("Auftrag erfolgreich angelegt.");
      setTimeout(() => navigate("/auftraege"), 1200);
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
        Neuen Auftrag anlegen
      </h2>
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
      >
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
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontWeight: 500 }}>Lehrkraft zuweisen:</label>
          <select
            name="assigned_teacher"
            value={form.assigned_teacher}
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
            {teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.id} {t.email ? `(${t.email})` : ""}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
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
              min={new Date().toISOString().split("T")[0]}
              onBlur={(e) => {
                if (
                  settings &&
                  form.rent_start &&
                  !getEnabledDays(settings.issue).includes(getWeekday(form.rent_start))
                ) {
                  setMessage(
                    "Nur erlaubte Ausleihtage auswählbar: " +
                      getEnabledDays(settings.issue)
                        .map(
                          (d) => d.charAt(0).toUpperCase() + d.slice(1)
                        )
                        .join(", ")
                  );
                  setForm((f) => ({ ...f, rent_start: "" }));
                } else {
                  setMessage("");
                }
              }}
            />
            {settings && (
                
              <small style={{ color: "#666" }}>
                Maximale Ausleihdauer: {settings.maxLoanDuration} Tage
                Erlaubte Ausleihtage:{" "}
                {getEnabledDays(settings.issue)
                  .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                  .join(", ")}
              </small>
            )}
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
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
              min={form.rent_start || new Date().toISOString().split("T")[0]}
              onBlur={(e) => {
                if (
                  settings &&
                  form.rent_end &&
                  !getEnabledDays(settings.return).includes(getWeekday(form.rent_end))
                ) {
                  setMessage(
                    "Nur erlaubte Rückgabetage auswählbar: " +
                      getEnabledDays(settings.return)
                        .map(
                          (d) => d.charAt(0).toUpperCase() + d.slice(1)
                        )
                        .join(", ")
                  );
                  setForm((f) => ({ ...f, rent_end: "" }));
                } else {
                  setMessage("");
                }
              }}
            />
            {settings && (
              <small style={{ color: "#666" }}>
                Erlaubte Rückgabetage:{" "}
                {getEnabledDays(settings.return)
                  .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                  .join(", ")}
              </small>
            )}
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
              <label
                key={set._id}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
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
                {"Set " + set.set_number}: {set.set_name?.name.de || set._id}
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