// src/app/admin/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";

export default function AdminLanding() {
  const [open, setOpen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);

  // toma shop de query string provisto por Shopify cuando abre app
  const shop = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("shop") || "" : "";

  const openPicker = useCallback(() => {
    // LOGS PARA DEBUG:
    console.log("🔍 DEBUG - Shop:", shop);
    console.log("🔍 DEBUG - Window location:", window.location.href);
    console.log("🔍 DEBUG - Window origin:", window.location.origin);
    console.log("🔍 DEBUG - Document referrer:", document.referrer);
    
    const finalUrl = `https://app.adrian-ortiz.com/picker${shop ? `?shop=${encodeURIComponent(shop)}` : ""}`;
    console.log("🔍 DEBUG - Final picker URL:", finalUrl);
    
    // Verificar si estamos en iframe
    console.log("🔍 DEBUG - In iframe:", window !== window.top);
    console.log("🔍 DEBUG - Parent accessible:", window.parent !== window);
    
    setIframeSrc(finalUrl);
    setOpen(true);
  }, [shop]);

  const close = useCallback(() => {
    setOpen(false);
    setIframeSrc(null);
  }, []);

  // listener para recibir selección desde el iframe picker
  useEffect(() => {
    async function onMsg(ev: MessageEvent) {
      console.log("📨 DEBUG - Received message:", ev.data, "from origin:", ev.origin);
      
      if (!ev?.data) return;
      const { type, products } = ev.data as any;

      if (type === "tryon:selected") {
        try {
          console.log("Productos seleccionados:", products);

          // 1) enviar al backend para persistir
          const resp = await fetch("/api/tryon/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shop, products }),
          });

          if (!resp.ok) {
            const txt = await resp.text();
            console.error("Error guardando selección:", resp.status, txt);
            alert("Error guardando selección");
          } else {
            // feedback y cerrar modal
            alert(`Guardados ${products.length} productos.`);
          }
        } catch (err) {
          console.error("Excepción guardando selección:", err);
          alert("Error inesperado guardando la selección.");
        } finally {
          // cerrar modal localmente
          close();
        }
      } else if (type === "tryon:cancel") {
        close();
      }
    }

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [shop, close]);

  // Log inicial para debug
  useEffect(() => {
    console.log("🚀 DEBUG - AdminLanding mounted");
    console.log("🚀 DEBUG - Shop from URL:", shop);
    console.log("🚀 DEBUG - Full URL search:", window.location.search);
    console.log("🚀 DEBUG - User agent:", navigator.userAgent);
  }, [shop]);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, -apple-system, Roboto, Arial" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>PASO 1: Selecciona tus productos</h1>
      <p style={{ color: "#555", marginTop: 8 }}>
        Haz clic en <strong>Seleccionar productos</strong> para abrir el selector dentro de la app.
      </p>

      <div style={{ marginTop: 18 }}>
        <button
          onClick={openPicker}
          style={{
            background: "#0b6cff",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          Seleccionar productos
        </button>
      </div>

      {/* Modal con iframe */}
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
              width: "95%",
              maxWidth: 1100,
              height: "85%",
              background: "#fff",
              borderRadius: 10,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Seleccionar productos</strong>
              <button onClick={close} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ flex: 1 }}>
              {iframeSrc ? (
                <>
                  <div style={{ padding: 8, fontSize: 12, color: "#666", borderBottom: "1px solid #eee" }}>
                    DEBUG: {iframeSrc}
                  </div>
                  <iframe
                    title="Product picker"
                    src={iframeSrc}
                    style={{ border: 0, width: "100%", height: "calc(100% - 32px)" }}
                    onLoad={() => console.log("🎯 DEBUG - Iframe loaded successfully")}
                    onError={(e) => console.error("❌ DEBUG - Iframe error:", e)}
                  />
                </>
              ) : (
                <div style={{ padding: 20 }}>Cargando selector…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}