// src/server/shopify.ts
import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

// 👇 IMPORTANTE: registra el adapter para Node
import "@shopify/shopify-api/adapters/node";

import { shopifyApi, LATEST_API_VERSION } from "@shopify/shopify-api";

export const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: process.env.SCOPES!.split(","),
  hostName: process.env.HOST!.replace(/^https?:\/\//, ""),
  isEmbeddedApp: true,
  apiVersion: LATEST_API_VERSION,
});
