import React, { useEffect, useState } from 'react';
import { MAIN_VARIABLES } from '../../config';
import ProductEdit from './ProductEdit';
import { Button } from '../../styles/catalyst/button';
import { Dialog, DialogTitle, DialogBody, DialogActions } from '../../styles/catalyst/dialog';

export default function SetProdukte() {
    const [selectedProductId, setSelectedProductId] = useState(null);
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sets, setSets] = useState([]);
    const [selectedSet, setSelectedSet] = useState(null);
    const [setProducts, setSetProducts] = useState([]);
    const [isSetModalOpen, setIsSetModalOpen] = useState(false);
    const [filters, setFilters] = useState({
        category: '',
        set: '',
        isActive: ''
    });

    useEffect(() => {
        loadFilters();
        loadProducts();
    }, []);

    async function loadFilters() {
        // Kategorien laden
        const categoryRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/product-categories`);
        const categories = await categoryRes.json();
        // Kategorien alphabetisch sortieren
        categories.sort((a, b) => {
            const nameA = (a.name?.de || a.name || '').toLowerCase();
            const nameB = (b.name?.de || b.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        setCategories(categories);

        // Sets laden
        const setRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets`);
        const sets = await setRes.json();
        // Sets alphabetisch sortieren (nach Hersteller, dann Set-Name)
        sets.sort((a, b) => {
            const brandA = (a.manufacturer?.name || '').toLowerCase();
            const brandB = (b.manufacturer?.name || '').toLowerCase();
            if (brandA !== brandB) {
                return brandA.localeCompare(brandB);
            }
            const nameA = (a.set_name?.name?.de || a.set_name?.name || '').toLowerCase();
            const nameB = (b.set_name?.name?.de || b.set_name?.name || '').toLowerCase();
            return nameA.localeCompare(nameB);
        });
        setSets(sets);
    }

    async function loadProducts() {
        const res = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products`);
        const products = await res.json();
        setAllProducts(products);
    }

    async function openSetModal(setId) {
        try {
            // Set-Details laden
            const setRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/sets/${setId}`);
            const setData = await setRes.json();
            setSelectedSet(setData);
            
            // Produkte des Sets laden
            const productsRes = await fetch(`${MAIN_VARIABLES.SERVER_URL}/api/single-products?set=${setId}`);
            const productsData = await productsRes.json();
            setSetProducts(productsData);
            
            setIsSetModalOpen(true);
        } catch (err) {
            console.error('Fehler beim Laden des Sets:', err);
            alert('Fehler beim Laden des Sets.');
        }
    }

    function handleFilterChange(e) {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    }

    function filteredProducts() {
        return allProducts.filter(product => {
            // Kategorie kann entweder im Set (set.category._id) oder im Produkt (Designation._id) sein
            const matchesCategory =
                !filters.category ||
                product.set?.category?._id === filters.category ||
                product.Designation?._id === filters.category;
            const matchesSet = !filters.set || product.set?._id === filters.set;
            const matchesIsActive = !filters.isActive || String(product.IsActive) === filters.isActive;
            return matchesCategory && matchesSet && matchesIsActive;
        });
    }

    return (
        <div className="w-full max-w-6xl mx-auto py-8 px-4">
            <h2 className="text-3xl font-semibold text-gray-900 mb-6">Produkte</h2>
            
            {/* Filter Section */}
            <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="categoryFilter" className="block text-sm font-medium text-gray-700 mb-2">
                            Kategorie
                        </label>
                        <select 
                            name="category" 
                            value={filters.category} 
                            onChange={handleFilterChange} 
                            id="categoryFilter"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Alle Kategorien</option>
                            {categories.map(cat => (
                                <option key={cat._id} value={cat._id}>
                                    {cat.name?.de || cat.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    <div>
                        <label htmlFor="setFilter" className="block text-sm font-medium text-gray-700 mb-2">
                            Set
                        </label>
                        <select 
                            name="set" 
                            value={filters.set} 
                            onChange={handleFilterChange} 
                            id="setFilter"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Alle Sets</option>
                            {sets.map(set => {
                                const brand = set.manufacturer?.name || '–';
                                const setName = set.set_name?.name?.de || set.set_name?.name || '–';
                                const setNr = set.set_number ?? '–';
                                return (
                                    <option key={set._id} value={set._id}>
                                        {`${brand} – ${setName} – Set-Nr: ${setNr}`}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                    
                    <div>
                        <label htmlFor="isActiveFilter" className="block text-sm font-medium text-gray-700 mb-2">
                            Prüfstatus
                        </label>
                        <select 
                            name="isActive" 
                            value={filters.isActive} 
                            onChange={handleFilterChange} 
                            id="isActiveFilter"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Alle Prüfstatus</option>
                            <option value="true">Elektrische Prüfung: Ja</option>
                            <option value="false">Elektrische Prüfung: Nein</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Product List */}
            <div id="productList" className="space-y-4">
                {filteredProducts().map(p => {
                    const set = p.set;
                    const brand = set?.manufacturer?.name || '–';
                    const setName = set?.set_name?.name?.de || set?.set_name?.name || '–';
                    const designation = p.Designation?.name?.de || p.Designation?.name || '–';
                    const category = set?.category?.name?.de || set?.category?.name || '–';
                    
                    // S/N nur anzeigen, wenn vorhanden
                    const serialNumber = p.SerialNumber && p.SerialNumber.trim() !== '' ? p.SerialNumber : null;
                    const headerText = serialNumber 
                        ? `${brand} ${setName} – S/N: ${serialNumber}`
                        : `${brand} ${setName}`;

                    return (
                        <div key={p._id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <div
                                className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
                            >
                                <span 
                                    className="font-medium text-gray-900 cursor-pointer flex-1"
                                    onClick={e => {
                                        const details = e.currentTarget.parentElement.nextSibling;
                                        details.classList.toggle('hidden');
                                    }}
                                >
                                    {headerText}
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 text-sm py-1 px-3"
                                        outline
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (p.set?._id) {
                                                openSetModal(p.set._id);
                                            } else {
                                                alert('Diesem Produkt ist kein Set zugeordnet.');
                                            }
                                        }}
                                    >
                                        Set aufrufen
                                    </Button>
                                    <Button
                                        type="button"
                                        className="hover:border-orange-500 hover:text-orange-600 transition-colors duration-200 text-sm py-1 px-3"
                                        outline
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedProductId(p._id);
                                        }}
                                    >
                                        Bearbeiten
                                    </Button>
                                    <svg 
                                        className="w-5 h-5 text-gray-500 transform transition-transform cursor-pointer ml-2" 
                                        fill="none" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                        onClick={e => {
                                            const details = e.currentTarget.parentElement.parentElement.nextSibling;
                                            details.classList.toggle('hidden');
                                        }}
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            
                            <div className="hidden border-t border-gray-200">
                                <div className="p-4 bg-gray-50">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Set:</span>{' '}
                                                <span className="text-gray-900">{brand} – {setName}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Kategorie:</span>{' '}
                                                <span className="text-gray-900">{category}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Bezeichnung:</span>{' '}
                                                <span className="text-gray-900">{designation}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Hersteller:</span>{' '}
                                                <span className="text-gray-900">{p.Manufacturer?.name || '-'}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Typ:</span>{' '}
                                                <span className="text-gray-900">{typeof p.Type === 'object' ? (p.Type?.name || '-') : (p.Type || '-')}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Seriennummer:</span>{' '}
                                                <span className="text-gray-900">{p.SerialNumber || '-'}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Kostenstelle:</span>{' '}
                                                <span className="text-gray-900">{typeof p.CostCenter === 'object' ? (p.CostCenter?.name || '-') : (p.CostCenter || '-')}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Raumnummer:</span>{' '}
                                                <span className="text-gray-900">{typeof p.Department === 'object' ? (p.Department?.name || '-') : (p.Department || '-')}</span>
                                            </p>
                                        </div>
                                        
                                        <div>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Bereichsnummer:</span>{' '}
                                                <span className="text-gray-900">{typeof p.CustomerID === 'object' ? (p.CustomerID?.name || '-') : (p.CustomerID || '-')}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">IVS-Nummer:</span>{' '}
                                                <span className="text-gray-900">{p.Various_1 ?? '-'}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Status:</span>{' '}
                                                <span className="text-gray-900">{typeof p.Status === 'object' ? (p.Status?.name || '-') : (p.Status || '-')}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Gerätetyp:</span>{' '}
                                                <span className="text-gray-900">{typeof p.DeviceType === 'object' ? (p.DeviceType?.name || '-') : (p.DeviceType || '-')}</span>
                                            </p>
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Elektrische Prüfung:</span>{' '}
                                                <span className={`font-medium ${p.IsActive ? 'text-green-600' : 'text-red-600'}`}>
                                                    {p.IsActive ? 'Ja' : 'Nein'}
                                                </span>
                                            </p>
                                            {p.IsActive && (
                                                <>
                                                    <p className="mb-2">
                                                        <span className="font-semibold text-gray-700">Prüfintervall:</span>{' '}
                                                        <span className="text-gray-900">{p.TestingInterval ?? '-'} Monate</span>
                                                    </p>
                                                    <p className="mb-2">
                                                        <span className="font-semibold text-gray-700">ID:</span>{' '}
                                                        <span className="text-gray-900">{p.ID ?? '-'}</span>
                                                    </p>
                                                    <p className="mb-2">
                                                        <span className="font-semibold text-gray-700">Zuletzt geprüft:</span>{' '}
                                                        <span className="text-gray-900">{p.LastTestingDate ? new Date(p.LastTestingDate).toLocaleDateString() : '-'}</span>
                                                    </p>
                                                </>
                                            )}
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Zustand:</span>{' '}
                                                <span className="text-gray-900">{typeof p.state === 'object' ? (p.state?.name || '-') : (p.state || '-')}</span>
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {p.Remark && (
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <p className="mb-2">
                                                <span className="font-semibold text-gray-700">Anmerkung:</span>
                                            </p>
                                            <p className="text-gray-900 bg-white p-3 rounded border border-gray-200">
                                                {p.Remark}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Product Edit Modal */}
            {selectedProductId && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-45 flex items-center justify-center p-4"
                    style={{ zIndex: 9999 }}
                    onClick={() => setSelectedProductId(null)}
                >
                    <div
                        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                            className="sticky top-0 right-0 float-right m-3 bg-white border border-gray-300 rounded-full w-8 h-8 flex items-center justify-center cursor-pointer font-bold text-red-600 text-2xl hover:bg-gray-100 transition-colors"
                            style={{ zIndex: 10 }}
                            onClick={() => setSelectedProductId(null)}
                            title="Schließen"
                        >
                            ×
                        </button>
                        <div className="p-6">
                            <ProductEdit 
                                productId={selectedProductId}
                                startInEditMode={true}
                                onSave={() => {
                                    loadProducts();
                                    setSelectedProductId(null);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Set Modal */}
            {isSetModalOpen && selectedSet && (
                <Dialog open={isSetModalOpen} onClose={() => setIsSetModalOpen(false)} size="4xl">
                    <DialogTitle>Set Details</DialogTitle>
                    <DialogBody>
                        <div className="space-y-6">
                            {/* Thumbnail */}
                            <div className="flex justify-center bg-gray-50 p-6 rounded-lg border border-gray-200">
                                <img
                                    src={`${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${selectedSet._id}`}
                                    alt={`${selectedSet.manufacturer?.name} ${selectedSet.set_name?.name?.de || selectedSet.set_name?.name} Thumbnail`}
                                    className="w-80 h-80 object-cover rounded-lg border border-gray-300 bg-white shadow-md"
                                    onError={(e) => {
                                        e.target.src = `${MAIN_VARIABLES.SERVER_URL}/data/placeholder/placeholder_set.jpg`;
                                    }}
                                />
                            </div>

                            {/* Set Informationen */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">Set Informationen</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <strong className="text-gray-700">Hersteller:</strong>
                                        <span className="ml-2">{selectedSet.manufacturer?.name || '–'}</span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-700">Set-Name:</strong>
                                        <span className="ml-2">{selectedSet.set_name?.name?.de || selectedSet.set_name?.name || '–'}</span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-700">Set-Nummer:</strong>
                                        <span className="ml-2">{selectedSet.set_number || '–'}</span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-700">Kategorie:</strong>
                                        <span className="ml-2">{selectedSet.category?.name?.de || selectedSet.category?.name || '–'}</span>
                                    </div>
                                    <div>
                                        <strong className="text-gray-700">Status:</strong>
                                        <span className="ml-2">{selectedSet.state?.name?.de || selectedSet.state?.name || '–'}</span>
                                    </div>
                                    {selectedSet.note_public && selectedSet.note_public.trim() !== '' && (
                                        <div className="md:col-span-2">
                                            <strong className="text-gray-700">Öffentliche Anmerkung:</strong>
                                            <p className="mt-1 text-gray-600">{selectedSet.note_public}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Enthaltene Produkte */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4 text-gray-800">Enthaltene Produkte</h3>
                                {setProducts.length === 0 ? (
                                    <div className="text-gray-500 text-center py-4">Keine Produkte vorhanden.</div>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {setProducts.map((product) => {
                                            const brandName = product.manufacturer?.name || '–';
                                            const typeName = typeof product.Type === 'object' 
                                                ? (product.Type?.name?.de || product.Type?.name || '–')
                                                : (product.Type || '–');
                                            const serial = product.SerialNumber || '–';
                                            return (
                                                <div key={product._id} className="p-3 rounded-md bg-gray-50 border border-gray-200">
                                                    <div className="font-medium text-gray-800">{brandName} {typeName}</div>
                                                    <div className="text-sm text-gray-600">Seriennummer: {serial}</div>
                                                    {product.state && (
                                                        <div className="text-sm text-gray-600">
                                                            Status: {typeof product.state === 'object' 
                                                                ? (product.state?.name?.de || product.state?.name || '–')
                                                                : (product.state || '–')}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogBody>
                    <DialogActions>
                        <Button color="zinc" onClick={() => setIsSetModalOpen(false)}>
                            Schließen
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </div>
    );
}