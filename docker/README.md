# PWA-App Docker Setup

## 📱 Frontend Container - React + Vite PWA

Diese Anleitung beschreibt, wie das Frontend der Medienausleihe-Anwendung mit Docker gestartet wird.

## 🚀 Schnellstart

```bash
cd pwa-app/docker
docker-compose up --build
```

Die Anwendung ist dann unter http://localhost:8080 erreichbar.

## ⚙️ Konfiguration

### Environment-Variablen (.env)

Die wichtigsten Einstellungen befinden sich in der `.env` Datei:

```bash
# Build Configuration
NODE_ENV=production
APP_PORT=8080

# Server-Verbindung
VITE_SERVER_URL=http://localhost:3001

# Optional: Google API Keys
# VITE_GOOGLE_CALENDAR_API_KEY=your-google-calendar-api-key-here
# VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
```

### API-Keys einrichten (Optional)

#### Google Calendar API
1. Gehe zur [Google Cloud Console](https://console.cloud.google.com/)
2. Erstelle ein neues Projekt oder wähle ein vorhandenes
3. Aktiviere die "Calendar API"
4. Erstelle einen API-Key unter "Credentials"
5. Füge den Key in die `.env` Datei ein:
   ```
   VITE_GOOGLE_CALENDAR_API_KEY=AIzaSyD...
   ```

#### Google Maps API
1. Gehe zur [Google Cloud Console](https://console.cloud.google.com/)
2. Aktiviere die "Maps JavaScript API"
3. Erstelle einen API-Key
4. Füge den Key in die `.env` Datei ein:
   ```
   VITE_GOOGLE_MAPS_API_KEY=AIzaSyD...
   ```

## 🔧 Docker Commands

### Container starten
```bash
docker-compose up
```

### Container im Hintergrund starten
```bash
docker-compose up -d
```

### Container neu builden
```bash
docker-compose up --build
```

### Container stoppen
```bash
docker-compose down
```

### Logs anzeigen
```bash
docker-compose logs -f
```

## 🌐 Ports

- **Frontend (nginx)**: 8080
- **Development Server**: 5173 (nur während Build)

## 📦 Volumes

- `./src:/app/src` - Live-Reload für Entwicklung
- `./public:/app/public` - Statische Assets

## 🔗 Abhängigkeiten

Das Frontend benötigt:
1. **pwa-server** (Backend API) - muss unter http://localhost:3001 laufen
2. **pwa-mongodb** (Datenbank) - wird vom Backend benötigt

## 📋 Reihenfolge starten

1. **MongoDB starten**: `cd pwa-mongodb/docker && docker-compose up -d`
2. **Server starten**: `cd pwa-server/docker && docker-compose up -d`
3. **App starten**: `cd pwa-app/docker && docker-compose up -d`

## 🐛 Troubleshooting

### Problem: "Server nicht erreichbar"
- Prüfe ob der pwa-server Container läuft
- Überprüfe die VITE_SERVER_URL in der .env Datei

### Problem: "Build failed"
- Lösche node_modules und package-lock.json
- Führe `docker-compose build --no-cache` aus

### Problem: "API-Keys funktionieren nicht"
- Stelle sicher, dass die API-Keys in der .env Datei korrekt eingetragen sind
- Überprüfe ob die entsprechenden APIs in der Google Cloud Console aktiviert sind
- Prüfe die Domain-Beschränkungen für die API-Keys

## 📁 Dateistruktur

```
pwa-app/docker/
├── docker-compose.yml    # Docker Service Definition
├── Dockerfile           # Container Build Instructions
├── .env                # Environment Variablen
├── nginx.conf          # Nginx Web Server Konfiguration
└── README.md           # Diese Anleitung
```

## 🔒 Sicherheit

- Die .env Datei sollte nicht in Git eingecheckt werden
- API-Keys sollten Domain-Beschränkungen haben
- Für Produktion sollten sichere, eindeutige Werte verwendet werden

## Übersicht
Dieses Verzeichnis enthält alle Docker-Konfigurationsdateien für die React/Vite PWA-App.

## Dateien
- `Dockerfile`: Multi-stage Build für React App mit Nginx
- `docker-compose.yml`: Docker Compose Konfiguration
- `nginx.conf`: Nginx-Konfiguration für SPA-Routing
- `.dockerignore`: Optimiert den Docker Build-Kontext

## Verwendung

### Standard-Setup
```bash
cd /path/to/pwa-app/docker
docker-compose up --build
```

### Mit benutzerdefinierter SERVER_URL
```bash
cd /path/to/pwa-app/docker
SERVER_URL=http://your-server:3001 docker-compose up --build
```

### Mit Umgebungsvariablen
```bash
cd /path/to/pwa-app/docker
VITE_SERVER_URL=http://localhost:3001 docker-compose up --build
```

## Zugriff
- Frontend: http://localhost:8080
- Nginx served die React-App im Production-Modus
- Client-Side Routing wird durch nginx.conf unterstützt

## Ports
- Container Port: 80 (Nginx)
- Host Port: 8080