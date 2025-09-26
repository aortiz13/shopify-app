// src/app/admin/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  title: string;
  handle?: string;
  updatedAt?: string;
};

export default function AdminLanding() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const shop =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("shop") || ""
      : "";

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSavedMessage(null);

    try {
      const resp = await fetch(`/api/products?shop=${encodeURIComponent(shop)}`);
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error loading products", err);
      setError(err?.message ? String(err.message) : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [shop]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const toggleProduct = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const all: Record<string, boolean> = {};
    products.forEach((product) => {
      all[product.id] = true;
    });
    setSelected(all);
  };

  const clearAll = () => setSelected({});

  const selectedCount = useMemo(
    () => Object.values(selected).filter(Boolean).length,
    [selected]
  );

  const handleSave = async () => {
    setSaving(true);
    setSavedMessage(null);
    setError(null);

    try {
      const chosen = products.filter((product) => selected[product.id]);
      const resp = await fetch("/api/tryon/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shop,
          products: chosen.map(({ id, title, handle }) => ({ id, title, handle })),
        }),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }

      setSavedMessage(`Guardados ${chosen.length} productos.`);
    } catch (err: any) {
      console.error("Error saving selection", err);
      setError(err?.message ? String(err.message) : "Error guardando selección");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: 24,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, color: "#6b7280", fontWeight: 600 }}>Paso 1</p>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Selecciona los productos para Try On</h1>
        <p style={{ margin: 0, color: "#4b5563", maxWidth: 540 }}>
          Elige los productos que quieres habilitar en el probador virtual. Puedes actualizar esta selección en cualquier momento.
        </p>
      </header>

      <section
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button onClick={selectAll} style={buttonStyle} disabled={loading || products.length === 0}>
          Seleccionar todos
        </button>
        <button onClick={clearAll} style={buttonStyle} disabled={loading || products.length === 0}>
          Limpiar selección
        </button>
        <button onClick={loadProducts} style={buttonStyle} disabled={loading}>
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
        <span style={{ marginLeft: "auto", color: "#6b7280" }}>
          {loading ? "Cargando productos…" : `${products.length} productos`}
        </span>
      </section>

      {error && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "12px 16px", borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", textTransform: "uppercase", fontSize: 12, letterSpacing: 0.4 }}>
            <tr>
              <th style={thStyle}> </th>
              <th style={thStyle}>Título</th>
              <th style={thStyle}>Handle</th>
              <th style={thStyle}>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} style={tdStyle}>
                  Cargando productos…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={4} style={tdStyle}>
                  No se encontraron productos.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <tr key={product.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                <td style={tdStyle}>
                  <input
                    type="checkbox"
                    checked={!!selected[product.id]}
                    onChange={() => toggleProduct(product.id)}
                    disabled={loading}
                  />
                </td>
                <td style={tdStyle}>{product.title}</td>
                <td style={tdStyle}>{product.handle ?? "-"}</td>
                <td style={tdStyle}>{product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer style={{ display: "flex", justifyContent: "flex-end", gap: 12, alignItems: "center" }}>
        <div style={{ color: "#4b5563" }}>
          {selectedCount === 0
            ? "Selecciona al menos un producto para continuar"
            : `${selectedCount} producto${selectedCount === 1 ? "" : "s"} seleccionados`}
        </div>
        <button
          onClick={handleSave}
          style={primaryButtonStyle}
          disabled={saving || selectedCount === 0}
        >
          {saving ? "Guardando…" : "Guardar selección"}
        </button>
      </footer>

      {savedMessage && (
        <div style={{ background: "#dcfce7", color: "#166534", padding: "12px 16px", borderRadius: 8 }}>
          {savedMessage}
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#111827",
  color: "#ffffff",
  border: "none",
  minWidth: 180,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  color: "#6b7280",
  fontWeight: 600,
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px",
  fontSize: 14,
  color: "#111827",
};
