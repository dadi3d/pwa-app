import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MAIN_VARIABLES } from '../../config';
import { useAuth, fetchUserData } from '../services/auth';

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
        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/set-relations`)
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
            const res = await fetch(endpoint);
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
                        fetch(`${MAIN_VARIABLES.SERVER_URL}/api/rooms/${id}`)
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

        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
            .vite-form select {
                padding: 0.5rem 0.7rem;
                border: 1px solid #d0d7de;
                border-radius: 6px;
                font-size: 1rem;
                background: #f6f8fa;
                transition: border 0.2s;
            }
            .vite-form input:focus,
            .vite-form select:focus {
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
            }
            .vite-form button:hover {
                background: #535bf2;
            }
            #message {
                min-height: 1.5em;
                font-size: 1rem;
                margin-top: 0.5rem;
            }
            `}
        </style>
        <h1 style={{ textAlign: 'center', marginTop: '1.5rem', color: '#2a3b4c' }}>Neues Produkt anlegen</h1>
        <form className="vite-form" onSubmit={submitProduct}>
            <ul>
                <li>
                    <label htmlFor="setSelect">Set</label>
                    <a>Welchem Set soll das Produkt zugeordnet werden?</a>
                    <select id="setSelect" required onChange={handleSetChange} />
                </li>
                <li>
                    <label htmlFor="brandSelect">Hersteller</label>
                    <a>Wählen Sie den Hersteller des Produkts.</a>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select id="brandSelect" required style={{ flex: 1 }} />
                        <button
                            type="button"
                            onClick={async () => {
                                const name = prompt('Neuen Hersteller anlegen:');
                                if (!name || !name.trim()) return;
                                try {
                                    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/brands`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
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
                            title="Neuen Hersteller hinzufügen"
                            style={{ padding: '0 12px' }}
                        >+</button>
                    </div>
                </li>
                <li>
                    <label htmlFor="type">Typenbezeichnung</label>
                    <a >Wie lautet die Bezeichnung des Produkts (Beispiel: SEL2470GM2)?</a>
                    <input id="type" required />
                </li>
                <li>
                    <label htmlFor="designationSelect">Kategorie</label>
                    <a>Wählen Sie die Kategorie des Produkts, wenn möglich aus den Vorgaben.</a>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <select id="designationSelect" required style={{ flex: 1 }} />
                        <button
                            type="button"
                            onClick={async () => {
                                const name = prompt('Neue Kategorie anlegen:');
                                if (!name || !name.trim()) return;
                                try {
                                    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
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
                            title="Neue Kategorie hinzufügen"
                            style={{ padding: '0 12px' }}
                        >+</button>
                    </div>
                </li>
                <li>
                    <label htmlFor="serial">Seriennummer</label>
                    <a>Wie lautet die Seriennummer des Produkts, falls vorhanden?</a>
                    <input id="serial" />
                </li>
                <li>
                    <label htmlFor="order">Bestellnummer</label>
                    <a>Wie lautet die vom Haushalt vergebene Bestellnummer?</a>
                    <input id="order" required />
                </li>
                <li>
                    <label htmlFor="price">Preis</label>
                    <a>Wie hoch ist der Preis des Produkts in Euro?</a>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input 
                                id="price" 
                                type="number" 
                                step="0.01" 
                                min="0" 
                                placeholder="0.00"
                                disabled={priceConsidered}
                                style={{ 
                                    width: '100%', 
                                    paddingRight: '30px',
                                    padding: '0.5rem 30px 0.5rem 0.7rem',
                                    border: '1px solid #d0d7de',
                                    borderRadius: '6px',
                                    fontSize: '1rem',
                                    background: priceConsidered ? '#f0f0f0' : '#f6f8fa',
                                    color: priceConsidered ? '#999' : '#000'
                                }} 
                            />
                            <span style={{ 
                                position: 'absolute', 
                                right: '8px', 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                color: priceConsidered ? '#ccc' : '#666',
                                pointerEvents: 'none'
                            }}>€</span>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
                            <input 
                                type="checkbox" 
                                id="priceConsidered" 
                                checked={priceConsidered}
                                onChange={handlePriceConsideredChange}
                            />
                            Preis wurde bereits berücksichtigt
                        </label>
                    </div>
                    {priceConsidered && (
                        <small style={{ color: '#666', fontStyle: 'italic', marginTop: '4px' }}>
                            Der eingegebene Preiswert wird nicht gespeichert, da er bereits berücksichtigt wurde.
                        </small>
                    )}
                </li>
                <li>
                    <label htmlFor="room">Raumnummer</label>
                    <a>Wie lautet die Raumnummer, in dem das Produkt verwendet / gelagert wird?</a>
                    <select id="room" required>
                        <option value="">-- Bitte wählen --</option>
                        {roomOptions.map(room => (
                            <option key={room._id} value={room._id}>{room.name}</option>
                        ))}
                    </select>
                </li>
                <li>
                    <label htmlFor="showAreaIvsDropdown">Inventarisierung?</label>
                    <a>Wird das Produkt inventarisiert (Produktwert &gt; 800€ Netto)?</a>
                    <select
                        id="showAreaIvsDropdown"
                        required
                        value={showAreaIvs}
                        onChange={e => {
                            handleIVSChange(e);
                        }}
                    >
                        <option value="">-- Bitte wählen --</option>
                        <option value="ja">Ja</option>
                        <option value="nein">Nein</option>
                    </select>
                </li>
                {showAreaIvs === 'ja' && (
                    <>
                        <li>
                            <label htmlFor="area">Bereichsnummer</label>
                            <select id="area" required />
                        </li>
                        <li>
                            <label htmlFor="ivs">Inventarnummer</label>
                            <a>Wie lautet die vom Haushalt vergebene Inventarnummer?</a>
                            <input id="ivs" required pattern="\d+" title="Nur Zahlen erlaubt" />
                        </li>
                    </>
                )}
                <li>
                    <label htmlFor="deviceType">Gerätetyp</label>
                    <a>Vorgegebener Standardwert</a>
                    <select id="deviceType" disabled>
                        <option value="Normal">Normal</option>
                    </select>
                </li>
                <li>
                    <label htmlFor="isActive">Elektrische Prüfung?</label>
                    <a>Für alle ortsveränderlichen Elektrogeräte (z.B. mit Netzanschluss)</a>
                    <select
                        id="isActive"
                        required
                        onChange={e => {
                            if (e.target.value === 'true') {
                                loadDropdown(`${MAIN_VARIABLES.SERVER_URL}/api/product-test-intervals`, 'interval', true);
                            }
                            setIsActiveValue(e.target.value);
                        }}
                    />
                </li>
                {isActiveValue === 'true' && (
                    <>
                        <li>
                            <label htmlFor="interval">Prüfintervall (Monate)</label>
                            <select id="interval" required={isActiveValue === 'true'} />
                        </li>
                        <li>
                            <label htmlFor="idNumber">ID (Elektrische Prüfung)</label>
                            <input id="idNumber" type="text" required={isActiveValue === 'true'} />
                        </li>
                        <li>
                            <label htmlFor="lastTest">Letzte elektrische Prüfung</label>
                            <input id="lastTest" type="date" />
                        </li>
                    </>
                )}
                <li>
                    <label htmlFor="remark">Anmerkung</label>
                    <a>Für den internen Gebrauch</a>
                    <input id="remark" />
                </li>
                <li>
                    <label htmlFor="status">Produktstatus</label>
                    <select id="status" required />
                </li>
                <li style={{ marginTop: 16 }}>
                    <button type="submit">Anlegen</button>
                </li>
                <li>
                    <div id="message" ref={messageRef}></div>
                </li>
            </ul>
        </form>
        {showSuccess && (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
            }}>
                <div style={{
                    background: '#fff',
                    borderRadius: 12,
                    padding: '2rem',
                    minWidth: 320,
                    boxShadow: '0 2px 16px #0002',
                    textAlign: 'center'
                }}>
                    <h2>Produkt erfolgreich angelegt!</h2>
                    <div style={{ margin: '1.5rem 0' }}>
                        Was möchten Sie als nächstes tun?
                    </div>
                    <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: '#646cff',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '0.7rem 1.2rem',
                                fontSize: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Neues Produkt anlegen
                        </button>
                        <button
                            onClick={() => navigate('/equipment')}
                            style={{
                                background: '#535bf2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 6,
                                padding: '0.7rem 1.2rem',
                                fontSize: '1rem',
                                cursor: 'pointer'
                            }}
                        >
                            Zum Menü
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
);
}