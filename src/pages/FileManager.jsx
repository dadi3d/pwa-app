import { useState, useEffect } from "react";
import { FileManager } from "@cubone/react-file-manager";
import "@cubone/react-file-manager/dist/style.css";
import './FileManager.css';
import { MAIN_VARIABLES } from "../config";

// Bild-Vorschau-Komponente
const CustomImagePreviewer = ({ file }) => {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);
  if (!isImage) return null;

  const imageUrl = `${MAIN_VARIABLES.SERVER_URL}/api/data/download-data-file?filePath=${encodeURIComponent(file.path)}`;
  return (
    <img
      src={imageUrl}
      alt={file.name}
      style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }}
    />
  );
};

function App() {
  const [files, setFiles] = useState([]);

  // Datenstruktur vom Server abrufen
  useEffect(() => {
    async function fetchDataStructure() {
      try {
        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/get-data-structure`);
        const data = await res.json();
        setFiles(data);
      } catch (err) {
        console.error("Fehler beim Abrufen der Datenstruktur:", err);
      }
    }
    fetchDataStructure();
  }, []);

  const handleRefresh = async () => {
  console.log("Aktualisiere Datenstruktur...");
  try {
    const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/get-data-structure`);
    const data = await res.json();
    setFiles(data);
  } catch (err) {
    console.error("Fehler beim Aktualisieren der Datenstruktur:", err);
  }
};

  const handleRename = async (file, newName) => {
    try {
      const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/rename-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldPath: file.path, newName }),
      });
      if (!res.ok) throw new Error("Fehler beim Umbenennen");
      // Nach erfolgreichem Umbenennen die Datenstruktur neu laden
      handleRefresh();
    } catch (err) {
      console.error("Fehler beim Umbenennen:", err);
    }
  };

  // Wird vom FileManager aufgerufen, wenn eine Datei oder ein Ordner heruntergeladen wird
  const handleDownload = (filesToDownload) => {
    filesToDownload.forEach(file => {
      // Nur Dateien herunterladen, keine Ordner
      if (!file.isDirectory) {
        const url = `${MAIN_VARIABLES.SERVER_URL}/api/data/download-data-file?filePath=${encodeURIComponent(file.path)}`;
        // Download im Browser auslösen
        window.open(url, '_blank');
      }
      // Optional: Für Ordner könntest du eine ZIP-Route nutzen
      // if (file.isDirectory) {
      //   const url = `${MAIN_VARIABLES.SERVER_URL}/api/data/download-data-zip?folderPath=${encodeURIComponent(file.path)}`;
      //   window.open(url, '_blank');
      // }
    });
  };

  // Wird vom FileManager aufgerufen, wenn Dateien/Ordner gelöscht werden
  const handleDelete = async (filesToDelete) => {
    const paths = filesToDelete.map(file => file.path);
    try {
      const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/delete-data`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
      });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      // Nach erfolgreichem Löschen die Datenstruktur neu laden
      handleRefresh();
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
    }
  };

  // Wird vom FileManager aufgerufen, wenn ein neuer Ordner erstellt wird
  const handleCreateFolder = async (name, parentFolder) => {
    try {
      const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/create-folder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentPath: parentFolder?.path || ""
        }),
      });
      if (!res.ok) throw new Error("Fehler beim Erstellen des Ordners");
      // Nach erfolgreichem Erstellen die Datenstruktur neu laden
      handleRefresh();
    } catch (err) {
      console.error("Fehler beim Erstellen des Ordners:", err);
    }
  };

  // Callback während des Uploads, zusätzliche Daten an den Server senden
  const handleFileUploading = (file, parentFolder) => {
    return {
      parentPath: parentFolder?.path || ""
      // Hier können weitere Felder ergänzt werden
    };
  };

  // Callback nach erfolgreichem Upload, neue Datei zur files-List hinzufügen
  const handleFileUploaded = (response) => {
    try {
      // response ist bereits ein Objekt mit File-Infos
      setFiles(prev => [...prev, response]);
    } catch (err) {
      console.error("Fehler beim Verarbeiten des Upload-Response:", err);
    }
  };

  return (
    <>
      <FileManager
        files={files}
        onRefresh={handleRefresh}
        onCreateFolder={handleCreateFolder}
        onRename={handleRename}
        onDownload={handleDownload}
        onDelete={handleDelete}
        onFileUploading={handleFileUploading}
        onFileUploaded={handleFileUploaded}
        filePreviewComponent={file => <CustomImagePreviewer file={file} />}
        fileUploadConfig={{
          url: `${MAIN_VARIABLES.SERVER_URL}/api/data/upload-file`,
          method: "POST",
          headers: { "Accept": "application/json" }
        }}
      />
    </>
  );
}

export default App;