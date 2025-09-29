"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type TryOnLog = {
  id: number;
  createdAt: string;
  productId: string | null;
  externalId: string | null;
  variantId: string | null;
  customerId: string | null;
  action: string | null;
  metadata: unknown;
};

type ParsedLog = TryOnLog & {
  productName: string;
  variantName: string;
  customerName: string;
  customerPhone: string;
  additionalDetails: string;
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

function parseMetadata(metadata: unknown): {
  productName: string;
  variantName: string;
  customerName: string;
  customerPhone: string;
  additionalDetails: string;
} {
  if (!metadata || typeof metadata !== "object") {
    return {
      productName: "-",
      variantName: "",
      customerName: "-",
      customerPhone: "-",
      additionalDetails: "",
    };
  }

  const record = metadata as Record<string, unknown>;

  const productName =
    typeof record.productTitle === "string"
      ? record.productTitle
      : typeof record.productName === "string"
      ? record.productName
      : typeof record.title === "string"
      ? record.title
      : "-";

  const variantName =
    typeof record.variantTitle === "string"
      ? record.variantTitle
      : typeof record.variantName === "string"
      ? record.variantName
      : "";

  const customerName =
    typeof record.customerName === "string"
      ? record.customerName
      : typeof record.userName === "string"
      ? record.userName
      : typeof record.name === "string"
      ? record.name
      : "-";

  const customerPhone =
    typeof record.customerPhone === "string"
      ? record.customerPhone
      : typeof record.phone === "string"
      ? record.phone
      : typeof record.userPhone === "string"
      ? record.userPhone
      : "-";

  const additionalFields = [
    typeof record.size === "string" ? `Talla: ${record.size}` : null,
    typeof record.color === "string" ? `Color: ${record.color}` : null,
    typeof record.email === "string" ? `Email: ${record.email}` : null,
  ].filter(Boolean);

  return {
    productName,
    variantName,
    customerName,
    customerPhone,
    additionalDetails: additionalFields.join(" · "),
  };
}

function enhanceLog(row: TryOnLog): ParsedLog {
  const parsed = parseMetadata(row.metadata);
  return {
    ...row,
    productName: parsed.productName,
    variantName: parsed.variantName,
    customerName: parsed.customerName,
    customerPhone: parsed.customerPhone,
    additionalDetails: parsed.additionalDetails,
  };
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export default function BaseDeDatosPage() {
  const [shop, setShop] = useState<string>("");
  const [adminHost, setAdminHost] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedLog[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get("shop");
    const hostParam = params.get("host");

    if (shopParam) {
      setShop(shopParam);
      setAdminHost(hostParam ?? "");
      return;
    }

    if (hostParam) {
      setAdminHost(hostParam);
      const decodedShop = decodeHostShop(hostParam);
      if (decodedShop) {
        setShop(decodedShop);
        rememberShopForHost(hostParam, decodedShop);
        return;
      }

      const stored = getStoredShopForHost(hostParam);
      if (stored) {
        setShop(stored);
      }
    }
  }, []);

  useEffect(() => {
    if (!shop) return;

    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ shop });
        if (adminHost) {
          params.set("host", adminHost);
        }

        const response = await fetch(`/api/tryon/logs?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || `HTTP ${response.status}`);
        }

        const data: TryOnLog[] = await response.json();
        setRows(data.map(enhanceLog));
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("Error cargando datos de uso", err);
        setError((err as Error).message || "Error al cargar los registros");
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => controller.abort();
  }, [adminHost, shop]);

  const subtitle = useMemo(() => {
    if (!shop) {
      return "Conecta la aplicación desde Shopify para ver la actividad.";
    }

    if (rows.length === 0) {
      return "Aún no hay interacciones registradas.";
    }

    return `Mostrando ${rows.length} interacciones recientes.`;
  }, [rows.length, shop]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          Base de datos de interacciones
        </h1>
        <p style={{ margin: 0, color: "#4b5563" }}>{subtitle}</p>
      </header>

      {error && (
        <div
          role="alert"
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

      {loading ? (
        <p style={{ color: "#6b7280" }}>Cargando actividad reciente…</p>
      ) : rows.length === 0 ? (
        <div
          style={{
            border: "1px dashed #d1d5db",
            borderRadius: 12,
            padding: "32px 24px",
            textAlign: "center",
            color: "#6b7280",
          }}
        >
          <p style={{ margin: 0, fontSize: 16 }}>
            No registramos interacciones todavía. Pídele a tus clientes que
            prueben el probador virtual para ver datos aquí.
          </p>
        </div>
      ) : (
        <div
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            overflow: "hidden",
            background: "#ffffff",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Producto</th>
                <th style={thStyle}>Usuario</th>
                <th style={thStyle}>Teléfono</th>
                <th style={thStyle}>Acción</th>
                <th style={thStyle}>Detalles</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={tdStyle}>{formatDate(row.createdAt)}</td>
                  <td style={tdStyle}>
                    <strong>{row.productName}</strong>
                    {row.variantName ? (
                      <span style={{ display: "block", color: "#6b7280" }}>
                        {row.variantName}
                      </span>
                    ) : null}
                  </td>
                  <td style={tdStyle}>{row.customerName}</td>
                  <td style={tdStyle}>{row.customerPhone}</td>
                  <td style={tdStyle}>{row.action ?? "-"}</td>
                  <td style={tdStyle}>
                    {row.additionalDetails ? (
                      <span style={{ color: "#4b5563" }}>{row.additionalDetails}</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Sin datos adicionales</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "12px 16px",
  fontSize: 12,
  textTransform: "uppercase",
  color: "#6b7280",
  letterSpacing: "0.05em",
};

const tdStyle: CSSProperties = {
  padding: "12px 16px",
  verticalAlign: "top",
  color: "#111827",
};
