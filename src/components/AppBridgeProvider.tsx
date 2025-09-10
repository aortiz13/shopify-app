"use client";

import { ReactNode, useMemo } from "react";
// 👇 named import, exactamente como en la doc oficial
import { Provider } from "@shopify/app-bridge-react";

type Props = { children: ReactNode };

export function AppBridgeProvider({ children }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || "";

  const host =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("host") || ""
      : "";

  const config = useMemo(() => ({ apiKey, host, forceRedirect: true }), [apiKey, host]);

  // En dev, si falta apiKey u host, no rompas el render
  if (!apiKey || !host) {
    return <>{children}</>;
  }

  return <Provider config={config}>{children}</Provider>;
}

export default AppBridgeProvider;
