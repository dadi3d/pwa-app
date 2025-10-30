import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { MAIN_VARIABLES } from "../../config";

const API_BRANDS = `${MAIN_VARIABLES.SERVER_URL}/api/brands`;
const API_CATEGORIES = `${MAIN_VARIABLES.SERVER_URL}/api/categories`;
const API_STATES = `${MAIN_VARIABLES.SERVER_URL}/api/set-states`;
const API_RELATIONS = `${MAIN_VARIABLES.SERVER_URL}/api/set-relations`;
const API_ASSIGNMENTS = `${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`;
const API_SETNAMES = `${MAIN_VARIABLES.SERVER_URL}/api/set-names`;
const API_FILEDATA = `${MAIN_VARIABLES.SERVER_URL}/api/file-data`;
const API_SETS = `${MAIN_VARIABLES.SERVER_URL}/api/sets`;
const API_SINGLE_PRODUCTS = `${MAIN_VARIABLES.SERVER_URL}/api/single-products`;

const SetEdit = ({ setId: propSetId }) => {
  const params = useParams();
  const setId = propSetId || params.setId;
  const [setData, setSetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [products, setProducts] = useState([]);

  // Referenzdaten
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [states, setStates] = useState([]);
  const [relations, setRelations] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [setNames, setSetNames] = useState([]);
  const [fileDatas, setFileDatas] = useState([]);
  const [imageUrls, setImageUrls] = useState({}); // Speichert URLs für Bilder: { fileId: url }

  // Refs für File-Inputs
  const thumbnailRef = useRef();
  const manualRef = useRef();

  useEffect(() => {
    // Alle Referenzdaten laden
    async function loadRefs() {
      const [b, c, s, r, a, sn] = await Promise.all([
        fetch(API_BRANDS).then(res => res.json()),
        fetch(API_CATEGORIES).then(res => res.json()),
        fetch(API_STATES).then(res => res.json()),
        fetch(API_RELATIONS).then(res => res.json()),
        fetch(API_ASSIGNMENTS).then(res => res.json()),
        fetch(API_SETNAMES).then(res => res.json()),
      ]);
      setBrands(b);
      setCategories(c);
      setStates(s);
      setRelations(r);
      setAssignments(a);
      setSetNames(sn);
    }
    loadRefs();
    // FileDatas laden
    fetch(API_FILEDATA)
      .then(res => res.json())
      .then(setFileDatas);
  }, []);

  useEffect(() => {
    if (!setId) return;
    // Set-Daten laden
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`)
        .then(res => res.json())
        .then(data => {
        setSetData({
            ...data,
            manufacturer: data.manufacturer?._id || data.manufacturer,
            set_name: data.set_name?._id || data.set_name,
            category: data.category?._id || data.category,
            state: data.state?._id || data.state,
            set_assignment: data.set_assignment?._id || data.set_assignment,
            set_relation: data.set_relation?._id || data.set_relation,
        });
        setLoading(false);
        });
    // Produkte laden
    fetch(`${API_SINGLE_PRODUCTS}?set=${setId}`)
        .then(res => res.json())
        .then(setProducts);
    }, [setId]);

  // Bild-URLs generieren, wenn sich fileDatas ändern
  useEffect(() => {
    const urls = {};
    for (const fd of fileDatas) {
      if (fd.filePath?.match(/\.(jpg|jpeg|png)$/i)) {
        // Pfad direkt verwenden: filePath ist z.B. "files/images/xyz.jpg"
        // Entferne "files/" Prefix falls vorhanden
        let cleanPath = fd.filePath;
        if (cleanPath.startsWith('files/')) {
          cleanPath = cleanPath.substring(6);
        }
        // URL konstruieren wie in Produkte.jsx
        urls[fd._id] = `${MAIN_VARIABLES.SERVER_URL}/api/files/${cleanPath}`;
      }
    }
    setImageUrls(urls);
  }, [fileDatas]);

  // Hilfsfunktion: passende Files filtern
  function getMatchingFiles(type) {
    if (!setData) return [];
    return fileDatas.filter(fd =>
      fd.set_relation?._id === setData.set_relation &&
      fd.manufacturer?._id === setData.manufacturer &&
      fd.set_name?._id === setData.set_name &&
      (type === "thumbnail"
        ? fd.filePath?.match(/\.(jpg|jpeg|png)$/i)
        : fd.filePath?.match(/\.pdf$/i))
    );
  }

  async function handleDelete(id) {
    // Warnung mit Produktliste anzeigen
    const productList = products.length > 0 
      ? products.map(p => `• ${p.Designation?.name || "–"} ${p.SerialNumber ? `(${p.SerialNumber})` : ""}`).join("\n")
      : "• Keine Produkte vorhanden";
    
    const confirmMessage = `Set wirklich löschen?\n\nFolgende Produkte werden ebenfalls gelöscht:\n${productList}\n\nDieser Vorgang kann nicht rückgängig gemacht werden!`;
    
    if (!window.confirm(confirmMessage)) return;
    try {
      // Set löschen (Server entfernt automatisch die Set-ID aus den fileDatas)
      await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${id}`, { method: "DELETE" });
      
      alert("Set und alle verbundenen Produkte wurden gelöscht!");
      if (typeof window.history.go === "function") {
        window.history.go(-1);
      } else {
        window.location.href = "/sets";
      }
    } catch (err) {
      alert("Fehler beim Löschen!");
    }
    }  // Thumbnail per Klick setzen
async function handleSetThumbnail(fileId) {
  await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data/set-thumbnail/${fileId}`, {
    method: "POST",
  });
  // Nach Änderung neu laden
  fetch(API_FILEDATA)
    .then(res => res.json())
    .then(setFileDatas);
}

  // Datei löschen
  async function handleDeleteFile(fileId) {
    if (!window.confirm("Datei wirklich löschen?")) return;
    await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data/${fileId}`, { method: "DELETE" });
    // Nach dem Löschen neu laden
    fetch(API_FILEDATA)
      .then(res => res.json())
      .then(setFileDatas);
  }

  // Datei-Upload
  async function handleUploadFiles(type) {
    const inputRef = type === "thumbnail" ? thumbnailRef : manualRef;
    const files = inputRef.current.files;
    if (!files.length) return;
    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("filePath", `uploads/${Date.now()}_${file.name}`);
      formData.append("set_name", setData.set_name);
      formData.append("set_relation", setData.set_relation);
      formData.append("manufacturer", setData.manufacturer);
      formData.append("type", type);
      formData.append("isThumbnail", type === "thumbnail");
      await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data`, {
        method: "POST",
        body: formData,
      });
    }
    // Nach Upload neu laden
    fetch(API_FILEDATA)
      .then(res => res.json())
      .then(setFileDatas);
    inputRef.current.value = "";
  }

  const handleChange = (e) => {
        const { name, value } = e.target;
        setSetData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    // Alle Felder hinzufügen
    formData.append("manufacturer", setData.manufacturer);
    formData.append("setName", setData.set_name);
    formData.append("category", setData.category);
    formData.append("set_number", setData.set_number);
    formData.append("note_public", setData.note_public || "");
    formData.append("note_private", setData.note_private || "");
    formData.append("state", setData.state);
    formData.append("insurance_value", setData.insurance_value || 0);
    formData.append("set_assignment", setData.set_assignment);
    formData.append("set_relation", setData.set_relation);

    // Thumbnails anhängen
    if (thumbnailRef.current?.files?.length) {
        for (const file of thumbnailRef.current.files) {
        formData.append("thumbnails", file);
        }
    }
    // Manuals anhängen
    if (manualRef.current?.files?.length) {
        for (const file of manualRef.current.files) {
        formData.append("manuals", file);
        }
    }

    await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`, {
        method: "PUT",
        body: formData,
    });

    setSaving(false);
    setEditMode(false);
    // Nach dem Speichern neu laden
    fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`)
        .then(res => res.json())
        .then(data => {
        setSetData({
            ...data,
            manufacturer: data.manufacturer?._id || data.manufacturer,
            set_name: data.set_name?._id || data.set_name,
            category: data.category?._id || data.category,
            state: data.state?._id || data.state,
            set_assignment: data.set_assignment?._id || data.set_assignment,
            set_relation: data.set_relation?._id || data.set_relation,
        });
        });
    // FileDatas neu laden
    fetch(API_FILEDATA)
        .then(res => res.json())
        .then(setFileDatas);

    // File-Inputs leeren
    if (thumbnailRef.current) thumbnailRef.current.value = "";
    if (manualRef.current) manualRef.current.value = "";
    };

  if (loading || !setData) return <div>Lade Daten...</div>;

  return (
    <div
      style={{
        maxWidth: 700,
        margin: "2rem auto",
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        border: "1px solid #eee",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "left", // Zentriert alle direkten Kinder
        textAlign: "left", // Text linksbündig
      }}
    >
    
      <div
        style={{
          fontWeight: "bold",
          fontSize: "1.3rem",
          padding: "0.7rem 1rem",
          background: "#f7f7f7",
          borderBottom: "1px solid #eee",
          borderRadius: "8px 8px 0 0",
          margin: "-2rem -2rem 2rem -2rem",
        }}
      >
        {setNames.find(sn => sn._id === setData.set_name)?.name?.de || setNames.find(sn => sn._id === setData.set_name)?.name || "–"}
      </div>
      {!editMode ? (
        <div style={{ padding: "1rem" }}>
          <div style={{ marginBottom: 12 }}>
            <strong>Hersteller:</strong> {brands.find(b => b._id === setData.manufacturer)?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Set-Name:</strong> {setNames.find(sn => sn._id === setData.set_name)?.name?.de || setNames.find(sn => sn._id === setData.set_name)?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Kategorie:</strong> {categories.find(c => c._id === setData.category)?.name?.de || categories.find(c => c._id === setData.category)?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Set-Nummer:</strong> {setData.set_number ?? "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Zustand:</strong> {states.find(s => s._id === setData.state)?.name?.de || states.find(s => s._id === setData.state)?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Versicherungswert:</strong> {setData.insurance_value ?? "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Öffentliche Notiz:</strong> {setData.note_public || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Private Notiz:</strong> {setData.note_private || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Set-Zuordnung:</strong> {assignments.find(a => a._id === setData.set_assignment)?.name?.de || assignments.find(a => a._id === setData.set_assignment)?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Zugehörigkeit:</strong> {relations.find(r => r._id === setData.set_relation)?.name?.de || relations.find(r => r._id === setData.set_relation)?.name || "–"}
          </div>
          <div style={{ marginBottom: 12, marginTop: 24 }}>
            <strong>Produkte im Set:</strong>
            {products.length > 0 ? (
            <ul style={{ marginTop: 8 }}>
                {products.map(prod => (
                <li key={prod._id}>
                    {prod.Designation?.name || "–"} {prod.SerialNumber ? `(${prod.SerialNumber})` : ""}
                </li>
                ))}
            </ul>
            ) : (
            <span>Keine Produkte vorhanden.</span>
            )}
        </div>
        {/* Thumbnails Vorschau mit Löschen */}
                  <div style={{ marginBottom: 12 }}>
                    <strong>Bilder:</strong>
                    {getMatchingFiles("thumbnail").length > 0 ? (
                      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                        {getMatchingFiles("thumbnail").map(fd => (
                          <div key={fd._id} style={{ position: "relative" }}>
                            <img
                              src={imageUrls[fd._id] || `${MAIN_VARIABLES.SERVER_URL}/api/files/images/placeholder_set.jpg`}
                              alt={fd.filePath.split("/").pop()}
                              style={{
                                maxWidth: 80,
                                maxHeight: 80,
                                borderRadius: 6,
                                border: "1px solid #ccc",
                                flex: "0 0 auto",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : " –"}
                  </div>
                  {/* Manuals Vorschau mit Löschen */}
          <div style={{ marginBottom: 12 }}>
            <strong>Dokumente:</strong>
            {getMatchingFiles("manual").length > 0 ? (
              <ul style={{ marginTop: 8, fontSize: "0.95em", color: "#555" }}>
                {getMatchingFiles("manual").map(fd => (
                  <li key={fd._id} style={{ position: "relative", paddingRight: 28 }}>
                    <a href={`${MAIN_VARIABLES.SERVER_URL}/${fd.filePath}`} target="_blank" rel="noopener noreferrer">
                      {fd.filePath.split("/").pop()}
                    </a>
                    <button
                      style={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        background: "#fff",
                        border: "1px solid #ccc",
                        borderRadius: "50%",
                        width: 22,
                        height: 22,
                        cursor: "pointer",
                        fontWeight: "bold",
                        color: "#d32f2f",
                        lineHeight: "18px",
                        padding: 0,
                      }}
                      title="Löschen"
                      onClick={e => {
                        e.stopPropagation(); // verhindert, dass der Bild-Klick ausgelöst wird
                        handleDeleteFile(fd._id);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : " –"}
          </div>
          <div style={{ marginTop: 32 }}>
            <button
              type="button"
              style={{
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "8px 24px",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              }}
              onClick={() => setEditMode(true)}
            >
              Bearbeiten
            </button>

            <button
              style={{
                background: "#4caf50",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "8px 24px",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                marginLeft: 12,
                }}
                onClick={e => {
                    e.stopPropagation();
                    window.location.href = `/set-copy/${setId}`;
                }}
                title="Set kopieren"
                >
                Kopieren
            </button>

            <button
              style={{
                background: "#e74c3c",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "8px 24px",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                marginLeft: 12,
                }}
                onClick={e => {
                    e.stopPropagation();
                    handleDelete(setId);
                }}
                title="Set löschen"
                >
                Löschen
            </button>

          </div>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <label>
              Hersteller:
              <select name="manufacturer" value={setData.manufacturer} onChange={handleChange}>
                <option value="">Bitte wählen</option>
                {brands.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </label>
            <label>
              Set-Name:
              <select name="set_name" value={setData.set_name} onChange={handleChange}>
                <option value="">Bitte wählen</option>
                {setNames.map(sn => (
                  <option key={sn._id} value={sn._id}>{sn.name?.de || sn.name}</option>
                ))}
              </select>
            </label>
            <label>
              Kategorie:
              <select name="category" value={setData.category} onChange={handleChange}>
                <option value="">Bitte wählen</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name?.de || c.name}</option>
                ))}
              </select>
            </label>
            <label>
              Set-Nummer:
              <input name="set_number" type="number" value={setData.set_number} onChange={handleChange} />
            </label>
            <label>
              Zustand:
              <select name="state" value={setData.state} onChange={handleChange}>
                <option value="">Bitte wählen</option>
                {states.map(s => (
                  <option key={s._id} value={s._id}>{s.name?.de || s.name}</option>
                ))}
              </select>
            </label>
            <label>
              Versicherungswert:
              <input name="insurance_value" type="number" value={setData.insurance_value || 0} onChange={handleChange} />
            </label>
            <label>
              Öffentliche Notiz:
              <input name="note_public" value={setData.note_public || ""} onChange={handleChange} />
            </label>
            <label>
              Private Notiz:
              <input name="note_private" value={setData.note_private || ""} onChange={handleChange} />
            </label>
            <label>
              Set-Zuordnung:
              <select name="set_assignment" value={setData.set_assignment} onChange={handleChange}>
                <option value="">Bitte wählen</option>
                {assignments.map(a => (
                  <option key={a._id} value={a._id}>{a.name?.de || a.name}</option>
                ))}
              </select>
            </label>
            <label>
              Zugehörigkeit:
              <select name="set_relation" value={setData.set_relation} onChange={handleChange}>
                <option value="">Bitte wählen</option>
                {relations.map(r => (
                  <option key={r._id} value={r._id}>{r.name?.de || r.name}</option>
                ))}
              </select>
            </label>
            {/* Thumbnails Vorschau und Upload */}
            <label>
              Thumbnails:
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                {getMatchingFiles("thumbnail").length > 0 ? (
                  getMatchingFiles("thumbnail").map(fd => (
                    <div key={fd._id} style={{ position: "relative" }}>
                      <img
                        src={imageUrls[fd._id] || `${MAIN_VARIABLES.SERVER_URL}/api/files/images/placeholder_set.jpg`}
                        alt={fd.filePath.split("/").pop()}
                        style={{
                            maxWidth: 80,
                            maxHeight: 80,
                            borderRadius: 6,
                            border: fd.isThumbnail ? "2px solid #1976d2" : "1px solid #ccc",
                            flex: "0 0 auto",
                            cursor: "pointer",
                            boxShadow: fd.isThumbnail ? "0 0 8px #1976d2" : undefined,
                        }}
                        title={fd.isThumbnail ? "Aktuelles Thumbnail" : "Als Thumbnail setzen"}
                        onClick={() => handleSetThumbnail(fd._id)}
                        />
                      <button
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          background: "#fff",
                          border: "1px solid #ccc",
                          borderRadius: "50%",
                          width: 22,
                          height: 22,
                          cursor: "pointer",
                          fontWeight: "bold",
                          color: "#d32f2f",
                          lineHeight: "18px",
                          padding: 0,
                        }}
                        title="Löschen"
                        onClick={e => {
                            e.stopPropagation(); // verhindert, dass der Bild-Klick ausgelöst wird
                            handleDeleteFile(fd._id);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                ) : (
                  <span>Keine vorhanden</span>
                )}
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png"
                  ref={thumbnailRef}
                  style={{ marginLeft: 12 }}
                />
              </div>
            </label>
            {/* Manuals Vorschau und Upload */}
            <label>
              Manuals:
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                {getMatchingFiles("manual").length > 0 ? (
                  <ul style={{ marginTop: 0, fontSize: "0.95em", color: "#555", paddingLeft: 18 }}>
                    {getMatchingFiles("manual").map(fd => (
                      <li key={fd._id} style={{ position: "relative", paddingRight: 28 }}>
                        <a href={`${MAIN_VARIABLES.SERVER_URL}/${fd.filePath}`} target="_blank" rel="noopener noreferrer">
                          {fd.filePath.split("/").pop()}
                        </a>
                        <button
                          style={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            background: "#fff",
                            border: "1px solid #ccc",
                            borderRadius: "50%",
                            width: 22,
                            height: 22,
                            cursor: "pointer",
                            fontWeight: "bold",
                            color: "#d32f2f",
                            lineHeight: "18px",
                            padding: 0,
                          }}
                          title="Löschen"
                          onClick={e => {
                            e.stopPropagation(); // verhindert, dass der Bild-Klick ausgelöst wird
                            handleDeleteFile(fd._id);
                        }}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>Keine vorhanden</span>
                )}
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  ref={manualRef}
                  style={{ marginLeft: 12 }}
                />
              </div>
            </label>
          </div>
          <div style={{ marginTop: 32}}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: "#1976d2",
                color: "#fff",
                border: "none",
                borderRadius: 4,
                padding: "8px 24px",
                fontSize: "1rem",
                cursor: "pointer",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
                marginRight: 8,
              }}
            >
              {saving ? "Speichern..." : "Speichern"}
            </button>
            <button
              type="button"
              style={{
                background: "#eee",
                color: "#333",
                border: "none",
                borderRadius: 4,
                padding: "8px 24px",
                fontSize: "1rem",
                cursor: "pointer",
              }}
              onClick={() => setEditMode(false)}
            >
              Abbrechen
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SetEdit;