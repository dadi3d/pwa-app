import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MAIN_VARIABLES } from "../../config";
import "./SetAnlegen.css";

export default function SetKopieren() {
  const { set: setId } = useParams();
  const navigate = useNavigate();

  // States für das ursprüngliche Set und dessen Produkte
  const [originalSet, setOriginalSet] = useState(null);
  const [originalProducts, setOriginalProducts] = useState([]);
  
  // States für editierbare Produktdaten
  const [editableProducts, setEditableProducts] = useState([]);
  const [productValidationErrors, setProductValidationErrors] = useState({});
  
  // Dropdown-Daten
  const [brands, setBrands] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productStates, setProductStates] = useState([]);
  const [productStatus, setProductStatus] = useState([]);
  const [productTestIntervals, setProductTestIntervals] = useState([]);
  const [productCustomerIds, setProductCustomerIds] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  // Thumbnail States
  const [availableThumbnails, setAvailableThumbnails] = useState([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [currentThumbnail, setCurrentThumbnail] = useState(null);
  
  // UI States
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [message, setMessage] = useState("");
  const [messageColor, setMessageColor] = useState("black");
  const [showPreview, setShowPreview] = useState(true);
  const [newSetNumber, setNewSetNumber] = useState(1);

  // Lade ursprüngliches Set und dessen Produkte
  useEffect(() => {
    if (!setId) {
      setMessage("Keine Set-ID angegeben.");
      setMessageColor("red");
      setLoading(false);
      return;
    }

    loadOriginalData();
    loadDropdownData();
  }, [setId]);

  async function loadDropdownData() {
    try {
      const [brandsRes, categoriesRes, statesRes, statusRes, intervalsRes, customerIdsRes, roomsRes] = await Promise.all([
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-states`),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-status`),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-test-intervals`),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-customerids`),
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/rooms`)
      ]);

      const [brandsData, categoriesData, statesData, statusData, intervalsData, customerIdsData, roomsData] = await Promise.all([
        brandsRes.json(),
        categoriesRes.json(),
        statesRes.json(),
        statusRes.json(),
        intervalsRes.json(),
        customerIdsRes.json(),
        roomsRes.json()
      ]);

      setBrands(brandsData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
      setProductCategories(categoriesData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
      setProductStates(statesData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
      setProductStatus(statusData);
      setProductTestIntervals(intervalsData);
      setProductCustomerIds(customerIdsData);
      setRooms(roomsData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
    } catch (error) {
      console.error("Fehler beim Laden der Dropdown-Daten:", error);
      setMessage("Fehler beim Laden der Dropdown-Daten");
      setMessageColor("red");
    }
  }

  async function loadOriginalData() {
    try {
      setLoading(true);
      
      // Set laden
      const setRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`);
      if (!setRes.ok) {
        throw new Error("Set nicht gefunden");
      }
      const setData = await setRes.json();
      setOriginalSet(setData);

      // Thumbnails laden
      await loadThumbnails(setData);

      // Neue Set-Nummer ermitteln
      const nextNumberRes = await fetch(
        `${MAIN_VARIABLES.SERVER_URL}/api/sets/next-set-number?brand=${setData.manufacturer._id}&setName=${setData.set_name._id}&setRelation=${setData.set_relation._id}`
      );
      const nextNumberData = await nextNumberRes.json();
      setNewSetNumber(nextNumberData.nextSetNumber || 1);

      // Produkte des Sets laden
      const productsRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products?set=${setId}`);
      if (!productsRes.ok) {
        throw new Error("Fehler beim Laden der Produkte");
      }
      const productsData = await productsRes.json();
      setOriginalProducts(productsData);

      // Editierbare Produktdaten initialisieren
      const editableProductsData = productsData.map((product, index) => ({
        id: `product_${index}`,
        set: setId, // Wird später auf neue Set-ID gesetzt
        Manufacturer: product.Manufacturer?._id || '',
        Type: product.Type || '',
        Designation: product.Designation?._id || '',
        SerialNumber: '', // Wird geleert
        CostCenter: product.CostCenter || '',
        Department: product.Department?._id || '',
        DeviceType: product.DeviceType || 'Normal',
        state: product.state || '',
        Remark: product.Remark || '',
        IsActive: product.IsActive || false,
        TestingInterval: product.TestingInterval || '',
        ID: '', // Wird geleert
        LastTestingDate: product.LastTestingDate || '',
        showInventarisierung: product.CustomerID && product.CustomerID._id ? 'ja' : '', // Inventarisierung basierend auf vorhandener CustomerID
        CustomerID: product.CustomerID?._id || '',
        Various_1: 0 // IVS-Nummer wird auf 0 gesetzt
      }));
      
      setEditableProducts(editableProductsData);
      
      // Initial validation für alle Produkte
      setTimeout(() => {
        editableProductsData.forEach(product => {
          checkProductValidation(product.id);
        });
      }, 200);
      
    } catch (error) {
      console.error("Fehler beim Laden:", error);
      setMessage(`Fehler beim Laden der Daten: ${error.message}`);
      setMessageColor("red");
    } finally {
      setLoading(false);
    }
  }

  async function loadThumbnails(setData) {
    try {
      // Alle verfügbaren File-Daten laden (wie in SetAnlegen.jsx)
      const allFilesRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data`);
      const allFiles = await allFilesRes.json();
      
      // Nur Bilder filtern
      const thumbnails = allFiles.filter(file => 
        file.filePath && file.filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)
      );
      
      setAvailableThumbnails(thumbnails);
      
      // Aktuelles Thumbnail des ursprünglichen Sets finden
      const currentThumb = thumbnails.find(thumb => 
        thumb.sets && thumb.sets.some(set => set._id === setData._id) && thumb.isThumbnail
      );
      
      if (currentThumb) {
        setCurrentThumbnail(currentThumb);
        setSelectedThumbnail(currentThumb._id);
      }
      
    } catch (error) {
      console.error("Fehler beim Laden der Thumbnails:", error);
    }
  }

  // Hilfsfunktion: passende Files filtern (wie in SetAnlegen.jsx)
  function getMatchingThumbnails() {
    if (!originalSet) return [];
    
    return availableThumbnails.filter(fd =>
      fd.set_relation?._id === originalSet.set_relation?._id &&
      fd.manufacturer?._id === originalSet.manufacturer?._id &&
      fd.set_name?._id === originalSet.set_name?._id &&
      fd.filePath?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
    );
  }

  function updateProduct(productId, field, value) {
    setEditableProducts(prev => 
      prev.map(product => 
        product.id === productId 
          ? { ...product, [field]: value }
          : product
      )
    );
    
    // Sofortige Validierung nach jeder Änderung
    setTimeout(() => {
      checkProductValidation(productId);
      
      // Bei IsActive, CustomerID oder showInventarisierung Änderungen auch die gesamte Validierung neu überprüfen
      // da sich die Required-Felder ändern können
      if (field === 'IsActive' || field === 'CustomerID' || field === 'showInventarisierung') {
        checkProductValidation(productId);
      }
    }, 50);
  }

  // Spezielle Funktion für Felder die andere Felder beeinflussen
  function updateProductWithDependencies(productId, field, value) {
    updateProduct(productId, field, value);
    
    // Zusätzliche Validierung für abhängige Felder
    setTimeout(() => {
      checkProductValidation(productId);
    }, 100);
  }

  function checkProductValidation(productId) {
    const product = editableProducts.find(p => p.id === productId);
    if (!product) return;

    const errors = [];
    
    // Grundlegende Required-Felder prüfen
    if (!product.Manufacturer || product.Manufacturer === '') errors.push('Hersteller auswählen');
    if (!product.Type || !product.Type.trim()) errors.push('Typ eingeben');
    if (!product.Designation || product.Designation === '') errors.push('Bezeichnung auswählen');
    if (!product.CostCenter || !product.CostCenter.trim()) errors.push('Kostenstelle eingeben');
    if (!product.Department || product.Department === '') errors.push('Bereich auswählen');
    if (!product.DeviceType || product.DeviceType === '') errors.push('Gerätetyp auswählen');
    if (!product.state || product.state === '') errors.push('Status auswählen');
    if (product.IsActive === '' || product.IsActive === null || product.IsActive === undefined) {
      errors.push('Aktiv-Status auswählen');
    }

    // Bedingte Required-Felder
    if (product.IsActive === true || product.IsActive === 'true') {
      if (!product.TestingInterval || product.TestingInterval === '') errors.push('Prüfintervall auswählen');
      if (!product.ID || !product.ID.trim()) errors.push('ID eingeben');
    }

    // Inventarisierung-bedingte Required-Felder
    if (product.showInventarisierung === 'ja') {
      if (!product.CustomerID || product.CustomerID === '') errors.push('Bereichsnummer auswählen');
      if (!product.Various_1 || product.Various_1 === 0) errors.push('IVS-Nummer eingeben');
    }

    setProductValidationErrors(prev => ({
      ...prev,
      [productId]: errors
    }));
  }

  function addNewProduct() {
    const newProduct = {
      id: `product_new_${Date.now()}`,
      set: setId, // Wird später auf neue Set-ID gesetzt
      Manufacturer: '',
      Type: '',
      Designation: '',
      SerialNumber: '',
      CostCenter: '',
      Department: '',
      DeviceType: 'Normal',
      state: '',
      Remark: '',
      IsActive: false,
      TestingInterval: '',
      ID: '',
      LastTestingDate: '',
      showInventarisierung: '', // Inventarisierung dropdown
      CustomerID: '',
      Various_1: 0,
      isNew: true // Markierung für neue Produkte
    };
    
    setEditableProducts(prev => [...prev, newProduct]);
    
    // Validation für das neue Produkt
    setTimeout(() => {
      checkProductValidation(newProduct.id);
    }, 100);
  }

  function removeProduct(productId) {
    setEditableProducts(prev => prev.filter(product => product.id !== productId));
    setProductValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[productId];
      return newErrors;
    });
  }

  function validateProducts() {
    const errors = [];
    const detailedErrors = [];
    
    if (editableProducts.length === 0) {
      errors.push("Es müssen mindestens ein Produkt vorhanden sein.");
      return { errors, detailedErrors, isValid: false };
    }
    
    editableProducts.forEach((product, index) => {
      const productErrors = [];
      const productName = product.isNew ? `Neues Produkt ${editableProducts.filter((p, i) => p.isNew && i <= index).length}` : `Produkt ${index + 1}`;
      
      // Grundlegende Required-Felder
      const basicRequired = [
        { field: 'Manufacturer', label: 'Hersteller' },
        { field: 'Type', label: 'Typ' },
        { field: 'Designation', label: 'Bezeichnung' },
        { field: 'CostCenter', label: 'Kostenstelle' },
        { field: 'Department', label: 'Bereich' },
        { field: 'DeviceType', label: 'Gerätetyp' },
        { field: 'state', label: 'Status' }
      ];

      // Prüfe IsActive Feld separat
      if (product.IsActive === '' || product.IsActive === null || product.IsActive === undefined) {
        productErrors.push('Aktiv-Status muss ausgewählt werden');
      }

      // Prüfe grundlegende Required-Felder
      basicRequired.forEach(({ field, label }) => {
        const value = product[field];
        if (!value || value === '' || value === null || value === undefined) {
          productErrors.push(`${label} muss ausgewählt/eingegeben werden`);
        }
      });

      // Zusätzliche Required-Felder basierend auf IsActive
      if (product.IsActive === true || product.IsActive === 'true') {
        if (!product.TestingInterval || product.TestingInterval === '') {
          productErrors.push('Prüfintervall muss ausgewählt werden (da Aktiv = Ja)');
        }
        if (!product.ID || product.ID.trim() === '') {
          productErrors.push('ID muss eingegeben werden (da Aktiv = Ja)');
        }
      }

      // Zusätzliche Required-Felder basierend auf Inventarisierung
      if (product.showInventarisierung === 'ja') {
        if (!product.CustomerID || product.CustomerID === '') {
          productErrors.push('Bereichsnummer muss ausgewählt werden (da Inventarisierung = Ja)');
        }
        if (!product.Various_1 || product.Various_1 === 0 || isNaN(product.Various_1)) {
          productErrors.push('IVS-Nummer muss eingegeben werden (da Inventarisierung = Ja)');
        }
      }

      // Prüfe auf doppelte Seriennummern (falls eingegeben)
      if (product.SerialNumber && product.SerialNumber.trim()) {
        const duplicates = editableProducts.filter((p, i) => 
          i !== index && 
          p.SerialNumber && 
          p.SerialNumber.trim() === product.SerialNumber.trim()
        );
        if (duplicates.length > 0) {
          productErrors.push(`Seriennummer "${product.SerialNumber}" wird bereits verwendet`);
        }
      }

      // Prüfe auf doppelte IDs (falls eingegeben)
      if (product.ID && product.ID.trim()) {
        const duplicates = editableProducts.filter((p, i) => 
          i !== index && 
          p.ID && 
          p.ID.trim() === product.ID.trim()
        );
        if (duplicates.length > 0) {
          productErrors.push(`ID "${product.ID}" wird bereits verwendet`);
        }
      }

      // Prüfe auf doppelte IVS-Nummern (falls eingegeben und > 0)
      if (product.Various_1 && product.Various_1 > 0) {
        const duplicates = editableProducts.filter((p, i) => 
          i !== index && 
          p.Various_1 && 
          p.Various_1 === product.Various_1
        );
        if (duplicates.length > 0) {
          productErrors.push(`IVS-Nummer "${product.Various_1}" wird bereits verwendet`);
        }
      }

      // Füge Produktfehler zu den Listen hinzu
      if (productErrors.length > 0) {
        errors.push(`${productName}: ${productErrors.join(', ')}`);
        detailedErrors.push({
          productIndex: index,
          productName: productName,
          errors: productErrors
        });
      }
    });

    return { 
      errors, 
      detailedErrors, 
      isValid: errors.length === 0 
    };
  }

  async function executeCopy() {
    const validation = validateProducts();
    
    if (!validation.isValid) {
      const errorMessage = `⚠️ Bitte vervollständigen Sie alle erforderlichen Felder:\n\n${validation.errors.join('\n\n')}`;
      setMessage(errorMessage);
      setMessageColor("red");
      
      // Scrolle zum ersten fehlerhaften Produkt
      if (validation.detailedErrors.length > 0) {
        const firstErrorIndex = validation.detailedErrors[0].productIndex;
        const firstErrorElement = document.querySelector(`[data-product-index="${firstErrorIndex}"]`);
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      
      return;
    }

    setCopying(true);
    setMessage("Set wird kopiert...");
    setMessageColor("blue");

    try {
      // Erst nur das Set erstellen (ohne Produkte)
      const setData = {
        manufacturer: originalSet.manufacturer._id,
        setName: originalSet.set_name._id,
        category: originalSet.category._id,
        set_assignment: originalSet.set_assignment._id,
        set_number: newSetNumber,
        note_public: originalSet.note_public,
        note_private: originalSet.note_private,
        state: originalSet.state._id,
        insurance_value: originalSet.insurance_value,
        set_relation: originalSet.set_relation._id
      };

      // Neues Set erstellen
      const formData = new FormData();
      Object.keys(setData).forEach(key => {
        formData.append(key, setData[key]);
      });

      const setResponse = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`, {
        method: "POST",
        body: formData
      });

      if (!setResponse.ok) {
        const errorData = await setResponse.text();
        throw new Error(errorData || "Fehler beim Erstellen des Sets");
      }

      const newSet = await setResponse.json();
      const newSetId = newSet._id;

      // Thumbnail zuweisen, falls eines ausgewählt ist
      if (selectedThumbnail) {
        try {
          const selectedThumb = availableThumbnails.find(thumb => thumb._id === selectedThumbnail);
          if (selectedThumb) {
            // FileData für das neue Set aktualisieren
            const updatedSets = selectedThumb.sets ? [...selectedThumb.sets.map(s => s._id), newSetId] : [newSetId];
            
            await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data/${selectedThumbnail}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                ...selectedThumb,
                sets: updatedSets,
                isThumbnail: true
              })
            });
          }
        } catch (error) {
          console.error("Fehler beim Zuweisen des Thumbnails:", error);
          // Thumbnail-Fehler soll das Kopieren nicht abbrechen
        }
      }

      // Dann alle Produkte (kopierte + neue) einzeln erstellen
      let createdProducts = 0;
      let errors = [];
      
      for (const [index, product] of editableProducts.entries()) {
        const productData = {
          set: newSetId,
          Manufacturer: product.Manufacturer || undefined,
          Type: product.Type || undefined,
          Designation: product.Designation || undefined,
          SerialNumber: product.SerialNumber && product.SerialNumber.trim() ? product.SerialNumber.trim() : undefined,
          CostCenter: product.CostCenter || undefined,
          Department: product.Department || undefined,
          DeviceType: product.DeviceType || 'Normal',
          state: product.state || undefined,
          Remark: product.Remark && product.Remark.trim() ? product.Remark.trim() : undefined,
          IsActive: product.IsActive === true || product.IsActive === 'true'
        };

        // Nur hinzufügen wenn Werte vorhanden sind (verhindert leere ObjectId Strings)
        if (product.TestingInterval && product.TestingInterval !== '') {
          productData.TestingInterval = parseInt(product.TestingInterval, 10);
        }
        
        if (product.ID && product.ID.trim()) {
          productData.ID = product.ID.trim();
        }
        
        if (product.LastTestingDate && product.LastTestingDate !== '') {
          productData.LastTestingDate = product.LastTestingDate;
        }
        
        // Nur hinzufügen wenn Inventarisierung aktiviert ist und CustomerID vorhanden
        if (product.showInventarisierung === 'ja' && product.CustomerID && product.CustomerID !== '') {
          productData.CustomerID = product.CustomerID;
        }
        
        if (product.showInventarisierung === 'ja' && product.Various_1 && product.Various_1 > 0) {
          productData.Various_1 = parseInt(product.Various_1, 10);
        }

        try {
          console.log('Sending product data:', productData); // Debug log
          
          const productResponse = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(productData)
          });

          if (!productResponse.ok) {
            const errorData = await productResponse.json();
            console.error('Product creation error:', errorData); // Debug log
            errors.push(`Produkt ${index + 1}: ${errorData.error || 'Unbekannter Fehler'}`);
          } else {
            createdProducts++;
          }
        } catch (error) {
          console.error('Product creation exception:', error); // Debug log
          errors.push(`Produkt ${index + 1}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        setMessage(`Set erstellt, aber ${errors.length} Produkt(e) konnten nicht erstellt werden:\n${errors.join('\n')}\n\nErfolgreich: ${createdProducts} von ${editableProducts.length} Produkten`);
        setMessageColor("orange");
      } else {
        setMessage(`Set erfolgreich kopiert! Neues Set: ${originalSet.manufacturer?.name} - ${originalSet.set_name?.name?.de} - Set ${newSetNumber}. Alle ${createdProducts} Produkte erfolgreich erstellt.`);
        setMessageColor("green");
      }
      
      setShowPreview(false);

      // Nach 3 Sekunden zur Sets-Übersicht navigieren
      setTimeout(() => {
        navigate("/sets");
      }, 3000);

    } catch (error) {
      console.error("Fehler beim Kopieren:", error);
      setMessage(`Fehler beim Kopieren: ${error.message}`);
      setMessageColor("red");
    } finally {
      setCopying(false);
    }
  }

  if (loading) {
    return (
      <div className="vite-form">
        <h1>Set wird geladen...</h1>
        <div>Lade Set-Daten und zugehörige Produkte...</div>
      </div>
    );
  }

  if (!originalSet) {
    return (
      <div className="vite-form">
        <h1>Fehler</h1>
        <div style={{ color: "red" }}>{message || "Set nicht gefunden"}</div>
        <button onClick={() => navigate("/sets")}>Zurück zur Übersicht</button>
      </div>
    );
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
            max-width: 1400px;
          }
          .preview-section {
            margin: 2rem 0;
            padding: 1.5rem;
            border: 2px solid #e1e8ed;
            border-radius: 8px;
            background: #f8f9fa;
          }
          .preview-title {
            font-size: 1.3rem;
            font-weight: bold;
            margin-bottom: 1rem;
            color: #2a3b4c;
            border-bottom: 2px solid #646cff;
            padding-bottom: 0.5rem;
          }
          .set-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }
          .info-item {
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
          }
          .info-label {
            font-weight: bold;
            color: #555;
            font-size: 0.9rem;
          }
          .info-value {
            color: #2a3b4c;
            font-size: 1rem;
          }
          .product-form {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            background: #fff;
          }
          .product-form h4 {
            margin: 0 0 1rem 0;
            color: #2a3b4c;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.5rem;
          }
          .form-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
          }
          .form-field {
            display: flex;
            flex-direction: column;
            gap: 0.3rem;
          }
          .form-field label {
            font-weight: 500;
            font-size: 0.9rem;
            color: #555;
          }
          .form-field select,
          .form-field input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
          }
          .form-field select:focus,
          .form-field input:focus {
            border-color: #646cff;
            outline: none;
          }
          .required {
            color: red;
          }
          .action-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 2rem;
          }
          .btn {
            padding: 0.8rem 1.5rem;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
          }
          .btn-primary {
            background: #646cff;
            color: white;
          }
          .btn-primary:hover:not(:disabled) {
            background: #535bf2;
          }
          .btn-secondary {
            background: #6c757d;
            color: white;
          }
          .btn-secondary:hover {
            background: #5a6268;
          }
          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
          .message {
            text-align: center;
            font-size: 1.1rem;
            margin: 1rem 0;
            padding: 1rem;
            border-radius: 6px;
            font-weight: 500;
            white-space: pre-line;
          }
          .summary-stats {
            display: flex;
            justify-content: space-around;
            margin: 1rem 0;
            padding: 1rem;
            background: #e8f4fd;
            border-radius: 6px;
          }
          .stat-item {
            text-align: center;
          }
          .stat-number {
            font-size: 1.5rem;
            font-weight: bold;
            color: #646cff;
          }
          .stat-label {
            font-size: 0.9rem;
            color: #666;
          }
        `}
      </style>

      <div className="vite-form">
        <h1 style={{ textAlign: "center", color: "#2a3b4c", marginBottom: "2rem" }}>
          Set Kopieren & Bearbeiten
        </h1>

        {showPreview && (
          <>
            <div className="preview-section">
              <div className="preview-title">📋 Neues Set</div>
              
              <div className="summary-stats">
                <div className="stat-item">
                  <div className="stat-number">1</div>
                  <div className="stat-label">Set wird erstellt</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{editableProducts.filter(p => !p.isNew).length}</div>
                  <div className="stat-label">Produkte kopiert</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{editableProducts.filter(p => p.isNew).length}</div>
                  <div className="stat-label">Neue Produkte</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{newSetNumber}</div>
                  <div className="stat-label">Neue Set-Nummer</div>
                </div>
              </div>

              <div className="set-info">
                <div className="info-item">
                  <div className="info-label">Hersteller</div>
                  <div className="info-value">{originalSet.manufacturer?.name}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Set-Bezeichnung</div>
                  <div className="info-value">{originalSet.set_name?.name?.de}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Set-Nummer</div>
                  <div className="info-value">{newSetNumber}</div>
                </div>
                <div className="info-item">
                  <div className="info-label">Kategorie</div>
                  <div className="info-value">{originalSet.category?.name?.de}</div>
                </div>
              </div>

              {/* Thumbnail-Auswahl */}
              <div style={{ marginTop: "1.5rem" }}>
                <h4 style={{ marginBottom: "1rem", color: "#2a3b4c" }}>📷 Thumbnail auswählen</h4>
                {currentThumbnail && (
                  <div style={{ 
                    marginBottom: "1rem", 
                    padding: "0.75rem", 
                    background: "#e8f4fd", 
                    borderRadius: "8px", 
                    border: "1px solid #bee5eb",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem"
                  }}>
                    <img 
                      src={`${MAIN_VARIABLES.SERVER_URL}/api/file-data/by-filename/${encodeURIComponent(currentThumbnail.filePath)}`}
                      alt="Aktuelles Thumbnail"
                      style={{
                        width: "40px",
                        height: "40px",
                        objectFit: "cover",
                        borderRadius: "4px",
                        border: "1px solid #ccc"
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div>
                      <strong>Aktuelles Thumbnail:</strong> {currentThumbnail.filePath?.split('/').pop()}
                    </div>
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "1rem", maxHeight: "300px", overflowY: "auto" }}>
                  <div 
                    onClick={() => setSelectedThumbnail(null)}
                    style={{
                      border: selectedThumbnail === null ? "3px solid #646cff" : "2px solid #ddd",
                      borderRadius: "8px",
                      padding: "0.5rem",
                      textAlign: "center",
                      cursor: "pointer",
                      background: "#f8f9fa",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      minHeight: "100px"
                    }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.25rem" }}>🚫</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>Kein Thumbnail</div>
                  </div>
                  {getMatchingThumbnails().map(thumbnail => (
                    <div 
                      key={thumbnail._id}
                      onClick={() => setSelectedThumbnail(thumbnail._id)}
                      style={{
                        border: selectedThumbnail === thumbnail._id ? "3px solid #646cff" : "2px solid #ddd",
                        borderRadius: "8px",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      <img 
                        src={`${MAIN_VARIABLES.SERVER_URL}/api/file-data/by-filename/${encodeURIComponent(thumbnail.filePath)}`}
                        alt="Thumbnail"
                        style={{
                          width: "100%",
                          height: "80px",
                          objectFit: "cover"
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div style={{ 
                        display: "none", 
                        alignItems: "center", 
                        justifyContent: "center", 
                        height: "80px", 
                        background: "#f8f9fa",
                        fontSize: "2rem"
                      }}>
                        📷
                      </div>
                      <div style={{ 
                        padding: "0.25rem", 
                        fontSize: "0.7rem", 
                        textAlign: "center",
                        background: selectedThumbnail === thumbnail._id ? "#646cff" : "#fff",
                        color: selectedThumbnail === thumbnail._id ? "white" : "#333"
                      }}>
                        {thumbnail.filePath?.split('/').pop()?.substring(0, 15) || 'Thumbnail'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="preview-section">
              <div className="preview-title">🔧 Produkte bearbeiten</div>
              <div style={{ color: "#666", marginBottom: "1rem" }}>
                Bearbeiten Sie die Produktdaten vor dem Kopieren. Felder mit <span className="required">*</span> sind Pflichtfelder.
              </div>
              
              {/* Validation Summary */}
              {editableProducts.length > 0 && (
                <div style={{ 
                  background: "#f8f9fa", 
                  border: "1px solid #dee2e6", 
                  borderRadius: "6px", 
                  padding: "1rem", 
                  marginBottom: "1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <strong>Validierungsstatus:</strong> {' '}
                    {Object.values(productValidationErrors).filter(errors => errors && errors.length > 0).length > 0 ? (
                      <span style={{ color: "#dc3545" }}>
                        ⚠️ {Object.values(productValidationErrors).filter(errors => errors && errors.length > 0).length} Produkt(e) unvollständig
                      </span>
                    ) : (
                      <span style={{ color: "#28a745" }}>
                        ✅ Alle Produkte vollständig
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.9rem", color: "#666" }}>
                    {editableProducts.length} Produkt(e) gesamt
                  </div>
                </div>
              )}
              
              <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
                <button 
                  className="btn btn-primary"
                  onClick={addNewProduct}
                  type="button"
                  style={{ 
                    background: "#28a745",
                    fontSize: "0.9rem",
                    padding: "0.6rem 1.2rem"
                  }}
                >
                  ➕ Zusätzliches Produkt hinzufügen
                </button>
              </div>
              
              {editableProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="product-form"
                  data-product-index={index}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <h4 style={{ margin: 0 }}>
                        {product.isNew ? "🆕 Neues Produkt" : `Produkt ${index + 1}`}
                      </h4>
                      {productValidationErrors[product.id] && productValidationErrors[product.id].length > 0 ? (
                        <span 
                          style={{ 
                            background: "#dc3545", 
                            color: "white", 
                            padding: "0.2rem 0.5rem", 
                            borderRadius: "4px", 
                            fontSize: "0.7rem",
                            cursor: "help"
                          }}
                          title={`Fehlende Felder: ${productValidationErrors[product.id].join(', ')}`}
                        >
                          ⚠️ {productValidationErrors[product.id].length} Fehler
                        </span>
                      ) : (
                        <span 
                          style={{ 
                            background: "#28a745", 
                            color: "white", 
                            padding: "0.2rem 0.5rem", 
                            borderRadius: "4px", 
                            fontSize: "0.7rem"
                          }}
                        >
                          ✅ Vollständig
                        </span>
                      )}
                    </div>
                    {product.isNew && (
                      <button
                        type="button"
                        onClick={() => removeProduct(product.id)}
                        style={{
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          padding: "0.3rem 0.6rem",
                          fontSize: "0.8rem",
                          cursor: "pointer"
                        }}
                        title="Produkt entfernen"
                      >
                        🗑️ Entfernen
                      </button>
                    )}
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-field">
                      <label>Hersteller <span className="required">*</span></label>
                      <select
                        value={product.Manufacturer}
                        onChange={(e) => updateProduct(product.id, 'Manufacturer', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                      >
                        <option value="">-- Bitte wählen --</option>
                        {brands.map(brand => (
                          <option key={brand._id} value={brand._id}>{brand.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Typ <span className="required">*</span></label>
                      <input
                        type="text"
                        value={product.Type}
                        onChange={(e) => updateProduct(product.id, 'Type', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                        onKeyUp={() => checkProductValidation(product.id)}
                        placeholder="Produkttyp"
                      />
                    </div>

                    <div className="form-field">
                      <label>Bezeichnung <span className="required">*</span></label>
                      <select
                        value={product.Designation}
                        onChange={(e) => updateProduct(product.id, 'Designation', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                      >
                        <option value="">-- Bitte wählen --</option>
                        {productCategories.map(cat => (
                          <option key={cat._id} value={cat._id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Seriennummer</label>
                      <input
                        type="text"
                        value={product.SerialNumber}
                        onChange={(e) => updateProduct(product.id, 'SerialNumber', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                        onKeyUp={() => checkProductValidation(product.id)}
                        placeholder="Seriennummer"
                      />
                    </div>

                    <div className="form-field">
                      <label>Kostenstelle <span className="required">*</span></label>
                      <input
                        type="text"
                        value={product.CostCenter}
                        onChange={(e) => updateProduct(product.id, 'CostCenter', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                        onKeyUp={() => checkProductValidation(product.id)}
                        placeholder="Kostenstelle"
                      />
                    </div>

                    <div className="form-field">
                      <label>Bereich <span className="required">*</span></label>
                      <select
                        value={product.Department}
                        onChange={(e) => updateProduct(product.id, 'Department', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                      >
                        <option value="">-- Bitte wählen --</option>
                        {rooms.map(room => (
                          <option key={room._id} value={room._id}>{room.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Gerätetyp <span className="required">*</span></label>
                      <select
                        value={product.DeviceType}
                        onChange={(e) => updateProduct(product.id, 'DeviceType', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                      >
                        <option value="Normal">Normal</option>
                        <option value="Sondergerät">Sondergerät</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Status <span className="required">*</span></label>
                      <select
                        value={product.state}
                        onChange={(e) => updateProduct(product.id, 'state', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                      >
                        <option value="">-- Bitte wählen --</option>
                        {productStates.map(state => (
                          <option key={state._id} value={state._id}>{state.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Aktiv <span className="required">*</span></label>
                      <select
                        value={product.IsActive}
                        onChange={(e) => updateProductWithDependencies(product.id, 'IsActive', e.target.value === 'true')}
                        onBlur={() => checkProductValidation(product.id)}
                      >
                        <option value="">-- Bitte wählen --</option>
                        <option value="true">Ja</option>
                        <option value="false">Nein</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>Inventarisierung?</label>
                      <select
                        value={product.showInventarisierung}
                        onChange={(e) => {
                          updateProductWithDependencies(product.id, 'showInventarisierung', e.target.value);
                          // CustomerID und Various_1 zurücksetzen wenn "nein" oder leer gewählt wird
                          if (e.target.value !== 'ja') {
                            updateProduct(product.id, 'CustomerID', '');
                            updateProduct(product.id, 'Various_1', 0);
                          }
                        }}
                        onBlur={() => checkProductValidation(product.id)}
                      >
                        <option value="">-- Bitte wählen --</option>
                        <option value="ja">Ja</option>
                        <option value="nein">Nein</option>
                      </select>
                    </div>

                    {product.IsActive && (
                      <>
                        <div className="form-field">
                          <label>Prüfintervall <span className="required">*</span></label>
                          <select
                            value={product.TestingInterval}
                            onChange={(e) => updateProduct(product.id, 'TestingInterval', parseInt(e.target.value))}
                            onBlur={() => checkProductValidation(product.id)}
                          >
                            <option value="">-- Bitte wählen --</option>
                            {productTestIntervals.map(interval => (
                              <option key={interval._id} value={interval.duration}>{interval.duration}</option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>ID <span className="required">*</span></label>
                          <input
                            type="text"
                            value={product.ID}
                            onChange={(e) => updateProduct(product.id, 'ID', e.target.value)}
                            onBlur={() => checkProductValidation(product.id)}
                            onKeyUp={() => checkProductValidation(product.id)}
                            placeholder="Produkt-ID"
                          />
                        </div>

                        <div className="form-field">
                          <label>Letztes Prüfdatum</label>
                          <input
                            type="date"
                            value={product.LastTestingDate ? product.LastTestingDate.slice(0, 10) : ''}
                            onChange={(e) => updateProduct(product.id, 'LastTestingDate', e.target.value)}
                            onBlur={() => checkProductValidation(product.id)}
                          />
                        </div>
                      </>
                    )}

                    {product.showInventarisierung === 'ja' && (
                      <>
                        <div className="form-field">
                          <label>Bereichsnummer <span className="required">*</span></label>
                          <select
                            value={product.CustomerID}
                            onChange={(e) => updateProductWithDependencies(product.id, 'CustomerID', e.target.value)}
                            onBlur={() => checkProductValidation(product.id)}
                          >
                            <option value="">-- Bitte wählen --</option>
                            {productCustomerIds.map(customer => (
                              <option key={customer._id} value={customer._id}>
                                {customer.area} {customer.description ? `- ${customer.description}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="form-field">
                          <label>IVS-Nummer <span className="required">*</span></label>
                          <input
                            type="number"
                            value={product.Various_1}
                            onChange={(e) => updateProduct(product.id, 'Various_1', parseInt(e.target.value) || 0)}
                            onBlur={() => checkProductValidation(product.id)}
                            onKeyUp={() => checkProductValidation(product.id)}
                            placeholder="IVS-Nummer"
                          />
                        </div>
                      </>
                    )}

                    <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                      <label>Bemerkung</label>
                      <input
                        type="text"
                        value={product.Remark}
                        onChange={(e) => updateProduct(product.id, 'Remark', e.target.value)}
                        onBlur={() => checkProductValidation(product.id)}
                        onKeyUp={() => checkProductValidation(product.id)}
                        placeholder="Bemerkung"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {message && (
          <div className="message" style={{ 
            color: messageColor,
            backgroundColor: messageColor === 'orange' ? '#fff3cd' : 
                           messageColor === 'red' ? '#f8d7da' : 
                           messageColor === 'green' ? '#d4edda' : 'transparent',
            border: messageColor === 'orange' ? '1px solid #ffeaa7' : 
                   messageColor === 'red' ? '1px solid #f5c6cb' : 
                   messageColor === 'green' ? '1px solid #c3e6cb' : 'none'
          }}>
            {message}
          </div>
        )}

        <div className="action-buttons">
          {showPreview ? (
            <>
              <button 
                className="btn btn-secondary" 
                onClick={() => navigate("/sets")}
                disabled={copying}
              >
                Abbrechen
              </button>
              <button 
                className="btn btn-primary" 
                onClick={executeCopy}
                disabled={copying || editableProducts.length === 0}
              >
                {copying ? "Kopiere..." : `Set mit ${editableProducts.length} Produkt(en) erstellen`}
              </button>
            </>
          ) : (
            <button 
              className="btn btn-primary" 
              onClick={() => navigate("/sets")}
            >
              Zur Sets-Übersicht
            </button>
          )}
        </div>
      </div>
    </>
  );
}
