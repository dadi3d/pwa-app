import { MAIN_VARIABLES } from '../../config.js';
import { authenticatedFetch } from './auth.js';

/**
 * Settings Service für API-Aufrufe
 */
export class SettingsService {
  
  /**
   * Lädt alle Einstellungen vom Server
   * @returns {Promise<Object>} Die aktuellen Einstellungen
   */
  static async fetchSettings() {
    try {
      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      throw error;
    }
  }

  /**
   * Speichert alle Einstellungen auf dem Server
   * @param {Object} settings - Die zu speichernden Einstellungen
   * @returns {Promise<Object>} Die gespeicherten Einstellungen
   */
  static async saveSettings(settings) {
    try {
      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Speichern der Einstellungen:', error);
      throw error;
    }
  }

  /**
   * Aktualisiert einzelne Einstellungsfelder
   * @param {Object} updates - Die zu aktualisierenden Felder
   * @returns {Promise<Object>} Die aktualisierten Einstellungen
   */
  static async updateSettings(updates) {
    try {
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Einstellungen:', error);
      throw error;
    }
  }

  /**
   * Lädt nur den editierbaren HTML-Text der Startseite
   * @returns {Promise<string>} Der HTML-Text
   */
  static async getHomePageText() {
    try {
      const response = await authenticatedFetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings/home-text`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Fehler beim Laden des Startseiten-Textes:', error);
      throw error;
    }
  }

  /**
   * Speichert nur den editierbaren HTML-Text der Startseite
   * @param {string} htmlText - Der neue HTML-Text
   * @returns {Promise<Object>} Die aktualisierten Einstellungen
   */
  static async updateHomePageText(htmlText) {
    try {
      return await this.updateSettings({ homePageText: htmlText });
    } catch (error) {
      console.error('Fehler beim Speichern des Startseiten-Textes:', error);
      throw error;
    }
  }

  /**
   * Setzt alle Einstellungen auf Standardwerte zurück
   * @returns {Promise<Object>} Die zurückgesetzten Einstellungen
   */
  static async resetSettings() {
    try {
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/settings/reset`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fehler beim Zurücksetzen der Einstellungen:', error);
      throw error;
    }
  }
}

export default SettingsService;