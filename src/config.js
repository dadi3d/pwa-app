// Use environment variable with fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

export const MAIN_VARIABLES = {
  SERVER_URL,
};

// For debugging: log the server URL in development
if (import.meta.env.DEV) {
  console.log('🔗 Server URL:', SERVER_URL);
}