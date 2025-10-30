import React, { useEffect, useState } from "react";
import { MAIN_VARIABLES } from "../config";

export default function TestSetsImages() {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSetsWithImages();
  }, []);

  async function fetchSetsWithImages() {
    try {
      setLoading(true);
      const response = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Sets with images:', data);
      setSets(data);
    } catch (err) {
      console.error('Fehler beim Laden der Sets:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const getImageUrl = (imagePath) => {
    // Entferne "files/" vom Pfad wenn vorhanden
    const cleanPath = imagePath.startsWith('files/') ? imagePath.substring(6) : imagePath;
    return `${MAIN_VARIABLES.SERVER_URL}/api/files/${cleanPath}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Test: Sets mit Bildern</h1>
        <p>Lade Sets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1>Test: Sets mit Bildern</h1>
        <p style={{ color: 'red' }}>Fehler: {error}</p>
        <button onClick={fetchSetsWithImages} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ marginBottom: '2rem', color: '#333' }}>Test: Sets mit Bildern</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <button 
          onClick={fetchSetsWithImages}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#646cff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Sets neu laden
        </button>
        <span style={{ marginLeft: '1rem', color: '#666' }}>
          Gefunden: {sets.length} Sets
        </span>
      </div>

      {sets.length === 0 ? (
        <p>Keine Sets gefunden.</p>
      ) : (
        <div style={{ display: 'grid', gap: '2rem' }}>
          {sets.map((set, index) => (
            <div 
              key={set._id} 
              style={{
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '1.5rem',
                backgroundColor: '#f9f9f9'
              }}
            >
              <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#333' }}>
                Set #{index + 1}: {set.manufacturer?.name} - {set.set_name?.name?.de}
              </h2>
              
              <div style={{ marginBottom: '1rem' }}>
                <p><strong>Set-ID:</strong> {set._id}</p>
                <p><strong>Set-Nummer:</strong> {set.set_number}</p>
                <p><strong>Kategorie:</strong> {set.category?.name?.de || 'N/A'}</p>
                <p><strong>Status:</strong> {set.state?.name?.de || 'N/A'}</p>
                <p><strong>Zugehörigkeit:</strong> {set.set_relation?.name || 'N/A'}</p>
              </div>

              <div>
                <h3 style={{ marginBottom: '1rem', color: '#555' }}>
                  Bilder ({set.images?.length || 0})
                </h3>
                
                {!set.images || set.images.length === 0 ? (
                  <p style={{ color: '#999', fontStyle: 'italic' }}>Keine Bilder vorhanden</p>
                ) : (
                  <div>
                    {/* Bild-Liste als Text */}
                    <div style={{ marginBottom: '1rem' }}>
                      <h4>Bild-Pfade:</h4>
                      <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                        {set.images.map((image, imgIndex) => (
                          <li key={imgIndex} style={{ marginBottom: '0.5rem' }}>
                            <code style={{ backgroundColor: '#e9e9e9', padding: '2px 4px', borderRadius: '3px' }}>
                              {image.path}
                            </code>
                            {image.isThumbnail && (
                              <span style={{ 
                                marginLeft: '0.5rem', 
                                color: '#ff6b35', 
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                              }}>
                                [THUMBNAIL]
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bilder anzeigen */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      {set.images.map((image, imgIndex) => (
                        <div key={imgIndex} style={{ textAlign: 'center' }}>
                          <img
                            src={getImageUrl(image.path)}
                            alt={`Set Bild ${imgIndex + 1}`}
                            style={{
                              maxWidth: '150px',
                              maxHeight: '150px',
                              border: image.isThumbnail ? '3px solid #ff6b35' : '1px solid #ccc',
                              borderRadius: '4px',
                              objectFit: 'contain'
                            }}
                            onError={(e) => {
                              e.target.style.border = '2px solid red';
                              e.target.alt = 'Bild nicht gefunden';
                            }}
                          />
                          <p style={{ 
                            fontSize: '0.8rem', 
                            margin: '0.5rem 0 0 0',
                            color: image.isThumbnail ? '#ff6b35' : '#666'
                          }}>
                            {image.isThumbnail ? 'Thumbnail' : `Bild ${imgIndex + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* JSON Debug-Ausgabe */}
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', color: '#666' }}>
                  JSON Debug (klicken zum Aufklappen)
                </summary>
                <pre style={{
                  backgroundColor: '#f0f0f0',
                  padding: '1rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                  fontSize: '0.8rem',
                  marginTop: '0.5rem'
                }}>
                  {JSON.stringify(set, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}