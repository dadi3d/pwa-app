import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MAIN_VARIABLES } from "../../config";
import { authenticatedFetch } from "../services/auth";
import { Button } from "../../styles/catalyst/button";
import { Input } from "../../styles/catalyst/input";
import { Select } from "../../styles/catalyst/select";
import { Checkbox } from "../../styles/catalyst/checkbox";
import { Fieldset, Legend } from "../../styles/catalyst/fieldset";
import { Heading } from "../../styles/catalyst/heading";
import { Text } from "../../styles/catalyst/text";
import { Badge } from "../../styles/catalyst/badge";
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
  const [setAssignments, setSetAssignments] = useState([]);
  
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
  
  // Set Assignment States
  const [selectedSetAssignments, setSelectedSetAssignments] = useState([]);

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
      const [brandsRes, categoriesRes, statesRes, statusRes, intervalsRes, customerIdsRes, roomsRes, setAssignmentsRes] = await Promise.all([
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`),
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`),
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-states`),
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-status`),
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-test-intervals`),
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-customerids`),
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/rooms`),
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-assignments`)
      ]);

      const [brandsData, categoriesData, statesData, statusData, intervalsData, customerIdsData, roomsData, setAssignmentsData] = await Promise.all([
        brandsRes.json(),
        categoriesRes.json(),
        statesRes.json(),
        statusRes.json(),
        intervalsRes.json(),
        customerIdsRes.json(),
        roomsRes.json(),
        setAssignmentsRes.json()
      ]);

      setBrands(brandsData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
      setProductCategories(categoriesData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
      setProductStates(statesData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
      setProductStatus(statusData);
      setProductTestIntervals(intervalsData);
      setProductCustomerIds(customerIdsData);
      setRooms(roomsData.sort((a, b) => (a.name || "").localeCompare(b.name || "", "de", { sensitivity: "base" })));
      setSetAssignments(setAssignmentsData.sort((a, b) => (a.name?.de || a.name || "").localeCompare(b.name?.de || b.name || "", "de", { sensitivity: "base" })));
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
      const setRes = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`);
      if (!setRes.ok) {
        throw new Error("Set nicht gefunden");
      }
      const setData = await setRes.json();
      setOriginalSet(setData);

      // Set-Assignments initialisieren (von originalSet übernehmen)
      if (setData.set_assignment) {
        if (Array.isArray(setData.set_assignment)) {
          setSelectedSetAssignments(setData.set_assignment.map(sa => sa._id || sa));
        } else {
          setSelectedSetAssignments([setData.set_assignment._id || setData.set_assignment]);
        }
      }

      // Thumbnails laden
      await loadThumbnails(setData);

      // Neue Set-Nummer ermitteln
      const nextNumberRes = await authenticatedFetch(
        `${MAIN_VARIABLES.SERVER_URL}/api/sets/next-set-number?brand=${setData.manufacturer._id}&setName=${setData.set_name._id}&setRelation=${setData.set_relation._id}`
      );
      const nextNumberData = await nextNumberRes.json();
      setNewSetNumber(nextNumberData.nextSetNumber || 1);

      // Produkte des Sets laden
      const productsRes = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products?set=${setId}`);
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
      const allFilesRes = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data`);
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

  // Set-Assignment Handling
  function handleSetAssignmentChange(assignmentId) {
    // Finde das Assignment-Objekt
    const assignment = setAssignments.find(sa => sa._id === assignmentId);
    
    // Prüfe ob es "Freie Verfügbarkeit" ist (kein Assignment oder leer)
    const isFreieVerfügbarkeit = !assignment || (assignment.name?.de === "Freie Verfügbarkeit");
    
    if (isFreieVerfügbarkeit) {
      // Wenn "Freie Verfügbarkeit" ausgewählt wird, alle anderen deaktivieren
      setSelectedSetAssignments([]);
    } else {
      // Normale Assignment-Logik
      if (selectedSetAssignments.includes(assignmentId)) {
        // Assignment entfernen
        setSelectedSetAssignments(prev => prev.filter(id => id !== assignmentId));
      } else {
        // Assignment hinzufügen
        setSelectedSetAssignments(prev => [...prev, assignmentId]);
      }
    }
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
    
    // Sets können auch ohne Produkte erstellt werden
    if (editableProducts.length === 0) {
      return { errors, detailedErrors, isValid: true };
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
        set_number: newSetNumber,
        note_public: originalSet.note_public,
        note_private: originalSet.note_private,
        state: originalSet.state._id,
        insurance_value: originalSet.insurance_value,
        set_relation: originalSet.set_relation._id
      };

      // Set-Assignment nur hinzufügen wenn welche ausgewählt sind
      if (selectedSetAssignments.length > 0) {
        setData.set_assignment = JSON.stringify(selectedSetAssignments);
      }

      // Neues Set erstellen
      const formData = new FormData();
      Object.keys(setData).forEach(key => {
        formData.append(key, setData[key]);
      });

      const setResponse = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`, {
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
            
            await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/file-data/${selectedThumbnail}`, {
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
          
          const productResponse = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products`, {
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
        const setAssignmentInfo = selectedSetAssignments.length === 0 ? 
          "Freie Verfügbarkeit" : 
          selectedSetAssignments.map(id => {
            const assignment = setAssignments.find(sa => sa._id === id);
            return assignment ? (assignment.name?.de || assignment.name) : id;
          }).join(', ');
        
        if (editableProducts.length > 0) {
          setMessage(`Set erfolgreich kopiert! Neues Set: ${originalSet.manufacturer?.name} - ${originalSet.set_name?.name?.de} - Set ${newSetNumber}. Alle ${createdProducts} Produkte erfolgreich erstellt.\n\nSet-Zuordnung: ${setAssignmentInfo}`);
        } else {
          setMessage(`Set erfolgreich kopiert! Neues Set: ${originalSet.manufacturer?.name} - ${originalSet.set_name?.name?.de} - Set ${newSetNumber} (ohne Produkte).\n\nSet-Zuordnung: ${setAssignmentInfo}`);
        }
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
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Heading>Set wird geladen...</Heading>
          <Text className="text-gray-600 mt-2">Lade Set-Daten und zugehörige Produkte...</Text>
        </div>
      </div>
    );
  }

  if (!originalSet) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <Heading className="text-red-600">Fehler</Heading>
          <Text className="text-red-600 mt-2">{message || "Set nicht gefunden"}</Text>
          <Button className="mt-4" onClick={() => navigate("/sets")}>
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Heading className="text-center mb-8">Set Kopieren & Bearbeiten</Heading>

        {showPreview && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <Heading level={2} className="mb-6 pb-3 border-b-2 border-blue-500">
                📋 Neues Set
              </Heading>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">1</div>
                  <Text className="text-sm text-gray-600">Set wird erstellt</Text>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{editableProducts.filter(p => !p.isNew).length}</div>
                  <Text className="text-sm text-gray-600">Produkte kopiert</Text>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{editableProducts.filter(p => p.isNew).length}</div>
                  <Text className="text-sm text-gray-600">Neue Produkte</Text>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{newSetNumber}</div>
                  <Text className="text-sm text-gray-600">Neue Set-Nummer</Text>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <div>
                  <Text className="font-medium text-gray-600 text-sm">Hersteller</Text>
                  <Text className="text-gray-900">{originalSet.manufacturer?.name}</Text>
                </div>
                <div>
                  <Text className="font-medium text-gray-600 text-sm">Set-Bezeichnung</Text>
                  <Text className="text-gray-900">{originalSet.set_name?.name?.de}</Text>
                </div>
                <div>
                  <Text className="font-medium text-gray-600 text-sm">Set-Nummer</Text>
                  <Text className="text-gray-900">{newSetNumber}</Text>
                </div>
                <div>
                  <Text className="font-medium text-gray-600 text-sm">Kategorie</Text>
                  <Text className="text-gray-900">{originalSet.category?.name?.de}</Text>
                </div>
                <div className="md:col-span-2">
                  <Text className="font-medium text-gray-600 text-sm">Set-Zuordnung</Text>
                  <Text className="text-gray-900">
                    {selectedSetAssignments.length === 0 ? (
                      <span className="italic text-gray-500">Freie Verfügbarkeit</span>
                    ) : (
                      selectedSetAssignments.map(assignmentId => {
                        const assignment = setAssignments.find(sa => sa._id === assignmentId);
                        return assignment ? (assignment.name?.de || assignment.name) : assignmentId;
                      }).join(', ')
                    )}
                  </Text>
                </div>
              </div>

              {/* Set-Assignment Auswahl */}
              <div className="mt-6">
                <Heading level={3} className="mb-4">🎯 Set-Zuordnung bearbeiten</Heading>
                <Fieldset className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="mb-4">
                    <label className={`flex items-center gap-3 cursor-pointer p-3 rounded-md transition-colors ${
                      selectedSetAssignments.length === 0 
                        ? "bg-blue-50 border-2 border-blue-500" 
                        : "bg-white border border-gray-300 hover:bg-gray-50"
                    }`}>
                      <Checkbox
                        checked={selectedSetAssignments.length === 0}
                        onChange={() => setSelectedSetAssignments([])}
                      />
                      <div className="flex-1">
                        <Text className="font-medium">Freie Verfügbarkeit</Text>
                        <Text className="text-sm text-gray-500">(für alle Benutzer sichtbar)</Text>
                      </div>
                    </label>
                  </div>
                  
                  {setAssignments.length > 0 && (
                    <div>
                      <Text className="mb-2 font-medium text-gray-700">
                        Oder spezifische Zuordnungen wählen:
                      </Text>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-md bg-white">
                        {setAssignments.map(assignment => (
                          <label
                            key={assignment._id}
                            className={`flex items-center gap-2 cursor-pointer p-2 rounded-md text-sm transition-colors ${
                              selectedSetAssignments.includes(assignment._id)
                                ? "bg-blue-50 border border-blue-500"
                                : "hover:bg-gray-50"
                            }`}
                          >
                            <Checkbox
                              checked={selectedSetAssignments.includes(assignment._id)}
                              onChange={() => handleSetAssignmentChange(assignment._id)}
                            />
                            <Text className="text-sm">{assignment.name?.de || assignment.name}</Text>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <Text className="mt-3 text-xs text-gray-500 italic">
                    💡 Sets mit "Freie Verfügbarkeit" sind für alle Benutzer sichtbar. 
                    Sets mit spezifischen Zuordnungen sind nur für Benutzer mit entsprechenden Berechtigung sichtbar.
                  </Text>
                </Fieldset>
              </div>

              {/* Thumbnail-Auswahl */}
              <div className="mt-6">
                <Heading level={3} className="mb-4">📷 Thumbnail auswählen</Heading>
                {currentThumbnail && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 flex items-center gap-3">
                    <img 
                      src={`${MAIN_VARIABLES.SERVER_URL}/api/file-data/by-filename/${encodeURIComponent(currentThumbnail.filePath)}`}
                      alt="Aktuelles Thumbnail"
                      className="w-10 h-10 object-cover rounded border border-gray-300"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    <div>
                      <Text className="font-medium">Aktuelles Thumbnail:</Text>
                      <Text className="text-sm text-gray-600">{currentThumbnail.filePath?.split('/').pop()}</Text>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-72 overflow-y-auto">
                  <div 
                    onClick={() => setSelectedThumbnail(null)}
                    className={`${
                      selectedThumbnail === null ? "border-4 border-blue-500" : "border-2 border-gray-300"
                    } rounded-lg p-2 text-center cursor-pointer bg-gray-50 flex flex-col items-center justify-center min-h-24 hover:bg-gray-100 transition-colors`}
                  >
                    <div className="text-2xl mb-1">🚫</div>
                    <Text className="text-xs text-gray-600">Kein Thumbnail</Text>
                  </div>
                  {getMatchingThumbnails().map(thumbnail => (
                    <div 
                      key={thumbnail._id}
                      onClick={() => setSelectedThumbnail(thumbnail._id)}
                      className={`${
                        selectedThumbnail === thumbnail._id ? "border-4 border-blue-500" : "border-2 border-gray-300"
                      } rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md`}
                    >
                      <img 
                        src={`${MAIN_VARIABLES.SERVER_URL}/api/file-data/by-filename/${encodeURIComponent(thumbnail.filePath)}`}
                        alt="Thumbnail"
                        className="w-full h-20 object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      <div className="hidden items-center justify-center h-20 bg-gray-50 text-2xl">
                        📷
                      </div>
                      <div className={`p-1 text-xs text-center ${
                        selectedThumbnail === thumbnail._id ? "bg-blue-500 text-white" : "bg-white text-gray-700"
                      }`}>
                        {thumbnail.filePath?.split('/').pop()?.substring(0, 15) || 'Thumbnail'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <Heading level={2} className="mb-6 pb-3 border-b-2 border-blue-500">🔧 Produkte bearbeiten</Heading>
              <Text className="text-gray-600 mb-4">
                Bearbeiten Sie die Produktdaten vor dem Kopieren. Felder mit <span className="text-red-500">*</span> sind Pflichtfelder.
              </Text>
              
              {/* Validation Summary */}
              {editableProducts.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 flex justify-between items-center">
                  <div>
                    <Text className="font-medium">Validierungsstatus: </Text>
                    {Object.values(productValidationErrors).filter(errors => errors && errors.length > 0).length > 0 ? (
                      <Badge color="red" className="ml-2">
                        ⚠️ {Object.values(productValidationErrors).filter(errors => errors && errors.length > 0).length} Produkt(e) unvollständig
                      </Badge>
                    ) : (
                      <Badge color="green" className="ml-2">
                        ✅ Alle Produkte vollständig
                      </Badge>
                    )}
                  </div>
                  <Text className="text-sm text-gray-600">
                    {editableProducts.length} Produkt(e) gesamt
                  </Text>
                </div>
              )}
              
              <div className="mb-6 text-center">
                <Button 
                  color="green"
                  onClick={addNewProduct}
                  type="button"
                >
                  ➕ Zusätzliches Produkt hinzufügen
                </Button>
              </div>
              
              {editableProducts.map((product, index) => (
                <div 
                  key={product.id} 
                  className="border border-gray-200 rounded-lg p-6 mb-6 bg-white"
                  data-product-index={index}
                >
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                      <Heading level={3} className="m-0">
                        {product.isNew ? "🆕 Neues Produkt" : `Produkt ${index + 1}`}
                      </Heading>
                      {productValidationErrors[product.id] && productValidationErrors[product.id].length > 0 ? (
                        <Badge 
                          color="red"
                          title={`Fehlende Felder: ${productValidationErrors[product.id].join(', ')}`}
                        >
                          ⚠️ {productValidationErrors[product.id].length} Fehler
                        </Badge>
                      ) : (
                        <Badge color="green">
                          ✅ Vollständig
                        </Badge>
                      )}
                    </div>
                    {product.isNew && (
                      <Button
                        color="red"
                        onClick={() => removeProduct(product.id)}
                        title="Produkt entfernen"
                      >
                        🗑️ Entfernen
                      </Button>
                    )}
                  </div>
                  
                  {/* Grundlegende Informationen Sektion */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                      Grundlegende Informationen
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Hersteller <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={product.Manufacturer}
                          onChange={(e) => updateProduct(product.id, 'Manufacturer', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                        >
                          <option value="">-- Bitte wählen --</option>
                          {brands.map(brand => (
                            <option key={brand._id} value={brand._id}>{brand.name}</option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Typ <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={product.Type}
                          onChange={(e) => updateProduct(product.id, 'Type', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                          onKeyUp={() => checkProductValidation(product.id)}
                          placeholder="Produkttyp"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Bezeichnung <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={product.Designation}
                          onChange={(e) => updateProduct(product.id, 'Designation', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                        >
                          <option value="">-- Bitte wählen --</option>
                          {productCategories.map(cat => (
                            <option key={cat._id} value={cat._id}>{cat.name}</option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Seriennummer</label>
                        <Input
                          type="text"
                          value={product.SerialNumber}
                          onChange={(e) => updateProduct(product.id, 'SerialNumber', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                          onKeyUp={() => checkProductValidation(product.id)}
                          placeholder="Seriennummer"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Kostenstelle <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="text"
                          value={product.CostCenter}
                          onChange={(e) => updateProduct(product.id, 'CostCenter', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                          onKeyUp={() => checkProductValidation(product.id)}
                          placeholder="Kostenstelle"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Bereich <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={product.Department}
                          onChange={(e) => updateProduct(product.id, 'Department', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                        >
                          <option value="">-- Bitte wählen --</option>
                          {rooms.map(room => (
                            <option key={room._id} value={room._id}>{room.name}</option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Gerätekonfiguration Sektion */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                      Gerätekonfiguration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Gerätetyp</label>
                        <p className="text-sm text-gray-600 mb-2">Vorgegebener Standardwert</p>
                        <Select
                          value="Normal"
                          disabled
                          className="bg-gray-100 text-gray-600"
                        >
                          <option value="Normal">Normal</option>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Status <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={product.state}
                          onChange={(e) => updateProduct(product.id, 'state', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                        >
                          <option value="">-- Bitte wählen --</option>
                          {productStates.map(state => (
                            <option key={state._id} value={state._id}>{state.name}</option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          Aktiv <span className="text-red-500">*</span>
                        </label>
                        <Select
                          value={product.IsActive}
                          onChange={(e) => updateProductWithDependencies(product.id, 'IsActive', e.target.value === 'true')}
                          onBlur={() => checkProductValidation(product.id)}
                        >
                          <option value="">-- Bitte wählen --</option>
                          <option value="true">Ja</option>
                          <option value="false">Nein</option>
                        </Select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-2">Inventarisierung?</label>
                        <Select
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
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Elektrische Prüfung Sektion */}
                  {product.IsActive && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                        Elektrische Prüfung
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Prüfintervall (Monate) <span className="text-red-500">*</span>
                          </label>
                          <Select
                            value={product.TestingInterval}
                            onChange={(e) => updateProduct(product.id, 'TestingInterval', parseInt(e.target.value))}
                            onBlur={() => checkProductValidation(product.id)}
                          >
                            <option value="">-- Bitte wählen --</option>
                            {productTestIntervals.map(interval => (
                              <option key={interval._id} value={interval.duration}>{interval.duration}</option>
                            ))}
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            ID (Elektrische Prüfung) <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="text"
                            value={product.ID}
                            onChange={(e) => updateProduct(product.id, 'ID', e.target.value)}
                            onBlur={() => checkProductValidation(product.id)}
                            onKeyUp={() => checkProductValidation(product.id)}
                            placeholder="Produkt-ID"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">Letzte elektrische Prüfung</label>
                          <Input
                            type="date"
                            value={product.LastTestingDate ? product.LastTestingDate.slice(0, 10) : ''}
                            onChange={(e) => updateProduct(product.id, 'LastTestingDate', e.target.value)}
                            onBlur={() => checkProductValidation(product.id)}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Inventarisierung Sektion */}
                  {product.showInventarisierung === 'ja' && (
                    <div className="bg-gray-50 rounded-lg p-6 border border-gray-200 mb-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                        Inventarisierung
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            Bereichsnummer <span className="text-red-500">*</span>
                          </label>
                          <Select
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
                          </Select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-900 mb-2">
                            IVS-Nummer <span className="text-red-500">*</span>
                          </label>
                          <Input
                            type="number"
                            value={product.Various_1}
                            onChange={(e) => updateProduct(product.id, 'Various_1', parseInt(e.target.value) || 0)}
                            onBlur={() => checkProductValidation(product.id)}
                            onKeyUp={() => checkProductValidation(product.id)}
                            placeholder="IVS-Nummer"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Zusätzliche Informationen Sektion */}
                  <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">5</span>
                      Zusätzliche Informationen
                    </h2>
                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Anmerkung</label>
                        <p className="text-sm text-gray-600 mb-2">Für den internen Gebrauch</p>
                        <Input
                          type="text"
                          value={product.Remark}
                          onChange={(e) => updateProduct(product.id, 'Remark', e.target.value)}
                          onBlur={() => checkProductValidation(product.id)}
                          onKeyUp={() => checkProductValidation(product.id)}
                          placeholder="Anmerkung"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {message && (
          <div className={`text-center text-lg p-4 rounded-lg font-medium whitespace-pre-line mb-6 ${
            messageColor === 'orange' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' :
            messageColor === 'red' ? 'bg-red-50 text-red-800 border border-red-200' :
            messageColor === 'green' ? 'bg-green-50 text-green-800 border border-green-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {message}
          </div>
        )}

        <div className="flex gap-4 justify-center mt-8">
          {showPreview ? (
            <>
              <Button 
                color="zinc"
                onClick={() => navigate("/sets")}
                disabled={copying}
              >
                Abbrechen
              </Button>
              <Button 
                color="blue"
                onClick={executeCopy}
                disabled={copying}
              >
                {copying ? "Kopiere..." : editableProducts.length > 0 ? `Set mit ${editableProducts.length} Produkt(en) erstellen` : "Set ohne Produkte erstellen"}
              </Button>
            </>
          ) : (
            <Button 
              color="blue"
              onClick={() => navigate("/sets")}
            >
              Zur Sets-Übersicht
            </Button>
          )}
        </div>
      </div>
  );
}
