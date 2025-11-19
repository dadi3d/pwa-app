import React, { useEffect, useState, useRef } from "react";
import { MAIN_VARIABLES } from "../../config";
import { useAuth, fetchUserData, authenticatedFetch } from '../services/auth';
import { Button } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function SetAnlegen() {
  // Dropdown-States
  const [brands, setBrands] = useState([]);
  const [setNames, setSetNames] = useState([]);
  const [categories, setCategories] = useState([]);
  const [setStates, setSetStates] = useState([]);
  const [setRelations, setSetRelations] = useState([]); // NEU

  // Auswahl-States
  const [brand, setBrand] = useState("");
  const [setName, setSetName] = useState("");

  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('student');
  const token = useAuth(state => state.token);
  const [category, setCategory] = useState("");
  const [setState, setSetState] = useState("");
  const [availabilityType, setAvailabilityType] = useState("free"); // "free" für null, "restricted" für []
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

  // Modal Inputs
  const [newBrandName, setNewBrandName] = useState("");
  const [newSetName, setNewSetName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [brandModalMessage, setBrandModalMessage] = useState("");
  const [setNameModalMessage, setSetNameModalMessage] = useState("");
  const [categoryModalMessage, setCategoryModalMessage] = useState("");

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
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data`)
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
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-relations`).then(r => r.json()).then(data => setSetRelations(data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })))) // NEU
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`).then(r => r.json()).then(data => setBrands(data.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" }))));
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`).then(r => r.json()).then(data => setSetNames(data.sort((a, b) => (a.name?.de || "").localeCompare(b.name?.de || "", "de", { sensitivity: "base" }))));
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`).then(r => r.json()).then(data => setCategories(data.sort((a, b) => (a.name?.de || "").localeCompare(b.name?.de || "", "de", { sensitivity: "base" }))));
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-states`).then(r => r.json()).then(data => setSetStates(data.sort((a, b) => (a.name?.de || "").localeCompare(b.name?.de || "", "de", { sensitivity: "base" }))));
  }, []);

  // Set-Nummer automatisch aktualisieren
  useEffect(() => {
    if (!brand || !setName || !setRelation) { // <--- geändert
      setSetNumber("");
      return;
    }
    authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/next-set-number?brand=${brand}&setName=${setName}&setRelation=${setRelation}`) // <--- geändert
      .then(r => r.json())
      .then(data => setSetNumber(data.nextSetNumber || ""))
      .catch(() => setSetNumber(""));
  }, [brand, setName, setRelation]); // <--- geändert

  // Set anlegen
  async function createSet(e) {
    e.preventDefault();
    setMessage("");
    setMessageColor("black");

    if (!setState || !brand || !setName || !category || !setRelation || !setNumber) {
      setMessage("Bitte alle Pflichtfelder ausfüllen.");
      setMessageColor("red");
      return;
    }

    const formData = new FormData();
    formData.append("manufacturer", brand);
    formData.append("setName", setName);
    
    // Verfügbarkeit: "free" = null, "restricted" = []
    if (availabilityType === "free") {
      formData.append("set_assignment", "null");
    } else {
      formData.append("set_assignment", "[]");
    }
    
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

    const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`, { 
      method: "POST", 
      body: formData
    });
    if (res.ok) {
      setMessage("Set erfolgreich angelegt.");
      setMessageColor("green");
      setBrand(""); setSetName(""); setAvailabilityType("free"); setCategory(""); setSetNumber("");
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
    const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`, {
      method: "POST",
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
    const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-names`, {
      method: "POST",
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
    const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/categories`, {
      method: "POST",
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



  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Set hinzufügen</h1>
          
          <form onSubmit={createSet}>
            <div className="space-y-6">
              {/* Zugehörigkeit */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Zugehörigkeit</label>
                <select 
                  value={setRelation} 
                  onChange={e => setSetRelation(e.target.value)} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Bitte auswählen</option>
                  {setRelations.map(r => (
                    <option key={r._id} value={r._id}>
                      {r.name || "–"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hersteller */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Hersteller</label>
                <div className="flex gap-2">
                  <select 
                    value={brand} 
                    onChange={e => setBrand(e.target.value)} 
                    required 
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Bitte auswählen</option>
                    {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                  <Button 
                    type="button" 
                    onClick={() => setShowBrandModal(true)} 
                    className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-md transition-colors"
                    title="Neuen Hersteller hinzufügen"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Set-Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Set-Name</label>
                <div className="flex gap-2">
                  <select 
                    value={setName} 
                    onChange={e => setSetName(e.target.value)} 
                    required 
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Bitte auswählen</option>
                    {setNames.map(s => <option key={s._id} value={s._id}>{s.name?.de}</option>)}
                  </select>
                  <Button 
                    type="button" 
                    onClick={() => setShowSetNameModal(true)} 
                    className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-md transition-colors"
                    title="Neue Set-Bezeichnung hinzufügen"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Kategorie */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Set-Kategorie</label>
                <div className="flex gap-2">
                  <select 
                    value={category} 
                    onChange={e => setCategory(e.target.value)} 
                    required 
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="">Bitte auswählen</option>
                    {categories.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name?.de || "–"}
                      </option>
                    ))}
                  </select>
                  <Button 
                    type="button" 
                    onClick={() => setShowCategoryModal(true)} 
                    className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-md transition-colors"
                    title="Neue Kategorie hinzufügen"
                  >
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Set-Nummer */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Set-Nummer</label>
                <div className="flex items-center gap-2">
                  <input 
                    value={setNumber} 
                    readOnly 
                    className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700"
                  />
                  <span className="text-sm text-gray-500">(automatisch vergeben)</span>
                </div>
              </div>

              {/* Thumbnail */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Thumbnail(s)</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png"
                    ref={thumbnailRef}
                    onChange={e => setThumbnails(Array.from(e.target.files))}
                    disabled={!setRelation || !brand || !setName || !category}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-500">(.jpg/.png, mehrere möglich)</span>
                </div>
                {/* Vorhandene Thumbnails anzeigen */}
                {getMatchingFiles("thumbnail").length > 0 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {getMatchingFiles("thumbnail").map(fd => (
                      <img
                        key={fd._id}
                        src={`${MAIN_VARIABLES.SERVER_URL}/api/file-data/by-filename/${encodeURIComponent(fd.filePath)}`}
                        alt={fd.filePath.split("/").pop()}
                        className="w-20 h-20 object-cover rounded border border-gray-300 flex-shrink-0"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Manual */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Manual(s)</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="file"
                    multiple
                    accept=".pdf"
                    ref={manualRef}
                    onChange={e => setManuals(Array.from(e.target.files))}
                    disabled={!setRelation || !brand || !setName || !category}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm text-gray-500">(.pdf, mehrere möglich)</span>
                </div>
                {/* Vorhandene Manuals anzeigen */}
                {getMatchingFiles("manual").length > 0 && (
                  <ul className="space-y-1 text-sm text-gray-600">
                    {getMatchingFiles("manual").map(fd => (
                      <li key={fd._id}>
                        <a 
                          href={`${MAIN_VARIABLES.SERVER_URL}/${fd.filePath}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:text-orange-800 underline"
                        >
                          {fd.filePath.split("/").pop()}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Notizen öffentlich */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Anmerkung öffentlich</label>
                <textarea 
                  value={notePublic} 
                  onChange={e => setNotePublic(e.target.value)} 
                  rows={2} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Notizen intern */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Anmerkung intern</label>
                <textarea 
                  value={notePrivate} 
                  onChange={e => setNotePrivate(e.target.value)} 
                  rows={2} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Set-Status</label>
                <select 
                  value={setState} 
                  onChange={e => setSetState(e.target.value)} 
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Bitte auswählen</option>
                  {setStates.map(s => (
                    <option key={s._id} value={s._id}>
                      {s.name?.de || "–"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Verfügbarkeit */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Verfügbarkeit</label>
                <div className="border border-gray-300 rounded-md p-3 bg-white space-y-2">
                  <div>
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        name="availability"
                        value="free"
                        checked={availabilityType === "free"}
                        onChange={(e) => setAvailabilityType(e.target.value)}
                        className="mr-2 h-4 w-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="font-medium">Freie Verfügbarkeit</span>
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center text-sm">
                      <input
                        type="radio"
                        name="availability"
                        value="restricted"
                        checked={availabilityType === "restricted"}
                        onChange={(e) => setAvailabilityType(e.target.value)}
                        className="mr-2 h-4 w-4 text-orange-500 border-gray-300 focus:ring-orange-500"
                      />
                      <span className="font-medium">Eingeschränkte Verfügbarkeit</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-md font-semibold transition-colors"
                >
                  Set anlegen
                </Button>
              </div>

              {/* Feedback */}
              <div className="min-h-6">
                {message && (
                  <div className={`font-semibold ${messageColor === 'green' ? 'text-green-600' : messageColor === 'red' ? 'text-red-600' : 'text-gray-900'}`}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* Modals */}
          {showBrandModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 min-w-96">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Neuen Hersteller hinzufügen</h3>
                <input 
                  type="text" 
                  value={newBrandName} 
                  onChange={e => setNewBrandName(e.target.value)} 
                  placeholder="Herstellername" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <div className="flex gap-3 mt-4">
                  <Button onClick={addBrand} className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-md transition-colors">
                    Speichern
                  </Button>
                  <Button onClick={() => setShowBrandModal(false)} className="bg-black hover:bg-gray-800 text-orange-500 px-4 py-2 rounded-md transition-colors">
                    Abbrechen
                  </Button>
                </div>
                {brandModalMessage && <p className="mt-4 text-red-600">{brandModalMessage}</p>}
              </div>
            </div>
          )}

          {showSetNameModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 min-w-96">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Neue Set-Bezeichnung hinzufügen</h3>
                <input 
                  type="text" 
                  value={newSetName} 
                  onChange={e => setNewSetName(e.target.value)} 
                  placeholder="Set-Bezeichnung" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <div className="flex gap-3 mt-4">
                  <Button onClick={addSetName} className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-md transition-colors">
                    Speichern
                  </Button>
                  <Button onClick={() => setShowSetNameModal(false)} className="bg-black hover:bg-gray-800 text-orange-500 px-4 py-2 rounded-md transition-colors">
                    Abbrechen
                  </Button>
                </div>
                {setNameModalMessage && <p className="mt-4 text-red-600">{setNameModalMessage}</p>}
              </div>
            </div>
          )}

          {showCategoryModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 min-w-96">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Neue Kategorie hinzufügen</h3>
                <input 
                  type="text" 
                  value={newCategoryName} 
                  onChange={e => setNewCategoryName(e.target.value)} 
                  placeholder="Kategoriename" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
                <div className="flex gap-3 mt-4">
                  <Button onClick={addCategory} className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-md transition-colors">
                    Speichern
                  </Button>
                  <Button onClick={() => setShowCategoryModal(false)} className="bg-black hover:bg-gray-800 text-orange-500 px-4 py-2 rounded-md transition-colors">
                    Abbrechen
                  </Button>
                </div>
                {categoryModalMessage && <p className="mt-4 text-red-600">{categoryModalMessage}</p>}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}