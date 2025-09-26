// src/app/picker/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type Product = {
  id: string;
  title: string;
  handle?: string;
  updatedAt?: string;
};

export default function PickerPageClient() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // Obtener shop de query string
  const shop = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("shop") || "" : "";

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const url = `/api/products?shop=${encodeURIComponent(shop)}`;

    fetch(url, { credentials: "same-origin" })
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(`HTTP ${r.status} - ${txt || r.statusText}`);
        }
        return r.json();
      })
      .then((data) => {
        if (!mounted) return;
        // data es array de productos (según tu endpoint /api/products)
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        console.error("Picker fetch error:", err);
        setError(String(err.message || err));
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [shop]);

  const toggle = (id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    products.forEach((p) => (all[p.id] = true));
    setSelected(all);
  };

  const clearAll = () => setSelected({});

  const doSubmit = () => {
    const chosen = products.filter((p) => selected[p.id]).map((p) => ({
      id: p.id,
      title: p.title,
      handle: p.handle,
    }));

    // Mandamos la selección al parent (la página que abrió el iframe/modal)
    // parent window puede estar en diferente origen: usamos postMessage
    window.parent.postMessage({ type: "tryon:selected", products: chosen }, "*");

    // También mostramos feedback dentro del iframe
    // (el parent debe cerrar el modal cuando reciba el message)
    // Si quieres, puedes cerrar automáticamente la ventana si es el mismo origen:
    try {
      // si parent es accesible y same-origin:
      if (window.parent && window.parent !== window) {
        // nothing more required; parent handles closing
      }
    } catch {
      // cross-origin: parent must receive message.
    }
  };

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Roboto, Arial", padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Seleccionar productos</h2>

      <div style={{ marginBottom: 12, display: "flex", gap: 8 }}>
        <button onClick={selectAll} style={btnStyle}>Seleccionar todos</button>
        <button onClick={clearAll} style={btnStyle}>Limpiar</button>
        <div style={{ marginLeft: "auto", color: "#666", alignSelf: "center" }}>{products.length} productos</div>
      </div>

      {loading && <div>Cargando productos…</div>}
      {error && <div style={{ color: "crimson" }}>Error: {error}</div>}

      {!loading && !error && (
        <div style={{ maxHeight: "60vh", overflow: "auto", border: "1px solid #eee", borderRadius: 6 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th style={th}> </th>
                <th style={th}>Título</th>
                <th style={th}>Handle</th>
                <th style={th}>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #f0f0f0" }}>
                  <td style={td}>
                    <input type="checkbox" checked={!!selected[p.id]} onChange={() => toggle(p.id)} />
                  </td>
                  <td style={td}>{p.title}</td>
                  <td style={td}>{p.handle ?? "-"}</td>
                  <td style={td}>{p.updatedAt ? new Date(p.updatedAt).toLocaleString() : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => window.parent.postMessage({ type: "tryon:cancel" }, "*")} style={btnStyleOutline}>
          Cancelar
        </button>
        <button onClick={doSubmit} style={btnStylePrimary}>
          Seleccionar ({Object.keys(selected).filter((id) => selected[id]).length})
        </button>
      </div>
    </div>
  );
}

/* estilos simples */
const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
};

const btnStyleOutline: React.CSSProperties = {
  ...btnStyle,
  background: "#fff",
};

const btnStylePrimary: React.CSSProperties = {
  ...btnStyle,
  background: "#111",
  color: "#fff",
  border: "none",
};

const th: React.CSSProperties = { textAlign: "left", padding: "10px 12px", fontSize: 13, color: "#444" };
const td: React.CSSProperties = { padding: "10px 12px", fontSize: 14, color: "#222" };