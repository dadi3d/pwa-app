import React, { useEffect, useState, useRef } from "react";
import { MAIN_VARIABLES } from "../config";
import { Dialog, DialogTitle, DialogBody, DialogActions } from "../styles/catalyst/dialog";
import { Button } from "../styles/catalyst/button";
import { Input } from "../styles/catalyst/input";
import { Dropdown, DropdownButton, DropdownMenu, DropdownItem } from "../styles/catalyst/dropdown";
import { ChevronDownIcon } from "@heroicons/react/16/solid";
import { Calendar } from 'vanilla-calendar-pro';
import 'vanilla-calendar-pro/styles/index.css';
import { useAuth, fetchUserData } from './services/auth';

// API Endpunkte - Angepasst für OTH-User
const API_SETS_AVAILABLE = `${MAIN_VARIABLES.SERVER_URL}/api/user-sets/available`; // Neue Route für OTH-User
const API_SINGLE_PRODUCTS = `${MAIN_VARIABLES.SERVER_URL}/api/single-products?set=`;
const API_CHECK_AVAILABILITY = `${MAIN_VARIABLES.SERVER_URL}/api/orders/check-availability`;


export default function Produkte() {
  const [sets, setSets] = useState([]);
  const [allSets, setAllSets] = useState([]); // Alle Sets für die Set-Anzahl-Berechnung
  const [productsBySet, setProductsBySet] = useState({});
  const [thumbnailUrls, setThumbnailUrls] = useState({}); // Thumbnail-URLs für Sets
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSet, setSelectedSet] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState({ start: null, end: null });
  const [unavailableSets, setUnavailableSets] = useState([]);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const calendarRef = useRef(null);

  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('student');
  const token = useAuth(state => state.token);

  // Sets laden
  useEffect(() => {
    async function loadSets() {
      // Verwende die neue Route für verfügbare Sets (ohne Status "nicht verfügbar")
      const res = await fetch(API_SETS_AVAILABLE);
      const data = await res.json();
      // Alle Sets für Set-Anzahl-Berechnung speichern
      setAllSets(data);
      // Nur Sets mit Nummer 1 für die Anzeige filtern
      const filteredSets = data.filter(set => set.set_number === 1);
      setSets(filteredSets);
      
      // Thumbnail-URLs für alle Sets laden mit imgproxy-Optimierung
      const thumbnails = {};
      for (const set of filteredSets) {
        try {
          const thumbnailRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${set._id}`);
          const thumbnailData = await thumbnailRes.json();
          // Backend gibt /api/files/images/... zurück, verwende direkt
          thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}${thumbnailData.path}?width=500&height=500&resize=fill&format=webp&quality=85`;
        } catch (err) {
          console.error(`Fehler beim Laden des Thumbnails für Set ${set._id}:`, err);
          thumbnails[set._id] = `${MAIN_VARIABLES.SERVER_URL}/api/files/images/placeholder_set.jpg?width=500&height=500&format=webp`;
        }
      }
      setThumbnailUrls(thumbnails);
    }
    loadSets();
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

  // Verfügbarkeit der Sets für den ausgewählten Zeitraum prüfen
  const checkAvailability = async (startDate, endDate) => {
    if (!startDate || !endDate) {
      setUnavailableSets([]);
      return;
    }

    setIsCheckingAvailability(true);
    try {
      const response = await fetch(API_CHECK_AVAILABILITY, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rent_start: startDate,
          rent_end: endDate
        })
      });

      if (!response.ok) {
        throw new Error('Fehler beim Prüfen der Verfügbarkeit');
      }

      const data = await response.json();
      setUnavailableSets(data.unavailable_sets || []);
    } catch (error) {
      console.error('Fehler beim Prüfen der Verfügbarkeit:', error);
      setUnavailableSets([]);
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  // Nicht verfügbare Sets zurücksetzen wenn Zeitraum geändert wird
  useEffect(() => {
    setUnavailableSets([]);
    
    // Automatisch Verfügbarkeit prüfen wenn vollständiger Zeitraum ausgewählt
    if (selectedDateRange.start && selectedDateRange.end) {
      checkAvailability(selectedDateRange.start, selectedDateRange.end);
    }
  }, [selectedDateRange.start, selectedDateRange.end]);

  // Kalender initialisieren wenn sichtbar
  useEffect(() => {
    if (showCalendar && calendarRef.current) {
      const options = {
        // Grundkonfiguration für deutschen Kalender
        locale: 'de',
        firstWeekday: 1, // Montag als erster Wochentag
        // Format für Datumsanzeige
        dateFormat: 'dd.mm.yyyy',
        // Styling
        theme: 'light',
        // Range-Auswahl aktivieren - neue API
        selectionDatesMode: 'multiple-ranged',
        // Range-Einstellungen
        range: {
          disablePast: true, // Verhindert Auswahl vergangener Daten
          min: new Date().toISOString().split('T')[0], // Frühestes Datum (heute)
          max: new Date(new Date().getFullYear() + 1, 11, 31).toISOString().split('T')[0] // 1 Jahr in die Zukunft
        },
        // Tooltip für Date Range
        onCreateDateRangeTooltip(self) {
          const createRow = (title, value) =>
            `<div style="text-align: left; white-space: nowrap; margin: 4px 0;">
              <span style="color: #6b7280; margin-right: 8px;">${title}</span>
              <b style="color: #1f2937;">${value}</b>
            </div>`;

          const formatDate = (dateStr) => {
            return new Date(dateStr).toLocaleDateString('de-DE', {
              weekday: 'short',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric'
            });
          };

          let tooltipContent = '';
          
          if (self.context.selectedDates && self.context.selectedDates.length > 0) {
            tooltipContent += createRow('Start:', formatDate(self.context.selectedDates[0]));
            
            if (self.context.selectedDates[1]) {
              tooltipContent += createRow('Ende:', formatDate(self.context.selectedDates[1]));
              
              // Berechne die Anzahl der Tage
              const startDate = new Date(self.context.selectedDates[0]);
              const endDate = new Date(self.context.selectedDates[1]);
              const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              tooltipContent += createRow('Dauer:', `${daysDiff} Tag${daysDiff !== 1 ? 'e' : ''}`);
            } else {
              tooltipContent += `<div style="color: #6b7280; font-style: italic; margin-top: 4px;">Wählen Sie ein Enddatum</div>`;
            }
          }

          return `<div style="padding: 8px; background: white; border-radius: 6px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ${tooltipContent}
          </div>`;
        },
        // Event-Handler für Datums-Auswahl
        onClickDate(self) {
          const selectedDates = self.context.selectedDates || [];
          
          // Update React state when dates change
          if (selectedDates && selectedDates.length >= 2) {
            // Sortiere die Daten um Start- und Enddatum zu bestimmen
            const sortedDates = [...selectedDates].sort((a, b) => new Date(a) - new Date(b));
            const startDate = sortedDates[0];
            const endDate = sortedDates[sortedDates.length - 1];
            
            setSelectedDateRange({
              start: startDate,
              end: endDate
            });
          } else if (selectedDates && selectedDates.length === 1) {
            // Nur ein Datum ausgewählt
            setSelectedDateRange({
              start: selectedDates[0],
              end: null
            });
          } else {
            // Keine Auswahl
            setSelectedDateRange({
              start: null,
              end: null
            });
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
  }, [showCalendar]);

  // Produkte für ein Set laden und Dialog öffnen
  const handleSetClick = async (set) => {
    setSelectedSet(set);
    setIsDialogOpen(true);
    
    // Produkte für das Set laden falls noch nicht vorhanden
    if (!productsBySet[set._id]) {
      try {
        const res = await fetch(API_SINGLE_PRODUCTS + set._id);
        if (!res.ok) throw new Error("Fehler beim Laden der Produkte");
        const products = await res.json();
        setProductsBySet((prev) => ({ ...prev, [set._id]: products }));
      } catch {
        setProductsBySet((prev) => ({ ...prev, [set._id]: [] }));
      }
    }
  };

  // Gefilterte Sets basierend auf Suchbegriff und Kategorie (nicht Verfügbarkeit)
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
      <h1 className="text-center text-3xl font-semibold text-gray-800 mb-8">Equipment</h1>
      
      {/* Filter und Suchbereich */}
      <div className="max-w-4xl mx-auto mb-8 px-4">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-4">
          {/* Suchfeld */}
          <div className="flex-1 w-full">
            <Input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Kategorie-Filter */}
          <div className="flex-shrink-0 w-full sm:w-auto">
            <Dropdown>
              <DropdownButton outline className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full sm:w-auto">
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
          
          {/* Kalender Toggle Button */}
          <div className="flex-shrink-0 w-full sm:w-auto">
            <Button 
              outline 
              onClick={() => setShowCalendar(!showCalendar)}
              className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full sm:w-auto"
            >
              {showCalendar ? "Kalender verbergen" : "Kalender anzeigen"}
            </Button>
          </div>
        </div>
        
        {/* Kalender */}
        {showCalendar && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Verfügbarkeitskalender</h3>
            
            {/* Ausgewählter Zeitraum anzeigen */}
            {(selectedDateRange.start || selectedDateRange.end) && (
              <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-medium text-orange-800 mb-2">Ausgewählter Zeitraum:</h4>
                {selectedDateRange.start && selectedDateRange.end ? (
                  <div>
                    <p className="text-orange-700 mb-2">
                      <strong>Von:</strong> {new Date(selectedDateRange.start).toLocaleDateString('de-DE')} 
                      <span className="mx-2">→</span>
                      <strong>Bis:</strong> {new Date(selectedDateRange.end).toLocaleDateString('de-DE')}
                      <span className="ml-3 text-sm">
                        ({Math.ceil((new Date(selectedDateRange.end) - new Date(selectedDateRange.start)) / (1000 * 60 * 60 * 24)) + 1} Tage)
                      </span>
                    </p>
                    <button 
                      onClick={() => setSelectedDateRange({ start: null, end: null })}
                      className="text-sm text-orange-600 hover:text-orange-800 underline"
                    >
                      Auswahl zurücksetzen
                    </button>
                  </div>
                ) : selectedDateRange.start ? (
                  <p className="text-orange-700">
                    <strong>Startdatum:</strong> {new Date(selectedDateRange.start).toLocaleDateString('de-DE')}
                    <span className="ml-2 text-sm">(Wählen Sie ein Enddatum)</span>
                  </p>
                ) : null}
              </div>
            )}
            
            <div 
              ref={calendarRef}
              className="max-w-md mx-auto"
            ></div>
            
            {/* Hinweistext */}
            <div className="mt-4 text-sm text-gray-600 text-center">
              <p>Klicken Sie auf ein Startdatum und dann auf ein Enddatum, um einen Zeitraum auszuwählen.</p>
            </div>
          </div>
        )}
      </div>

        
      {/* Verfügbarkeitsstatus Container */}
      {/*selectedDateRange.start && selectedDateRange.end && !isCheckingAvailability && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">📅 Verfügbarkeitsstatus</h4>
            <div className="text-blue-700">
              {unavailableSets.length === 0 ? (
                <p>✅ Alle Sets sind im ausgewählten Zeitraum verfügbar!</p>
              ) : (
                <div>
                  <p>⚠️ {unavailableSets.length} Set{unavailableSets.length !== 1 ? 's sind' : ' ist'} im ausgewählten Zeitraum nicht verfügbar.</p>
                  <p className="text-sm mt-1">Diese Sets werden automatisch ausgeblendet.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )*/}

      

      <div id="setList" className="flex flex-wrap gap-6 justify-center">
        {filteredSets.length === 0 && searchTerm && (
          <div className="text-gray-500 text-lg">Keine Sets für "{searchTerm}" gefunden.</div>
        )}
        {filteredSets.length === 0 && !searchTerm && selectedDateRange.start && selectedDateRange.end && (
          <div className="text-gray-500 text-lg">
            Keine Sets im ausgewählten Zeitraum ({new Date(selectedDateRange.start).toLocaleDateString('de-DE')} - {new Date(selectedDateRange.end).toLocaleDateString('de-DE')}) verfügbar.
          </div>
        )}
        {filteredSets.length === 0 && !searchTerm && !selectedDateRange.start && (
          <div className="text-gray-500 text-lg">Keine Sets gefunden.</div>
        )}
        {filteredSets.map((p) => {
          const brand = p.manufacturer?.name || "–";
          const category = p.category?.name?.de || "–";
          const setName = p.set_name?.name?.de || "–";
          const thumbnailUrl = thumbnailUrls[p._id] || `${MAIN_VARIABLES.SERVER_URL}/api/images/files/images/placeholder_set.jpg?width=500&height=500&format=webp`;
          
          // Alle Sets dieser Kombination finden
          const allSetsOfThisType = allSets.filter(set => 
            set.manufacturer?.name === p.manufacturer?.name && 
            set.set_name?.name?.de === p.set_name?.name?.de
          );
          
          // Höchste Set-Nummer für diese Kombination
          const maxSetNumber = Math.max(...allSetsOfThisType.map(set => set.set_number || 0));
          
          // Verfügbare Sets berechnen (nicht in unavailableSets enthalten)
          const availableSetsOfThisType = allSetsOfThisType.filter(set => 
            !unavailableSets.includes(set._id)
          );
          const availableCount = availableSetsOfThisType.length;
          
          // Prüfen ob dieses spezifische Set verfügbar ist
          const isThisSetAvailable = !unavailableSets.includes(p._id);
          
          // Bestimme ob Set ausgegraut werden soll (nur wenn Datumsauswahl aktiv ist)
          const shouldBeGreyedOut = selectedDateRange.start && selectedDateRange.end && 
                                   (maxSetNumber === 1 && !isThisSetAvailable);
          
          return (
            <div
              className={`w-80 bg-white rounded-xl shadow-md mb-4 transition-all duration-200 overflow-hidden relative border border-gray-200 hover:shadow-xl hover:border-orange-500 cursor-pointer group ${
                shouldBeGreyedOut ? 'opacity-50' : ''
              }`}
              key={p._id}
              id={`set-${p._id}`}
              onClick={() => handleSetClick(p)}
            >
              {/* Nicht verfügbar Overlay für einzelne Sets */}
              {shouldBeGreyedOut && (
                <div className="absolute inset-0 bg-opacity-20 flex items-center justify-center z-10">
                  <div className="bg-gray-600 text-white px-3 py-1 rounded-lg text-sm font-medium">
                    Nicht verfügbar
                  </div>
                </div>
              )}
              
              <div className="text-center p-6 bg-gray-50 group-hover:bg-gray-100 transition-colors duration-200">
                <img
                  src={thumbnailUrl}
                  alt={`${brand} ${setName} Thumbnail`}
                  className="w-60 h-60 object-cover rounded-lg border border-gray-200 bg-white shadow-sm mx-auto"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <div className="font-semibold text-lg py-3 px-5 border-b border-gray-200 text-gray-800 transition-all duration-200 tracking-wide bg-gray-50 group-hover:bg-gray-100">
                <span>
                  {brand} <span className="text-gray-900 ">{setName}</span>
                </span>
              </div>
              <div className="p-3 bg-gray-50 text-gray-800 text-sm group-hover:bg-gray-100">
                <div className="mb-1">
                  <strong>Kategorie:</strong> {category}
                </div>
                <div className="mb-1">
                  {selectedDateRange.start && selectedDateRange.end ? (
                    // Wenn Datumsauswahl aktiv ist, zeige Verfügbarkeitsstatus
                    maxSetNumber === 1 && !isThisSetAvailable ? (
                      <strong className="text-red-600">0 Sets verfügbar</strong>
                    ) : availableCount === maxSetNumber ? (
                      <strong className="text-green-600">{availableCount} von {maxSetNumber} verfügbar</strong>
                    ) : (
                      <strong className="text-orange-600">{availableCount} von {maxSetNumber} verfügbar</strong>
                    )
                  ) : (
                    // Ohne Datumsauswahl zeige normale Anzahl
                    <strong>{maxSetNumber} Set{maxSetNumber !== 1 ? "s" : ""} vorhanden</strong>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Set Details Dialog */}
      {selectedSet && (
        <Dialog open={isDialogOpen} onClose={() => setIsDialogOpen(false)} size="5xl">
          <DialogTitle>
            {selectedSet.manufacturer?.name || "–"} {selectedSet.set_name?.name?.de || "–"}
          </DialogTitle>
          
          <DialogBody>
            {/* Bildergalerie */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Bilder</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <img
                  src={thumbnailUrls[selectedSet._id]?.replace('width=500&height=500', 'width=800&height=800') || `${MAIN_VARIABLES.SERVER_URL}/api/images/files/images/placeholder_set.jpg?width=800&height=800&format=webp`}
                  alt={`${selectedSet.manufacturer?.name || "–"} ${selectedSet.set_name?.name?.de || "–"}`}
                  className="w-full aspect-square object-cover rounded-lg border border-gray-200 bg-white shadow-sm"
                  loading="lazy"
                  decoding="async"
                />
                {/* Hier können weitere Bilder hinzugefügt werden, wenn verfügbar */}
              </div>
            </div>

            {/* Set Informationen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Set Details</h3>
                <div className="space-y-3">
                  <div>
                    <strong className="text-gray-700">Kategorie:</strong>
                    <span className="ml-2">{selectedSet.category?.name?.de || "–"}</span>
                  </div>
                  {selectedSet.note_public && selectedSet.note_public.trim() !== "" && (
                    <div>
                      <strong className="text-gray-700">Öffentliche Anmerkung:</strong>
                      <span className="ml-2">{selectedSet.note_public}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Enthaltene Produkte</h3>
                <div className="max-h-64 overflow-y-auto">
                  {!productsBySet[selectedSet._id] && (
                    <div className="text-gray-500">Lade Produkte...</div>
                  )}
                  {productsBySet[selectedSet._id] && productsBySet[selectedSet._id].length === 0 && (
                    <div className="text-gray-500">Keine Produkte vorhanden.</div>
                  )}
                  {productsBySet[selectedSet._id] && productsBySet[selectedSet._id].length > 0 && (
                    <div className="space-y-2">
                      {productsBySet[selectedSet._id].map((product) => {
                        const brandName = product.manufacturer?.name ?? "–";
                        const typeName = product.Type?.name?.de ?? product.Type?.name ?? product.Type ?? "–";
                        const serial = product.SerialNumber ?? "–";
                        return (
                          <div key={product._id} className="p-3 rounded-md bg-gray-50 border border-gray-200">
                            <div className="font-medium text-gray-800">{brandName} {typeName}</div>
                            <div className="text-sm text-gray-600">Seriennummer: {serial}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogBody>

          <DialogActions>
            <Button color="zinc" onClick={() => setIsDialogOpen(false)}>
              Schließen
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}