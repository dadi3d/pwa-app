#!/bin/sh
echo "🚀 Starting PWA-App Container..."
echo "📅 Date: $(date)"
echo "🐳 Container: medienausleihe-app"
echo ""
echo "🔧 Runtime Environment Variables:"
echo "NGINX_VERSION: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "PORT: 80"
echo ""
echo "📦 Built with Configuration:"

# Read build configuration from file
if [ -f /build-config.txt ]; then
    while IFS='=' read -r key value; do
        case $key in
            VITE_SERVER_URL)
                echo "- Server URL: $value"
                ;;
            VITE_APP_NAME)
                echo "- App Name: $value"
                ;;
            VITE_GOOGLE_CALENDAR_API_KEY)
                echo "- Google Calendar API: $value"
                ;;
            VITE_GOOGLE_MAPS_API_KEY)
                echo "- Google Maps API: $value"
                ;;
        esac
    done < /build-config.txt
else
    echo "- Configuration file not found"
fi

echo ""
echo "🌐 Access URL: http://localhost:8080"
echo "📋 Status: Container ready and serving static files"
echo "=========================================="

# Start nginx
nginx -g "daemon off;"