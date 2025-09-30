// Use environment variable with fallback
const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const MAIN_VARIABLES = {
  SERVER_URL,
  FLMN_API_KEY: 'vBnHUoygoqfxdIAUJ3JAtelX',
  FLMN_URL_FILE_MANAGER: `${SERVER_URL}/flmngr`,
  FLMN_URL_FILES: `${SERVER_URL}/files`,
};