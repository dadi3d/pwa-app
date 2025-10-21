#!/bin/sh
echo "🚀 Starting PWA-App Container..."
echo "📅 Date: $(date)"
echo "🐳 Container: medienausleihe-app"
echo ""
echo "🔧 Runtime Environment Variables:"
echo "NGINX_VERSION: $(nginx -v 2>&1 | cut -d'/' -f2)"
echo "INTERNAL_PORT: 80"
if [ -n "$APP_PORT" ]; then
    echo "EXTERNAL_PORT: $APP_PORT"
else
    echo "EXTERNAL_PORT: Not set"
fi
echo ""
echo "📦 Built with Configuration:"

# Read build configuration from file
if [ -f /build-config.txt ]; then
    while IFS='=' read -r key value; do
        case $key in
            VITE_SERVER_URL)
                if [ -n "$value" ]; then
                    echo "- Server URL: $value"
                else
                    echo "- Server URL: Not set"
                fi
                ;;
            VITE_APP_NAME)
                if [ -n "$value" ]; then
                    echo "- App Name: $value"
                else
                    echo "- App Name: Not set"
                fi
                ;;
            VITE_GOOGLE_CALENDAR_API_KEY)
                if [ -n "$value" ]; then
                    echo "- Google Calendar API: Configured"
                else
                    echo "- Google Calendar API: Not configured"
                fi
                ;;
            VITE_GOOGLE_MAPS_API_KEY)
                if [ -n "$value" ]; then
                    echo "- Google Maps API: Configured"
                else
                    echo "- Google Maps API: Not configured"
                fi
                ;;
        esac
    done < /build-config.txt
else
    echo "- Configuration file not found"
fi

echo ""
if [ -n "$APP_PORT" ]; then
    echo "🌐 Access URL: http://localhost:$APP_PORT"
else
    echo "🌐 Access URL: APP_PORT not configured"
fi
echo "📋 Status: Container ready and serving static files"
echo "=========================================="

# Start nginx
nginx -g "daemon off;"