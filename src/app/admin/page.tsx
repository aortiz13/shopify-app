// src/app/admin/page.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  title: string;
  handle?: string;
  updatedAt?: string;
  featuredImage?: {
    url?: string | null;
    altText?: string | null;
  } | null;
};

type PageInfo = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) {
    return err.message;
  }

  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return typeof err === "string" ? err : "Error inesperado";
};

const decodeHostShop = (hostParam: string): string | null => {
  try {
    const normalized = hostParam.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
    const decoded = window.atob(`${normalized}${padding}`);

    const directDomain = decoded.match(/([\w-]+\.myshopify\.com)/);
    if (directDomain?.[1]) {
      return directDomain[1];
    }

    const storeSegment = decoded.match(/\/store\/([^/]+)/);
    if (storeSegment?.[1]) {
      const slug = storeSegment[1];
      return slug.endsWith(".myshopify.com") ? slug : `${slug}.myshopify.com`;
    }

    const legacySegment = decoded.match(/\/([^/]+)\/app\//);
    if (legacySegment?.[1]) {
      const slug = legacySegment[1];
      return slug.endsWith(".myshopify.com") ? slug : `${slug}.myshopify.com`;
    }
  } catch (error) {
    console.warn("No se pudo decodificar el parámetro host", error);
  }

  return null;
};

const resolveShopFromLocation = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  const parseShop = (search: string | undefined | null): string => {
    if (!search) {
      return "";
    }

    const params = new URLSearchParams(search);
    const direct = params.get("shop");
    if (direct) {
      return direct;
    }

    const host = params.get("host");
    if (host) {
      const fromHost = decodeHostShop(host);
      if (fromHost) {
        return fromHost;
      }
    }

    return "";
  };

  const current = parseShop(window.location.search);
  if (current) {
    return current;
  }

  try {
    if (window.top && window.top !== window) {
      const fromTop = parseShop(window.top.location.search);
      if (fromTop) {
        return fromTop;
      }
    }
  } catch (error) {
    console.warn("No se pudo acceder a window.top.location", error);
  }

  return "";
};

export default function AdminLanding() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectedDetails, setSelectedDetails] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [page, setPage] = useState(1);
  const [shop, setShop] = useState<string>("");

  useEffect(() => {
    const resolved = resolveShopFromLocation();
    if (resolved) {
      setShop(resolved);
    } else {
      setError("No se pudo determinar la tienda. Reabre la app desde Shopify.");
    }
  }, []);

  const loadProducts = useCallback(
    async (params?: { cursor?: string | null; direction?: "next" | "prev" }) => {
      if (!shop) {
        return;
      }

      const direction = params?.direction ?? "next";
      const cursor = params?.cursor ?? undefined;

      const qs = new URLSearchParams();
      qs.set("shop", shop);
      if (cursor) {
        qs.set("cursor", cursor);
      }
      if (direction === "prev") {
        qs.set("direction", "prev");
      }

      setLoading(true);
      setError(null);
      setSavedMessage(null);

      try {
        const resp = await fetch(`/api/products?${qs.toString()}`);
        if (!resp.ok) {
          const txt = await resp.text();
          throw new Error(txt || `HTTP ${resp.status}`);
        }
        const data = await resp.json();
        const items = Array.isArray(data?.products) ? data.products : [];
        setProducts(items);

        if (items.length > 0) {
          setSelectedDetails((prev) => {
            const updates: Record<string, Product> = {};
            items.forEach((product: Product) => {
              if (prev[product.id]) {
                updates[product.id] = product;
              }
            });
            return Object.keys(updates).length > 0 ? { ...prev, ...updates } : prev;
          });
        }

        if (data?.pageInfo && typeof data.pageInfo === "object") {
          setPageInfo({
            hasNextPage: Boolean(data.pageInfo.hasNextPage),
            hasPreviousPage: Boolean(data.pageInfo.hasPreviousPage),
            startCursor: data.pageInfo.startCursor ?? null,
            endCursor: data.pageInfo.endCursor ?? null,
          });
        } else {
          setPageInfo(null);
        }

        setPage((prev) => {
          if (cursor) {
            if (direction === "next") {
              return prev + 1;
            }
            if (direction === "prev") {
              return Math.max(1, prev - 1);
            }
          }
          return 1;
        });
      } catch (err: unknown) {
        console.error("Error loading products", err);
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [shop]
  );

  useEffect(() => {
    if (shop) {
      loadProducts();
    }
  }, [loadProducts, shop]);

  const toggleProduct = (id: string) => {
    setSelected((prevSelected) => {
      const isSelected = !!prevSelected[id];

      if (isSelected) {
        const { [id]: _removed, ...rest } = prevSelected;
        setSelectedDetails((prev) => {
          const { [id]: __, ...remaining } = prev;
          return remaining;
        });
        return rest;
      }

      const product = products.find((p) => p.id === id);
      if (!product) {
        return prevSelected;
      }

      setSelectedDetails((prev) => ({ ...prev, [id]: product }));
      return { ...prevSelected, [id]: true };
    });
  };

  const selectAll = () => {
    if (products.length === 0) return;

    const detailsToAdd: Record<string, Product> = {};
    const idsToAdd: Record<string, boolean> = {};

    products.forEach((product) => {
      idsToAdd[product.id] = true;
      detailsToAdd[product.id] = product;
    });

    setSelected((prev) => ({ ...prev, ...idsToAdd }));
    setSelectedDetails((prev) => ({ ...prev, ...detailsToAdd }));
  };

  const clearAll = () => {
    setSelected({});
    setSelectedDetails({});
  };

  const selectedCount = useMemo(
    () => Object.keys(selectedDetails).length,
    [selectedDetails]
  );

  const handleSave = async () => {
    if (!shop) {
      setError("No se pudo determinar la tienda. Reabre la app desde Shopify.");
      return;
    }

    setSaving(true);
    setSavedMessage(null);
    setError(null);

    try {
      const chosen = Object.values(selectedDetails);
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
    } catch (err: unknown) {
      console.error("Error saving selection", err);
      const message = getErrorMessage(err) || "Error guardando selección";
      setError(message);
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
        <button onClick={() => loadProducts()} style={buttonStyle} disabled={loading}>
          {loading ? "Actualizando…" : "Actualizar"}
        </button>
        <span style={{ marginLeft: "auto", color: "#6b7280" }}>
          {loading
            ? "Cargando productos…"
            : `Página ${page} · ${products.length} producto${products.length === 1 ? "" : "s"}`}
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
              <th style={thStyle}>Producto</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={2} style={tdStyle}>
                  Cargando productos…
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={2} style={tdStyle}>
                  No se encontraron productos.
                </td>
              </tr>
            )}
            {products.map((product) => {
              const imageUrl = product.featuredImage?.url ?? undefined;
              const imageAlt = product.featuredImage?.altText ?? product.title;

              return (
                <tr key={product.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>
                    <input
                      type="checkbox"
                      checked={!!selected[product.id]}
                      onChange={() => toggleProduct(product.id)}
                      disabled={loading}
                    />
                  </td>
                  <td style={productCellStyle}>
                    <div style={imageWrapperStyle}>
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={imageAlt}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={placeholderStyle} aria-hidden="true">
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>Sin imagen</span>
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 600, color: "#111827" }}>{product.title}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ color: "#6b7280", fontSize: 14 }}>
          Mostrando {products.length} producto{products.length === 1 ? "" : "s"} · Página {page}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() =>
              loadProducts({ cursor: pageInfo?.startCursor ?? undefined, direction: "prev" })
            }
            style={buttonStyle}
            disabled={
              loading || !pageInfo?.hasPreviousPage || !pageInfo?.startCursor || page <= 1
            }
          >
            Anterior
          </button>
          <button
            onClick={() => loadProducts({ cursor: pageInfo?.endCursor ?? undefined, direction: "next" })}
            style={buttonStyle}
            disabled={loading || !pageInfo?.hasNextPage || !pageInfo?.endCursor}
          >
            Siguiente
          </button>
        </div>
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
        <div
          style={{
            background: "#dcfce7",
            color: "#166534",
            padding: "12px 16px",
            borderRadius: 8,
          }}
        >
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

const productCellStyle: React.CSSProperties = {
  ...tdStyle,
  display: "flex",
  alignItems: "center",
  gap: 16,
};

const imageWrapperStyle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: 12,
  overflow: "hidden",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const placeholderStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f9fafb",
};
