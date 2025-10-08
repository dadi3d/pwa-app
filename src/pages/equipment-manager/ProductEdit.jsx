import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MAIN_VARIABLES } from '../../config.js';

const API_BRANDS = `${MAIN_VARIABLES.SERVER_URL}/api/brands`;
const API_CATEGORIES = `${MAIN_VARIABLES.SERVER_URL}/api/product-categories`;
const API_STATES = `${MAIN_VARIABLES.SERVER_URL}/api/product-states`;
const API_SINGLE_PRODUCTS = `${MAIN_VARIABLES.SERVER_URL}/api/single-products`;
const API_SETS = `${MAIN_VARIABLES.SERVER_URL}/api/sets`;

const ProductEdit = ({ productId: propProductId, onSave }) => {
  const params = useParams();
  const productId = propProductId || params.productId;
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Referenzdaten
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [states, setStates] = useState([]);
  const [sets, setSets] = useState([]);

  useEffect(() => {
    // Alle Referenzdaten laden
    async function loadRefs() {
      const [b, c, s, sets] = await Promise.all([
        fetch(API_BRANDS).then(res => res.json()),
        fetch(API_CATEGORIES).then(res => res.json()),
        fetch(API_STATES).then(res => res.json()),
        fetch(API_SETS).then(res => res.json()),
      ]);
      setBrands(b);
      setCategories(c);
      setStates(s);
      setSets(sets);
    }
    loadRefs();
  }, []);

  useEffect(() => {
    if (!productId) return;
    // Produkt-Daten laden
    fetch(`${API_SINGLE_PRODUCTS}/${productId}`)
      .then(res => res.json())
      .then(data => {
        setProductData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Fehler beim Laden des Produkts:', err);
        setLoading(false);
      });
  }, [productId]);

  async function handleDelete(id) {
    if (!window.confirm("Produkt wirklich löschen?")) return;
    try {
      await fetch(`${API_SINGLE_PRODUCTS}/${id}`, {
        method: "DELETE",
      });
      window.location.href = '/equipment/products';
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      alert("Fehler beim Löschen des Produkts.");
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    const dataToSend = {
      set: productData.set,
      Manufacturer: productData.Manufacturer,
      Type: productData.Type,
      Designation: productData.Designation,
      SerialNumber: productData.SerialNumber || "",
      CostCenter: productData.CostCenter || "",
      Department: productData.Department || "",
      CustomerID: productData.CustomerID || null,
      Various_1: productData.Various_1 || null,
      Status: productData.Status || 'aktiv',
      DeviceType: productData.DeviceType || 'Normal',
      IsActive: productData.IsActive || false,
      TestingInterval: productData.TestingInterval || 24,
      ID: productData.ID || null,
      LastTestingDate: productData.LastTestingDate || null,
      Remark: productData.Remark || "",
      state: productData.state,
    };

    try {
      const response = await fetch(`${API_SINGLE_PRODUCTS}/${productId}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Speichern');
      }

      setSaving(false);
      setEditMode(false);
      
      // Nach dem Speichern neu laden
      const updatedProduct = await fetch(`${API_SINGLE_PRODUCTS}/${productId}`)
        .then(res => res.json());
      setProductData(updatedProduct);
      
      // Callback aufrufen, falls vorhanden
      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error("Fehler beim Speichern:", err);
      alert(`Fehler beim Speichern: ${err.message}`);
      setSaving(false);
    }
  };

  if (loading || !productData) return <div>Lade Daten...</div>;

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
        alignItems: "left",
        textAlign: "left",
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
        {productData.Designation?.name?.de || productData.Designation?.name || "–"}
        {productData.SerialNumber && ` (${productData.SerialNumber})`}
      </div>

      {!editMode ? (
        <div style={{ padding: "1rem" }}>
          <div style={{ marginBottom: 12 }}>
            <strong>Hersteller:</strong> {productData.Manufacturer?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Bezeichnung:</strong> {productData.Designation?.name?.de || productData.Designation?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Typ:</strong> {productData.Type || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Seriennummer:</strong> {productData.SerialNumber || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Kostenstelle:</strong> {productData.CostCenter || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Abteilung:</strong> {productData.Department || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Kunden-ID:</strong> {productData.CustomerID || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>IVS-Nummer:</strong> {productData.Various_1 || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Status:</strong> {productData.Status || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Gerätetyp:</strong> {productData.DeviceType || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Aktiv:</strong> {productData.IsActive ? "Ja" : "Nein"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Prüfintervall (Monate):</strong> {productData.TestingInterval || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>ID:</strong> {productData.ID || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Letztes Prüfdatum:</strong> {
              productData.LastTestingDate 
                ? new Date(productData.LastTestingDate).toLocaleDateString('de-DE')
                : "–"
            }
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Bemerkung:</strong> {productData.Remark || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Zustand:</strong> {productData.state?.name?.de || productData.state?.name || "–"}
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>Zugehöriges Set:</strong> {
              productData.set?.set_name?.name?.de || 
              productData.set?.set_name?.name || 
              "Kein Set zugewiesen"
            }
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
                handleDelete(productId);
              }}
              title="Produkt löschen"
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
              <select 
                name="Manufacturer" 
                value={productData.Manufacturer?._id || productData.Manufacturer || ""} 
                onChange={handleChange}
                required
              >
                <option value="">Bitte wählen</option>
                {brands.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </label>

            <label>
              Bezeichnung:
              <select 
                name="Designation" 
                value={productData.Designation?._id || productData.Designation || ""} 
                onChange={handleChange}
                required
              >
                <option value="">Bitte wählen</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name?.de || c.name}</option>
                ))}
              </select>
            </label>

            <label>
              Typ:
              <input 
                name="Type" 
                type="text" 
                value={productData.Type || ""} 
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Seriennummer:
              <input 
                name="SerialNumber" 
                type="text" 
                value={productData.SerialNumber || ""} 
                onChange={handleChange}
              />
            </label>

            <label>
              Kostenstelle:
              <input 
                name="CostCenter" 
                type="text" 
                value={productData.CostCenter || ""} 
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Abteilung:
              <input 
                name="Department" 
                type="text" 
                value={productData.Department || ""} 
                onChange={handleChange}
                required
              />
            </label>

            <label>
              Kunden-ID:
              <input 
                name="CustomerID" 
                type="number" 
                value={productData.CustomerID || ""} 
                onChange={handleChange}
              />
            </label>

            <label>
              IVS-Nummer:
              <input 
                name="Various_1" 
                type="number" 
                value={productData.Various_1 || ""} 
                onChange={handleChange}
              />
            </label>

            <label>
              Status:
              <select 
                name="Status" 
                value={productData.Status || "aktiv"} 
                onChange={handleChange}
              >
                <option value="aktiv">Aktiv</option>
                <option value="inaktiv">Inaktiv</option>
                <option value="defekt">Defekt</option>
                <option value="wartung">In Wartung</option>
              </select>
            </label>

            <label>
              Gerätetyp:
              <select 
                name="DeviceType" 
                value={productData.DeviceType || "Normal"} 
                onChange={handleChange}
              >
                <option value="Normal">Normal</option>
                <option value="Prüfgerät">Prüfgerät</option>
                <option value="Messgerät">Messgerät</option>
              </select>
            </label>

            <label>
              Aktiv:
              <select 
                name="IsActive" 
                value={productData.IsActive ? "true" : "false"} 
                onChange={(e) => handleChange({target: {name: 'IsActive', value: e.target.value === 'true'}})}
              >
                <option value="false">Nein</option>
                <option value="true">Ja</option>
              </select>
            </label>

            <label>
              Prüfintervall (Monate):
              <input 
                name="TestingInterval" 
                type="number" 
                value={productData.TestingInterval || 24} 
                onChange={handleChange}
              />
            </label>

            <label>
              ID:
              <input 
                name="ID" 
                type="number" 
                value={productData.ID || ""} 
                onChange={handleChange}
              />
            </label>

            <label>
              Letztes Prüfdatum:
              <input 
                name="LastTestingDate" 
                type="date" 
                value={
                  productData.LastTestingDate 
                    ? new Date(productData.LastTestingDate).toISOString().split('T')[0]
                    : ""
                } 
                onChange={handleChange}
              />
            </label>

            <label>
              Bemerkung:
              <textarea 
                name="Remark" 
                value={productData.Remark || ""} 
                onChange={handleChange}
                rows="3"
                style={{ resize: "vertical" }}
              />
            </label>

            <label>
              Zustand:
              <select 
                name="state" 
                value={productData.state?._id || productData.state || ""} 
                onChange={handleChange}
                required
              >
                <option value="">Bitte wählen</option>
                {states.map(s => (
                  <option key={s._id} value={s._id}>{s.name?.de || s.name}</option>
                ))}
              </select>
            </label>

            <label>
              Zugehöriges Set:
              <select 
                name="set" 
                value={productData.set?._id || productData.set || ""} 
                onChange={handleChange}
              >
                <option value="">Kein Set</option>
                {sets.map(s => (
                  <option key={s._id} value={s._id}>
                    {s.set_name?.name?.de || s.set_name?.name || `Set ${s._id}`}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ marginTop: 32 }}>
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

export default ProductEdit;