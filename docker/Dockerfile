# Multi-stage build for React/Vite app
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build arguments (must be provided at build time)
ARG VITE_SERVER_URL
ARG VITE_MONGODB_URL
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CALENDAR_API_KEY
ARG VITE_GOOGLE_MAPS_API_KEY
ARG VITE_APP_NAME
ARG VITE_APP_SHORT_NAME
ARG VITE_APP_DESCRIPTION

# Set environment variables for build
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_MONGODB_URL=$VITE_MONGODB_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CALENDAR_API_KEY=$VITE_GOOGLE_CALENDAR_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_SHORT_NAME=$VITE_APP_SHORT_NAME
ENV VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION

# Show build-time environment variables and save to file
RUN echo "🔧 PWA-App Build Configuration:" && \
    echo "NODE_ENV: $NODE_ENV" && \
    echo "VITE_SERVER_URL: $VITE_SERVER_URL" && \
    echo "VITE_MONGODB_URL: $VITE_MONGODB_URL" && \
    echo "VITE_API_BASE_URL: $VITE_API_BASE_URL" && \
    echo "VITE_APP_NAME: $VITE_APP_NAME" && \
    echo "VITE_APP_SHORT_NAME: $VITE_APP_SHORT_NAME" && \
    echo "VITE_APP_DESCRIPTION: $VITE_APP_DESCRIPTION" && \
    echo "VITE_GOOGLE_CALENDAR_API_KEY: $(if [ -n "$VITE_GOOGLE_CALENDAR_API_KEY" ]; then echo "***SET***"; else echo "not set"; fi)" && \
    echo "VITE_GOOGLE_MAPS_API_KEY: $(if [ -n "$VITE_GOOGLE_MAPS_API_KEY" ]; then echo "***SET***"; else echo "not set"; fi)" && \
    echo "----------------------------------------" && \
    echo "# Build-time configuration" > /build-config.txt && \
    echo "VITE_SERVER_URL=$VITE_SERVER_URL" >> /build-config.txt && \
    echo "VITE_MONGODB_URL=$VITE_MONGODB_URL" >> /build-config.txt && \
    echo "VITE_API_BASE_URL=$VITE_API_BASE_URL" >> /build-config.txt && \
    echo "VITE_APP_NAME=$VITE_APP_NAME" >> /build-config.txt && \
    echo "VITE_APP_SHORT_NAME=$VITE_APP_SHORT_NAME" >> /build-config.txt && \
    echo "VITE_APP_DESCRIPTION=$VITE_APP_DESCRIPTION" >> /build-config.txt && \
    echo "VITE_GOOGLE_CALENDAR_API_KEY=$(if [ -n "$VITE_GOOGLE_CALENDAR_API_KEY" ]; then echo "***SET***"; else echo "not set"; fi)" >> /build-config.txt && \
    echo "VITE_GOOGLE_MAPS_API_KEY=$(if [ -n "$VITE_GOOGLE_MAPS_API_KEY" ]; then echo "***SET***"; else echo "not set"; fi)" >> /build-config.txt

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx configuration
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Copy build configuration from build stage
COPY --from=build /build-config.txt /build-config.txt

# Copy startup script
COPY docker/startup.sh /startup.sh
RUN chmod +x /startup.sh

# Expose port 80
EXPOSE 80

# Start with custom script
CMD ["/startup.sh"]