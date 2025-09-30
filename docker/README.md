# Docker Setup für PWA-App (Frontend)

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