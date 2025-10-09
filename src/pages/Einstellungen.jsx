import { useEffect, useState } from "react";
import { MAIN_VARIABLES } from "../config";
import { SettingsService } from "./services/Settings.js";
import { Button } from "../styles/catalyst/button";
import packageJson from '../../package.json';

const weekdays = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];
const weekdayLabels = {
  monday: "Montag",
  tuesday: "Dienstag", 
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag"
};

export default function Einstellungen() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [settings, setSettings] = useState(null);
    const [homePageText, setHomePageText] = useState("");
    const [events, setEvents] = useState([]);
    
    const [serverStatus, setServerStatus] = useState({ status: 'checking', label: 'Prüfe...' });
    const [mongoStatus, setMongoStatus] = useState({ status: 'checking', label: 'Prüfe...' });
    const [dbStatus, setDbStatus] = useState(null);
    const [filesStatus, setFilesStatus] = useState(null);
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupMessage, setBackupMessage] = useState("");
    const [filesBackupLoading, setFilesBackupLoading] = useState(false);
    const [filesBackupMessage, setFilesBackupMessage] = useState("");
    const [restoreFile, setRestoreFile] = useState(null);
    const [filesRestoreFile, setFilesRestoreFile] = useState(null);
    const [serverInfo, setServerInfo] = useState(null);

    useEffect(() => {
        fetchSettings();
        checkSystemStatus();
        fetchDbStatus();
        fetchFilesStatus();
        fetchEvents();
        fetchServerInfo();
    }, []);

    async function fetchSettings() {
        setLoading(true);
        setMessage("");
        try {
            const data = await SettingsService.fetchSettings();
            setSettings(data);
            setHomePageText(data.homePageText || '<p>Willkommen zur Medienausleihe! Hier können Sie Equipment für Ihre Projekte ausleihen.</p>');
        } catch (error) {
            setMessage("❌ Fehler beim Laden der Einstellungen: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function saveSettings() {
        setLoading(true);
        setMessage("");
        try {
            const updatedSettings = { ...settings, homePageText };
            await SettingsService.updateSettings(updatedSettings);
            setMessage("✅ Einstellungen gespeichert!");
            setSettings(updatedSettings);
        } catch (error) {
            setMessage("❌ Fehler beim Speichern: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchEvents() {
        setLoading(true);
        try {
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/google-calendar/events`);
            const data = await response.json();
            
            if (response.ok) {
                setEvents(data || []);
            } else {
                setMessage(`Fehler beim Laden der Events: ${data.message || 'Unbekannter Fehler'}`);
            }
        } catch (error) {
            console.error('Error fetching events:', error);
            setMessage('Fehler beim Laden der Events: Netzwerkfehler');
        } finally {
            setLoading(false);
        }
    }

    async function syncCalendar() {
        setLoading(true);
        try {
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/google-calendar/sync-calendar`, {
                method: 'POST'
            });
            const data = await response.json();
            
            if (response.ok) {
                setMessage(`✅ Kalender synchronisiert! ${data.created || 0} Events erstellt (nur nicht-gelöschte Orders)`);
                // Events nach Synchronisation neu laden
                await fetchEvents();
            } else {
                setMessage(`Fehler beim Synchronisieren: ${data.error || 'Unbekannter Fehler'}`);
            }
        } catch (error) {
            console.error('Error syncing calendar:', error);
            setMessage('Fehler beim Synchronisieren: Netzwerkfehler');
        } finally {
            setLoading(false);
        }
    }

    const updateOpeningHours = (day, field, value) => {
        if (!settings) return;
        const newSettings = { ...settings };
        if (!newSettings.openingHours) {
            newSettings.openingHours = {};
        }
        if (!newSettings.openingHours[day]) {
            newSettings.openingHours[day] = { open: "", close: "", closed: false };
        }
        newSettings.openingHours[day][field] = value;
        setSettings(newSettings);
    };

    async function checkSystemStatus() {
        try {
            const serverRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/status`);
            if (serverRes.ok) {
                setServerStatus({ status: 'online', label: 'Verbunden' });
                const dbData = await serverRes.json();
                if (dbData.success) {
                    setMongoStatus({ 
                        status: 'connected', 
                        label: 'Verbunden' 
                    });
                } else {
                    setMongoStatus({ status: 'offline', label: 'Nicht verbunden' });
                }
            } else {
                setServerStatus({ status: 'offline', label: 'Nicht erreichbar' });
            }
        } catch (error) {
            setServerStatus({ status: 'offline', label: 'Verbindungsfehler' });
            setMongoStatus({ status: 'offline', label: 'Unbekannt' });
        }
    }

    async function fetchDbStatus() {
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/status`);
            const data = await res.json();
            if (res.ok) {
                setDbStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch database status:', error);
        }
    }

    async function fetchFilesStatus() {
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/files-status`);
            const data = await res.json();
            if (res.ok) {
                setFilesStatus(data);
            }
        } catch (error) {
            console.error('Failed to fetch files status:', error);
        }
    }

    async function fetchServerInfo() {
        try {
            const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/server/info`);
            const data = await res.json();
            if (res.ok) {
                setServerInfo(data);
            }
        } catch (error) {
            console.error('Failed to fetch server info:', error);
            // Fallback values if API is not available
            setServerInfo({
                version: '0.1.0a',
                buildDate: '10.09.2025',
                port: 3001,
                nodeVersion: 'N/A',
                environment: 'production'
            });
        }
    }

    const handleBackupDownload = async () => {
        const password = getBackupPassword();
        if (!password) return;

        setBackupLoading(true);
        setBackupMessage("🔄 Erstelle Backup...");
        
        try {
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/download`, {
                method: 'POST',
                headers: {
                    'x-backup-password': password
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `medienausleihe-backup-${new Date().toISOString().split('T')[0]}.tar.gz`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                setBackupMessage("✅ Backup erfolgreich heruntergeladen!");
                await fetchDbStatus();
            } else {
                const errorData = await response.json();
                setBackupMessage(`❌ Backup fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`);
            }
        } catch (error) {
            setBackupMessage(`❌ Backup fehlgeschlagen: ${error.message}`);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleBackupRestore = async () => {
        if (!restoreFile) return;

        const password = getBackupPassword();
        if (!password) return;
        
        setBackupLoading(true);
        setBackupMessage("🔄 Stelle Backup wieder her...");
        
        try {
            const formData = new FormData();
            formData.append('backupFile', restoreFile);
            
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/upload`, {
                method: 'POST',
                headers: {
                    'x-backup-password': password
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                setBackupMessage(`✅ Backup erfolgreich wiederhergestellt! ${data.sourceDatabase ? `(${data.sourceDatabase} → medienausleihe)` : ''}`);
                setRestoreFile(null);
                await fetchDbStatus();
                await checkSystemStatus();
            } else {
                setBackupMessage(`❌ Restore fehlgeschlagen: ${data.error || 'Unbekannter Fehler'}`);
            }
        } catch (error) {
            setBackupMessage(`❌ Restore fehlgeschlagen: ${error.message}`);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleDbClear = async () => {
        if (!window.confirm('⚠️ WARNUNG: Alle Daten werden unwiderruflich gelöscht! Fortfahren?')) {
            return;
        }

        const password = getBackupPassword();
        if (!password) return;
        
        setBackupLoading(true);
        setBackupMessage("🗑️ Lösche Datenbank...");
        
        try {
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/clear`, {
                method: 'POST',
                headers: {
                    'x-backup-password': password
                }
            });
            
            const data = await response.json();
            
            if (data.success) {
                setBackupMessage(`✅ Datenbank geleert! ${data.deletedCollections?.length || 0} Collections gelöscht.`);
                await fetchDbStatus();
                await checkSystemStatus();
            } else {
                setBackupMessage(`❌ Löschen fehlgeschlagen: ${data.error || 'Unbekannter Fehler'}`);
            }
        } catch (error) {
            setBackupMessage(`❌ Löschen fehlgeschlagen: ${error.message}`);
        } finally {
            setBackupLoading(false);
        }
    };

    const handleFilesBackupDownload = async () => {
        const password = getBackupPassword();
        if (!password) return;

        setFilesBackupLoading(true);
        setFilesBackupMessage("🔄 Erstelle Files-Backup...");
        
        try {
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/download-files`, {
                method: 'POST',
                headers: {
                    'x-backup-password': password
                }
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `medienausleihe-files-backup-${new Date().toISOString().split('T')[0]}.tar.gz`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                setFilesBackupMessage("✅ Files-Backup erfolgreich heruntergeladen!");
                await fetchFilesStatus();
            } else {
                const errorData = await response.json();
                setFilesBackupMessage(`❌ Files-Backup fehlgeschlagen: ${errorData.error || 'Unbekannter Fehler'}`);
            }
        } catch (error) {
            setFilesBackupMessage(`❌ Files-Backup fehlgeschlagen: ${error.message}`);
        } finally {
            setFilesBackupLoading(false);
        }
    };

    const handleFilesBackupRestore = async () => {
        if (!filesRestoreFile) return;

        const password = getBackupPassword();
        if (!password) return;
        
        setFilesBackupLoading(true);
        setFilesBackupMessage("🔄 Stelle Files-Backup wieder her...");
        
        try {
            const formData = new FormData();
            formData.append('filesBackupFile', filesRestoreFile);
            
            const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/backup/upload-files`, {
                method: 'POST',
                headers: {
                    'x-backup-password': password
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                setFilesBackupMessage(`✅ Files-Backup erfolgreich wiederhergestellt! ${data.restoredDirectories ? `(${data.restoredDirectories.join(', ')})` : ''}`);
                setFilesRestoreFile(null);
                await fetchFilesStatus();
            } else {
                setFilesBackupMessage(`❌ Files-Restore fehlgeschlagen: ${data.error || 'Unbekannter Fehler'}`);
            }
        } catch (error) {
            setFilesBackupMessage(`❌ Files-Restore fehlgeschlagen: ${error.message}`);
        } finally {
            setFilesBackupLoading(false);
        }
    };

    // Backup Password Helper - Popup-basiert
    const getBackupPassword = () => {
        const password = window.prompt('🔐 Backup-Passwort eingeben:', '');
        if (!password || password.trim() === '') {
            return null; // Benutzer hat abgebrochen oder kein Passwort eingegeben
        }
        return password.trim();
    };

    // Status Badge Component
    const StatusBadge = ({ status, label }) => {
        const isOnline = status === 'online' || status === 'connected';
        return (
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isOnline 
                    ? 'bg-green-100 text-green-800 border border-green-200' 
                    : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                    isOnline ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                {label}
            </div>
        );
    };

    // Section Header Component
    const SectionHeader = ({ icon, title, status, address }) => (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
                <div className="text-2xl mr-3">{icon}</div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                    {address && (
                        <p className="text-sm text-gray-600 mt-1">{address}</p>
                    )}
                </div>
            </div>
            {status && <StatusBadge status={status.status} label={status.label} />}
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
                    <p className="mt-2 text-gray-600">Verwalten Sie System-, Server- und Datenbankeinstellungen</p>
                </div>

                {/* Status Messages */}
                {message && (
                    <div className={`mb-6 p-4 rounded-lg border ${
                        message.includes('✅') 
                            ? 'bg-green-50 text-green-800 border-green-200' 
                            : 'bg-red-50 text-red-800 border-red-200'
                    }`}>
                        {message}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
                    
                    {/* APP BEREICH */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
                        <SectionHeader 
                            icon="💻" 
                            title="PWA App" 
                            status={{ status: 'online', label: 'Online' }}
                            address={window.location.origin}
                        />
                        
                        <div className="space-y-6">
                            {/* Homepage Text Editor */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Homepage Text
                                </label>
                                <textarea
                                    value={homePageText}
                                    onChange={(e) => setHomePageText(e.target.value)}
                                    rows={4}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                    placeholder="HTML für die Homepage eingeben..."
                                />
                            </div>

                            {/* Öffnungszeiten */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Öffnungszeiten
                                </label>
                                <div className="space-y-3">
                                    {weekdays.map(day => (
                                        <div key={day} className="flex items-center space-x-3">
                                            <div className="w-20 text-sm text-gray-600">
                                                {weekdayLabels[day]}
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={!settings?.openingHours?.[day]?.closed}
                                                onChange={(e) => updateOpeningHours(day, 'closed', !e.target.checked)}
                                                className="rounded text-blue-600 focus:ring-blue-500"
                                            />
                                            <input
                                                type="time"
                                                value={settings?.openingHours?.[day]?.open || ''}
                                                onChange={(e) => updateOpeningHours(day, 'open', e.target.value)}
                                                disabled={settings?.openingHours?.[day]?.closed}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                            />
                                            <span className="text-gray-400">bis</span>
                                            <input
                                                type="time"
                                                value={settings?.openingHours?.[day]?.close || ''}
                                                onChange={(e) => updateOpeningHours(day, 'close', e.target.value)}
                                                disabled={settings?.openingHours?.[day]?.closed}
                                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* App Status */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">App Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Version:</span>
                                        <span className="font-mono">{packageJson.version}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Status:</span>
                                        <span className="text-green-600 font-medium">Online</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Framework:</span>
                                        <span className="font-mono">React + Vite</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">PWA:</span>
                                        <span className="font-mono">Aktiviert</span>
                                    </div>
                                </div>
                            </div>

                            {/* Save Button */}
                            <Button
                                onClick={saveSettings}
                                disabled={loading}
                                outline
                                className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full"
                            >
                                {loading ? '🔄 Speichere...' : '💾 Einstellungen speichern'}
                            </Button>
                        </div>
                    </div>

                    {/* SERVER BEREICH */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
                        <SectionHeader 
                            icon="🖥️" 
                            title="pwa-server" 
                            status={serverStatus}
                            address={MAIN_VARIABLES.SERVER_URL}
                        />
                        
                        <div className="space-y-6">
                            {/* Google Calendar Integration */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Google Calendar</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">Events geladen:</span>
                                        <span className="text-sm font-medium">{events.length}</span>
                                    </div>
                                    {events.length > 0 && (
                                        <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                            ✓ Kalender erfolgreich geladen
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        <Button
                                            onClick={fetchEvents}
                                            disabled={loading}
                                            outline
                                            className="hover:border-blue-500 hover:text-blue-600 transition-colors duration-200 w-full"
                                        >
                                            {loading ? '🔄 Lade...' : '📅 Events laden'}
                                        </Button>
                                        <Button
                                            onClick={syncCalendar}
                                            disabled={loading}
                                            outline
                                            className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full"
                                        >
                                            {loading ? '🔄 Synchronisiere...' : '� Kalender synchronisieren'}
                                        </Button>
                                    </div>
                                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                                        <p className="text-xs text-yellow-800">
                                            <strong>💡 Hinweis:</strong> "Synchronisieren" erstellt den Kalender neu und filtert gelöschte Orders heraus.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Server Info */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Server Information</h3>
                                <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Version:</span>
                                        <span className="font-mono">{serverInfo?.version || 'Laden...'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Build:</span>
                                        <span className="font-mono">{serverInfo?.buildDate || 'Laden...'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Port:</span>
                                        <span className="font-mono">{serverInfo?.port || 'Laden...'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Node.js:</span>
                                        <span className="font-mono">{serverInfo?.nodeVersion || 'Laden...'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Environment:</span>
                                        <span className="font-mono">{serverInfo?.environment || 'Laden...'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Memory:</span>
                                        <span className="font-mono">
                                            {serverInfo?.memory ? 
                                                `${serverInfo.memory.used}MB / ${serverInfo.memory.total}MB` : 
                                                'Laden...'
                                            }
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Uptime:</span>
                                        <span className="font-mono">
                                            {serverInfo?.uptime ? 
                                                `${Math.floor(serverInfo.uptime / 3600)}h ${Math.floor((serverInfo.uptime % 3600) / 60)}m` : 
                                                'Laden...'
                                            }
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MONGODB BEREICH */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
                        <SectionHeader 
                            icon="🗄️" 
                            title="MongoDB" 
                            status={mongoStatus}
                            address="mongodb://localhost:27017/medienausleihe"
                        />
                        
                        <div className="space-y-6">
                            {/* Database Status */}
                            {dbStatus && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-3">Datenbank Status</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Collections:</span>
                                            <span className="font-medium">{dbStatus.collections || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Dokumente:</span>
                                            <span className="font-medium">{dbStatus.totalDocuments || 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Datenbank:</span>
                                            <span className="font-mono text-xs">{dbStatus.database || 'medienausleihe'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Backup Actions */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Backup & Restore</h3>
                                <div className="space-y-3">
                                    {/* Download Backup */}
                                    <Button
                                        onClick={handleBackupDownload}
                                        disabled={backupLoading}
                                        outline
                                        className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full"
                                    >
                                        {backupLoading ? '🔄 Erstelle...' : '📥 Backup herunterladen'}
                                    </Button>

                                    {/* Upload & Restore */}
                                    <div className="space-y-2">
                                        <input
                                            type="file"
                                            accept=".tar.gz,.gz"
                                            onChange={(e) => setRestoreFile(e.target.files[0])}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        <Button
                                            onClick={handleBackupRestore}
                                            disabled={!restoreFile || backupLoading}
                                            outline
                                            className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full"
                                        >
                                            {backupLoading ? '🔄 Stelle wieder her...' : '📤 Backup wiederherstellen'}
                                        </Button>
                                    </div>

                                    {/* Clear Database */}
                                    <Button
                                        onClick={handleDbClear}
                                        disabled={backupLoading}
                                        color="red"
                                        className="w-full"
                                    >
                                        {backupLoading ? '🔄 Lösche...' : '🗑️ Datenbank leeren'}
                                    </Button>
                                </div>
                            </div>

                            {/* Hinweise */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Hinweise</h4>
                                <ul className="text-xs text-blue-800 space-y-1">
                                    <li>• Passwort-Eingabe erfolgt per Popup</li>
                                    <li>• Backup enthält alle Collections</li>
                                    <li>• Restore überschreibt alle Daten</li>
                                    <li>• Beliebige DB-Namen werden gemappt</li>
                                    <li>• Container startet mit leerer DB</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* FILES BEREICH */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 min-h-[600px]">
                        <SectionHeader 
                            icon="📁" 
                            title="Files Backup" 
                            status={{ status: 'online', label: 'Verfügbar' }}
                            address="files/"
                        />
                        
                        <div className="space-y-6">
                            {/* Files Status */}
                            {filesStatus && (
                                <div>
                                    <h3 className="text-sm font-medium text-gray-700 mb-3">Files Status</h3>
                                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">files/ Ordner:</span>
                                            <span className="font-medium">
                                                {filesStatus.directories?.files?.exists ? 
                                                    `${filesStatus.directories.files.files} Dateien (${filesStatus.directories.files.sizeMB} MB)` : 
                                                    'Nicht vorhanden'
                                                }
                                            </span>
                                        </div>
                                        <div className="flex justify-between border-t pt-2">
                                            <span className="text-gray-600">Gesamt:</span>
                                            <span className="font-medium">{filesStatus.totalFiles || 0} Dateien ({filesStatus.totalSizeMB || 0} MB)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Files Backup Actions */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-700 mb-3">Files Backup & Restore</h3>
                                <div className="space-y-3">
                                    {/* Download Files Backup */}
                                    <Button
                                        onClick={handleFilesBackupDownload}
                                        disabled={filesBackupLoading}
                                        outline
                                        className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full"
                                    >
                                        {filesBackupLoading ? '🔄 Erstelle...' : '📁 Files-Backup herunterladen'}
                                    </Button>

                                    {/* Upload & Restore Files */}
                                    <div className="space-y-2">
                                        <input
                                            type="file"
                                            accept=".tar.gz,.gz"
                                            onChange={(e) => setFilesRestoreFile(e.target.files[0])}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        <Button
                                            onClick={handleFilesBackupRestore}
                                            disabled={!filesRestoreFile || filesBackupLoading}
                                            outline
                                            className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 w-full"
                                        >
                                            {filesBackupLoading ? '🔄 Stelle wieder her...' : '📁 Files-Backup wiederherstellen'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Files Hinweise */}
                            <div className="bg-green-50 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-green-900 mb-2">📁 Files Hinweise</h4>
                                <ul className="text-xs text-green-800 space-y-1">
                                    <li>• Passwort-Eingabe erfolgt per Popup</li>
                                    <li>• Backup enthält nur files/ Ordner</li>
                                    <li>• Restore erstellt Backup des bestehenden Ordners</li>
                                    <li>• Unterstützt alle Dateiformate</li>
                                    <li>• Originalstruktur wird beibehalten</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Backup Messages */}
                {backupMessage && (
                    <div className={`mt-6 p-4 rounded-lg border ${
                        backupMessage.includes('✅') 
                            ? 'bg-green-50 text-green-800 border-green-200' 
                            : backupMessage.includes('❌')
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                        {backupMessage}
                    </div>
                )}

                {/* Files Backup Messages */}
                {filesBackupMessage && (
                    <div className={`mt-6 p-4 rounded-lg border ${
                        filesBackupMessage.includes('✅') 
                            ? 'bg-green-50 text-green-800 border-green-200' 
                            : filesBackupMessage.includes('❌')
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                    }`}>
                        {filesBackupMessage}
                    </div>
                )}
            </div>
        </div>
    );
}