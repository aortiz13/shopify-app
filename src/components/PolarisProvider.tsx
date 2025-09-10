"use client";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import translations from "@shopify/polaris/locales/es.json";

export function PolarisWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider i18n={translations}>
      {children}
    </AppProvider>
  );
}