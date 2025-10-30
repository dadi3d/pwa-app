import React, { useEffect, useState, useRef } from "react";
import { MAIN_VARIABLES } from "../../config";
import { useAuth, fetchUserData } from '../services/auth';

export default function SetAnlegen() {
  // Dropdown-States
  const [brands, setBrands] = useState([]);
  const [setNames, setSetNames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [setStates, setSetStates] = useState([]);
  const [setAssignments, setSetAssignments] = useState([]);
  const [setRelations, setSetRelations] = useState([]); // NEU

  // Auswahl-States
  const [brand, setBrand] = useState("");
  const [setName, setSetName] = useState("");

  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('student');
  const token = useAuth(state => state.token);
  const [category, setCategory] = useState("");
  const [setState, setSetState] = useState("");
  const [setAssignment, setSetAssignment] = useState("");
  const [setRelation, setSetRelation] = useState(""); // NEU
  const [setNumber, setSetNumber] = useState("");
  const [notePublic, setNotePublic] = useState("");
  const [notePrivate, setNotePrivate] = useState("");
  // Mehrfach-Upload für Bilder und Dokumente
  const [thumbnails, setThumbnails] = useState([]);
  const [manuals, setManuals] = useState([]);

  // Modals
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showSetNameModal, setShowSetNameModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSetAssignmentModal, setShowSetAssignmentModal] = useState(false);

  // Modal Inputs
  const [newBrandName, setNewBrandName] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSetAssignmentName, setNewSetAssignmentName] = useState("");
  const [brandModalMessage, setBrandModalMessage] = useState("");
  const [setNameModalMessage, setSetNameModalMessage] = useState("");
  const [categoryModalMessage, setCategoryModalMessage] = useState("");
  const [setAssignmentModalMessage, setSetAssignmentModalMessage] = useState("");

  // Feedback
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("black");

  // Refs für File-Inputs
  const thumbnailRef = useRef();
  const manualRef = useRef();

  const [fileDatas, setFileDatas] = useState([]);

  // Hilfsfunktion
  function normalizeName(name) {
    return (name || "").toLowerCase().replace(/\s+/g, "");
  }

  // Files laden
  useEffect(() => {
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data`)
      .then(r => r.json())
      .then(setFileDatas);
    fetchUserId();
  }, [token]);

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

  // Hilfsfunktion: passende Files filtern
  function getMatchingFiles(type) {
    return fileDatas.filter(fd =>
      fd.set_relation?._id === setRelation &&
      fd.manufacturer?._id === brand &&
      fd.set_name?._id === setName &&
      (type === "thumbnail" ? fd.filePath?.match(/\.(jpg|jpeg|png)$/i) : fd.filePath?.match(/\.pdf$/i))
    );
  }

  // Dropdowns laden
  useEffect(() => {
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-relations`).then(r => r.json()).then(data => setSetRelations(data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })))) // NEU
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`).then(r => r.json()).then(data => setBrands(data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" }))));
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`).then(r => r.json()).then(data => setSetNames(data.sort((a, b) => (a.name?.de || "").localeCompare(b.name?.de || "", "de", { sensitivity: "base" }))));
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`).then(r => r.json()).then(data => setCategories(data.sort((a, b) => (a.name?.de || "").localeCompare(b.name?.de || "", "de", { sensitivity: "base" }))));
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-states`).then(r => r.json()).then(data => setSetStates(data.sort((a, b) => (a.name?.de || "").localeCompare(b.name?.de || "", "de", { sensitivity: "base" }))));
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`).then(r => r.json()).then(data => setSetAssignments(data.sort((a, b) => (a.name?.de || "").localeCompare(b.name?.de || "", "de", { sensitivity: "base" }))));
  }, []);

  // Set-Nummer automatisch aktualisieren
  useEffect(() => {
    if (!brand || !setName || !setRelation) { // <--- geändert
      setSetNumber("");
      return;
    }
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/next-set-number?brand=${brand}&setName=${setName}&setRelation=${setRelation}`) // <--- geändert
      .then(r => r.json())
      .then(data => setSetNumber(data.nextSetNumber || ""))
      .catch(() => setSetNumber(""));
  }, [brand, setName, setRelation]); // <--- geändert

  // Set anlegen
  async function createSet(e) {
    e.preventDefault();
    setMessage("");
    setMessageColor("black");

    if (!setState || !brand || !setName || !setAssignment || !category || !setRelation || !setNumber) {
      setMessage("Bitte alle Pflichtfelder ausfüllen.");
      setMessageColor("red");
      return;
    }

    const formData = new FormData();
    formData.append("manufacturer", brand);
    formData.append("setName", setName);
    formData.append("set_assignment", setAssignment);
    formData.append("category", category);
    formData.append("set_number", setNumber);
    formData.append("insurance_value", null);
    formData.append("note_public", notePublic);
    formData.append("note_private", notePrivate);
    formData.append("state", setState);
    formData.append("set_relation", setRelation);

    // Mehrere Bilder/Dokumente anhängen
    thumbnails.forEach(file => formData.append("thumbnails", file));
    manuals.forEach(file => formData.append("manuals", file));

    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`, { method: "POST", body: formData });
    if (res.ok) {
      setMessage("Set erfolgreich angelegt.");
      setMessageColor("green");
      setBrand(""); setSetName(""); setSetAssignment(""); setCategory(""); setSetNumber("");
      setNotePublic(""); setNotePrivate(""); setSetState(""); setThumbnails([]); setManuals([]); setSetRelation("");
      if (thumbnailRef.current) thumbnailRef.current.value = "";
      if (manualRef.current) manualRef.current.value = "";
    } else {
      const errorText = await res.text();
      setMessage(`Fehler beim Anlegen des Sets: ${errorText}`);
      setMessageColor("red");
    }
  }

  // Hersteller hinzufügen
  async function addBrand() {
    if (!newBrandName.trim()) {
      setBrandModalMessage("Bitte gib einen Namen ein.");
      return;
    }
    if (brands.some(b => normalizeName(b.name) === normalizeName(newBrandName))) {
      setBrandModalMessage("Hersteller existiert bereits.");
      return;
    }
    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newBrandName.trim() }),
    });
    if (!res.ok) {
      setBrandModalMessage("Fehler beim Hinzufügen.");
      return;
    }
    const newBrand = await res.json();
    setBrands([...brands, newBrand]);
    setBrand(newBrand._id);
    setShowBrandModal(false);
    setNewBrandName("");
    setBrandModalMessage("");
  }

  // Set-Name hinzufügen
  async function addSetName() {
    if (!newSetName.trim()) {
      setSetNameModalMessage("Bitte gib eine Set-Bezeichnung ein.");
      return;
    }
    if (setNames.some(s => normalizeName(s.name?.de) === normalizeName(newSetName))) {
      setSetNameModalMessage("Set-Bezeichnung existiert bereits.");
      return;
    }
    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: { de: newSetName.trim() } }),
    });
    if (!res.ok) {
      setSetNameModalMessage("Fehler beim Hinzufügen.");
      return;
    }
    const newSet = await res.json();
    setSetNames([...setNames, newSet]);
    setSetName(newSet._id);
    setShowSetNameModal(false);
    setNewSetName("");
    setSetNameModalMessage("");
  }

  // Kategorie hinzufügen
  async function addCategory() {
    if (!newCategoryName.trim()) {
      setCategoryModalMessage("Bitte gib einen Kategorienamen ein.");
      return;
    }
    if (categories.some(c => normalizeName(c.name?.de) === normalizeName(newCategoryName))) {
      setCategoryModalMessage("Kategorie existiert bereits.");
      return;
    }
    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: { de: newCategoryName.trim() } }),
    });
    if (!res.ok) {
      setCategoryModalMessage("Fehler beim Hinzufügen.");
      return;
    }
    const newCategory = await res.json();
    setCategories([...categories, newCategory]);
    setCategory(newCategory._id);
    setShowCategoryModal(false);
    setNewCategoryName("");
    setCategoryModalMessage("");
  }

  // Set-Zuordnung hinzufügen
  async function addSetAssignment() {
    if (!newSetAssignmentName.trim()) {
      setSetAssignmentModalMessage("Bitte gib einen Namen ein.");
      return;
    }
    if (setAssignments.some(a => normalizeName(a.name?.de) === normalizeName(newSetAssignmentName))) {
      setSetAssignmentModalMessage("Zuordnung existiert bereits.");
      return;
    }
    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: { de: newSetAssignmentName.trim() } }),
    });
    if (!res.ok) {
      setSetAssignmentModalMessage("Fehler beim Hinzufügen.");
      return;
    }
    const newAssignment = await res.json();
    setSetAssignments([...setAssignments, newAssignment]);
    setSetAssignment(newAssignment._id);
    setShowSetAssignmentModal(false);
    setNewSetAssignmentName("");
    setSetAssignmentModalMessage("");
  }

  return (
    <>
      <style>
        {`
        .vite-form {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 8px #0001;
          padding: 2rem;
          font-family: system-ui, sans-serif;
          margin: 2rem auto;
          min-width: 300px;
          max-width: 600px;
        }
        .vite-form ul {
          padding: 0;
          margin: 0;
        }
        .vite-form li {
          margin-bottom: 1.2rem;
          display: flex;
          flex-direction: column;
        }
        .vite-form label {
          font-weight: 500;
          margin-bottom: 0.3rem;
        }
        .vite-form input,
        .vite-form select,
        .vite-form textarea {
          padding: 0.5rem 0.7rem;
          border: 1px solid #d0d7de;
          border-radius: 6px;
          font-size: 1rem;
          background: #f6f8fa;
          transition: border 0.2s;
        }
        .vite-form input:focus,
        .vite-form select:focus,
        .vite-form textarea:focus {
          border-color: #646cff;
          outline: none;
        }
        .vite-form button {
          background: #646cff;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 0.7rem 1.2rem;
          font-size: 1rem;
          cursor: pointer;
          transition: background 0.2s;
          margin-left: 0.5rem;
        }
        .vite-form button:hover {
          background: #535bf2;
        }
        .vite-form .inline {
          display: flex;
          align-items: center;
          gap: 0.7rem;
        }
        .vite-form .hint {
          font-size: 0.9em;
          color: #888;
          margin-left: 0.3rem;
        }
        .vite-form .modal {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 16px #0002;
          padding: 2rem;
          min-width: 320px;
          position: fixed;
          top: 20%;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          border: 1px solid #ccc;
        }
        `}
      </style>
      <div className="vite-form">
        <h1 style={{ marginBottom: "1.5rem" }}>Set hinzufügen</h1>
        <form onSubmit={createSet}>
          <ul>
            {/* Zugehörigkeit */}
            <li>
              <label>Zugehörigkeit</label>
              <div className="inline">
                <select value={setRelation} onChange={e => setSetRelation(e.target.value)} style={{ flex: 1 }}>
                  <option value="">Bitte auswählen</option>
                  {setRelations.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.name || "–"}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            {/* Hersteller */}
            <li>
              <label>Hersteller</label>
              <div className="inline">
                <select value={brand} onChange={e => setBrand(e.target.value)} required style={{ flex: 1 }} >
                  <option value="">Bitte auswählen</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
                <button type="button" onClick={() => setShowBrandModal(true)} title="Neuen Hersteller hinzufügen">+</button>
              </div>
            </li>
            {/* Set-Name */}
            <li>
              <label>Set-Name</label>
              <div className="inline">
                <select value={setName} onChange={e => setSetName(e.target.value)} required style={{ flex: 1 }}>
                  <option value="">Bitte auswählen</option>
                  {setNames.map(s => <option key={s._id} value={s._id}>{s.name?.de}</option>)}
                </select>
                <button type="button" onClick={() => setShowSetNameModal(true)} title="Neue Set-Bezeichnung hinzufügen">+</button>
              </div>
            </li>
            {/* Kategorie */}
            <li>
              <label>Set-Kategorie</label>
              <div className="inline">
                <select value={category} onChange={e => setCategory(e.target.value)} required style={{ flex: 1 }}>
                  <option value="">Bitte auswählen</option>
                  {categories.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name?.de || "–"}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => setShowCategoryModal(true)} title="Neue Kategorie hinzufügen">+</button>
              </div>
            </li>
            {/* Set-Nummer */}
            <li>
              <label>Set-Nummer</label>
              <div className="inline">
                <input value={setNumber} readOnly style={{ flex: 1 }} />
                <span className="hint">(automatisch vergeben)</span>
              </div>
            </li>
            {/* Thumbnail */}
            <li>
              <label>Thumbnail(s)</label>
              <div className="inline">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  ref={thumbnailRef}
                  onChange={e => setThumbnails(Array.from(e.target.files))}
                  disabled={
                    !setRelation || !brand || !setName || !category
                  }
                  style={{
                    flex: 1,
                    opacity: (!setRelation || !brand || !setName || !category) ? 0.5 : 1,
                    pointerEvents: (!setRelation || !brand || !setName || !category) ? "none" : "auto"
                  }}
                />
                <span className="hint">(.jpg/.png, mehrere möglich)</span>
              </div>
              {/* Vorhandene Thumbnails anzeigen */}
              {getMatchingFiles("thumbnail").length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 12,
                    overflowX: "auto",
                    paddingBottom: 8,
                  }}
                >
                  {getMatchingFiles("thumbnail").map(fd => (
                    <img
                      key={fd._id}
                      src={`${MAIN_VARIABLES.SERVER_URL}/api/file-data/by-filename/${encodeURIComponent(fd.filePath)}`}
                      alt={fd.filePath.split("/").pop()}
                      style={{
                        maxWidth: 80,
                        maxHeight: 80,
                        borderRadius: 6,
                        border: "1px solid #ccc",
                        flex: "0 0 auto",
                      }}
                    />
                  ))}
                </div>
              )}
            </li>
            {/* Manual */}
            <li>
              <label>Manual(s)</label>
              <div className="inline">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  ref={manualRef}
                  onChange={e => setManuals(Array.from(e.target.files))}
                  disabled={
                    !setRelation || !brand || !setName || !category
                  }
                  style={{
                    flex: 1,
                    opacity: (!setRelation || !brand || !setName || !category) ? 0.5 : 1,
                    pointerEvents: (!setRelation || !brand || !setName || !category) ? "none" : "auto"
                  }}
                />
                <span className="hint">(.pdf, mehrere möglich)</span>
              </div>
              {/* Vorhandene Manuals anzeigen */}
              {getMatchingFiles("manual").length > 0 && (
                <ul style={{ marginTop: 8, fontSize: "0.95em", color: "#555" }}>
                  {getMatchingFiles("manual").map(fd => (
                    <li key={fd._id}>
                      <a href={`${MAIN_VARIABLES.SERVER_URL}/${fd.filePath}`} target="_blank" rel="noopener noreferrer">
                        {fd.filePath.split("/").pop()}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
            {/* Notizen öffentlich */}
            <li>
              <label>Anmerkung öffentlich</label>
              <textarea value={notePublic} onChange={e => setNotePublic(e.target.value)} rows={2} />
            </li>
            {/* Notizen intern */}
            <li>
              <label>Anmerkung intern</label>
              <textarea value={notePrivate} onChange={e => setNotePrivate(e.target.value)} rows={2} />
            </li>
            {/* Status */}
            <li>
              <label>Set-Status</label>
              <select value={setState} onChange={e => setSetState(e.target.value)} required>
                <option value="">Bitte auswählen</option>
                {setStates.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.name?.de || "–"}
                  </option>
                ))}
              </select>
            </li>
            {/* Verfügbarkeit */}
            <li>
              <label>Verfügbarkeit</label>
              <div className="inline">
                <select value={setAssignment} onChange={e => setSetAssignment(e.target.value)} required style={{ flex: 1 }}>
                  <option value="">Bitte auswählen</option>
                  {setAssignments.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name?.de || "–"}
                    </option>
                  ))}
                </select>
              </div>
            </li>
            <li>
              <button type="submit" style={{ marginTop: "1rem" }}>Set anlegen</button>
            </li>
            <li>
              <div style={{ color: messageColor, fontWeight: "bold", minHeight: "1.5em" }}>{message}</div>
            </li>
          </ul>
        </form>
        {/* Modals */}
        {showBrandModal && (
          <div className="modal">
            <h3>Neuen Hersteller hinzufügen</h3>
            <input type="text" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} placeholder="Herstellername" />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={addBrand}>Speichern</button>
              <button onClick={() => setShowBrandModal(false)} style={{ background: "#ccc", color: "#222" }}>Abbrechen</button>
            </div>
            <p style={{ marginTop: "1rem", color: "red" }}>{brandModalMessage}</p>
          </div>
        )}
        {showSetNameModal && (
          <div className="modal">
            <h3>Neue Set-Bezeichnung hinzufügen</h3>
            <input type="text" value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="Set-Bezeichnung" />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={addSetName}>Speichern</button>
              <button onClick={() => setShowSetNameModal(false)} style={{ background: "#ccc", color: "#222" }}>Abbrechen</button>
            </div>
            <p style={{ marginTop: "1rem", color: "red" }}>{setNameModalMessage}</p>
          </div>
        )}
        {showCategoryModal && (
          <div className="modal">
            <h3>Neue Kategorie hinzufügen</h3>
            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Kategoriename" />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={addCategory}>Speichern</button>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: "#ccc", color: "#222" }}>Abbrechen</button>
            </div>
            <p style={{ marginTop: "1rem", color: "red" }}>{categoryModalMessage}</p>
          </div>
        )}
        {showSetAssignmentModal && (
          <div className="modal">
            <h3>Neue Zuordnung hinzufügen</h3>
            <input
              type="text"
              value={newSetAssignmentName}
              onChange={e => setNewSetAssignmentName(e.target.value)}
              placeholder="Zuordnungsname"
            />
            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button onClick={addSetAssignment}>Speichern</button>
              <button onClick={() => setShowSetAssignmentModal(false)} style={{ background: "#ccc", color: "#222" }}>Abbrechen</button>
            </div>
            <p style={{ marginTop: "1rem", color: "red" }}>{setAssignmentModalMessage}</p>
          </div>
        )}
      </div>
    </>
  );
}