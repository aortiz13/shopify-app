// src/app/admin/page.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ProductImage = {
  url?: string | null;
  originalSrc?: string | null;
  altText?: string | null;
};

type Product = {
  id: string;
  title: string;
  handle?: string;
  updatedAt?: string;
  featuredImage?: ProductImage | null;
  featuredMediaPreview?: ProductImage | null;
  mediaPreviews?: ProductImage[];
  images?: {
    edges?: Array<{ node?: ProductImage | null } | null>;
  } | null;
  cursor?: string | null;
  thumbnailUrl?: string | null;
  thumbnailAlt?: string | null;
};

type StoredSelectionProduct = {
  id?: string | null;
  title?: string | null;
  handle?: string | null;
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

const parseErrorPayload = (raw: string | null | undefined): string | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.error === "string" && parsed.error.trim()) {
        if (typeof parsed.detail === "string" && parsed.detail.trim()) {
          return `${parsed.error}. ${parsed.detail}`;
        }
        return parsed.error;
      }

      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
    }
  } catch {
    // texto plano, ignoramos
  }

  return raw;
};

const STORAGE_PREFIX = "tryon-shop-for-host::";

const rememberShopForHost = (host: string, shop: string) => {
  if (!host || !shop) return;

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${host}`, shop);
    }
  } catch (error) {
    console.warn("No se pudo guardar la tienda en sessionStorage", error);
  }
};

const getStoredShopForHost = (host: string): string | null => {
  if (!host) return null;

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const value = window.sessionStorage.getItem(`${STORAGE_PREFIX}${host}`);
      return value ? value : null;
    }
  } catch (error) {
    console.warn("No se pudo leer la tienda desde sessionStorage", error);
  }

  return null;
};

const decodeHostShop = (hostParam: string): string | null => {
  try {
    const normalized = hostParam.replace(/-/g, "+").replace(/_/g, "/");
    const padding =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(4 - (normalized.length % 4));
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

export default function AdminLanding() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [selectedDetails, setSelectedDetails] = useState<
    Record<string, Product>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [hasSavedSelection, setHasSavedSelection] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shop, setShop] = useState<string>("");
  const [adminHost, setAdminHost] = useState<string>("");
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [page, setPage] = useState(1);
  const [resolvingShop, setResolvingShop] = useState(true);
  const [currentStartCursor, setCurrentStartCursor] = useState<string | null>(
    null,
  );
  const [currentEndCursor, setCurrentEndCursor] = useState<string | null>(null);
  const currentStartCursorRef = useRef<string | null>(null);
  const authInProgressRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setResolvingShop(true);

    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get("shop") ?? "";
    const hostParam = params.get("host") ?? "";

    setAdminHost(hostParam);

    const finalizeShop = (value: string) => {
      setShop(value);
      setPage(1);
      setPageInfo(null);
      setCurrentStartCursor(null);
      setCurrentEndCursor(null);
      currentStartCursorRef.current = null;
      setError(null);
      if (hostParam && value) {
        rememberShopForHost(hostParam, value);
      }
      setResolvingShop(false);
    };

    if (shopParam) {
      finalizeShop(shopParam);
      return;
    }

    if (hostParam) {
      const stored = getStoredShopForHost(hostParam);
      if (stored) {
        finalizeShop(stored);
        return;
      }

      const decoded = decodeHostShop(hostParam);
      if (decoded) {
        finalizeShop(decoded);
        return;
      }
    }

    setResolvingShop(false);
    setError(
      (prev) =>
        prev ?? "No se pudo determinar la tienda. Reabre la app desde Shopify.",
    );
  }, []);

  const loadProducts = useCallback(
    async (options: { cursor?: string; direction?: "next" | "prev" } = {}) => {
      if (!shop) {
        setError(
          "No se pudo determinar la tienda. Reabre la app desde Shopify.",
        );
        return;
      }

      setLoading(true);
      setError(null);
      setSavedMessage(null);

      const direction: "next" | "prev" = options.direction ?? "next";
      const productParams = new URLSearchParams({ shop });

      if (adminHost) {
        productParams.set("host", adminHost);
      }

      if (options.cursor) {
        productParams.set("cursor", options.cursor);
      }

      if (direction) {
        productParams.set("direction", direction);
      }

      const selectionParams = new URLSearchParams({ shop });
      if (adminHost) {
        selectionParams.set("host", adminHost);
      }

      let savedProducts: StoredSelectionProduct[] = [];
      let selectionApplied = false;

      try {
        const [productsResp, selectionResp] = await Promise.all([
          fetch(`/api/products?${productParams.toString()}`),
          fetch(`/api/tryon/selection?${selectionParams.toString()}`),
        ]);

        if (!productsResp.ok) {
          const rawErrorText = await productsResp.text();
          const parsedErrorMessage = parseErrorPayload(rawErrorText);

          if (productsResp.status === 401 && shop) {
            const params = new URLSearchParams({ shop });
            if (adminHost) {
              params.set("host", adminHost);
            }

            if (!authInProgressRef.current && typeof window !== "undefined") {
              authInProgressRef.current = true;
              const authUrl = `/api/auth?${params.toString()}`;
              try {
                if (window.top) {
                  window.top.location.href = authUrl;
                } else {
                  window.location.href = authUrl;
                }
              } catch (navError) {
                console.warn(
                  "No se pudo redirigir automáticamente a OAuth",
                  navError,
                );
              }
            }

            throw new Error(
              parsedErrorMessage ||
                "No hay una sesión válida para la tienda. Autoriza nuevamente la app desde Shopify.",
            );
          }

          throw new Error(parsedErrorMessage || `HTTP ${productsResp.status}`);
        }

        const productsJson = await productsResp.json();
        const productList = Array.isArray(productsJson?.products)
          ? productsJson.products
          : Array.isArray(productsJson)
            ? productsJson
            : [];

        setProducts(productList);

        const resolvedDirection =
          typeof productsJson?.direction === "string" &&
          (productsJson.direction === "prev" ||
            productsJson.direction === "next")
            ? (productsJson.direction as "prev" | "next")
            : direction;

        const pageInfoData = productsJson?.pageInfo;
        const pageInfoObject =
          pageInfoData && typeof pageInfoData === "object"
            ? {
                hasNextPage: Boolean(pageInfoData.hasNextPage),
                hasPreviousPage: Boolean(pageInfoData.hasPreviousPage),
                startCursor: pageInfoData.startCursor ?? null,
                endCursor: pageInfoData.endCursor ?? null,
              }
            : null;

        const firstProductCursor =
          productList.length > 0 && productList[0]?.cursor
            ? String(productList[0]?.cursor)
            : null;
        const lastProductCursor =
          productList.length > 0 && productList[productList.length - 1]?.cursor
            ? String(productList[productList.length - 1]?.cursor)
            : null;

        const resolvedStartCursor =
          pageInfoObject?.startCursor ?? firstProductCursor;
        const resolvedEndCursor =
          pageInfoObject?.endCursor ?? lastProductCursor;

        if (pageInfoObject) {
          setPageInfo({
            ...pageInfoObject,
            startCursor: resolvedStartCursor ?? null,
            endCursor: resolvedEndCursor ?? null,
          });
        } else if (resolvedStartCursor || resolvedEndCursor) {
          setPageInfo({
            hasNextPage: Boolean(productsJson?.hasNextPage),
            hasPreviousPage: Boolean(productsJson?.hasPreviousPage),
            startCursor: resolvedStartCursor ?? null,
            endCursor: resolvedEndCursor ?? null,
          });
        } else {
          setPageInfo(null);
        }

        currentStartCursorRef.current = resolvedStartCursor ?? null;
        setCurrentStartCursor(resolvedStartCursor ?? null);
        setCurrentEndCursor(resolvedEndCursor ?? null);

        if (!options.cursor) {
          setPage(1);
        } else if (resolvedDirection === "next") {
          setPage((prev) => prev + 1);
        } else {
          setPage((prev) => Math.max(1, prev - 1));
        }
        if (selectionResp.ok) {
          const selectionJson = await selectionResp.json();
          savedProducts = Array.isArray(selectionJson?.products)
            ? selectionJson.products
            : [];

          if (savedProducts.length > 0) {
            const map: Record<string, boolean> = {};
            savedProducts.forEach((product) => {
              if (product?.id) {
                map[product.id] = true;
              }
            });
            setSelected(map);
            setHasSavedSelection(true);
          } else {
            setSelected({});
            setHasSavedSelection(false);
          }
          selectionApplied = true;
        } else if (selectionResp.status !== 404) {
          const txt = await selectionResp.text();
          throw new Error(txt || `HTTP ${selectionResp.status}`);
        }

        setSelectedDetails((prevDetails) => {
          if (selectionApplied) {
            if (savedProducts.length === 0) {
              return {};
            }

            const details: Record<string, Product> = {};

            savedProducts.forEach((product) => {
              const id = typeof product?.id === "string" ? product.id : null;
              if (!id) return;

              const previous = prevDetails[id];
              const normalizedTitle =
                typeof product?.title === "string" && product.title
                  ? product.title
                  : (previous?.title ?? "");
              const normalizedHandle =
                typeof product?.handle === "string" && product.handle
                  ? product.handle
                  : previous?.handle;

              details[id] = {
                ...(previous ?? {}),
                id,
                title: normalizedTitle,
                handle: normalizedHandle,
              };
            });

            productList.forEach((product: Product) => {
              if (details[product.id]) {
                details[product.id] = { ...details[product.id], ...product };
              }
            });

            return details;
          }

          const nextDetails: Record<string, Product> = { ...prevDetails };

          productList.forEach((product: Product) => {
            if (nextDetails[product.id]) {
              nextDetails[product.id] = {
                ...nextDetails[product.id],
                ...product,
              };
            }
          });

          return nextDetails;
        });
      } catch (err: any) {
        console.error("Error loading products", err);
        setError(err?.message ? String(err.message) : "Error inesperado");
      } finally {
        setLoading(false);
      }
    },
    [adminHost, shop],
  );

  useEffect(() => {
    if (!resolvingShop && shop) {
      loadProducts();
    }
  }, [loadProducts, resolvingShop, shop]);

  useEffect(() => {
    if (!isModalOpen) return;
    if (typeof document === "undefined") return;

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsModalOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModalOpen]);

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
    () => Object.keys(selected).filter((id) => selected[id]).length,
    [selected],
  );

  const busy = loading || resolvingShop;

  const handleOpenModal = () => {
    setIsModalOpen(true);

    if (!resolvingShop && shop && !loading && products.length === 0) {
      loadProducts();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const selectionHint = hasSavedSelection
    ? "Tu última selección guardada se mostrará en los productos habilitados."
    : "Guarda tu selección para activar el probador en tu tienda.";

  const statusText = resolvingShop
    ? "Determinando la tienda…"
    : loading
      ? "Cargando productos…"
      : products.length === 0
        ? "No se encontraron productos en la última carga."
        : `Última carga: ${products.length} producto${
            products.length === 1 ? "" : "s"
          } · Página ${page}`;

  const handleSave = async () => {
    if (!shop) {
      setError("No se pudo determinar la tienda. Reabre la app desde Shopify.");
      return;
    }

    setSaving(true);
    setSavedMessage(null);
    setError(null);

    try {
      const chosen = Object.keys(selected)
        .filter((id) => selected[id])
        .map((id) => {
          const detail = selectedDetails[id];
          return {
            id,
            title: detail?.title,
            handle: detail?.handle,
          };
        });
      const payload: {
        shop: string;
        products: Array<{ id: string; title?: string; handle?: string }>;
        host?: string;
      } = {
        shop,
        products: chosen.map(({ id, title, handle }) => ({
          id,
          title,
          handle,
        })),
      };

      if (adminHost) {
        payload.host = adminHost;
      }

      const resp = await fetch("/api/tryon/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || `HTTP ${resp.status}`);
      }

      setSavedMessage(
        `Guardados ${chosen.length} producto${chosen.length === 1 ? "" : "s"}. Actualiza tu theme para que el probador esté disponible.`,
      );
      setHasSavedSelection(chosen.length > 0);
    } catch (err: any) {
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
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, color: "#6b7280", fontWeight: 600 }}>Paso 1</p>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          Selecciona los productos para Try On
        </h1>
        <p style={{ margin: 0, color: "#4b5563", maxWidth: 540 }}>
          Elige los productos que quieres habilitar en el probador virtual.
          Puedes actualizar esta selección en cualquier momento.
        </p>
      </header>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ color: "#4b5563", maxWidth: 560, lineHeight: 1.5 }}>
          Administra los productos habilitados para el probador virtual desde el
          modal. Puedes actualizar la selección cuando lo necesites.
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              minWidth: 220,
            }}
          >
            <span style={{ color: "#111827", fontWeight: 600 }}>
              Productos seleccionados: {selectedCount} producto
              {selectedCount === 1 ? "" : "s"}
            </span>
            <span style={{ color: "#6b7280", fontSize: 14 }}>
              {selectionHint}
            </span>
            <span style={{ color: "#9ca3af", fontSize: 13 }}>{statusText}</span>
          </div>
          <button
            onClick={handleOpenModal}
            style={{
              ...primaryButtonStyle,
              minWidth: 220,
            }}
            disabled={resolvingShop}
          >
            Administrar productos
          </button>
        </div>
      </section>

      {!isModalOpen && savedMessage && (
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

      {!isModalOpen && error && (
        <div
          style={{
            background: "#fee2e2",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      )}

      {isModalOpen && (
        <div
          style={modalOverlayStyle}
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-selection-modal-title"
          onClick={handleCloseModal}
        >
          <div
            style={modalContainerStyle}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={modalHeaderStyle}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h2
                  id="product-selection-modal-title"
                  style={{ margin: 0, fontSize: 24, fontWeight: 700 }}
                >
                  Selecciona los productos para Try On
                </h2>
                <p style={{ margin: 0, color: "#6b7280", maxWidth: 540 }}>
                  Marca los productos que deseas habilitar en el probador
                  virtual.
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                style={modalCloseButtonStyle}
                aria-label="Cerrar selección de productos"
              >
                ×
              </button>
            </div>
            <div style={modalBodyStyle}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={selectAll}
                  style={buttonStyle}
                  disabled={busy || products.length === 0}
                >
                  Seleccionar todos
                </button>
                <button
                  onClick={clearAll}
                  style={buttonStyle}
                  disabled={busy || products.length === 0}
                >
                  Limpiar selección
                </button>
                <button
                  onClick={() => loadProducts()}
                  style={buttonStyle}
                  disabled={busy}
                >
                  {loading
                    ? "Actualizando…"
                    : resolvingShop
                      ? "Resolviendo tienda…"
                      : "Actualizar"}
                </button>
                <span style={{ marginLeft: "auto", color: "#6b7280" }}>
                  {resolvingShop
                    ? "Determinando la tienda…"
                    : loading
                      ? "Cargando productos…"
                      : `Página ${page} · ${products.length} producto${
                          products.length === 1 ? "" : "s"
                        }`}
                </span>
              </div>

              {error && (
                <div
                  style={{
                    background: "#fee2e2",
                    color: "#991b1b",
                    padding: "12px 16px",
                    borderRadius: 8,
                  }}
                >
                  {error}
                </div>
              )}

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

              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  overflow: "hidden",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
                  background: "#ffffff",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead
                    style={{
                      background: "#f9fafb",
                      textTransform: "uppercase",
                      fontSize: 12,
                      letterSpacing: 0.4,
                    }}
                  >
                    <tr>
                      <th style={thStyle}> </th>
                      <th style={thStyle}>Producto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resolvingShop && (
                      <tr>
                        <td colSpan={2} style={tdStyle}>
                          Determinando la tienda…
                        </td>
                      </tr>
                    )}
                    {!resolvingShop && loading && (
                      <tr>
                        <td colSpan={2} style={tdStyle}>
                          Cargando productos…
                        </td>
                      </tr>
                    )}
                    {!resolvingShop && !loading && products.length === 0 && (
                      <tr>
                        <td colSpan={2} style={tdStyle}>
                          No se encontraron productos.
                        </td>
                      </tr>
                    )}
                    {!resolvingShop &&
                      products.map((product) => {
                        const firstGalleryImage =
                          product.images?.edges?.find((edge) => edge?.node)?.node
                            ?? null;
                        const mediaPreview =
                          product.mediaPreviews?.find(
                            (item) => item?.url || item?.originalSrc,
                          ) ?? null;
                        const preferredImage = product.thumbnailUrl
                          ? null
                          : product.featuredMediaPreview &&
                              (product.featuredMediaPreview.url ||
                                product.featuredMediaPreview.originalSrc ||
                                product.featuredMediaPreview.altText)
                            ? product.featuredMediaPreview
                            : product.featuredImage &&
                                (product.featuredImage.url ||
                                  product.featuredImage.originalSrc ||
                                  product.featuredImage.altText)
                              ? product.featuredImage
                              : (mediaPreview ?? firstGalleryImage);

                        const resolvedThumbnailUrl =
                          product.thumbnailUrl ??
                          preferredImage?.url ??
                          preferredImage?.originalSrc ??
                          mediaPreview?.url ??
                          mediaPreview?.originalSrc ??
                          firstGalleryImage?.url ??
                          firstGalleryImage?.originalSrc ??
                          undefined;

                        const resolvedThumbnailAlt =
                          product.thumbnailAlt ??
                          preferredImage?.altText ??
                          mediaPreview?.altText ??
                          firstGalleryImage?.altText ??
                          product.title;

                        return (
                          <tr
                            key={product.id}
                            style={{ borderTop: "1px solid #f3f4f6" }}
                          >
                            <td style={tdStyle}>
                              <input
                                type="checkbox"
                                checked={!!selected[product.id]}
                                onChange={() => toggleProduct(product.id)}
                                disabled={busy}
                              />
                            </td>
                            <td style={productCellStyle}>
                              <div style={imageWrapperStyle}>
                                {resolvedThumbnailUrl ? (
                                  <img
                                    src={resolvedThumbnailUrl}
                                    alt={resolvedThumbnailAlt}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  <div style={placeholderStyle} aria-hidden="true">
                                    <span style={{ fontSize: 12, color: "#9ca3af" }}>
                                      Sin imagen
                                    </span>
                                  </div>
                                )}
                              </div>
                              <span style={{ fontWeight: 600, color: "#111827" }}>
                                {product.title}
                              </span>
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
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ color: "#6b7280", fontSize: 14 }}>
                  {resolvingShop
                    ? "Esperando la tienda para mostrar productos…"
                    : `Mostrando ${products.length} producto${
                        products.length === 1 ? "" : "s"
                      } · Página ${page}`}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      const cursor = currentStartCursorRef.current;
                      if (!cursor) return;
                      loadProducts({ cursor, direction: "prev" });
                    }}
                    style={buttonStyle}
                    disabled={
                      busy ||
                      !pageInfo?.hasPreviousPage ||
                      !currentStartCursor ||
                      page <= 1
                    }
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => {
                      if (!currentEndCursor) return;
                      loadProducts({ cursor: currentEndCursor, direction: "next" });
                    }}
                    style={buttonStyle}
                    disabled={busy || !pageInfo?.hasNextPage || !currentEndCursor}
                  >
                    Siguiente
                  </button>
                </div>
              </div>

              <footer
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 12,
                  alignItems: "center",
                }}
              >
                <div style={{ color: "#4b5563" }}>
                  {resolvingShop
                    ? "Esperando la tienda..."
                    : selectedCount === 0
                      ? "Selecciona al menos un producto para continuar"
                      : `${selectedCount} producto${
                          selectedCount === 1 ? "" : "s"
                        } seleccionados`}
                </div>
                <button
                  onClick={handleSave}
                  style={primaryButtonStyle}
                  disabled={saving || selectedCount === 0 || busy}
                >
                  {saving ? "Guardando…" : "Guardar selección"}
                </button>
              </footer>
            </div>
          </div>
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

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 1000,
};

const modalContainerStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 20,
  maxWidth: 960,
  width: "100%",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.25)",
};

const modalHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  padding: "24px 24px 16px 24px",
  gap: 16,
};

const modalBodyStyle: React.CSSProperties = {
  padding: "0 24px 24px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  overflowY: "auto",
};

const modalCloseButtonStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  fontSize: 24,
  lineHeight: 1,
  padding: 0,
  width: 32,
  height: 32,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  color: "#6b7280",
};
