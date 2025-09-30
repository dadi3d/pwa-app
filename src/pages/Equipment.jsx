import { useEffect, useState } from "react";
import "./Equipment.css";
import { MAIN_VARIABLES } from "../config";


const EquipmentManagerMenu = () => {

    return (
        <div className="body">
            <header className="header">
                <h1 className="header-h1" id="title_">
                    Equipment Management
                </h1>
            </header>
            <main className="main">
                {/* Sets */}
                <section className="section">
                    <button
                        className="button"
                        onClick={() => (window.location.href = "/set-anlegen")}
                    >
                        Set hinzufügen
                    </button>
                    <div className="sub-items">
                        <p className="sub-items-p">
                            <a className="link" href="/set-bezeichnungen">
                                Set-Bezeichnungen
                            </a>
                        </p>
                        <p className="sub-items-p">
                            <a className="link" href="/kategorien">
                                Set-Kategorien
                            </a>
                        </p>
                        <p className="sub-items-p">
                            <a className="link" href="/sets">
                                Set-Übersicht
                            </a>
                        </p>
                        <p className="sub-items-p">
                            <a className="link" href="/hersteller">
                                Hersteller-Übersicht
                            </a>
                        </p>
                    </div>
                </section>

                {/* Produkte */}
                <section className="section">
                    <button
                        className="button"
                        onClick={() => (window.location.href = "/produkt-anlegen")}
                    >
                        Produkt hinzufügen
                    </button>
                    <div className="sub-items">
                        <p className="sub-items-p">
                            <a className="link" href="/produkt-kategorien">
                                Produkt-Kategorien
                            </a>
                        </p>
                        <p className="sub-items-p">
                            <a className="link" href="/set-produkte">
                                Produkt-Übersicht
                            </a>
                        </p>
                        <p className="sub-items-p">
                            <a className="link" href="/hersteller">
                                Hersteller-Übersicht
                            </a>
                        </p>
                    </div>
                </section>

                {/* Dateimanager */}
                <section className="section">
                <button
                    className="button"
                    onClick={() => (window.location.href = "/file-manager")}
                >
                    Dateimanager öffnen
                </button>
            </section>
            </main>
        </div>
    );
};

export default EquipmentManagerMenu;