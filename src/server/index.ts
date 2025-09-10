// src/server/index.ts
import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import Koa from "koa";
import Router from "@koa/router";
import session from "koa-session";
import bodyParser from "koa-bodyparser";
import proxy from "koa-proxies";

import { shopify } from "./shopify";
import {
  prisma,
  adminGraphqlEndpoint,
  getShopToken,
  saveShopSession,
} from "./db";

// ----------------------------------------------------
// App base
// ----------------------------------------------------
const app = new Koa();
const router = new Router();

// Confiar en X-Forwarded-* (ngrok / reverse proxy)
app.proxy = true;

// Requerido por koa-session (usamos el secret de Shopify)
app.keys = [shopify.config.apiSecretKey];

// Cookies aptas para app embebida (Secure + SameSite=None)
app.use(session({ sameSite: "none", secure: true }, app));

// Body parser para JSON en /api/*
app.use(bodyParser());

// ----------------------------------------------------
// CSP UNIFICADO - para permitir embebido en Admin de Shopify + assets ngrok
// ----------------------------------------------------
app.use(async (ctx, next) => {
  const isNgrok = process.env.HOST?.includes("ngrok") || process.env.NODE_ENV === "development";

  if (isNgrok) {
    // Desarrollo: CSP que permite assets de ngrok
    ctx.set(
      "Content-Security-Policy",
      [
        "default-src 'self' https:",
        "img-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline' https:",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
        "font-src 'self' data: https://assets.ngrok.com https://cdn.ngrok.com https:",
        "connect-src 'self' https: wss:",
        "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
        "frame-src https://admin.shopify.com https://*.myshopify.com"
      ].join("; ")
    );
  } else {
    // Producción: CSP más estricta
    ctx.set(
      "Content-Security-Policy",
      [
        "default-src 'self' https:",
        "img-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline' https:",
        "script-src 'self' https:",
        "font-src 'self' data: https:",
        "connect-src 'self' https: wss:",
        "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
        "frame-src https://admin.shopify.com https://*.myshopify.com"
      ].join("; ")
    );
  }

  await next();
});

// ----------------------------------------------------
// Skip ngrok browser warning by sending the expected header
// ----------------------------------------------------
app.use(async (ctx, next) => {
  if (process.env.HOST?.includes("ngrok")) {
    ctx.set("ngrok-skip-browser-warning", "true");
  }

  await next();
});

// Log simple de requests (útil para debug)
app.use(async (ctx, next) => {
  console.log("➡️", ctx.method, ctx.path);
  await next();
});

// ----------------------------------------------------
// Proxies a Next.js (UI) en puerto 3000 (o configurable)
// ----------------------------------------------------
const NEXT_TARGET = process.env.NEXT_TARGET || "http://127.0.0.1:3000";

// /admin y todo lo que cuelga
app.use(
  proxy(/^\/admin(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
  })
);
// /widget (popup de PDP) y todo lo que cuelga
app.use(
  proxy(/^\/widget(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
  })
);
// Assets/HMR de Next
app.use(
  proxy(/^\/_next(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
  })
);
// Fuentes de Next 15 (Geist)
app.use(
  proxy(/^\/__nextjs_font(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
  })
);
// Íconos (opcional)
app.use(
  proxy("/favicon.ico", {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
  })
);

// ----------------------------------------------------
// Rutas utilitarias
// ----------------------------------------------------
router.get("/health", (ctx) => {
  ctx.body = "ok";
});

// Evitar 404 al abrir raíz del túnel
router.get("/", (ctx) => ctx.redirect("/admin"));

// ----------------------------------------------------
// OAuth Shopify
// ----------------------------------------------------
router.get("/api/auth", async (ctx) => {
  const shop = (ctx.query.shop as string)?.trim();
  if (!shop) {
    ctx.status = 400;
    ctx.body = "Missing shop param";
    return;
  }

  await shopify.auth.begin({
    shop,
    callbackPath: "/api/auth/callback",
    isOnline: false, // token offline
    rawRequest: ctx.req,
    rawResponse: ctx.res,
  });

  // La librería ya manejó el redirect
  ctx.respond = false;
});

router.get("/api/auth/callback", async (ctx) => {
  try {
    const result = await shopify.auth.callback({
      rawRequest: ctx.req,
      rawResponse: ctx.res,
    });

    const sess = result.session;

    // Normalizar scope (puede venir undefined)
    const scope = String(
      (sess as { scope?: string }).scope || process.env.SCOPES || ""
    );

    // Guardar token offline en DB
    await saveShopSession({
      shop: sess.shop,
      // @ts-expect-error: en v11 accessToken está en la sesión
      accessToken: sess.accessToken,
      scope,
      isOnline: !!sess.isOnline,
    });

    console.log("🔐 Session guardada en DB:", {
      shop: sess.shop,
      scope,
      isOnline: sess.isOnline,
    });

    // Tras OAuth, redirigir al dashboard embebido
    ctx.redirect(`/admin?shop=${encodeURIComponent(sess.shop)}`);
  } catch (err) {
    console.error("❌ Error en callback OAuth:", err);
    ctx.status = 500;
    ctx.body = "OAuth error";
  }
});

// ----------------------------------------------------
// API: Productos (Admin GraphQL real)
// GET /api/products?shop=<shop.myshopify.com>
// ----------------------------------------------------
router.get("/api/products", async (ctx) => {
  try {
    const shop = String(ctx.query.shop ?? "");
    if (!shop) {
      ctx.status = 400;
      ctx.body = { error: "Missing shop" };
      return;
    }

    const token = await getShopToken(shop);
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: "No session for this shop — reinstall app" };
      return;
    }

    const query = `
      query {
        products(first: 20, sortKey: UPDATED_AT, reverse: true) {
          edges {
            node {
              id
              title
              handle
              status
              variants(first: 5) { edges { node { id title sku } } }
              metafields(first: 10, namespace: "internal") { edges { node { key value } } }
              updatedAt
            }
          }
        }
      }
    `;

    const resp = await fetch(adminGraphqlEndpoint(shop), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    });

    type ProductsResponse = {
      errors?: unknown;
      data: { products: { edges: { node: unknown }[] } };
    };

    const json = (await resp.json()) as ProductsResponse;
    if (json.errors) {
      ctx.status = 500;
      ctx.body = { errors: json.errors };
      return;
    }

    ctx.body = json.data.products.edges.map((e) => e.node);
  } catch (e) {
    console.error("❌ /api/products error:", e);
    ctx.status = 500;
    ctx.body = { error: "Internal error" };
  }
});

// ----------------------------------------------------
// API: Logging del probador virtual
// POST /api/tryon/log   { shop, productId, action, ... }
// ----------------------------------------------------
router.post("/api/tryon/log", async (ctx) => {
  try {
    type TryOnLogBody = {
      shop?: string;
      productId?: string;
      externalId?: string;
      variantId?: string;
      customerId?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    };

    const {
      shop,
      productId,
      externalId,
      variantId,
      customerId,
      action,
      metadata,
    } = (ctx.request as { body?: TryOnLogBody }).body ?? {};

    if (!shop || !productId || !action) {
      ctx.status = 400;
      ctx.body = { error: "shop, productId y action son requeridos" };
      return;
    }

    const log = await prisma.tryOnLog.create({
      data: { shop, productId, externalId, variantId, customerId, action, metadata },
    });

    ctx.body = { ok: true, id: log.id };
  } catch (e) {
    console.error("❌ /api/tryon/log error:", e);
    ctx.status = 500;
    ctx.body = { error: "Internal error" };
  }
});

// ----------------------------------------------------
// Montar rutas y lanzar servidor
// ----------------------------------------------------
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = Number(process.env.PORT ?? 3001);
const HOST = "127.0.0.1";

app.listen(PORT, HOST, () => {
  console.log(
    `🚀 Koa server escuchando en http://${HOST}:${PORT}  |  HOST público: ${process.env.HOST ?? "no-config"}`
  );
});
