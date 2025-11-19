import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserData, useAuth } from './services/auth';
import { MAIN_VARIABLES } from '../config';
import { Button } from '../styles/catalyst/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../styles/catalyst/dialog';

export default function Auftraege() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [enrichedSets, setEnrichedSets] = useState({});
  const [thumbnailUrls, setThumbnailUrls] = useState({}); // Cache für Thumbnail-URLs
  const token = useAuth(state => state.token);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      const user = await fetchUserData();
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id || user._id);

      // Orders direkt gefiltert vom Backend laden, JWT im Header mitsenden
      const res = await fetch(
        `${MAIN_VARIABLES.SERVER_URL}/api/orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      let myOrders;
      try {
        myOrders = await res.json();
      } catch {
        myOrders = [];
      }
    
      // Prüfen, ob Array, sonst leeres Array setzen
      setOrders(Array.isArray(myOrders) ? myOrders : []);
      setLoading(false);
    }
    loadOrders();
  }, [token]);

  if (loading) return (
    <>
      <h1 className="text-center text-3xl font-semibold text-gray-800 mb-8">Meine Bestellungen</h1>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
          <div className="text-lg font-medium text-gray-600 mb-2">Lade Bestellungen...</div>
          <div className="text-sm text-gray-500">Bitte warten Sie einen Moment.</div>
        </div>
      </div>
    </>
  );
  
  if (!userId) return (
    <>
      <h1 className="text-center text-3xl font-semibold text-gray-800 mb-8">Meine Bestellungen</h1>
      <div className="max-w-4xl mx-auto">
        <div className="bg-orange-50 rounded-xl shadow-md p-8 text-center border border-orange-200">
          <div className="text-lg font-medium text-orange-800 mb-2">Keine Nutzerinformationen gefunden</div>
          <div className="text-sm text-orange-600">Bitte melden Sie sich erneut an.</div>
        </div>
      </div>
    </>
  );

  // Popup Funktionen
  const openOrderDetails = async (order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
    
    // Debug: Set-Daten in der Konsole ausgeben
    if (order.sets && order.sets.length > 0) {
      console.log('Raw set data:', order.sets);
      order.sets.forEach((set, index) => {
        console.log(`Set ${index + 1}:`, set);
        console.log(`Set ${index + 1} - manufacturer:`, set.manufacturer);
        console.log(`Set ${index + 1} - set_name:`, set.set_name?.name?.de);
      });
      
      // Thumbnail-URLs für Sets laden, falls noch nicht vorhanden
      for (const set of order.sets) {
        const setId = set._id || set.id;
        if (setId && !thumbnailUrls[setId]) {
          try {
            const thumbnailRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${setId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            const thumbnailData = await thumbnailRes.json();
            setThumbnailUrls(prev => ({
              ...prev,
              [setId]: `${MAIN_VARIABLES.SERVER_URL}${thumbnailData.path}`
            }));
          } catch (err) {
            console.error(`Fehler beim Laden des Thumbnails für Set ${setId}:`, err);
            setThumbnailUrls(prev => ({
              ...prev,
              [setId]: `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`
            }));
          }
        }
      }
    }
  };

  const closeOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrder(null);
  };

  // Hilfsfunktion für Datum-Formatierung
  const formatDate = (dateString) => {
    if (!dateString) return '–';
    return new Date(dateString).toLocaleDateString('de-DE', {
      weekday: 'short',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Hilfsfunktion für Status-Badge
  function StatusBadge({ status }) {
    let style = { backgroundColor: 'var(--color-gray-400)' };
    let displayText = status;
    
    if (status === 'Bestätigt' || status === 'confirmed') {
      style = { backgroundColor: '#10b981' }; // Grün
      displayText = 'Bestätigt';
    }
    else if (status === 'Abgelehnt' || status === 'rejected') {
      style = { backgroundColor: '#ef4444' }; // Rot
      displayText = 'Abgelehnt';
    }
    else if (status === 'Offen' || status === 'pending') {
      style = { backgroundColor: '#f59e0b' }; // Orange
      displayText = 'Offen';
    }
    
    return (
      <span className="text-white rounded-full px-3 py-1 text-xs font-medium" style={style}>
        {displayText}
      </span>
    );
  }

  return (
    <>
      <h1 className="text-center text-3xl font-semibold text-gray-800 mb-8">Meine Bestellungen</h1>
      
      {/* Header und Aktionsbereich */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-center">
          <Button
            outline
            onClick={() => navigate('/auftrag-anlegen')}
            className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200"
          >
            + Neuen Auftrag anlegen
          </Button>
        </div>
      </div>
      
      {orders.length === 0 ? (
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-100 rounded-xl shadow-md p-8 text-center text-gray-600 border border-gray-200">
            <div className="text-lg font-medium mb-2">Keine Bestellungen gefunden</div>
            <div className="text-sm text-gray-500">Sie haben noch keine Bestellungen erstellt.</div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {orders.map(order => (
            <div 
              key={order._id} 
              className="bg-white rounded-xl shadow-md transition-all duration-200 overflow-hidden border border-gray-200 hover:shadow-xl hover:border-orange-500 cursor-pointer group"
              onClick={() => openOrderDetails(order)}
            >
              {/* Header Section */}
              <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 group-hover:from-orange-50 group-hover:to-orange-100 transition-all duration-200">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
                    {order.name || 'Unbenannte Bestellung'}
                  </h3>
                  <StatusBadge status={order.state?.name?.de || order.state?.name || 'Offen'} />
                </div>
                <p className="text-sm text-gray-600">
                  {order.location || 'Kein Ort angegeben'}
                </p>
              </div>
              
              {/* Quick Info Section */}
              <div className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-700 w-20">Zeitraum:</span>
                    <span className="text-gray-600">
                      {formatDate(order.rent_start)} <br></br> {formatDate(order.rent_end)}
                    </span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <span className="font-medium text-gray-700 w-20">Equipment:</span>
                    <span className="text-gray-600">
                      {order.sets && order.sets.length > 0 
                        ? `${order.sets.length} Set${order.sets.length !== 1 ? 's' : ''}`
                        : 'Keine Sets'
                      }
                    </span>
                  </div>
                  
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Button 
                    outline 
                    className="w-full hover:border-orange-500 hover:text-orange-600 transition-colors duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      openOrderDetails(order);
                    }}
                  >
                    Details anzeigen
                  </Button>
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      )}      {/* Order Details Popup */}
      <Dialog open={showOrderDetails} onClose={closeOrderDetails} size="4xl">
        <DialogTitle>
          Auftrag Details: {selectedOrder?.name || 'Unbenannte Bestellung'}
        </DialogTitle>
        <DialogBody className="max-h-[70vh] overflow-y-auto">
          {selectedOrder && (
            <div className="space-y-6">
              {/* Status und Grundinformationen */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedOrder.name || 'Unbenannte Bestellung'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Auftrag ID: <span className="font-mono">{selectedOrder._id}</span>
                    </p>
                  </div>
                  <StatusBadge status={selectedOrder.state?.name?.de || selectedOrder.state?.name || 'Offen'} />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Benutzer:</label>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.user?.first_name && selectedOrder.user?.last_name 
                        ? `${selectedOrder.user.first_name} ${selectedOrder.user.last_name}`
                        : selectedOrder.user?.email || '–'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zugewiesene Lehrkraft:</label>
                    <p className="text-sm text-gray-900">
                      {selectedOrder.assigned_teacher?.first_name && selectedOrder.assigned_teacher?.last_name 
                        ? `${selectedOrder.assigned_teacher.first_name} ${selectedOrder.assigned_teacher.last_name}`
                        : selectedOrder.assigned_teacher?.email || '–'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ort:</label>
                    <p className="text-sm text-gray-900">{selectedOrder.location || '–'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon:</label>
                    <p className="text-sm text-gray-900">{selectedOrder.phone || '–'}</p>
                  </div>
                </div>
              </div>

              {/* Zeitraum */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Ausleihzeitraum</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Abholdatum:</label>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedOrder.rent_start)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rückgabedatum:</label>
                    <p className="text-sm font-medium text-gray-900">
                      {formatDate(selectedOrder.rent_end)}
                    </p>
                  </div>
                </div>
                {selectedOrder.rent_start && selectedOrder.rent_end && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-sm text-gray-600">
                      Gesamtdauer: {Math.ceil((new Date(selectedOrder.rent_end) - new Date(selectedOrder.rent_start)) / (1000 * 60 * 60 * 24))} Tag(e)
                    </p>
                  </div>
                )}
              </div>

              {/* Equipment/Sets */}
              <div className="bg-orange-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">
                  Equipment ({selectedOrder.sets?.length || 0} Sets)
                </h4>
                {selectedOrder.sets && selectedOrder.sets.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedOrder.sets.map((set, index) => {
                      const setId = set._id || set.id;
                      const thumbnailUrl = thumbnailUrls[setId] || `${MAIN_VARIABLES.SERVER_URL}/api/files/data/placeholder/placeholder_set.jpg`;
                      
                      return (
                        <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                          <div className="flex items-start gap-3">
                            {/* Thumbnail */}
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={thumbnailUrl}
                                alt={set.set_name?.name || set.name || 'Set'}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="w-full h-full bg-gray-200 items-center justify-center text-gray-400 text-xs hidden">
                                Kein Bild
                            </div>
                          </div>
                          
                          {/* Set Info */}
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 text-sm line-clamp-2">
                              {set.manufacturer?.name && set.set_name?.name?.de 
                                ? `${set.manufacturer.name} ${set.set_name.name.de}`
                                : set.set_name?.name?.de || set.set_name?.name || set.name || 'Unbekanntes Set'
                              }
                            </h5>
                            {set.category?.name?.de && (
                              <p className="text-xs text-gray-500 mt-1">
                                Kategorie: {set.category.name.de}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">Keine Sets zugewiesen</p>
                )}
              </div>

              {/* Bemerkungen */}
              {selectedOrder.remarks && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Bemerkungen</h4>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {selectedOrder.remarks}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogActions>
          <Button variant="outline" onClick={closeOrderDetails}>
            Schließen
          </Button>
          {selectedOrder && (
            <Button
              color="red"
              onClick={async () => {
                if (!window.confirm('Diesen Auftrag wirklich löschen?')) return;
                try {
                  const res = await fetch(
                    `${MAIN_VARIABLES.SERVER_URL}/api/orders/${selectedOrder._id}`,
                    {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    }
                  );
                  if (res.ok) {
                    setOrders(orders => orders.filter(o => o._id !== selectedOrder._id));
                    closeOrderDetails();
                  } else {
                    const err = await res.json();
                    alert(err.error || 'Fehler beim Löschen.');
                  }
                } catch (e) {
                  alert('Fehler beim Löschen.');
                }
              }}
            >
              Auftrag löschen
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}