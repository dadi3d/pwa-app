import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { MAIN_VARIABLES } from "../config";
import { useAuth, fetchUserData } from "./services/auth";
import { Button } from '../styles/catalyst/button';
import { Input } from '../styles/catalyst/input';
import { Textarea } from '../styles/catalyst/textarea';
import { Dialog, DialogTitle, DialogBody, DialogActions } from "../styles/catalyst/dialog";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from "../styles/catalyst/dropdown";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { Calendar } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/index.css';

export default function AuftragAnlegen() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  // Original states
  const [sets, setSets] = useState([]);
  const [allSets, setAllSets] = useState([]); // Alle Sets für die Set-Anzahl-Berechnung
  const [thumbnailUrls, setThumbnailUrls] = useState({}); // Thumbnail-URLs für Sets
  const [orderTypes, setOrderTypes] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [settings, setSettings] = useState(null);
  const [message, setMessage] = useState("");
  const calendarRef = useRef(null);
  
  // Neue states für Verfügbarkeitsprüfung
  const [availability, setAvailability] = useState({});
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [unavailableSets, setUnavailableSets] = useState([]);
  const [showSetSelection, setShowSetSelection] = useState(false); // Für Set-Auswahl Popup
  const [showSetDetails, setShowSetDetails] = useState(false);
  const [selectedSetDetails, setSelectedSetDetails] = useState(null);
  const [singleProducts, setSingleProducts] = useState([]);
  
  // Such- und Filterstates für Set-Auswahl
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Original Form State
  const [form, setForm] = useState({
    name: "",
    rent_start: "",
    rent_end: "",
    type: "",
    assigned_teacher: "",
    location: "",
    phone: "",
    sets: [],
    notes: "",
  });

  // Selected Date Range für Kalender
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: null,
    end: null,
  });

  // Calendar Mode State für drei-stufigen Auswahlprozess
  const [calendarMode, setCalendarMode] = useState('issue'); // 'issue', 'return', oder 'display'

  // API Funktionen für Verfügbarkeitsprüfung
  const checkAvailability = async (startDate, endDate) => {
    if (!startDate || !endDate) {
      setAvailability({});
      setUnavailableSets([]);
      return;
    }

    setLoadingAvailability(true);
    try {
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orders/check-availability`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rent_start: startDate,
          rent_end: endDate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setAvailability(data);
        const newUnavailableSets = data.unavailable_sets || [];
        setUnavailableSets(newUnavailableSets);
        
        // Nicht verfügbare Sets aus der aktuellen Auswahl entfernen
        setForm(prev => ({
          ...prev,
          sets: prev.sets.filter(setId => !newUnavailableSets.includes(setId))
        }));
      }
    } catch (error) {
      console.error('Fehler beim Prüfen der Verfügbarkeit:', error);
      setAvailability({});
      setUnavailableSets([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const fetchSingleProducts = async (setId) => {
    try {
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products?set=${setId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSingleProducts(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einzelprodukte:', error);
    }
  };

  const openSetDetails = (set) => {
    setSelectedSetDetails(set);
    fetchSingleProducts(set._id);
    setShowSetDetails(true);
  };

  const closeSetDetails = () => {
    setShowSetDetails(false);
    setSelectedSetDetails(null);
    setSingleProducts([]);
  };

  // Warenkorb-ähnliche Funktionen für Sets
  const openSetSelection = () => {
    setShowSetSelection(true);
  };

  const closeSetSelection = () => {
    setShowSetSelection(false);
  };

  const addSetToSelection = (setId) => {
    setForm((f) => ({
      ...f,
      sets: [...f.sets, setId],
    }));
  };

  const removeSetFromSelection = (setId) => {
    setForm((f) => ({
      ...f,
      sets: f.sets.filter((id) => id !== setId),
    }));
  };

  const toggleSetSelection = (setId) => {
    if (form.sets.includes(setId)) {
      removeSetFromSelection(setId);
    } else {
      addSetToSelection(setId);
    }
  };

  // Anzahl der ausgewählten Sets einer bestimmten Art
  const getSelectedCountForSetType = (manufacturer, setName) => {
    const allSetsOfThisType = allSets.filter(s => 
      s.manufacturer?.name === manufacturer && 
      s.set_name?.name?.de === setName
    );
    
    return allSetsOfThisType.filter(s => form.sets.includes(s._id)).length;
  };

  // Nächstes verfügbares Set einer Art finden
  const getNextAvailableSetOfType = (manufacturer, setName) => {
    const allSetsOfThisType = allSets.filter(s => 
      s.manufacturer?.name === manufacturer && 
      s.set_name?.name?.de === setName
    );
    
    const availableSetsOfThisType = allSetsOfThisType.filter(s => 
      !unavailableSets.includes(s._id) && !form.sets.includes(s._id)
    );
    
    return availableSetsOfThisType[0] || null;
  };

  // Set-Typ Auswahl (kann mehrere Sets derselben Art auswählen)
  const toggleSetTypeSelection = (manufacturer, setName) => {
    // Alle Sets dieser Kombination finden
    const allSetsOfThisType = allSets.filter(s => 
      s.manufacturer?.name === manufacturer && 
      s.set_name?.name?.de === setName
    );
    
    // Verfügbare Sets berechnen
    const availableSetsOfThisType = allSetsOfThisType.filter(s => 
      !unavailableSets.includes(s._id)
    );
    
    // Bereits ausgewählte Sets dieser Art
    const selectedSetsOfThisType = allSetsOfThisType.filter(s => 
      form.sets.includes(s._id)
    );
    
    // Wenn bereits Sets dieser Art ausgewählt sind, das nächste verfügbare hinzufügen
    // oder wenn alle ausgewählt sind, alle entfernen
    if (selectedSetsOfThisType.length > 0) {
      if (selectedSetsOfThisType.length === availableSetsOfThisType.length) {
        // Alle Sets dieser Art entfernen
        setForm(prev => ({
          ...prev,
          sets: prev.sets.filter(id => !allSetsOfThisType.map(s => s._id).includes(id))
        }));
      } else {
        // Nächstes verfügbares Set hinzufügen
        const nextSet = getNextAvailableSetOfType(manufacturer, setName);
        if (nextSet) {
          setForm(prev => ({
            ...prev,
            sets: [...prev.sets, nextSet._id]
          }));
        }
      }
    } else {
      // Erstes verfügbares Set hinzufügen
      if (availableSetsOfThisType.length > 0) {
        setForm(prev => ({
          ...prev,
          sets: [...prev.sets, availableSetsOfThisType[0]._id]
        }));
      }
    }
  };

  useEffect(() => {
    // Sets laden - nur verfügbare Sets (ohne Status "nicht verfügbar")
    const loadData = async () => {
      try {
        // Sets laden
        const setsRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/available`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const setsData = await setsRes.json();
        
        // Alle verfügbaren Sets für Set-Anzahl-Berechnung speichern
        setAllSets(setsData);
        // Nur Sets mit Nummer 1 für die Anzeige filtern
        const filteredSets = setsData.filter(set => set.set_number === 1);
        setSets(filteredSets);
        
        // Thumbnail-URLs für alle Sets laden
        const thumbnails = {};
        for (const set of filteredSets) {
          try {
            const thumbnailRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${set._id}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            const thumbnailData = await thumbnailRes.json();
            thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}${thumbnailData.path}`;
          } catch (err) {
            console.error(`Fehler beim Laden des Thumbnails für Set ${set._id}:`, err);
            thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
          }
        }
        setThumbnailUrls(thumbnails);

        // Order Types laden
        const orderTypesRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/orderTypes`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const orderTypesData = await orderTypesRes.json();
        setOrderTypes(orderTypesData);

        // Teachers laden
        const teachersRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/users?role=teacher`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const teachersData = await teachersRes.json();
        setTeachers(teachersData);

        // Einstellungen abrufen und speichern
        const settingsRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
        console.log("Settings:", settingsData);
      } catch (error) {
        console.error('Fehler beim Laden der Daten:', error);
      }
    };
    
    loadData();
  }, []);

  // Verfügbarkeitsprüfung bei Datumsänderung
  useEffect(() => {
    setUnavailableSets([]);
    
    // Automatisch Verfügbarkeit prüfen wenn vollständiger Zeitraum ausgewählt
    if (selectedDateRange.start && selectedDateRange.end) {
      checkAvailability(selectedDateRange.start, selectedDateRange.end);
    }
  }, [selectedDateRange.start, selectedDateRange.end]);

  // Legacy: Verfügbarkeitsprüfung bei Form-Datumsänderung (für bestehende Logik)
  useEffect(() => {
    if (form.rent_start && form.rent_end) {
      checkAvailability(form.rent_start, form.rent_end);
    }
  }, [form.rent_start, form.rent_end]);

  // Kalender initialisieren NACH dem vollständigen Laden aller Daten
  useEffect(() => {
    // Warten bis alle Daten geladen sind und DOM bereit ist
    const initializeCalendar = () => {
      if (calendarRef.current && sets.length > 0) {
        const options = {
          // Grundkonfiguration für deutschen Kalender
          locale: 'de',
          firstWeekday: 1, // Montag als erster Wochentag
          // Format für Datumsanzeige
          dateFormat: 'dd.mm.yyyy',
          // Styling
          theme: 'light',
          // Auswahl-Modus: Single für ersten Schritt, Range für zweiten Schritt, Multiple-Ranged für Anzeige
          selectionDatesMode: calendarMode === 'issue' ? 'single' : 'multiple-ranged',
          // Deaktiviere Wochentage basierend auf aktuellem Modus
          disableWeekdays: calendarMode === 'display' ? [] : getDisabledWeekdays(),
          // Deaktiviere spezifische Daten (für Rückgabe-Modus)
          disableDates: calendarMode === 'return' ? getDisabledDatesForReturn() : 
                       calendarMode === 'display' ? [] : [],
          // Vorausgewählte Daten für Display-Modus
          ...(calendarMode === 'display' && selectedDateRange.start && selectedDateRange.end ? {
            selectedDates: [selectedDateRange.start, selectedDateRange.end]
          } : {}),
          // Range-Einstellungen
          range: {
            disablePast: true, // Verhindert Auswahl vergangener Daten
            min: calendarMode === 'return' && selectedDateRange.start 
              ? new Date(new Date(selectedDateRange.start).getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Nach Startdatum
              : new Date().toISOString().split('T')[0], // Frühestes Datum (heute)
            max: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0] // 1 Jahr in die Zukunft
          },
          // Event-Handler für Datums-Auswahl - Zwei-Stufen-Prozess
          onClickDate(self) {
            const selectedDates = self.context.selectedDates || [];
            
            if (calendarMode === 'issue') {
              // Erster Schritt: Ausleihdatum wählen
              if (selectedDates && selectedDates.length === 1) {
                const issueDate = selectedDates[0];
                
                // Validierung: Muss ein erlaubter Ausleihtag sein
                const allowedIssueDays = getEnabledDays(settings?.issue);
                if (settings && !allowedIssueDays.includes(getWeekday(issueDate))) {
                  setMessage(
                    "Das gewählte Ausleihdatum ist kein erlaubter Ausleihtag (" +
                      allowedIssueDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") +
                      ")."
                  );
                  return;
                }
                
                // Ausleihdatum setzen und zum nächsten Schritt wechseln
                setSelectedDateRange({
                  start: issueDate,
                  end: null
                });
                
                setForm(f => ({
                  ...f,
                  rent_start: issueDate,
                  rent_end: ""
                }));
                
                // Wechsel zu Rückgabe-Modus
                setCalendarMode('return');
                setMessage("Ausleihdatum gewählt. Wählen Sie nun das Rückgabedatum.");
              }
            } else if (calendarMode === 'return') {
              // Zweiter Schritt: Rückgabedatum wählen
              if (selectedDates && selectedDates.length >= 1) {
                // Bei Range-Auswahl: nehme das letzte ausgewählte Datum als Rückgabedatum
                const returnDate = selectedDates[selectedDates.length - 1];
                
                // Validierung: Muss ein erlaubter Rückgabetag sein
                const allowedReturnDays = getEnabledDays(settings?.return);
                if (settings && !allowedReturnDays.includes(getWeekday(returnDate))) {
                  setMessage(
                    "Das gewählte Rückgabedatum ist kein erlaubter Rückgabetag (" +
                      allowedReturnDays.map((d) => d.charAt(0).toUpperCase() + d.slice(1)).join(", ") +
                      ")."
                  );
                  return;
                }
                
                // Validierung: Rückgabedatum muss nach Ausleihdatum liegen
                if (selectedDateRange.start && new Date(returnDate) <= new Date(selectedDateRange.start)) {
                  setMessage("Das Rückgabedatum muss nach dem Ausleihdatum liegen.");
                  return;
                }
                
                // Validierung: Maximale Ausleihdauer prüfen
                if (settings?.maxLoanDuration && selectedDateRange.start) {
                  const start = new Date(selectedDateRange.start);
                  const end = new Date(returnDate);
                  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                  if (diffDays > settings.maxLoanDuration) {
                    setMessage(
                      `Die maximale Ausleihdauer von ${settings.maxLoanDuration} Tagen wird überschritten. ` +
                      `Gewählte Dauer: ${diffDays} Tage.`
                    );
                    return;
                  }
                }
                
                // Rückgabedatum setzen und zur Anzeige wechseln
                setSelectedDateRange({
                  start: selectedDateRange.start,
                  end: returnDate
                });
                
                setForm(f => ({
                  ...f,
                  rent_end: returnDate
                }));
                
                // Wechsel zu Display-Modus um den gewählten Zeitraum anzuzeigen
                setCalendarMode('display');
                setMessage("Zeitraum erfolgreich gewählt! Sie können die Auswahl bei Bedarf zurücksetzen.");
              }
            } else if (calendarMode === 'display') {
              // Dritter Schritt: Anzeige des gewählten Zeitraums
              // In diesem Modus sind keine weiteren Änderungen erlaubt
              // Der Benutzer kann nur über den Reset-Button eine neue Auswahl starten
            }
          },
          // Callback nach Kalender-Initialisierung
          onInit(self) {
            // Wenn wir im Display-Modus sind, setze die gewählten Daten
            if (calendarMode === 'display' && selectedDateRange.start && selectedDateRange.end) {
              self.context.selectedDates = [selectedDateRange.start, selectedDateRange.end];
              self.update();
            }
          }
        };

        const calendar = new Calendar(calendarRef.current, options);
        calendar.init();
        
        // Cleanup function
        return () => {
          if (calendar) {
            calendar.destroy();
          }
        };
      }
    };

    // Kleiner Delay um sicherzustellen, dass alles vollständig geladen ist
    const timer = setTimeout(initializeCalendar, 100);
    
    return () => {
      clearTimeout(timer);
    };
  }, [sets, orderTypes, teachers, settings, calendarMode, selectedDateRange.start]); // Abhängig von den geladenen Daten und Modus

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

  // Funktion zum Zurücksetzen der Datumsauswahl
  function resetDateSelection() {
    setCalendarMode('issue');
    setSelectedDateRange({
      start: null,
      end: null
    });
    setForm(f => ({
      ...f,
      rent_start: "",
      rent_end: ""
    }));
    setMessage("");
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

  // Hilfsfunktion: Berechne welche Wochentage deaktiviert werden sollen basierend auf Modus
  function getDisabledWeekdays() {
    if (!settings) return [];
    
    // Mapping von Wochentag-Namen zu Zahlen (0 = Sonntag, 1 = Montag, etc.)
    const dayMap = {
      "sunday": 0,
      "monday": 1,
      "tuesday": 2,
      "wednesday": 3,
      "thursday": 4,
      "friday": 5,
      "saturday": 6,
    };
    
    // Alle Wochentage (0-6)
    const allWeekdays = [0, 1, 2, 3, 4, 5, 6];
    
    let allowedDays = [];
    
    if (calendarMode === 'issue') {
      // Nur Ausleihtage erlauben
      allowedDays = getEnabledDays(settings.issue);
    } else if (calendarMode === 'return') {
      // Nur Rückgabetage erlauben
      allowedDays = getEnabledDays(settings.return);
    }
    
    // Erlaubte Tage in Zahlen umwandeln
    const allowedWeekdayNumbers = allowedDays.map(day => dayMap[day]).filter(num => num !== undefined);
    
    // Deaktivierte Tage = Alle Tage minus erlaubte Tage
    const disabledWeekdays = allWeekdays.filter(day => !allowedWeekdayNumbers.includes(day));
    
    return disabledWeekdays;
  }

  // Hilfsfunktion: Berechne erlaubte Enddaten basierend auf Startdatum und maximaler Ausleihdauer
  function getDisabledDatesForReturn() {
    if (!selectedDateRange.start || !settings || !settings.maxLoanDuration) return [];
    
    const startDate = new Date(selectedDateRange.start);
    const maxEndDate = new Date(startDate);
    maxEndDate.setDate(maxEndDate.getDate() + settings.maxLoanDuration - 1);
    
    const disabledDates = [];
    const currentDate = new Date();
    currentDate.setFullYear(currentDate.getFullYear() + 1); // Ein Jahr in die Zukunft
    
    // Alle Daten nach dem maximalen Enddatum deaktivieren
    let checkDate = new Date(maxEndDate);
    checkDate.setDate(checkDate.getDate() + 1);
    
    while (checkDate <= currentDate) {
      disabledDates.push(checkDate.toISOString().split('T')[0]);
      checkDate.setDate(checkDate.getDate() + 1);
    }
    
    return disabledDates;
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

  // Gefilterte Sets basierend auf Suchbegriff und Kategorie
  const filteredSets = sets.filter((set) => {
    // Kategorie-Filter
    if (selectedCategory && set.category?.name?.de !== selectedCategory) {
      return false;
    }
    
    // Suchbegriff-Filter
    if (!searchTerm) return true;
    
    const manufacturer = (set.manufacturer?.name || "").toLowerCase();
    const setName = (set.set_name?.name?.de || "").toLowerCase();
    
    // Suchbegriff in einzelne Wörter aufteilen
    const searchWords = searchTerm.toLowerCase().trim().split(/\s+/);
    
    // Jedes Wort muss in mindestens einem der Felder (manufacturer oder setName) gefunden werden
    return searchWords.every(word => 
      manufacturer.includes(word) || setName.includes(word)
    );
  });

  // Verfügbare Kategorien aus den Sets extrahieren
  const availableCategories = [...new Set(
    sets
      .map(set => set.category?.name?.de)
      .filter(category => category) // Nur nicht-leere Kategorien
  )].sort();

  return (
    <>
      <h1 className="text-center text-3xl font-semibold text-gray-800 mb-8">Neuen Auftrag anlegen</h1>
      
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="p-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name/Titel */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Name/Titel:</label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Geben Sie einen Namen oder Titel ein"
                />
              </div>

              {/* Lehrkraft zuweisen */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Lehrkraft zuweisen:</label>
                <select
                  name="assigned_teacher"
                  value={form.assigned_teacher}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Bitte wählen</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name || t.id} {t.email ? `(${t.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Zeitraum */}
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Zeitraum auswählen:</label>

                {/* Kalender */}
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  
                  
                  {/* Ausgewählter Zeitraum anzeigen */}
                  {(selectedDateRange.start || selectedDateRange.end) && (
                    <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <h4 className="font-medium text-orange-800 mb-2">Ausgewählter Zeitraum:</h4>
                      {selectedDateRange.start && selectedDateRange.end ? (
                        <div>
                          <p className="text-green-700 mb-2">
                            <strong>Von:</strong> {new Date(selectedDateRange.start).toLocaleDateString('de-DE')} 
                            <span className="mx-2">→</span>
                            <strong>Bis:</strong> {new Date(selectedDateRange.end).toLocaleDateString('de-DE')}
                            <span className="ml-3 text-sm">
                              ({Math.ceil((new Date(selectedDateRange.end) - new Date(selectedDateRange.start)) / (1000 * 60 * 60 * 24)) + 1} Tage)
                            </span>
                          </p>
                          <button 
                            type="button"
                            onClick={resetDateSelection}
                            className="text-sm text-orange-600 hover:text-orange-800 underline"
                          >
                            Neue Auswahl starten
                          </button>
                        </div>
                      ) : selectedDateRange.start ? (
                        <div>
                          <p className="text-orange-700 mb-2">
                            <strong>Ausleihdatum:</strong> {new Date(selectedDateRange.start).toLocaleDateString('de-DE')}
                          </p>
                          <button 
                            type="button"
                            onClick={resetDateSelection}
                            className="text-sm text-orange-600 hover:text-orange-800 underline"
                          >
                            Ausleihdatum ändern
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                  
                  {/* Modus-Anzeige */}
                  <div className={`mb-4 p-3 rounded-lg border-2 ${
                    calendarMode === 'issue' 
                      ? 'bg-blue-50 border-blue-200' 
                      : calendarMode === 'return'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-purple-50 border-purple-200'
                  }`}>
                    <div className="text-center">
                      <h3 className={`font-semibold ${
                        calendarMode === 'issue' 
                          ? 'text-blue-800' 
                          : calendarMode === 'return'
                          ? 'text-green-800'
                          : 'text-purple-800'
                      }`}>
                        {calendarMode === 'issue' 
                          ? 'Schritt 1: Ausleihdatum wählen' 
                          : calendarMode === 'return'
                          ? 'Schritt 2: Rückgabedatum wählen'
                          : 'Gewählter Zeitraum'
                        }
                      </h3>
                      <p className={`text-sm mt-1 ${
                        calendarMode === 'issue' 
                          ? 'text-blue-600' 
                          : calendarMode === 'return'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}>
                        {calendarMode === 'issue'
                          ? 'Klicken Sie auf einen erlaubten Ausleihtag'
                          : calendarMode === 'return'
                          ? 'Klicken Sie auf einen erlaubten Rückgabetag'
                          : 'Ihr gewählter Ausleihzeitraum wird im Kalender angezeigt'
                        }
                      </p>
                    </div>
                  </div>
                  
                  <div 
                    ref={calendarRef}
                    className="vanilla-calendar vanilla-calendar--default max-w-md mx-auto"
                    style={{ minHeight: '300px' }}
                  ></div>
                  
                  {/* Hinweistext */}
                  <div className="mt-4 text-sm text-gray-600 text-center">
                    {calendarMode === 'issue' ? (
                      <p>Nur erlaubte Ausleihtage sind auswählbar. Nach der Auswahl wechselt der Kalender automatisch zur Rückgabe-Auswahl.</p>
                    ) : calendarMode === 'return' ? (
                      <p>Nur erlaubte Rückgabetage sind auswählbar. Die maximale Ausleihdauer wird berücksichtigt.</p>
                    ) : (
                      <p>Der gewählte Zeitraum wird im Kalender hervorgehoben angezeigt. Nutzen Sie "Neue Auswahl starten" um den Zeitraum zu ändern.</p>
                    )}
                  </div>

                  {/* Settings Info */}
                  {settings && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-xs text-gray-600 space-y-1">
                        <div><strong>Maximale Ausleihdauer:</strong> {settings.maxLoanDuration} Tage</div>
                        <div>
                          <strong>Erlaubte Ausleihtage:</strong>{" "}
                          {getEnabledDays(settings.issue)
                            .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                            .join(", ")}
                        </div>
                        <div>
                          <strong>Erlaubte Rückgabetage:</strong>{" "}
                          {getEnabledDays(settings.return)
                            .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                            .join(", ")}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Typ */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Typ:</label>
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Bitte wählen</option>
                  {orderTypes.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name?.de || t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sets - Kompakte Anzeige mit Toggle */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Sets:
                  {loadingAvailability && (
                    <span className="ml-2 text-orange-600">
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                    </span>
                  )}
                </label>
                
                {!selectedDateRange.start || !selectedDateRange.end ? (
                  <div className="text-center py-4 text-gray-500 border border-gray-300 rounded-md">
                    <p>Bitte wählen Sie zuerst einen Zeitraum aus, um Sets auszuwählen.</p>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                    {/* Ausgewählte Sets anzeigen */}
                    {form.sets.length > 0 ? (
                      <div className="text-center py-4">
                        <p className="text-lg font-medium text-orange-600">
                          {form.sets.length} Set{form.sets.length !== 1 ? 's' : ''} ausgewählt
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <p>Keine Sets ausgewählt</p>
                      </div>
                    )}
                    
                    {/* Toggle Button für Set-Auswahl */}
                    <div className="text-center">
                      <Button
                        type="button"
                        onClick={openSetSelection}
                        outline
                        className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200"
                      >
                        {form.sets.length > 0 ? "Sets bearbeiten" : "Sets auswählen"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Ort */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Ort:</label>
                <Input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  required
                  placeholder="Veranstaltungsort eingeben"
                />
              </div>

              {/* Telefon */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Telefon:</label>
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  required
                  placeholder="Telefonnummer eingeben"
                />
              </div>

              {/* Bemerkung */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Bemerkung:</label>
                <Textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Optional: Zusätzliche Bemerkungen"
                  rows={3}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  className="w-full hover:border-orange-500 hover:text-orange-600 transition-colors duration-200"
                  outline
                >
                  Auftrag anlegen
                </Button>
              </div>
            </form>

            {/* Message */}
            {message && (
              <div className={`mt-6 p-4 rounded-lg text-center font-medium ${
                message === "Auftrag erfolgreich angelegt." 
                  ? "bg-green-50 text-green-800 border border-green-200" 
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Set Details Dialog */}
      <Dialog open={showSetDetails} onClose={closeSetDetails}>
        <DialogTitle>{selectedSetDetails?.set_name?.name?.de || selectedSetDetails?._id}</DialogTitle>
        <DialogBody>
          <div className="space-y-4">
            {selectedSetDetails?.imageUrl && (
              <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <img
                  src={selectedSetDetails.imageUrl}
                  alt={selectedSetDetails.set_name?.name?.de || selectedSetDetails._id}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Enthaltene Geräte:</h4>
              <div className="space-y-2">
                {singleProducts.map((product) => (
                  <div key={product._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{product.name}</span>
                    <span className="text-xs text-gray-500">
                      Anzahl: {product.quantity || 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {availability[selectedSetDetails?._id] && (
              <div className="border-t pt-3">
                <h4 className="font-semibold text-gray-900 mb-2">Verfügbarkeit:</h4>
                <div className="flex items-center space-x-2">
                  {availability[selectedSetDetails._id].available ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      ✓ Verfügbar ({availability[selectedSetDetails._id].available_count} Stück)
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                      ✗ Nicht verfügbar
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogBody>
        <DialogActions>
          <Button variant="outline" onClick={closeSetDetails}>
            Schließen
          </Button>
          {availability[selectedSetDetails?._id]?.available && (
            <Button 
              onClick={() => {
                const setId = selectedSetDetails._id;
                toggleSetSelection(setId);
                closeSetDetails();
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {form.sets.includes(selectedSetDetails._id) ? 'Entfernen' : 'Auswählen'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Set Selection Dialog - Equipment Auswahl Popup */}
      <Dialog open={showSetSelection} onClose={closeSetSelection} size="5xl">
        <DialogTitle>Equipment auswählen</DialogTitle>
        <DialogBody className="max-h-[70vh] overflow-hidden p-0">
          {!selectedDateRange.start || !selectedDateRange.end ? (
            <div className="text-center py-8 text-gray-500">
              <p>Bitte wählen Sie zuerst einen Zeitraum aus, um die Verfügbarkeit zu prüfen.</p>
            </div>
          ) : (
            <div className="flex gap-6 h-[70vh]">
              {/* Ausgewählte Sets Seitenleiste - nur Desktop */}
              {form.sets.length > 0 && (
                <div className="hidden lg:block w-80 flex-shrink-0 p-6 border-r border-gray-200">
                  <div className="h-full flex flex-col">
                    <h4 className="font-medium text-orange-800 mb-4 flex-shrink-0">
                      Ausgewählte Sets ({form.sets.length}):
                    </h4>
                    <div className="flex-1 overflow-y-auto pr-2">
                      <div className="space-y-3">
                        {form.sets.map((setId) => {
                          const set = sets.find(s => s._id === setId);
                          if (!set) return null;
                          
                          const thumbnailUrl = thumbnailUrls[set._id] || `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
                          
                          return (
                            <div key={setId} className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                              {/* Thumbnail */}
                              <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                <img
                                  src={thumbnailUrl}
                                  alt={set.set_name?.name?.de || set._id}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              
                              {/* Set Info */}
                              <div className="flex-1 min-w-0">
                                <h5 className="text-sm font-medium text-orange-900 line-clamp-2">
                                  {set.manufacturer?.name || "–"} {set.set_name?.name?.de || set._id}
                                </h5>
                                <button
                                  onClick={() => removeSetFromSelection(setId)}
                                  className="mt-2 text-xs text-orange-600 hover:text-orange-800 underline"
                                >
                                  Entfernen
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Hauptbereich mit Suche und Sets Grid */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Such- und Filterbereich - Fix oben */}
                <div className="flex-shrink-0 p-6 bg-white border-b border-gray-200">
                  <div className="flex gap-4 items-center">
                    {/* Suchfeld */}
                    <div className="flex-1">
                      <Input
                        type="text"
                        placeholder="Suchen..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    {/* Kategorie-Filter */}
                    <div className="flex-shrink-0">
                      <Dropdown>
                        <DropdownButton outline className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200">
                          <span className="mr-2">
                            {selectedCategory || "Alle Kategorien"}
                          </span>
                          <ChevronDownIcon className="size-4" />
                        </DropdownButton>
                        <DropdownMenu className="border border-gray-200">
                          <DropdownItem 
                            onClick={() => setSelectedCategory("")}
                          >
                            Alle Kategorien
                          </DropdownItem>
                          {availableCategories.map((category) => (
                            <DropdownItem 
                              key={category} 
                              onClick={() => setSelectedCategory(category)}
                            >
                              {category}
                            </DropdownItem>
                          ))}
                        </DropdownMenu>
                      </Dropdown>
                    </div>
                  </div>
                </div>

                {/* Scrollbarer Content-Bereich */}
                <div className="flex-1 overflow-y-auto p-6">

                {/* Ausgewählte Sets Übersicht - nur Mobile */}
                {form.sets.length > 0 && (
                  <div className="lg:hidden mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                    <h4 className="font-medium text-orange-800 mb-2">
                      Ausgewählte Sets ({form.sets.length}):
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {form.sets.map((setId) => {
                        const set = sets.find(s => s._id === setId);
                        if (!set) return null;
                        
                        return (
                          <span key={setId} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800">
                            {set.manufacturer?.name || "–"} {set.set_name?.name?.de || set._id}
                            <button
                              onClick={() => removeSetFromSelection(setId)}
                              className="ml-2 hover:text-orange-900"
                            >
                              ✕
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Verfügbare Sets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {filteredSets
                  .filter((set) => {
                    // Alle Sets dieser Kombination finden
                    const allSetsOfThisType = allSets.filter(s => 
                      s.manufacturer?.name === set.manufacturer?.name && 
                      s.set_name?.name?.de === set.set_name?.name?.de
                    );
                    
                    // Verfügbare Sets berechnen (nicht in unavailableSets enthalten)
                    const availableSetsOfThisType = allSetsOfThisType.filter(s => 
                      !unavailableSets.includes(s._id)
                    );
                    
                    // Nur Sets anzeigen, die mindestens 1 verfügbares Set haben
                    return availableSetsOfThisType.length > 0;
                  })
                  .map((set) => {
                    // Alle Sets dieser Kombination finden
                    const allSetsOfThisType = allSets.filter(s => 
                      s.manufacturer?.name === set.manufacturer?.name && 
                      s.set_name?.name?.de === set.set_name?.name?.de
                    );
                    
                    // Verfügbare Sets berechnen
                    const availableSetsOfThisType = allSetsOfThisType.filter(s => 
                      !unavailableSets.includes(s._id)
                    );
                    const availableCount = availableSetsOfThisType.length;
                    const totalCount = allSetsOfThisType.length;
                    
                    const selectedCount = getSelectedCountForSetType(set.manufacturer?.name, set.set_name?.name?.de);
                    const isAnySelected = selectedCount > 0;
                    const thumbnailUrl = thumbnailUrls[set._id] || `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
                    
                    return (
                      <div
                        key={set._id}
                        className={`relative border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                          isAnySelected
                            ? 'border-orange-500 bg-orange-50 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-orange-300 hover:shadow-md'
                        }`}
                        onClick={() => toggleSetTypeSelection(set.manufacturer?.name, set.set_name?.name?.de)}
                      >
                        {/* Verfügbarkeitsstatus */}
                        <div className="absolute top-2 right-2">
                          {availableCount === totalCount ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {availableCount} verfügbar
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {availableCount} von {totalCount}
                            </span>
                          )}
                        </div>

                        {/* Ausgewählt-Indikator */}
                        {isAnySelected && (
                          <div className="absolute top-2 left-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-600 text-white">
                              {availableCount === 1 ? '✓' : (selectedCount === availableCount ? '✓ Alle' : `✓ ${selectedCount}`)}
                            </span>
                          </div>
                        )}

                        {/* Set Bild */}
                        <div className="w-full aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                          <img
                            src={thumbnailUrl}
                            alt={set.set_name?.name?.de || set._id}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Set Informationen */}
                        <div className="space-y-2">
                          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                            {set.manufacturer?.name || "–"} {set.set_name?.name?.de || set._id}
                          </h3>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {/* Keine verfügbaren Sets Nachricht */}
              {filteredSets.filter((set) => {
                const allSetsOfThisType = allSets.filter(s => 
                  s.manufacturer?.name === set.manufacturer?.name && 
                  s.set_name?.name?.de === set.set_name?.name?.de
                );
                const availableSetsOfThisType = allSetsOfThisType.filter(s => 
                  !unavailableSets.includes(s._id)
                );
                return availableSetsOfThisType.length > 0;
              }).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? (
                    <p>Keine Sets für "{searchTerm}" im ausgewählten Zeitraum gefunden.</p>
                  ) : (
                    <p>Keine Sets im ausgewählten Zeitraum ({new Date(selectedDateRange.start).toLocaleDateString('de-DE')} - {new Date(selectedDateRange.end).toLocaleDateString('de-DE')}) verfügbar.</p>
                  )}
                </div>
              )}
                </div>
              </div>
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button variant="outline" onClick={closeSetSelection}>
            Schließen
          </Button>
          <Button 
            onClick={closeSetSelection}
            className="bg-orange-600 hover:bg-orange-700 text-white"
          >
            Auswahl bestätigen ({form.sets.length} Sets)
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}