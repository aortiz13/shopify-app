"use client";

import React, { PropsWithChildren, useMemo } from "react";

export default function AppBridgeProvider({
  children,
  apiKey,
  host,
}: PropsWithChildren<{ apiKey?: string; host?: string }>) {
  // Si falta apiKey/host, o no existe app-bridge-react, renderizamos pelado.
  if (!apiKey || !host) return <>{children}</>;

  try {
    // @ts-ignore – carga dinámica para evitar el error de build si el paquete no está
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AppBridgeReact = require("@shopify/app-bridge-react");
    const { Provider } = AppBridgeReact || {};

    if (!Provider) {
      console.warn(
        "[AppBridge] Provider no encontrado en '@shopify/app-bridge-react'. Renderizando sin App Bridge."
      );
      return <>{children}</>;
    }

    const config = useMemo(
      () => ({ apiKey, host, forceRedirect: true }),
      [apiKey, host]
    );

    return <Provider config={config}>{children}</Provider>;
  } catch {
    console.warn(
      "[AppBridge] Paquete '@shopify/app-bridge-react' no disponible. Renderizando sin App Bridge."
    );
    return <>{children}</>;
  }
}