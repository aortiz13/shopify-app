// src/server/index.ts
import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import Koa from "koa";
import type { Context } from "koa";
import Router from "@koa/router";
import session from "koa-session";
import bodyParser from "koa-bodyparser";
import proxy from "koa-proxies";
import { shopify } from "./shopify";
import { prisma, adminGraphqlEndpoint, getShopToken, saveShopSession } from "./db";

// ----------------------------------------------------
// App base
// ----------------------------------------------------
const app = new Koa();
const router = new Router();

// Confiar en X-Forwarded-* (Cloudflare Tunnel / reverse proxy)
app.proxy = true;

// Requerido por koa-session (usamos el secret de Shopify)
app.keys = [shopify.config.apiSecretKey];

// Cookies aptas para app embebida (Secure + SameSite=None)
app.use(session({ sameSite: "none", secure: true }, app));

// Body parser para JSON en /api/*
app.use(bodyParser());

// ----------------------------------------------------
// CSP UNIFICADO - para permitir embebido en Admin de Shopify
// y assets propios (Cloudflare Tunnel/no-ngrok)
// ----------------------------------------------------
const CSP = [
  "default-src 'self' https:",
  "img-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss:",
  "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
  "frame-src https://admin.shopify.com https://*.myshopify.com https://app.adrian-ortiz.com",
].join("; ");

app.use(async (ctx, next) => {
  ctx.set("Content-Security-Policy", CSP);
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

/**
 * En koa-proxies NO existe `onProxyRes`.
 * La forma correcta es usar `events.proxyRes` para tocar headers de la respuesta.
 * Importante: NO setear X-Frame-Options; simplemente removerlo.
 */
const proxyEvents = {
  proxyRes(proxyRes: any /* IncomingMessage */, _req: any, _res: any) {
    try {
      proxyRes.headers["content-security-policy"] = CSP;
      delete proxyRes.headers["x-frame-options"];
    } catch {
      // no-op
    }
  },
};

// /admin (dashboard embebido) y todo lo que cuelga
app.use(
  proxy(/^\/admin(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
    events: proxyEvents,
  }),
);

// /widget (UI del popup/iframe) y todo lo que cuelga
app.use(
  proxy(/^\/widget(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
    events: proxyEvents,
  }),
);

// Assets/HMR de Next
app.use(
  proxy(/^\/_next(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
    events: proxyEvents,
  }),
);

// Fuentes de Next 15 (Geist)
app.use(
  proxy(/^\/__nextjs_font(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
    events: proxyEvents,
  }),
);

// Ícono (opcional)
app.use(
  proxy("/favicon.ico", {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
    events: proxyEvents,
  }),
);

// ----------------------------------------------------
// Helpers para el proxy manual del App Proxy
// ----------------------------------------------------
function copyUpstreamHeaders(resp: Response, ctx: Context) {
  // Copiamos todos los headers del upstream salvo los hop-by-hop o los que rompen el embed.
  const skip = new Set([
    "transfer-encoding",
    "content-length",
    "connection",
    "keep-alive",
    "x-frame-options",
    "content-security-policy",
  ]);
  resp.headers.forEach((val, key) => {
    if (!skip.has(key.toLowerCase())) {
      ctx.set(key, val);
    }
  });
}

// ---------------------------------------------------------------------
// App Proxy: Shopify -> /apps/tryon/widget  →  Tu host -> /proxy/widget
// Aquí NO usamos koa-proxies para evitar "Http response closed while proxying"
// ---------------------------------------------------------------------
router.get("/proxy/widget", async (ctx) => {
  try {
    const qs = ctx.querystring ? `?${ctx.querystring}` : "";
    const upstreamUrl = `${NEXT_TARGET}/widget${qs}`;

    const upstream = await fetch(upstreamUrl, {
      headers: {
        "x-forwarded-host": ctx.host,
        "x-forwarded-proto": ctx.secure ? "https" : "http",
      },
    });

    // Copiamos headers útiles del upstream y sobreescribimos lo necesario
    copyUpstreamHeaders(upstream as unknown as Response, ctx);

    // CSP válida para storefront/admin
    const isDev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self' https:",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval' " : ""}https:`,
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      "frame-ancestors https://admin.shopify.com https://*.myshopify.com",
      "frame-src https://admin.shopify.com https://*.myshopify.com https://app.adrian-ortiz.com",
    ].join("; ");
    ctx.set("Content-Security-Policy", csp);
    ctx.remove("X-Frame-Options");
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    ctx.status = upstream.status;
    ctx.body = await upstream.text(); // devolvemos el HTML
  } catch (e) {
    console.error("❌ /proxy/widget error:", e);
    ctx.status = 502;
    ctx.body = "Proxy error";
  }
});

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
      (sess as { scope?: string }).scope || process.env.SCOPES || "",
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
// POST /api/tryon/save
router.post("/api/tryon/save", async (ctx) => {
  try {
    const body = ctx.request.body as { shop?: string; products?: Array<{ id: string; title?: string; handle?: string }> };
    const shop = body.shop ?? String(ctx.query.shop ?? "");
    const products = Array.isArray(body.products) ? body.products : [];

    if (!shop || products.length === 0) {
      ctx.status = 400;
      ctx.body = { error: "shop and products are required" };
      return;
    }

    // Guarda en DB (prisma). Ajusta el modelo según tu esquema.
    // Ejemplo simple: crear un registro con JSON
    const record = await prisma.tryOnSelection.create({
      data: {
        shop,
        productsJson: JSON.stringify(products),
      },
    });

    ctx.body = { ok: true, id: record.id };
  } catch (e) {
    console.error("❌ /api/tryon/save error:", e);
    ctx.status = 500;
    ctx.body = { error: "Internal error", detail: String(e?.message ?? e) };
  }
});

// ----------------------------------------------------
// API: Productos (Admin GraphQL real) con logs detallados
// GET /api/products?shop=<shop.myshopify.com>[&debug=1]
// ----------------------------------------------------
router.get("/api/products", async (ctx) => {
  const shop = String(ctx.query.shop ?? "").trim();
  if (!shop) {
    ctx.status = 400;
    ctx.body = { error: "Missing shop" };
    return;
  }

  try {
    const token = await getShopToken(shop);

    if (!token) {
      // Token offline no encontrado -> pide reinstalar/auth
      ctx.status = 401;
      ctx.body = { error: "No session for this shop — reinstall the app" };
      return;
    }

    // Si pasas ?debug=1 hago una query mínima, útil para aislar el problema de permisos/campos
    const minimal = String(ctx.query.debug || "") === "1";

    const query = minimal
      ? `
        query {
          products(first: 10, sortKey: UPDATED_AT, reverse: true) {
            edges { node { id title handle updatedAt } }
          }
        }
      `
      : `
        query {
          products(first: 20, sortKey: UPDATED_AT, reverse: true) {
            edges {
              node {
                id
                title
                handle
                updatedAt
                variants(first: 5) { edges { node { id title sku } } }
                metafields(first: 10, namespace: "internal") { edges { node { key value } } }
              }
            }
          }
        }
      `;

    const endpoint = adminGraphqlEndpoint(shop); // debería ser https://{shop}/admin/api/2024-07/graphql.json
    const resp = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query }),
    });

    // Si Shopify devolvió 4xx/5xx, devolvemos ese status y el cuerpo crudo para ver el motivo
    if (!resp.ok) {
      const text = await resp.text();
      console.error("❌ Admin GraphQL upstream error:", resp.status, text);
      ctx.status = resp.status;
      ctx.body = { error: "Upstream error", status: resp.status, detail: text };
      return;
    }

    const json = (await resp.json()) as any;

    if (json.errors) {
      console.error("❌ Admin GraphQL JSON errors:", JSON.stringify(json.errors, null, 2));
      ctx.status = 500;
      ctx.body = { error: "GraphQL errors", detail: json.errors };
      return;
    }

    const nodes = json.data?.products?.edges?.map((e: any) => e.node) ?? [];
    ctx.body = nodes;
  } catch (e: any) {
    console.error("❌ /api/products exception:", e?.message || e);
    ctx.status = 500;
    ctx.body = { error: "Internal error", detail: String(e?.message || e) };
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
    `🚀 Koa server escuchando en http://${HOST}:${PORT}  |  HOST público: ${process.env.HOST ?? "no-config"}`,
  );
});
