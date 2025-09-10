"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Page,
  LegacyCard,
  DataTable,
  Spinner,
  Text,
} from "@shopify/polaris";
import { PolarisWrapper } from "@/components/PolarisProvider";
import AppBridgeProvider from "@/components/AppBridgeProvider";

type Product = {
  id: string; title: string; handle: string; status: string; updatedAt: string;
  variants?: { edges: { node: { id: string; title: string; sku: string } }[] };
  metafields?: { edges: { node: { key: string; value: string } }[] };
};

export default function AdminDashboard() {
  const sp = useSearchParams();
  const shop = sp.get("shop") || process.env.NEXT_PUBLIC_SHOP!;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[][]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const resp = await fetch(`/api/products?shop=${encodeURIComponent(shop)}`);
      const data: Product[] = await resp.json();

      const r = data.map((p) => {
        const extId =
          p.metafields?.edges.find((e) => e.node.key === "external_id")
            ?.node.value ?? "-";
        const vCount = p.variants?.edges?.length ?? 0;
        return [
          p.title,
          p.handle,
          extId,
          String(vCount),
          new Date(p.updatedAt).toLocaleString(),
        ];
      });

      setRows(r);
      setLoading(false);
    })();
  }, [shop]);

  const headings = useMemo(
    () => ["Título", "Handle", "ID Externo", "Variantes", "Actualizado"],
    []
  );

  return (
    <AppBridgeProvider>
      <PolarisWrapper>
        <Page title="Dashboard del Probador Virtual">
          <LegacyCard title="Productos" sectioned>
            {loading ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Spinner accessibilityLabel="Cargando" size="small" />
                <Text as="span" variant="bodyMd">
                  Cargando productos…
                </Text>
              </div>
            ) : (
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric", "text"]}
                headings={headings}
                rows={rows}
              />
            )}
          </LegacyCard>
        </Page>
      </PolarisWrapper>
    </AppBridgeProvider>
  );
}
