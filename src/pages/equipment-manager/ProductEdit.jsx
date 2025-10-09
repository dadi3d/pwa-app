import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MAIN_VARIABLES } from '../../config.js';
import { Button } from '../../styles/catalyst/button';
import { Input } from '../../styles/catalyst/input';
import { Textarea } from '../../styles/catalyst/textarea';

const API_BRANDS = `${MAIN_VARIABLES.SERVER_URL}/api/brands`;
const API_CATEGORIES = `${MAIN_VARIABLES.SERVER_URL}/api/product-categories`;
const API_STATES = `${MAIN_VARIABLES.SERVER_URL}/api/product-states`;
const API_SINGLE_PRODUCTS = `${MAIN_VARIABLES.SERVER_URL}/api/single-products`;
const API_SETS = `${MAIN_VARIABLES.SERVER_URL}/api/sets`;
const API_ROOMS = `${MAIN_VARIABLES.SERVER_URL}/api/rooms`;
const API_CUSTOMERIDS = `${MAIN_VARIABLES.SERVER_URL}/api/product-customerids`;
const API_TEST_INTERVALS = `${MAIN_VARIABLES.SERVER_URL}/api/product-test-intervals`;

const ProductEdit = ({ productId: propProductId, onSave, startInEditMode = false }) => {
  const params = useParams();
  const productId = propProductId || params.productId;
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(startInEditMode);

  // Referenzdaten
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [states, setStates] = useState([]);
  const [sets, setSets] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [customerIds, setCustomerIds] = useState([]);
  const [testIntervals, setTestIntervals] = useState([]);
  
  // Conditional visibility
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    // Alle Referenzdaten laden
    async function loadRefs() {
      const [b, c, s, sets, intervals] = await Promise.all([
        fetch(API_BRANDS).then(res => res.json()),
        fetch(API_CATEGORIES).then(res => res.json()),
        fetch(API_STATES).then(res => res.json()),
        fetch(API_SETS).then(res => res.json()),
        fetch(API_TEST_INTERVALS).then(res => res.json()),
      ]);
      setBrands(b);
      setCategories(c);
      setStates(s);
      setSets(sets);
      setTestIntervals(intervals);
    }
    loadRefs();
  }, []);

  useEffect(() => {
    if (!productId) return;
    // Produkt-Daten laden
    fetch(`${API_SINGLE_PRODUCTS}/${productId}`)
      .then(res => res.json())
      .then(async data => {
        setProductData(data);
        // Prüfen ob Inventarisierung vorhanden
        if (data.CustomerID || data.Various_1) {
          setShowInventory(true);
          // CustomerIDs laden wenn vorhanden
          fetch(API_CUSTOMERIDS)
            .then(res => res.json())
            .then(customerIds => setCustomerIds(customerIds))
            .catch(err => console.error('Fehler beim Laden der CustomerIDs:', err));
        }
        // Räume für das Set laden
        if (data.set?._id) {
          await loadRoomsForSet(data.set._id);
        } else if (data.set) {
          // Falls set nur als String-ID vorliegt
          await loadRoomsForSet(data.set);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Fehler beim Laden des Produkts:', err);
        setLoading(false);
      });
  }, [productId]);

  async function loadRoomsForSet(setId) {
    try {
      console.log('Loading rooms for set:', setId);
      // Set mit Relations laden
      const setRes = await fetch(`${API_SETS}/${setId}`);
      const setData = await setRes.json();
      console.log('Set data:', setData);
      
      let roomIds = [];
      if (setData?.set_relation?.rooms && Array.isArray(setData.set_relation.rooms)) {
        roomIds = setData.set_relation.rooms;
      } else if (setData?.rooms && Array.isArray(setData.rooms)) {
        roomIds = setData.rooms;
      }
      
      console.log('Room IDs found:', roomIds);

      if (roomIds.length > 0) {
        const fetchedRooms = await Promise.all(
          roomIds.map(id =>
            fetch(`${API_ROOMS}/${id}`)
              .then(res => res.ok ? res.json() : null)
              .catch(() => null)
          )
        );
        const validRooms = fetchedRooms
          .filter(room => room && room._id && room.name)
          .map(room => ({ _id: room._id, name: room.name }));
        console.log('Valid rooms loaded:', validRooms);
        setRooms(validRooms);
      } else {
        console.log('No rooms found for set, loading all available rooms');
        // Fallback: alle verfügbaren Räume laden
        const allRoomsRes = await fetch(API_ROOMS);
        const allRooms = await allRoomsRes.json();
        console.log('All available rooms:', allRooms);
        setRooms(allRooms);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Räume:', err);
      // Fallback: alle Räume laden
      try {
        const allRoomsRes = await fetch(API_ROOMS);
        const allRooms = await allRoomsRes.json();
        setRooms(allRooms);
      } catch (fallbackErr) {
        console.error('Fehler beim Laden aller Räume:', fallbackErr);
        setRooms([]);
      }
    }
  }

  async function handleSetChange(newSetId) {
    if (newSetId) {
      await loadRoomsForSet(newSetId);
    } else {
      setRooms([]);
    }
  }

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
    
    // Bei Set-Änderung: Räume neu laden
    if (name === 'set') {
      handleSetChange(value);
    }
    
    // Bei Inventarisierung-Änderung: CustomerIDs laden
    if (name === 'hasInventory') {
      const showInv = value === 'ja';
      setShowInventory(showInv);
      if (showInv && customerIds.length === 0) {
        fetch(API_CUSTOMERIDS)
          .then(res => res.json())
          .then(data => setCustomerIds(data))
          .catch(err => console.error('Fehler beim Laden der CustomerIDs:', err));
      }
    }
    
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

  if (loading || !productData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Lade Daten...</p>
      </div>
    );
  }

  const displayType = typeof productData.Type === 'object' ? (productData.Type?.name || '–') : (productData.Type || '–');
  const displayStatus = typeof productData.Status === 'object' ? (productData.Status?.name || '–') : (productData.Status || '–');
  const displayDeviceType = typeof productData.DeviceType === 'object' ? (productData.DeviceType?.name || '–') : (productData.DeviceType || '–');

  // Header Text: Hersteller Typ
  const manufacturer = productData.Manufacturer?.name || productData.manufacturer?.name || '–';
  const type = typeof productData.Type === 'object' ? (productData.Type?.name || '–') : (productData.Type || '–');
  const headerText = `${manufacturer} ${type}`;

  return (
    <div className="w-full">
      <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 -mx-6 -mt-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {headerText}
        </h2>
      </div>

      {!editMode ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-700">Hersteller</p>
              <p className="text-gray-900">{productData.Manufacturer?.name || "–"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Bezeichnung</p>
              <p className="text-gray-900">{productData.Designation?.name?.de || productData.Designation?.name || "–"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Typ</p>
              <p className="text-gray-900">{displayType}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Seriennummer</p>
              <p className="text-gray-900">{productData.SerialNumber || "–"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Kostenstelle</p>
              <p className="text-gray-900">{productData.CostCenter || "–"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Raumnummer</p>
              <p className="text-gray-900">{typeof productData.Department === 'object' ? (productData.Department?.name || '–') : (productData.Department || '–')}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Bereichsnummer</p>
              <p className="text-gray-900">{typeof productData.CustomerID === 'object' ? (productData.CustomerID?.name || '–') : (productData.CustomerID || '–')}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">IVS-Nummer</p>
              <p className="text-gray-900">{productData.Various_1 || "–"}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Status</p>
              <p className="text-gray-900">{displayStatus}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Gerätetyp</p>
              <p className="text-gray-900">{displayDeviceType}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700">Elektrische Prüfung</p>
              <p className={`font-medium ${productData.IsActive ? 'text-green-600' : 'text-red-600'}`}>
                {productData.IsActive ? "Ja" : "Nein"}
              </p>
            </div>
            {productData.IsActive && (
              <>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Prüfintervall</p>
                  <p className="text-gray-900">{productData.TestingInterval || "–"} Monate</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">ID</p>
                  <p className="text-gray-900">{productData.ID || "–"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Letztes Prüfdatum</p>
                  <p className="text-gray-900">
                    {productData.LastTestingDate 
                      ? new Date(productData.LastTestingDate).toLocaleDateString('de-DE')
                      : "–"}
                  </p>
                </div>
              </>
            )}
            <div>
              <p className="text-sm font-semibold text-gray-700">Zustand</p>
              <p className="text-gray-900">{productData.state?.name?.de || productData.state?.name || "–"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-gray-700">Zugehöriges Set</p>
              <p className="text-gray-900">
                {productData.set?.set_name?.name?.de || 
                 productData.set?.set_name?.name || 
                 "Kein Set zugewiesen"}
              </p>
            </div>
          </div>

          {productData.Remark && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-semibold text-gray-700 mb-2">Bemerkung</p>
              <p className="text-gray-900 bg-gray-50 p-3 rounded border border-gray-200">
                {productData.Remark}
              </p>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200 flex gap-3">
            <Button
              type="button"
              className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200"
              outline
              onClick={() => setEditMode(true)}
            >
              Bearbeiten
            </Button>
            <Button
              type="button"
              color="red"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(productId);
              }}
            >
              Löschen
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Set */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Set *
              </label>
              <p className="text-xs text-gray-500 mb-2">Welchem Set soll das Produkt zugeordnet werden?</p>
              <select 
                name="set" 
                value={productData.set?._id || productData.set || ""} 
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                {sets.map(s => (
                  <option key={s._id} value={s._id}>
                    {`${s.manufacturer?.name || ''} - ${s.set_name?.name?.de || s.set_name?.name || ''} - Set ${s.set_number || ''}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Hersteller */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hersteller *
              </label>
              <p className="text-xs text-gray-500 mb-2">Wählen Sie den Hersteller des Produkts.</p>
              <select 
                name="Manufacturer" 
                value={productData.Manufacturer?._id || productData.Manufacturer || ""} 
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                {brands.map(b => (
                  <option key={b._id} value={b._id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Typenbezeichnung */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Typenbezeichnung *
              </label>
              <p className="text-xs text-gray-500 mb-2">Wie lautet die Bezeichnung des Produkts?</p>
              <Input 
                name="Type" 
                type="text" 
                value={typeof productData.Type === 'object' ? (productData.Type?.name || '') : (productData.Type || '')} 
                onChange={handleChange}
                required
              />
            </div>

            {/* Kategorie */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategorie *
              </label>
              <p className="text-xs text-gray-500 mb-2">Wählen Sie die Kategorie des Produkts.</p>
              <select 
                name="Designation" 
                value={productData.Designation?._id || productData.Designation || ""} 
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                {categories.map(c => (
                  <option key={c._id} value={c._id}>{c.name?.de || c.name}</option>
                ))}
              </select>
            </div>

            {/* Seriennummer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seriennummer
              </label>
              <p className="text-xs text-gray-500 mb-2">Wie lautet die Seriennummer des Produkts, falls vorhanden?</p>
              <Input 
                name="SerialNumber" 
                type="text" 
                value={productData.SerialNumber || ""} 
                onChange={handleChange}
              />
            </div>

            {/* Bestellnummer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bestellnummer *
              </label>
              <p className="text-xs text-gray-500 mb-2">Wie lautet die vom Haushalt vergebene Bestellnummer?</p>
              <Input 
                name="CostCenter" 
                type="text" 
                value={productData.CostCenter || ""} 
                onChange={handleChange}
                required
              />
            </div>

            {/* Raumnummer */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raumnummer *
              </label>
              <p className="text-xs text-gray-500 mb-2">Wie lautet die Raumnummer, in dem das Produkt verwendet / gelagert wird?</p>
              <select 
                name="Department" 
                value={typeof productData.Department === 'object' ? (productData.Department?._id || '') : (productData.Department || '')} 
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                {rooms.map(room => (
                  <option key={room._id} value={room._id}>{room.name}</option>
                ))}
              </select>
            </div>

            {/* Inventarisierung */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inventarisierung? *
              </label>
              <p className="text-xs text-gray-500 mb-2">Wird das Produkt inventarisiert (Produktwert &gt; 800€ Netto)?</p>
              <select 
                name="hasInventory" 
                value={showInventory ? 'ja' : 'nein'} 
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                <option value="ja">Ja</option>
                <option value="nein">Nein</option>
              </select>
            </div>

            {/* Bereichsnummer & Inventarnummer - nur wenn Inventarisierung = Ja */}
            {showInventory && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bereichsnummer *
                  </label>
                  <select 
                    name="CustomerID" 
                    value={typeof productData.CustomerID === 'object' ? (productData.CustomerID?._id || '') : (productData.CustomerID || '')} 
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Bitte wählen --</option>
                    {customerIds.map(cid => (
                      <option key={cid._id} value={cid._id}>
                        {cid.area}{cid.description ? ` - ${cid.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Inventarnummer *
                  </label>
                  <p className="text-xs text-gray-500 mb-2">Wie lautet die vom Haushalt vergebene Inventarnummer?</p>
                  <Input 
                    name="Various_1" 
                    type="number" 
                    value={productData.Various_1 || ""} 
                    onChange={handleChange}
                    required
                  />
                </div>
              </>
            )}

            {/* Gerätetyp - disabled */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gerätetyp
              </label>
              <p className="text-xs text-gray-500 mb-2">Vorgegebener Standardwert</p>
              <select 
                name="DeviceType" 
                value="Normal"
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              >
                <option value="Normal">Normal</option>
              </select>
            </div>

            {/* Elektrische Prüfung */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Elektrische Prüfung? *
              </label>
              <p className="text-xs text-gray-500 mb-2">Für alle ortsveränderlichen Elektrogeräte (z.B. mit Netzanschluss)</p>
              <select 
                name="IsActive" 
                value={productData.IsActive ? "true" : "false"} 
                onChange={(e) => handleChange({target: {name: 'IsActive', value: e.target.value === 'true'}})}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                <option value="false">Nein</option>
                <option value="true">Ja</option>
              </select>
            </div>

            {/* Prüfintervall, ID, Letztes Prüfdatum - nur wenn IsActive = true */}
            {productData.IsActive && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prüfintervall (Monate) *
                  </label>
                  <select 
                    name="TestingInterval" 
                    value={productData.TestingInterval || ""} 
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Bitte wählen --</option>
                    {testIntervals.map(interval => (
                      <option key={interval._id} value={interval.duration}>
                        {interval.duration}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID (Elektrische Prüfung) *
                  </label>
                  <Input 
                    name="ID" 
                    type="text" 
                    value={productData.ID || ""} 
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Letzte elektrische Prüfung
                  </label>
                  <Input 
                    name="LastTestingDate" 
                    type="date" 
                    value={
                      productData.LastTestingDate 
                        ? new Date(productData.LastTestingDate).toISOString().split('T')[0]
                        : ""
                    } 
                    onChange={handleChange}
                  />
                </div>
              </>
            )}

            {/* Anmerkung */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Anmerkung
              </label>
              <p className="text-xs text-gray-500 mb-2">Für den internen Gebrauch</p>
              <Textarea 
                name="Remark" 
                value={productData.Remark || ""} 
                onChange={handleChange}
                rows={3}
              />
            </div>

            {/* Produktstatus */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Produktstatus *
              </label>
              <select 
                name="state" 
                value={productData.state?._id || productData.state || ""} 
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Bitte wählen --</option>
                {states.map(s => (
                  <option key={s._id} value={s._id}>{s.name?.de || s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex gap-3 justify-between">
            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={saving}
                className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200"
                outline
              >
                {saving ? "Speichern..." : "Speichern"}
              </Button>
              <Button
                type="button"
                onClick={() => setEditMode(false)}
                color="zinc"
              >
                Abbrechen
              </Button>
            </div>
            <Button
              type="button"
              color="red"
              onClick={async () => {
                const typeName = typeof productData.Type === 'object' 
                  ? (productData.Type?.name || 'Produkt') 
                  : (productData.Type || 'Produkt');
                const serial = productData.SerialNumber || '-';
                
                if (window.confirm(`Möchten Sie das Produkt "${typeName}" mit der Seriennummer "${serial}" wirklich löschen?`)) {
                  try {
                    const res = await fetch(`${API_SINGLE_PRODUCTS.replace('?set=', '')}/${productId}`, { 
                      method: 'DELETE' 
                    });
                    if (res.ok) {
                      alert('Produkt erfolgreich gelöscht.');
                      if (onSave) onSave(); // Trigger reload in parent
                    } else {
                      alert('Fehler beim Löschen des Produkts.');
                    }
                  } catch (err) {
                    console.error('Fehler beim Löschen:', err);
                    alert('Fehler beim Löschen des Produkts.');
                  }
                }
              }}
            >
              Löschen
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default ProductEdit;