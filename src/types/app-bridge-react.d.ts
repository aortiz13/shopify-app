declare module "@shopify/app-bridge-react" {
  import * as React from "react";
  export interface ProviderProps {
    config: any;
    children?: React.ReactNode;
  }
  // 👇 export named
  export const Provider: React.ComponentType<ProviderProps>;
}
