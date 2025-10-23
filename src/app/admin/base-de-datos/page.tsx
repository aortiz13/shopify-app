"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  decodeHostShop,
  rememberShopForHost,
  getStoredShopForHost,
} from "@/lib/utils/shopParams";

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
  customFields: Record<string, string>;
};

type CustomColumn = {
  key: string;
  label: string;
};

type Filters = {
  action: string;
  product: string;
  search: string;
  startDate: string;
  endDate: string;
};

const LOCAL_STORAGE_COLUMNS_KEY = "tryon-db-custom-columns";
const LOCAL_STORAGE_NAMESPACE = "tryon-db-columns::";

function parseMetadata(metadata: unknown): {
  productName: string;
  variantName: string;
  customerName: string;
  customerPhone: string;
  additionalDetails: string;
  customFields: Record<string, string>;
} {
  if (!metadata || typeof metadata !== "object") {
    return {
      productName: "-",
      variantName: "",
      customerName: "-",
      customerPhone: "-",
      additionalDetails: "",
      customFields: {},
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

  const knownKeys = new Set([
    "productTitle",
    "productName",
    "title",
    "variantTitle",
    "variantName",
    "customerName",
    "userName",
    "name",
    "customerPhone",
    "phone",
    "userPhone",
    "size",
    "color",
    "email",
  ]);

  const customFields: Record<string, string> = {};

  Object.entries(record).forEach(([key, value]) => {
    if (knownKeys.has(key)) return;

    if (typeof value === "string" || typeof value === "number") {
      customFields[key] = String(value);
      return;
    }

    if (typeof value === "boolean") {
      customFields[key] = value ? "Sí" : "No";
    }
  });

  return {
    productName,
    variantName,
    customerName,
    customerPhone,
    additionalDetails: additionalFields.join(" · "),
    customFields,
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
    customFields: parsed.customFields,
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
  const [filters, setFilters] = useState<Filters>({
    action: "",
    product: "",
    search: "",
    startDate: "",
    endDate: "",
  });
  const [customColumns, setCustomColumns] = useState<CustomColumn[]>([]);
  const [newColumnLabel, setNewColumnLabel] = useState("");
  const [newColumnKey, setNewColumnKey] = useState("");

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shop) return;

    try {
      const storageKey = `${LOCAL_STORAGE_NAMESPACE}${shop}`;
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed: CustomColumn[] = JSON.parse(stored);
        setCustomColumns(parsed.filter((col) => col.key && col.label));
        return;
      }

      const legacy = window.localStorage.getItem(LOCAL_STORAGE_COLUMNS_KEY);
      if (legacy) {
        const parsed: CustomColumn[] = JSON.parse(legacy);
        setCustomColumns(parsed.filter((col) => col.key && col.label));
      }
    } catch (err) {
      console.warn("No se pudieron cargar las columnas personalizadas", err);
    }
  }, [shop]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shop) return;

    try {
      const storageKey = `${LOCAL_STORAGE_NAMESPACE}${shop}`;
      window.localStorage.setItem(storageKey, JSON.stringify(customColumns));
    } catch (err) {
      console.warn("No se pudieron guardar las columnas personalizadas", err);
    }
  }, [customColumns, shop]);

  const availableActions = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      if (row.action) {
        values.add(row.action);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const availableProducts = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((row) => {
      if (row.productName && row.productName !== "-") {
        values.add(row.productName);
      }
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const metadataKeys = useMemo(() => {
    const keys = new Set<string>();
    rows.forEach((row) => {
      Object.keys(row.customFields).forEach((key) => keys.add(key));
    });
    return Array.from(keys).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const createdAtDate = new Date(row.createdAt);
      const hasValidDate = !Number.isNaN(createdAtDate.getTime());

      if (filters.action && row.action !== filters.action) {
        return false;
      }

      if (filters.product && row.productName !== filters.product) {
        return false;
      }

      if (filters.startDate && hasValidDate) {
        const from = new Date(filters.startDate);
        from.setHours(0, 0, 0, 0);
        if (!Number.isNaN(from.getTime()) && createdAtDate < from) {
          return false;
        }
      }

      if (filters.endDate && hasValidDate) {
        const to = new Date(filters.endDate);
        to.setHours(23, 59, 59, 999);
        if (!Number.isNaN(to.getTime()) && createdAtDate > to) {
          return false;
        }
      }

      if (filters.search) {
        const haystack = [
          row.productName,
          row.variantName,
          row.customerName,
          row.customerPhone,
          row.action ?? "",
          row.additionalDetails,
          ...Object.values(row.customFields),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [filters, rows]);

  const subtitle = useMemo(() => {
    if (!shop) {
      return "Conecta la aplicación desde Shopify para ver la actividad.";
    }

    if (rows.length === 0) {
      return "Aún no hay interacciones registradas.";
    }

    return filteredRows.length === rows.length
      ? `Mostrando ${rows.length} interacciones recientes.`
      : `Filtrado: ${filteredRows.length} de ${rows.length} interacciones.`;
  }, [filteredRows.length, rows.length, shop]);

  const handleFilterChange = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddCustomColumn = () => {
    const trimmedKey = newColumnKey.trim();
    const trimmedLabel = newColumnLabel.trim();
    if (!trimmedKey || !trimmedLabel) return;

    if (customColumns.some((column) => column.key === trimmedKey)) {
      setNewColumnKey("");
      setNewColumnLabel("");
      return;
    }

    setCustomColumns((prev) => [...prev, { key: trimmedKey, label: trimmedLabel }]);
    setNewColumnKey("");
    setNewColumnLabel("");
  };

  const handleRemoveColumn = (key: string) => {
    setCustomColumns((prev) => prev.filter((column) => column.key !== key));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
          Base de datos de interacciones
        </h1>
        <p style={{ margin: 0, color: "#4b5563" }}>{subtitle}</p>
      </header>

      <section
        aria-label="Filtros"
        style={{
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          padding: "16px",
        }}
      >
        <label style={filterLabelStyle}>
          <span>Buscar</span>
          <input
            type="search"
            placeholder="Nombre, teléfono, acción…"
            value={filters.search}
            onChange={(event) => handleFilterChange("search", event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={filterLabelStyle}>
          <span>Acción</span>
          <select
            value={filters.action}
            onChange={(event) => handleFilterChange("action", event.target.value)}
            style={inputStyle}
          >
            <option value="">Todas</option>
            {availableActions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          <span>Producto</span>
          <select
            value={filters.product}
            onChange={(event) => handleFilterChange("product", event.target.value)}
            style={inputStyle}
          >
            <option value="">Todos</option>
            {availableProducts.map((product) => (
              <option key={product} value={product}>
                {product}
              </option>
            ))}
          </select>
        </label>
        <label style={filterLabelStyle}>
          <span>Desde</span>
          <input
            type="date"
            value={filters.startDate}
            onChange={(event) => handleFilterChange("startDate", event.target.value)}
            style={inputStyle}
          />
        </label>
        <label style={filterLabelStyle}>
          <span>Hasta</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(event) => handleFilterChange("endDate", event.target.value)}
            style={inputStyle}
          />
        </label>
      </section>

      <section
        aria-label="Campos personalizados"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: "#ffffff",
          borderRadius: 16,
          border: "1px solid #e5e7eb",
          padding: 16,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Campos personalizados</h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
            Añade columnas adicionales basadas en los datos capturados por el probador
            virtual.
          </p>
        </header>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          <label style={filterLabelStyle}>
            <span>Clave del dato</span>
            <input
              list="metadata-keys"
              placeholder="Ej: talla, preferencia"
              value={newColumnKey}
              onChange={(event) => setNewColumnKey(event.target.value)}
              style={inputStyle}
            />
            <datalist id="metadata-keys">
              {metadataKeys.map((key) => (
                <option key={key} value={key} />
              ))}
            </datalist>
          </label>
          <label style={filterLabelStyle}>
            <span>Nombre para mostrar</span>
            <input
              type="text"
              placeholder="Ej: Preferencia de color"
              value={newColumnLabel}
              onChange={(event) => setNewColumnLabel(event.target.value)}
              style={inputStyle}
            />
          </label>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button
              type="button"
              onClick={handleAddCustomColumn}
              style={{
                padding: "10px 16px",
                background: "#111827",
                color: "#ffffff",
                borderRadius: 8,
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Añadir columna
            </button>
          </div>
        </div>
        {customColumns.length > 0 ? (
          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: 0,
              margin: 0,
            }}
          >
            {customColumns.map((column) => (
              <li
                key={column.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#f3f4f6",
                  color: "#111827",
                  borderRadius: 999,
                  padding: "6px 12px",
                  fontSize: 13,
                }}
              >
                <span>
                  <strong>{column.label}</strong>
                  <span style={{ color: "#6b7280" }}> · {column.key}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveColumn(column.key)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0, color: "#6b7280", fontSize: 13 }}>
            No has añadido columnas personalizadas todavía. Puedes elegir cualquiera de
            las claves detectadas o escribir una propia.
          </p>
        )}
      </section>

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
      ) : filteredRows.length === 0 ? (
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
            No hay resultados para los filtros aplicados. Ajusta los criterios para ver
            más interacciones.
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
                {customColumns.map((column) => (
                  <th key={column.key} style={thStyle}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
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
                  <td style={{ ...tdStyle, display: "flex", flexDirection: "column", gap: 6 }}>
                    {row.additionalDetails ? (
                      <span style={{ color: "#4b5563" }}>{row.additionalDetails}</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Sin datos adicionales</span>
                    )}
                    {Object.entries(row.customFields).length > 0 ? (
                      <ul
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 6,
                          margin: 0,
                          padding: 0,
                          listStyle: "none",
                        }}
                      >
                        {Object.entries(row.customFields).map(([key, value]) => (
                          <li key={key} style={customPillStyle}>
                            <span style={{ color: "#6b7280" }}>{key}:</span> {value}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </td>
                  {customColumns.map((column) => (
                    <td key={column.key} style={tdStyle}>
                      {row.customFields[column.key] ?? (
                        <span style={{ color: "#9ca3af" }}>Sin datos</span>
                      )}
                    </td>
                  ))}
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

const filterLabelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 4,
  fontSize: 13,
  color: "#111827",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  fontSize: 14,
  color: "#111827",
  background: "#ffffff",
};

const customPillStyle: CSSProperties = {
  background: "#e0f2fe",
  color: "#0f172a",
  padding: "4px 8px",
  borderRadius: 999,
  fontSize: 12,
};
