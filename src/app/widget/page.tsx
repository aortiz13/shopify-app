// src/app/widget/page.tsx
"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";

type PickerProduct = {
  id?: string | null;
  title?: string | null;
  handle?: string | null;
};

export default function WidgetPage() {
  const [open, setOpen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const [shop, setShop] = useState<string>("");
  const [adminHost, setAdminHost] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [hasSavedSelection, setHasSavedSelection] = useState(false);

  const PICKER_URL = "/picker";

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get("shop") ?? "";
    const hostParam = params.get("host") ?? "";

    setShop(shopParam);
    setAdminHost(hostParam);

    const selectionParams = new URLSearchParams();
    if (shopParam) {
      selectionParams.set("shop", shopParam);
    }
    if (hostParam) {
      selectionParams.set("host", hostParam);
    }

    let cancelled = false;

    const fetchSelection = async () => {
      if (!shopParam) return;

      try {
        const response = await fetch(`/api/tryon/selection?${selectionParams.toString()}`);
        if (!response.ok) {
          if (response.status === 404) {
            if (!cancelled) {
              setHasSavedSelection(false);
            }
            return;
          }
          throw new Error(await response.text());
        }

        const json = await response.json();
        const products: PickerProduct[] = Array.isArray(json?.products) ? json.products : [];
        if (!cancelled) {
          setHasSavedSelection(products.some((product) => product?.id));
          if (products.length > 0) {
            setSavedMessage(
              `Seleccionados ${products.length} producto${products.length === 1 ? "" : "s"}. Continúa con el paso 2 para activar el probador en tu tienda.`,
            );
          }
        }
      } catch (err) {
        console.warn("No se pudo recuperar la selección guardada", err);
        if (!cancelled) {
          setHasSavedSelection(false);
        }
      }
    };

    fetchSelection();

    return () => {
      cancelled = true;
    };
  }, []);

  const openPicker = useCallback(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams();
    if (shop) {
      params.set("shop", shop);
    }
    if (adminHost) {
      params.set("host", adminHost);
    }

    const query = params.toString();
    setIframeSrc(`${PICKER_URL}${query ? `?${query}` : ""}`);
    setOpen(true);
    setError(null);
    setSavedMessage(null);
  }, [adminHost, shop]);

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
    if (!hasSavedSelection) return;
    window.open(themeEditorUrl, "_blank", "noopener,noreferrer");
  }, [hasSavedSelection, themeEditorUrl]);

  const saveSelection = useCallback(
    async (products: PickerProduct[]) => {
      if (!shop) {
        setError("No se pudo determinar la tienda. Reabre la app desde Shopify.");
        return;
      }

      const payload = {
        shop,
        products: products
          .filter((product): product is Required<Pick<PickerProduct, "id">> & PickerProduct => Boolean(product?.id))
          .map((product) => ({
            id: String(product.id),
            title: product?.title ?? undefined,
            handle: product?.handle ?? undefined,
          })),
        ...(adminHost ? { host: adminHost } : {}),
      };

      if (payload.products.length === 0) {
        setError("Selecciona al menos un producto antes de guardar.");
        return;
      }

      setSaving(true);
      setError(null);
      setSavedMessage(null);

      try {
        const response = await fetch("/api/tryon/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `HTTP ${response.status}`);
        }

        const count = payload.products.length;
        setSavedMessage(
          `Guardados ${count} producto${count === 1 ? "" : "s"}. Continúa con el paso 2 para activar el probador en tu tienda.`,
        );
        setHasSavedSelection(true);
        close();
      } catch (err: any) {
        console.error("Error guardando selección desde el picker", err);
        setError(err?.message ? String(err.message) : "Error guardando selección");
      } finally {
        setSaving(false);
      }
    },
    [adminHost, close, shop]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;

      const messageType =
        typeof (data as any).type === "string"
          ? (data as any).type
          : typeof (data as any).__tryon?.type === "string"
          ? (data as any).__tryon.type
          : "";

      if (messageType === "tryon:cancel") {
        close();
        return;
      }

      if (messageType !== "tryon:selected") {
        return;
      }

      const products = Array.isArray((data as any).products)
        ? ((data as any).products as PickerProduct[])
        : Array.isArray((data as any).__tryon?.products)
        ? ((data as any).__tryon.products as PickerProduct[])
        : [];

      saveSelection(products);
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [close, saveSelection]);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, -apple-system, Roboto, 'Helvetica Neue', Arial" }}>
      <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>Comencemos seteando los productos</h1>
      <div style={{ marginTop: 28 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Paso 1: Selecciona los productos que deseas habilitar</h2>
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

      {error && (
        <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: "#fee2e2", color: "#991b1b" }}>
          {error}
        </div>
      )}

      {savedMessage && (
        <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: 8, background: "#dcfce7", color: "#166534" }}>
          {savedMessage}
        </div>
      )}

      <div
        style={{
          marginTop: 32,
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          background: "#f9fafb",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ color: "#6b7280", fontWeight: 600 }}>Paso 2</span>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Activa la app en tu theme</h2>
          <p style={{ margin: 0, color: "#4b5563", maxWidth: 560 }}>
            Abre el Theme Editor de Shopify, agrega el bloque <strong>Antia Try On Button</strong> dentro de la sección de producto y
            guarda los cambios para mostrar el probador en los productos seleccionados.
          </p>
        </header>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <button
            onClick={openThemeEditor}
            style={{
              background: hasSavedSelection ? "#111827" : "#9ca3af",
              color: "#ffffff",
              padding: "10px 18px",
              borderRadius: 8,
              border: "none",
              cursor: hasSavedSelection ? "pointer" : "not-allowed",
              minWidth: 180,
              fontSize: 14,
              fontWeight: 600,
            }}
            disabled={!hasSavedSelection || saving}
          >
            Abrir Theme Editor
          </button>
          <span style={{ color: "#6b7280" }}>
            {hasSavedSelection
              ? "Selecciona el bloque de Antia en tu theme para finalizar"
              : "Guarda al menos un producto en el Paso 1 para continuar"}
          </span>
        </div>
      </div>

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
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>Seleccionar productos</strong>
              <button onClick={close} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer" }}>
                ✕
              </button>
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
              <button
                onClick={close}
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  border: "1px solid #ddd",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}