import { useEffect, useState } from "react";
import { MAIN_VARIABLES } from "../config";

const weekdays = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];
const weekdayLabels = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag"
};

export default function Einstellungen() {
    const [loading, setLoading] = useState(false);
    const [events, setEvents] = useState([]);
    const [message, setMessage] = useState("");
    const [settings, setSettings] = useState(null);

    // Einstellungen laden
    useEffect(() => {
        fetchSettings();
    }, []);

    async function fetchSettings() {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings`);
            const data = await res.json();
            if (res.ok) setSettings(data);
            else setMessage(data.error || "Fehler beim Laden.");
        } catch {
            setMessage("Fehler beim Laden.");
        }
        setLoading(false);
    }

    // Änderung im Formular
    function handleChange(type, day, field, value) {
        setSettings((prev) => ({
            ...prev,
            [type]: {
                ...prev[type],
                [day]: {
                    ...(prev[type]?.[day] || { enabled: false, time: "" }),
                    [field]: value
                }
            }
        }));
    }

    // Maximale Ausleihdauer ändern
    function handleMaxLoanDurationChange(e) {
        setSettings((prev) => ({
            ...prev,
            maxLoanDuration: Number(e.target.value)
        }));
    }

    // Speichern
    async function handleSave(e) {
        e.preventDefault();
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            });
            const data = await res.json();
            if (res.ok) setMessage("Einstellungen gespeichert!");
            else setMessage(data.error || "Fehler beim Speichern.");
        } catch {
            setMessage("Fehler beim Speichern.");
        }
        setLoading(false);
    }

    // Zurücksetzen
    async function handleReset() {
        if (!window.confirm("Wirklich auf Standard zurücksetzen?")) return;
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings/reset`, {
                method: "POST"
            });
            const data = await res.json();
            if (res.ok) {
                setSettings(data);
                setMessage("Zurückgesetzt!");
            } else setMessage(data.error || "Fehler beim Zurücksetzen.");
        } catch {
            setMessage("Fehler beim Zurücksetzen.");
        }
        setLoading(false);
    }

    // Kalender mit Orders synchronisieren
    async function handleSyncOrdersToCalendar() {
        setLoading(true);
        setMessage("");
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/google-calendar/sync-calendar`, {
                method: "POST"
            });
            const data = await res.json();
            if (res.ok) {
                setMessage("Kalender erfolgreich synchronisiert!");
                handleSyncCalendar(); // Events neu laden
            } else {
                setMessage(data.error || "Fehler beim Kalender-Sync.");
            }
        } catch (err) {
            setMessage("Fehler beim Kalender-Sync.");
        }
        setLoading(false);
    }

    // Kalender synchronisieren (Events abrufen)
    async function handleSyncCalendar() {
        setLoading(true);
        setMessage("");
        setEvents([]);
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/google-calendar/events`, {
                method: "GET"
            });
            const data = await res.json();
            if (res.ok) {
                setEvents(data);
            } else {
                setMessage(data.error || "Fehler beim Synchronisieren.");
            }
        } catch (err) {
            setMessage("Fehler beim Synchronisieren.");
        }
        setLoading(false);
    }

    if (!settings) return <div>Lade Einstellungen...</div>;

    return (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "1rem",
            minHeight: "100vh",
            justifyContent: "flex-start"
        }}
    >
            <h1>Einstellungen</h1>
            <form onSubmit={handleSave}>
                <h2>Ausgabe-Zeiten</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Tag</th>
                            <th>Aktiv</th>
                            <th>Uhrzeit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weekdays.map((day) => (
                            <tr key={"issue-" + day}>
                                <td>{weekdayLabels[day]}</td>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={settings.issue?.[day]?.enabled || false}
                                        onChange={e =>
                                            handleChange("issue", day, "enabled", e.target.checked)
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        value={settings.issue?.[day]?.time || ""}
                                        onChange={e =>
                                            handleChange("issue", day, "time", e.target.value)
                                        }
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <h2>Rückgabe-Zeiten</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Tag</th>
                            <th>Aktiv</th>
                            <th>Uhrzeit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weekdays.map((day) => (
                            <tr key={"return-" + day}>
                                <td>{weekdayLabels[day]}</td>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={settings.return?.[day]?.enabled || false}
                                        onChange={e =>
                                            handleChange("return", day, "enabled", e.target.checked)
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        type="time"
                                        value={settings.return?.[day]?.time || ""}
                                        onChange={e =>
                                            handleChange("return", day, "time", e.target.value)
                                        }
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Maximale Ausleihdauer */}
                <div style={{ marginTop: 30, marginBottom: 20 }}>
                    <label>
                        Maximale Ausleihdauer (Tage):{" "}
                        <input
                            type="number"
                            min={1}
                            max={60}
                            value={settings.maxLoanDuration || 14}
                            onChange={handleMaxLoanDurationChange}
                            style={{ width: 60 }}
                        />
                    </label>
                </div>

                <div style={{ marginTop: 20 }}>
                    <button type="submit" disabled={loading}>
                        {loading ? "Speichern..." : "Speichern"}
                    </button>
                    <button type="button" onClick={handleReset} disabled={loading} style={{ marginLeft: 10 }}>
                        Zurücksetzen
                    </button>
                </div>
            </form>

            <hr style={{ margin: "2rem 0" }} />

            <h2>Google Kalender Events</h2>
            <button onClick={handleSyncOrdersToCalendar} disabled={loading}>
                {loading ? "Synchronisiere..." : "Google Kalender synchronisieren"}
            </button>
            {message && (
                <p style={{ color: message.includes("erfolg") ? "green" : "red" }}>
                    {message}
                </p>
            )}
            {events.length > 0 && (
                <div>
                    <h3>Kalender-Einträge:</h3>
                    <ul>
                        {events.map(ev => (
                            <li key={ev.id}>
                                {ev.summary} ({ev.start?.dateTime || ev.start?.date})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            {/* Data-Ordner als ZIP herunterladen */}
            <div style={{ marginTop: 30 }}>
                <button
                    type="button"
                    onClick={async () => {
                        setLoading(true);
                        setMessage("");
                        try {
                            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/download-data-zip`);
                            if (!res.ok) throw new Error("Fehler beim Download.");
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = "data.zip";
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            window.URL.revokeObjectURL(url);
                            setMessage("Download gestartet.");
                        } catch {
                            setMessage("Fehler beim Download.");
                        }
                        setLoading(false);
                    }}
                    disabled={loading}
                >
                    {loading ? "Lade herunter..." : "Data-Ordner als ZIP herunterladen"}
                </button>
            </div>

        </div>
    );
}