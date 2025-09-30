import React, { useEffect, useState } from "react";
import { MAIN_VARIABLES } from "../config";

// API Endpunkte wie im Backend
const API_SETS = `${MAIN_VARIABLES.SERVER_URL}/api/sets`;
const API_SINGLE_PRODUCTS = `${MAIN_VARIABLES.SERVER_URL}/api/single-products?set=`;


export default function Produkte() {
  const [sets, setSets] = useState([]);
  const [productsBySet, setProductsBySet] = useState({});
  const [expandedSetId, setExpandedSetId] = useState(null);

  // Sets laden
  useEffect(() => {
    async function loadSets() {
      const res = await fetch(API_SETS);
      const data = await res.json();
      setSets(data);
    }
    loadSets();
  }, []);

  // Produkte für ein Set laden (Lazy Loading)
  const handleExpand = async (setId) => {
    setExpandedSetId(expandedSetId === setId ? null : setId);
    if (!productsBySet[setId]) {
      try {
        const res = await fetch(API_SINGLE_PRODUCTS + setId);
        if (!res.ok) throw new Error("Fehler beim Laden der Produkte");
        const products = await res.json();
        setProductsBySet((prev) => ({ ...prev, [setId]: products }));
      } catch {
        setProductsBySet((prev) => ({ ...prev, [setId]: [] }));
      }
    }
  };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "2rem auto",
        padding: "1.5rem",
        background: "#f4f6fa",
        borderRadius: 16,
        boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: 32, color: "#2a3b4c" }}>Equipment</h1>
      <div id="setList" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "center" }}>
        {sets.length === 0 && (
          <div style={{ color: "#888", fontSize: 18 }}>Keine Sets gefunden.</div>
        )}
        {sets.map((p) => {
          const brand = p.manufacturer?.name?.de || "–";
          const category = p.category?.name?.de || "–";
          const setName = p.set_name?.name?.de || "–";
          const setNr = p.set_number ?? "–";
          const isExpanded = expandedSetId === p._id;
          const thumbnailUrl = `${MAIN_VARIABLES.SERVER_URL}/api/data/set-thumbnail/${p._id}`;
          return (
            <div
              className="set"
              key={p._id}
              id={`set-${p._id}`}
              style={{
                width: 340,
                background: "#fff",
                borderRadius: 12,
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                marginBottom: 16,
                transition: "box-shadow 0.2s",
                border: isExpanded ? "2px solid #1976d2" : "1px solid #e0e0e0",
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  textAlign: "center",
                  padding: "1.2rem 0 0.7rem 0",
                  background: "#f8fafc",
                }}
              >
                <img
                  src={thumbnailUrl}
                  alt={`${brand} ${setName} Thumbnail`}
                  style={{
                    maxWidth: 160,
                    maxHeight: 110,
                    objectFit: "contain",
                    borderRadius: 8,
                    border: "1px solid #eee",
                    background: "#fff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                />
              </div>
              <div
                className="header"
                style={{
                  fontWeight: "bold",
                  fontSize: "1.13rem",
                  padding: "0.8rem 1.2rem",
                  cursor: "pointer",
                  background: isExpanded ? "#e3f0fc" : "#f7f7f7",
                  borderBottom: "1px solid #eee",
                  color: "#1a2533",
                  transition: "background 0.2s",
                  letterSpacing: 0.1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
                onClick={() => handleExpand(p._id)}
                tabIndex={0}
                onKeyPress={e => { if (e.key === "Enter") handleExpand(p._id); }}
              >
                <span>
                  {brand} <span style={{ color: "#1976d2" }}>{setName}</span>
                  <span style={{ fontWeight: 400, color: "#888", marginLeft: 8 }}>Set-Nr: {setNr}</span>
                </span>
                <span style={{
                  fontSize: 22,
                  color: "#1976d2",
                  transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s"
                }}>›</span>
              </div>
              <div
                className="details"
                style={{
                  display: isExpanded ? "block" : "none",
                  padding: "1.1rem 1.2rem 1.2rem 1.2rem",
                  background: "#fcfdff",
                  fontSize: 15.5,
                  color: "#2a3b4c",
                  borderTop: "1px solid #f0f0f0",
                  animation: isExpanded ? "fadeIn 0.3s" : undefined,
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <strong>Kategorie:</strong> {category}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Status:</strong> {p.state?.name?.de ?? "-"}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Öffentliche Anmerkung:</strong> {p.note_public || "-"}
                </div>
                <div style={{ marginBottom: 8 }}>
                  <strong>Interne Anmerkung:</strong> {p.note_private || "-"}
                </div>
                <div style={{ marginTop: 16 }}>
                  <strong>Produkte:</strong>
                  {!productsBySet[p._id] && (
                    <div style={{ color: "#888", marginTop: 6 }}>Lade Produkte...</div>
                  )}
                  {productsBySet[p._id] && productsBySet[p._id].length === 0 && (
                    <div style={{ color: "#888", marginTop: 6 }}>Keine Produkte vorhanden.</div>
                  )}
                  {productsBySet[p._id] && productsBySet[p._id].length > 0 && (
                    <ul
                      className="product-list"
                      style={{
                        marginTop: 10,
                        paddingLeft: 18,
                        listStyle: "disc",
                        color: "#1a2533",
                        fontSize: 15,
                      }}
                    >
                      {productsBySet[p._id].map((product) => {
                        const brandName = product.manufacturer?.name?.de ?? "–";
                        const typeName =
                          product.Type?.name?.de ?? product.Type?.name ?? product.Type ?? "–";
                        const serial = product.SerialNumber ?? "–";
                        return (
                          <li
                            className="product"
                            key={product._id}
                            style={{
                              marginBottom: 4,
                              padding: "2px 0",
                              borderRadius: 3,
                              background: "#f5faff",
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>{brandName}</span>{" "}
                            <span style={{ color: "#1976d2" }}>{typeName}</span>{" "}
                            <span style={{ color: "#888" }}>(SN: {serial})</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Optional: kleine CSS-Animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px);}
          to { opacity: 1; transform: translateY(0);}
        }
        .set:hover {
          box-shadow: 0 6px 24px rgba(25, 118, 210, 0.13);
        }
        .header:focus {
          outline: 2px solid #1976d2;
        }
      `}</style>
    </div>
  );
}