import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAIN_VARIABLES } from '../../config';
import { useAuth, fetchUserData, authenticatedFetch } from '../services/auth';
import { Button } from '@headlessui/react';
import { PlusIcon } from '@heroicons/react/24/outline';

export default function ProduktAnlegen() {
    const messageRef = useRef();
    const [showSuccess, setShowSuccess] = useState(false);
    const [setRelations, setSetRelations] = useState([]);
    const [roomOptions, setRoomOptions] = useState([]);
    const [selectedSet, setSelectedSet] = useState('');
    const [setList, setSetList] = useState([]);
    const [isActiveValue, setIsActiveValue] = useState('');
    const navigate = useNavigate();
    const [showAreaIvs, setShowAreaIvs] = useState('');
    const [priceConsidered, setPriceConsidered] = useState(false);

    const [userId, setUserId] = useState('');
    const [userRole, setUserRole] = useState('student');
    const token = useAuth(state => state.token);

    useEffect(() => {
        loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/sets`, 'setSelect');
        loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/brands`, 'brandSelect');
        loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`, 'designationSelect');
        loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-states`, 'status');
        //loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-test-intervals`, 'interval', true);
        loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-status`, 'isActive', false, false, true);
        //loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-customerids`, 'area'); // Bereichsnummern laden

        

        // Set-Relations laden
        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-relations`)
            .then(res => res.json())
            .then(data => {
            // Die Räume sind direkt im Objekt, nicht in name.rooms
            setSetRelations(data);
            setRoomOptions([]); // Räume leer lassen
            setSelectedSet(''); // Keine Vorauswahl
            });
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

    async function loadDropdown(endpoint, selectId, isInterval = false, isState = false, isActiveStatus = false) {
        try {
            const res = await authenticatedFetch(endpoint);
            let items = await res.json();

            // Alphabetisch sortieren für Set, Hersteller, Kategorie
            if (['setSelect', 'brandSelect', 'designationSelect'].includes(selectId)) {
                items = items.sort((a, b) => {
                    const getText = item => item.name ||
                        `${item.manufacturer?.name ?? ''} - ${item.set_name?.name?.de ?? ''} - Set ${item.set_number ?? ''}`;
                    return getText(a).localeCompare(getText(b), 'de', { sensitivity: 'base' });
                });
            }

            // Wenn das Set-Dropdown geladen wird, speichere die Liste im State
            if (selectId === 'setSelect') {
                setSetList(items);
            }

            const select = document.getElementById(selectId);
            select.innerHTML = '';

            // Leere Option für keine Vorauswahl
            if (
                ['setSelect', 'brandSelect', 'designationSelect', 'area', 'isActive'].includes(selectId)
                || (isInterval && selectId === 'interval')
            ) {
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = '-- Bitte wählen --';
                emptyOption.disabled = true;
                emptyOption.selected = true;
                select.appendChild(emptyOption);
            }

            items.forEach(item => {
                const option = document.createElement('option');
                if (isInterval) {
                    option.value = item.duration;
                    option.textContent = `${item.duration}`;
                } else if (isActiveStatus) {
                    option.value = item.value;
                    option.textContent = item.name;
                } else if (selectId === 'area' && item._id) {
                    option.value = item._id; // ID als value für Bereichsnummern
                    option.textContent = item.area + (item.description ? ` - ${item.description}` : '');
                } else {
                    option.value = item._id;
                    option.textContent = item.name || `${item.manufacturer?.name ?? ''} - ${item.set_name?.name?.de ?? ''} - Set ${item.set_number ?? ''}`;
                }
                select.appendChild(option);
            });
        } catch (err) {
            console.error(`Fehler beim Laden von ${endpoint}:`, err);
        }
    }

    // Set-Auswahl: Räume aus Relation und Set-Objekt laden
    async function handleSetChange(e) {
        const setId = e.target.value;
        setSelectedSet(setId);

        console.log('SELECTED SET ID', setId);

        // Finde das Set-Objekt aus setList
        const selectedSetObj = setList.find(set => set._id === setId);

        // Räume aus Relation oder direkt aus Set-Objekt holen
        let rooms = [];
        if (selectedSetObj?.set_relation?.rooms && Array.isArray(selectedSetObj.set_relation.rooms)) {
            rooms = selectedSetObj.set_relation.rooms;
        } else if (selectedSetObj?.rooms && Array.isArray(selectedSetObj.rooms)) {
            rooms = selectedSetObj.rooms;
        }

        // Räume aus API holen, falls IDs vorhanden sind
        let roomOptions = [];
        if (rooms.length > 0) {
            try {
                const fetchedRooms = await Promise.all(
                    rooms.map(id =>
                        authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/rooms/${id}`)
                            .then(res => res.ok ? res.json() : null)
                            .catch(() => null)
                    )
                );
                roomOptions = fetchedRooms
                    .filter(room => room && room._id && room.name)
                    .map(room => ({ _id: room._id, name: room.name }));
            } catch (err) {
                console.error('Fehler beim Laden der Räume:', err);
            }
        }

        setRoomOptions(roomOptions);
    }

    async function handleIVSChange(e) {     
        setShowAreaIvs(e.target.value);
        if( e.target.value === 'ja' )
            loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-customerids`, 'area'); // Bereichsnummern laden
       
        console.log('HANDLE CHANGE IVS', e.target.value);
    }

    function handlePriceConsideredChange(e) {
        const isChecked = e.target.checked;
        setPriceConsidered(isChecked);
        
        const priceInput = document.getElementById('price');
        if (isChecked) {
            // Checkbox angehakt: Feld ausgrauen und auf 0 setzen
            priceInput.value = '0.00';
            priceInput.disabled = true;
            priceInput.style.backgroundColor = '#f0f0f0';
            priceInput.style.color = '#999';
        } else {
            // Checkbox nicht angehakt: Feld aktivieren und leeren
            priceInput.value = '';
            priceInput.disabled = false;
            priceInput.style.backgroundColor = '#f6f8fa';
            priceInput.style.color = '#000';
        }
    }

    async function submitProduct(e) {
        e.preventDefault();

        const get = id => document.getElementById(id)?.value.trim();
        const getInt = id => parseInt(document.getElementById(id)?.value, 10);
        const getDate = id => {
            const val = document.getElementById(id)?.value.trim();
            return val ? new Date(val).toISOString().slice(0, 10) : '';
        };

        const payload = {
            set: get('setSelect'),
            Manufacturer: get('brandSelect'),
            Type: get('type'),
            Designation: get('designationSelect'),
            SerialNumber: get('serial'),
            CostCenter: get('order'),
            ProductValue: priceConsidered ? null : (parseFloat(get('price')) || 0),
            Department: get('room'),
            DeviceType: get('deviceType') || 'Normal',
            state: get('status'),
            Remark: get('remark'),
            IsActive: get('isActive') === 'true',
        };

        // Nur wenn isActiveValue === 'true' oder isActiveValue === 'ja'
        if (isActiveValue === 'true' || isActiveValue === 'ja') {
            payload.TestingInterval = getInt('interval');
            payload.ID = get('idNumber');
            payload.LastTestingDate = getDate('lastTest');
        }

        // Nur wenn showAreaIvs === 'true' oder showAreaIvs === 'ja'
        if (showAreaIvs === 'true' || showAreaIvs === 'ja') {
            payload.CustomerID = get('area');
            payload.Various_1 = getInt('ivs');
        }

        // Dynamisch required Felder je nach Bedingungen
        let required = [
            'set', 'Manufacturer', 'Type', 'Designation', 'CostCenter',
            'Department', 'DeviceType', 'IsActive', 'state'
        ];
        if (isActiveValue === 'true' || isActiveValue === 'ja') {
            required = [...required, 'TestingInterval', 'ID'];
        }
        if (showAreaIvs === 'true' || showAreaIvs === 'ja') {
            required = [...required, 'CustomerID', 'Various_1'];
        }

        const missing = required.filter(k => payload[k] === '' || payload[k] === null || (typeof payload[k] === 'number' && isNaN(payload[k])));

        if (missing.length > 0) {
            messageRef.current.textContent = `Fehlende Pflichtfelder: ${missing.join(', ')}`;
            messageRef.current.style.color = 'red';
            return;
        }

        console.log('Sende Payload:', payload);

        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setShowSuccess(true);
            handleSubmitSetChange(); // Ergänzung: Funktion nach erfolgreichem Abschluss aufrufen
        } else {
            const err = await res.json();
            messageRef.current.textContent = err.error || 'Fehler beim Speichern.';
            messageRef.current.style.color = 'red';
        }
    }

    async function handleSubmitSetChange() {
        
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Neues Produkt anlegen</h1>
                    
                    <form onSubmit={submitProduct}>
                        <div className="space-y-8">
                            {/* Grunddaten Sektion */}
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                                    Grunddaten
                                </h2>
                                <div className="space-y-6">
                                    {/* Set */}
                                    <div>
                                        <label htmlFor="setSelect" className="block text-sm font-medium text-gray-900 mb-1">Set</label>
                                        <p className="text-sm text-gray-600 mb-2">Welchem Set soll das Produkt zugeordnet werden?</p>
                                        <select 
                                            id="setSelect" 
                                            required 
                                            onChange={handleSetChange}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Hersteller */}
                                    <div>
                                        <label htmlFor="brandSelect" className="block text-sm font-medium text-gray-900 mb-1">Hersteller</label>
                                        <p className="text-sm text-gray-600 mb-2">Wählen Sie den Hersteller des Produkts.</p>
                                        <div className="flex gap-2">
                                            <select 
                                                id="brandSelect" 
                                                required 
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                            <Button
                                                type="button"
                                                onClick={async () => {
                                                    const name = prompt('Neuen Hersteller anlegen:');
                                                    if (!name || !name.trim()) return;
                                                    try {
                                                        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`, {
                                                            method: 'POST',
                                                            body: JSON.stringify({ name: name.trim() })
                                                        });
                                                        if (res.status === 409) {
                                                            alert('Dieser Hersteller existiert bereits (auch in anderer Schreibweise).');
                                                            return;
                                                        }
                                                        if (!res.ok) {
                                                            alert('Fehler beim Speichern.');
                                                            return;
                                                        }
                                                        loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/brands`, 'brandSelect');
                                                    } catch (err) {
                                                        alert('Fehler beim Hinzufügen des Herstellers.');
                                                    }
                                                }}
                                                className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-md transition-colors"
                                                title="Neuen Hersteller hinzufügen"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Typenbezeichnung */}
                                    <div>
                                        <label htmlFor="type" className="block text-sm font-medium text-gray-900 mb-1">Typenbezeichnung</label>
                                        <p className="text-sm text-gray-600 mb-2">Wie lautet die Bezeichnung des Produkts (Beispiel: SEL2470GM2)?</p>
                                        <input 
                                            id="type" 
                                            required 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Kategorie */}
                                    <div>
                                        <label htmlFor="designationSelect" className="block text-sm font-medium text-gray-900 mb-1">Kategorie</label>
                                        <p className="text-sm text-gray-600 mb-2">Wählen Sie die Kategorie des Produkts, wenn möglich aus den Vorgaben.</p>
                                        <div className="flex gap-2">
                                            <select 
                                                id="designationSelect" 
                                                required 
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            />
                                            <Button
                                                type="button"
                                                onClick={async () => {
                                                    const name = prompt('Neue Kategorie anlegen:');
                                                    if (!name || !name.trim()) return;
                                                    try {
                                                        const res = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`, {
                                                            method: 'POST',
                                                            body: JSON.stringify({ name: name.trim() })
                                                        });
                                                        if (res.status === 409) {
                                                            alert('Diese Produkt-Kategorie existiert bereits (auch in anderer Schreibweise).');
                                                            return;
                                                        }
                                                        if (!res.ok) {
                                                            alert('Fehler beim Speichern.');
                                                            return;
                                                        }
                                                        loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`, 'designationSelect');
                                                    } catch (err) {
                                                        alert('Fehler beim Hinzufügen der Kategorie.');
                                                    }
                                                }}
                                                className="bg-orange-500 hover:bg-orange-600 text-black px-3 py-2 rounded-md transition-colors"
                                                title="Neue Kategorie hinzufügen"
                                            >
                                                <PlusIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Seriennummer */}
                                    <div>
                                        <label htmlFor="serial" className="block text-sm font-medium text-gray-900 mb-1">Seriennummer</label>
                                        <p className="text-sm text-gray-600 mb-2">Wie lautet die Seriennummer des Produkts, falls vorhanden?</p>
                                        <input 
                                            id="serial" 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Bestellnummer */}
                                    <div>
                                        <label htmlFor="order" className="block text-sm font-medium text-gray-900 mb-1">Bestellnummer</label>
                                        <p className="text-sm text-gray-600 mb-2">Wie lautet die vom Haushalt vergebene Bestellnummer?</p>
                                        <input 
                                            id="order" 
                                            required 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Preis */}
                                    <div>
                                        <label htmlFor="price" className="block text-sm font-medium text-gray-900 mb-1">Preis</label>
                                        <p className="text-sm text-gray-600 mb-2">Wie hoch ist der Preis des Produkts in Euro?</p>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <input 
                                                    id="price" 
                                                    type="number" 
                                                    step="0.01" 
                                                    min="0" 
                                                    placeholder="0.00"
                                                    disabled={priceConsidered}
                                                    className={`w-full pr-8 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                                                        priceConsidered ? 'bg-gray-100 text-gray-500' : ''
                                                    }`}
                                                />
                                                <span className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                                                    priceConsidered ? 'text-gray-400' : 'text-gray-600'
                                                }`}>€</span>
                                            </div>
                                            <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                                                <input 
                                                    type="checkbox" 
                                                    id="priceConsidered" 
                                                    checked={priceConsidered}
                                                    onChange={handlePriceConsideredChange}
                                                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                                                />
                                                Preis wurde bereits berücksichtigt
                                            </label>
                                        </div>
                                        {priceConsidered && (
                                            <p className="text-sm text-gray-500 italic mt-1">
                                                Der eingegebene Preiswert wird nicht gespeichert, da er bereits berücksichtigt wurde.
                                            </p>
                                        )}
                                    </div>

                                    {/* Raumnummer */}
                                    <div>
                                        <label htmlFor="room" className="block text-sm font-medium text-gray-900 mb-1">Raumnummer</label>
                                        <p className="text-sm text-gray-600 mb-2">Wie lautet die Raumnummer, in dem das Produkt verwendet / gelagert wird?</p>
                                        <select 
                                            id="room" 
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        >
                                            <option value="">-- Bitte wählen --</option>
                                            {roomOptions.map(room => (
                                                <option key={room._id} value={room._id}>{room.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Inventarisierung Sektion */}
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                                    Inventarisierung
                                </h2>
                                <div className="space-y-6">
                                    {/* Inventarisierung */}
                                    <div>
                                        <label htmlFor="showAreaIvsDropdown" className="block text-sm font-medium text-gray-900 mb-1">Inventarisierung?</label>
                                        <p className="text-sm text-gray-600 mb-2">Wird das Produkt inventarisiert (Produktwert &gt; 800€ Netto)?</p>
                                        <select
                                            id="showAreaIvsDropdown"
                                            required
                                            value={showAreaIvs}
                                            onChange={e => {
                                                handleIVSChange(e);
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        >
                                            <option value="">-- Bitte wählen --</option>
                                            <option value="ja">Ja</option>
                                            <option value="nein">Nein</option>
                                        </select>
                                    </div>

                                    {/* Inventarisierung Zusatzfelder */}
                                    {showAreaIvs === 'ja' && (
                                        <>
                                            <div>
                                                <label htmlFor="area" className="block text-sm font-medium text-gray-900 mb-2">Bereichsnummer</label>
                                                <select 
                                                    id="area" 
                                                    required 
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="ivs" className="block text-sm font-medium text-gray-900 mb-1">Inventarnummer</label>
                                                <p className="text-sm text-gray-600 mb-2">Wie lautet die vom Haushalt vergebene Inventarnummer?</p>
                                                <input 
                                                    id="ivs" 
                                                    required 
                                                    pattern="\d+" 
                                                    title="Nur Zahlen erlaubt"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Geräteeigenschaften Sektion */}
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                                    Elektrische Prüfung
                                </h2>
                                <div className="space-y-6">
                                    {/* Gerätetyp */}
                                    <div>
                                        <label htmlFor="deviceType" className="block text-sm font-medium text-gray-900 mb-1">Gerätetyp</label>
                                        <p className="text-sm text-gray-600 mb-2">Vorgegebener Standardwert</p>
                                        <select 
                                            id="deviceType" 
                                            disabled
                                            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-600"
                                        >
                                            <option value="Normal">Normal</option>
                                        </select>
                                    </div>

                                    {/* Elektrische Prüfung */}
                                    <div>
                                        <label htmlFor="isActive" className="block text-sm font-medium text-gray-900 mb-1">Elektrische Prüfung?</label>
                                        <p className="text-sm text-gray-600 mb-2">Für alle ortsveränderlichen Elektrogeräte (z.B. mit Netzanschluss)</p>
                                        <select
                                            id="isActive"
                                            required
                                            onChange={e => {
                                                if (e.target.value === 'true') {
                                                    loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-test-intervals`, 'interval', true);
                                                }
                                                setIsActiveValue(e.target.value);
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Elektrische Prüfung Zusatzfelder */}
                                    {isActiveValue === 'true' && (
                                        <>
                                            <div>
                                                <label htmlFor="interval" className="block text-sm font-medium text-gray-900 mb-2">Prüfintervall (Monate)</label>
                                                <select 
                                                    id="interval" 
                                                    required={isActiveValue === 'true'}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="idNumber" className="block text-sm font-medium text-gray-900 mb-2">ID (Elektrische Prüfung)</label>
                                                <input 
                                                    id="idNumber" 
                                                    type="text" 
                                                    required={isActiveValue === 'true'}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="lastTest" className="block text-sm font-medium text-gray-900 mb-2">Letzte elektrische Prüfung</label>
                                                <input 
                                                    id="lastTest" 
                                                    type="date"
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Zusätzliche Informationen Sektion */}
                            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                    <span className="bg-orange-500 text-black w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                                    Zusätzliche Informationen
                                </h2>
                                <div className="space-y-6">
                                    {/* Anmerkung */}
                                    <div>
                                        <label htmlFor="remark" className="block text-sm font-medium text-gray-900 mb-1">Anmerkung</label>
                                        <p className="text-sm text-gray-600 mb-2">Für den internen Gebrauch</p>
                                        <input 
                                            id="remark" 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    {/* Produktstatus */}
                                    <div>
                                        <label htmlFor="status" className="block text-sm font-medium text-gray-900 mb-2">Produktstatus</label>
                                        <select 
                                            id="status" 
                                            required
                                            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-4">
                                <Button 
                                    type="submit"
                                    className="bg-orange-500 hover:bg-orange-600 text-black px-6 py-3 rounded-md font-semibold transition-colors"
                                >
                                    Anlegen
                                </Button>
                            </div>

                            {/* Message */}
                            <div 
                                id="message" 
                                ref={messageRef}
                                className="min-h-6 text-sm font-medium"
                            ></div>
                        </div>
                    </form>
                </div>

                {/* Success Modal */}
                {showSuccess && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-lg p-6 min-w-96 text-center">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Produkt erfolgreich angelegt!</h2>
                            <p className="text-gray-600 mb-6">Was möchten Sie als nächstes tun?</p>
                            <div className="flex gap-4 justify-center">
                                <Button
                                    onClick={() => window.location.reload()}
                                    className="bg-orange-500 hover:bg-orange-600 text-black px-4 py-2 rounded-md transition-colors"
                                >
                                    Neues Produkt anlegen
                                </Button>
                                <Button
                                    onClick={() => navigate('/equipment')}
                                    className="bg-black hover:bg-gray-800 text-orange-500 px-4 py-2 rounded-md transition-colors"
                                >
                                    Zum Menü
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}