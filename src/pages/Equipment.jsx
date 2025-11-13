import { useEffect, useState } from "react";
import { MAIN_VARIABLES } from "../config";
import { useAuth, fetchUserData } from './services/auth';
import { Heading, Subheading } from '../styles/catalyst/heading';
import { Button } from '../styles/catalyst/button';
import { Link } from '../styles/catalyst/link';


const EquipmentManagerMenu = () => {
    const [userId, setUserId] = useState('');
    const [userRole, setUserRole] = useState('student');
    const token = useAuth(state => state.token);

    useEffect(() => {
        fetchUserId();
    }, [token]);

    // Benutzer-ID aus JWT holen
    async function fetchUserId() {
        try {
            const userData = await fetchUserData();
            if(userData) {
                setUserId(userData.id);
                if(userData.role) {
                    setUserRole(userData.role);
                }
            }
        } catch (err) {
            setUserId('');
        }
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 bg-gray-50">
            <Heading className="text-center mb-8 text-gray-900">
                Equipment Management
            </Heading>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Sets Management */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg hover:border-orange-500">
                    <Subheading className="mb-4 flex items-center text-gray-900">
                        <span className="w-8 h-8 bg-gray-800 text-white rounded-lg flex items-center justify-center mr-3">
                            📦
                        </span>
                        Sets verwalten
                    </Subheading>
                    
                    <Button 
                        className="w-full mb-4 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                        onClick={() => (window.location.href = "/set-anlegen")}
                    >
                        Set hinzufügen
                    </Button>
                    
                    <div className="space-y-3">
                        <Link 
                            href="/set-bezeichnungen"
                            className="block p-3 rounded-lg border border-gray-200 text-black hover:text-black transition-colors duration-200 hover:bg-gray-50 hover:border-orange-500"
                        >
                            Set-Bezeichnungen
                        </Link>
                        <Link 
                            href="/kategorien"
                            className="block p-3 rounded-lg border border-gray-200 text-black hover:text-black transition-colors duration-200 hover:bg-gray-50 hover:border-orange-500"
                        >
                            Set-Kategorien
                        </Link>
                        <Link 
                            href="/sets"
                            className="block p-3 rounded-lg border border-gray-200 text-black hover:text-black transition-colors duration-200 hover:bg-gray-50 hover:border-orange-500"
                        >
                            Set-Übersicht
                        </Link>
                        <Link 
                            href="/hersteller"
                            className="block p-3 rounded-lg border border-gray-200 text-black hover:text-black transition-colors duration-200 hover:bg-gray-50 hover:border-orange-500"
                        >
                            Hersteller-Übersicht
                        </Link>
                    </div>
                </div>

                {/* Produkte Management */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg hover:border-orange-500">
                    <Subheading className="mb-4 flex items-center text-gray-900">
                        <span className="w-8 h-8 bg-gray-800 text-white rounded-lg flex items-center justify-center mr-3">
                            🔧
                        </span>
                        Produkte verwalten
                    </Subheading>
                    
                    <Button 
                        className="w-full mb-4 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                        onClick={() => (window.location.href = "/produkt-anlegen")}
                    >
                        Produkt hinzufügen
                    </Button>
                    
                    <div className="space-y-3">
                        <Link 
                            href="/produkt-kategorien"
                            className="block p-3 rounded-lg border border-gray-200 text-black hover:text-black transition-colors duration-200 hover:bg-gray-50 hover:border-orange-500"
                        >
                            Produkt-Kategorien
                        </Link>
                        <Link 
                            href="/set-produkte"
                            className="block p-3 rounded-lg border border-gray-200 text-black hover:text-black transition-colors duration-200 hover:bg-gray-50 hover:border-orange-500"
                        >
                            Produkt-Übersicht
                        </Link>
                        <Link 
                            href="/hersteller"
                            className="block p-3 rounded-lg border border-gray-200 text-black hover:text-black transition-colors duration-200 hover:bg-gray-50 hover:border-orange-500"
                        >
                            Hersteller-Übersicht
                        </Link>
                    </div>
                </div>

                {/* Dateimanager */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg hover:border-orange-500">
                    <Subheading className="mb-4 flex items-center text-gray-900">
                        <span className="w-8 h-8 bg-gray-800 text-white rounded-lg flex items-center justify-center mr-3">
                            📁
                        </span>
                        Dateien verwalten
                    </Subheading>
                    
                    <Button 
                        className="w-full bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                        onClick={() => (window.location.href = "/file-manager")}
                    >
                        Dateimanager öffnen
                    </Button>
                    
                    <p className="text-sm text-gray-600 mt-3">
                        Verwalten Sie Bilder, Dokumente und andere Dateien für Ihre Sets und Produkte.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default EquipmentManagerMenu;