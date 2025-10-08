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
ARG VITE_APP_NAME

# Set environment variables for build
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_APP_NAME=$VITE_APP_NAME

# Show build-time environment variables
RUN echo "🔧 Build Config:" && \
    echo "VITE_SERVER_URL: $VITE_SERVER_URL" && \
    echo "VITE_APP_NAME: $VITE_APP_NAME" && \
    echo "VITE_SERVER_URL=$VITE_SERVER_URL" > /build-config.txt && \
    echo "VITE_APP_NAME=$VITE_APP_NAME" >> /build-config.txt

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