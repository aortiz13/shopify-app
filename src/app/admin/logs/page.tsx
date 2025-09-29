// ~/shopify-app/src/app/admin/logs/page.tsx
"use client";

import { useEffect, useState } from "react";

type Log = {
  id: string;
  createdAt: string;
  shop: string;
  productId: string | null;
  action: string | null;
  metadata: any;
};

export default function LogsAdminPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  // ⚠️ Ajusta tu shop dev aquí o pásala por query
  const shop = "actual-moda-dev.myshopify.com";

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch(`/api/tryon/logs?shop=${encodeURIComponent(shop)}&limit=50`);
      const data: Log[] = await res.json();
      setRows(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ marginBottom: 12 }}>Accesos al Probador</h1>
      {loading ? (
        <p>Cargando…</p>
      ) : rows.length === 0 ? (
        <p>Sin registros aún.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Fecha</th>
              <th style={th}>Producto</th>
              <th style={th}>Acción</th>
              <th style={th}>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={td}>{new Date(r.createdAt).toLocaleString()}</td>
                <td style={td}>{r.productId ?? "-"}</td>
                <td style={td}>{r.action ?? "-"}</td>
                <td style={td}><code style={{ fontSize: 12 }}>{JSON.stringify(r.metadata ?? {}, null, 0)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", borderBottom: "1px solid #ddd", padding: "8px 6px" };
const td: React.CSSProperties = { borderBottom: "1px solid #eee", padding: "8px 6px", fontSize: 14 };
