// src/app/widget/page.tsx
"use client";

import React, { useCallback, useMemo, useState } from "react";

export default function WidgetPage() {
  const [open, setOpen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  const shop =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("shop") || ""
      : "";

  // Cambia esta URL por la que quieras cargar en el modal:
  // - si tienes un endpoint que muestra el product-picker, usa esa URL.
  // - por defecto usamos /picker (el cual puedes montar en Next o proxyear desde Koa).
  const PICKER_URL = "/picker"; // <-- reemplaza si hace falta

  const openPicker = useCallback(() => {
    // Agrega parámetros si quieres (ej: shop, productId)
    const q = shop ? `?shop=${encodeURIComponent(shop)}` : "";
    setIframeSrc(`${PICKER_URL}${q}`);
    setOpen(true);
  }, [shop]);

  const close = useCallback(() => {
    setOpen(false);
    setIframeSrc(null);
  }, []);

  const storeSubdomain = useMemo(() => {
    if (!shop) return "";
    const suffix = ".myshopify.com";
    return shop.endsWith(suffix) ? shop.slice(0, -suffix.length) : shop;
  }, [shop]);

  const themeEditorUrl = useMemo(() => {
    return storeSubdomain
      ? `https://admin.shopify.com/store/${storeSubdomain}/themes/current/editor?context=apps`
      : "https://admin.shopify.com/store";
  }, [storeSubdomain]);

  const openThemeEditor = useCallback(() => {
    window.open(themeEditorUrl, "_blank", "noopener,noreferrer");
  }, [themeEditorUrl]);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Comencemos seteando los productos</h1>
      <div style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Paso 1: Seleccionas los productos que deseas tener el probador</h2>
        <div style={{ marginTop: 16 }}>
          <button
            onClick={openPicker}
            style={{
              background: "#111",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Seleccionar productos
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 32,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          background: "#f9fafb",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          maxWidth: 720,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#6b7280", fontWeight: 600 }}>Paso 2</span>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Activa Antia en tu Theme</h2>
          <p style={{ margin: 0, color: "#4b5563" }}>
            Una vez guardados tus productos, habilita el bloque del probador desde el Theme Editor para verlo en tu tienda.
          </p>
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, color: "#111827", display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Abre el Theme Editor y elige una plantilla de página de producto.</li>
          <li>Haz clic en <strong>Agregar bloque</strong> dentro de la sección de producto y selecciona <strong>Antia Try On Button</strong>.</li>
          <li>Guarda los cambios para que el botón aparezca en los productos seleccionados.</li>
        </ol>
        <div>
          <button
            onClick={openThemeEditor}
            style={{
              background: "#111",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Abrir Theme Editor
          </button>
        </div>
      </div>

      {/* Modal (simple) */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "90%",
              maxWidth: 1100,
              height: "80%",
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ padding: 14, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Seleccionar productos</strong>
              <button onClick={close} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
              {iframeSrc ? (
                <iframe
                  title="Product picker"
                  src={iframeSrc}
                  style={{ border: 0, width: "100%", height: "100%" }}
                />
              ) : (
                <div style={{ padding: 20 }}>Cargando selector...</div>
              )}
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #eee", textAlign: "right" }}>
              <button onClick={close} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}