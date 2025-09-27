// src/server/index.ts
import * as dotenv from "dotenv";
import { resolve } from "path";
import process from "node:process";
dotenv.config({ path: resolve(process.cwd(), ".env.local") });

import Koa from "koa";
import type { Context } from "koa";
import Router from "@koa/router";
import session from "koa-session";
import bodyParser from "koa-bodyparser";
import proxy from "koa-proxies";
import { shopify } from "./shopify";
import {
  prisma,
  adminGraphqlEndpoint,
  getShopToken,
  getShopByAdminHost,
  saveShopSession,
  rememberAdminHost,
} from "./db";

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
// CSP DINÁMICO - para permitir embebido en Admin de Shopify
// y assets propios (Cloudflare Tunnel)
// ----------------------------------------------------
app.use(async (ctx, next) => {
  // Logging unificado
  console.log("➡️", ctx.method, ctx.path);
  
  // CSP dinámico basado en el host
  const forwardedHost = ctx.headers['x-forwarded-host'];
  const shopDomain = typeof forwardedHost === 'string' && forwardedHost.includes('.myshopify.com') 
    ? forwardedHost 
    : '';
  
  const frameAncestors = [
    "'self'",
    "https://admin.shopify.com", 
    "https://*.myshopify.com"
  ];
  
  if (shopDomain) {
    frameAncestors.push(`https://${shopDomain}`);
  }
  
  const dynamicCSP = [
    "default-src 'self' https:",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss: ws:",
    `frame-ancestors ${frameAncestors.join(' ')}`,
    "frame-src https://admin.shopify.com https://*.myshopify.com https://app.adrian-ortiz.com https://app.adrian-ortiz.com/picker",
  ].join("; ");
  
  ctx.set("Content-Security-Policy", dynamicCSP);
  await next();
});

// ----------------------------------------------------
// Proxies a Next.js (UI) en puerto 3000 (o configurable)
// ----------------------------------------------------
const NEXT_TARGET = process.env.NEXT_TARGET || "http://127.0.0.1:3000";

/**
 * Proxy events mejorado
 */
const proxyEvents = {
  proxyRes(proxyRes: any /* IncomingMessage */, _req: any, _res: any) {
    try {
      // No setear CSP aquí ya que lo manejamos globalmente
      delete proxyRes.headers["x-frame-options"];
    } catch {
      // no-op
    }
  },
  error(err: any, _req: any, _res: any) {
    // Solo registra errores que NO sean de HMR
    if (!err.message?.includes('webpack-hmr') && !err.message?.includes('ECONNRESET')) {
      console.log('Proxy error:', err.message);
    }
  }
};

// Proxy específico para HMR (debe ir ANTES de los otros _next)
app.use(
  proxy("/_next/webpack-hmr", {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: false,
    events: {
      error() {
        // Ignora completamente errores de HMR
      }
    },
  }),
);

// /admin (dashboard embebido) y todo lo que cuelga
app.use(
  proxy(/^\/admin(?:\/.*)?$/, {
    target: NEXT_TARGET,
    changeOrigin: true,
    logs: true,
    events: proxyEvents,
  }),
);

// /widget (UI del selector integrado en la página) y todo lo que cuelga
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

// Icono (opcional)
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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error && typeof err.message === "string") {
    return err.message;
  }

  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string") {
      return message;
    }
  }

  return typeof err === "string" ? err : String(err);
}

function normalizeShopParam(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeHostParam(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

async function resolveShopFromParams(params: {
  shop?: unknown;
  host?: unknown;
}) {
  const shopParam = normalizeShopParam(params.shop);
  if (shopParam) {
    const hostParam = normalizeHostParam(params.host);
    return {
      shop: shopParam,
      from: "shop" as const,
      host: hostParam || undefined,
    };
  }

  const hostParam = normalizeHostParam(params.host);
  if (!hostParam) {
    return { shop: "", from: null as const };
  }

  const found = await getShopByAdminHost(hostParam);
  if (found) {
    return { shop: found, from: "host" as const, host: hostParam };
  }

  return { shop: "", from: "host" as const, host: hostParam };
}

async function persistAdminHostIfNeeded(shop: string, host?: string) {
  const adminHost = normalizeHostParam(host);
  if (!adminHost) return;

  await rememberAdminHost({ shop, adminHost });
}

type SanitizedImage = {
  url: string | null;
  originalSrc: string | null;
  altText: string | null;
};

const SHOPIFY_IMAGE_FIELDS =
  "url(transform: {maxWidth: 200, maxHeight: 200, crop: CENTER}) originalSrc altText";

const MEDIA_IMAGE_FRAGMENT = `
  ... on MediaImage {
    image { ${SHOPIFY_IMAGE_FIELDS} }
  }
`;

const MEDIA_PREVIEW_FRAGMENTS = `
  ... on ExternalVideo {
    preview { image { ${SHOPIFY_IMAGE_FIELDS} } }
  }
  ... on Model3d {
    preview { image { ${SHOPIFY_IMAGE_FIELDS} } }
  }
  ... on Video {
    preview { image { ${SHOPIFY_IMAGE_FIELDS} } }
  }
`;

const MEDIA_BASE_SELECTION = `
  mediaContentType
  ... on ExternalVideo {
    preview {
      image { ${SHOPIFY_IMAGE_FIELDS} }
    }
  }
  ... on Model3d {
    preview {
      image { ${SHOPIFY_IMAGE_FIELDS} }
    }
  }
  ... on Video {
    preview {
      image { ${SHOPIFY_IMAGE_FIELDS} }
    }
  }
  ... on MediaImage {
    image { ${SHOPIFY_IMAGE_FIELDS} }
  }
`;

function sanitizeImage(image: unknown): SanitizedImage | null {
  if (!image || typeof image !== "object") {
    return null;
  }

  const maybeRecord = image as Record<string, unknown>;
  const url = typeof maybeRecord.url === "string" ? maybeRecord.url : null;
  const originalSrc =
    typeof maybeRecord.originalSrc === "string"
      ? maybeRecord.originalSrc
      : null;
  const altText =
    typeof maybeRecord.altText === "string" ? maybeRecord.altText : null;

  if (!url && !originalSrc && !altText) {
    return null;
  }

  return { url, originalSrc, altText };
}

function sanitizeImageEdges(images: unknown): Array<{ node: SanitizedImage }> {
  if (!images || typeof images !== "object") {
    return [];
  }

  const edges = (images as { edges?: unknown }).edges;
  if (!Array.isArray(edges)) {
    return [];
  }

  return edges
    .map((edge) => {
      if (!edge || typeof edge !== "object") return null;
      const node = (edge as { node?: unknown }).node;
      const sanitized = sanitizeImage(node);
      return sanitized ? { node: sanitized } : null;
    })
    .filter((value): value is { node: SanitizedImage } => Boolean(value));
}

function sanitizePreviewImage(preview: unknown): SanitizedImage | null {
  if (!preview || typeof preview !== "object") {
    return null;
  }

  const image = (preview as { image?: unknown }).image;
  return sanitizeImage(image);
}

function sanitizeMediaPreview(media: unknown): SanitizedImage | null {
  if (!media || typeof media !== "object") {
    return null;
  }

  const previewImage = sanitizePreviewImage((media as { preview?: unknown }).preview);
  if (previewImage) {
    return previewImage;
  }

  return sanitizeImage((media as { image?: unknown }).image);
}

function sanitizeMediaNodes(media: unknown): SanitizedImage[] {
  if (!media || typeof media !== "object") {
    return [];
  }

  const nodes = (media as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes
    .map((node) => sanitizeMediaPreview(node))
    .filter((value): value is SanitizedImage => Boolean(value));
}

// ---------------------------------------------------------------------
// App Proxy: Shopify -> /apps/tryon/widget → Tu host -> /proxy/widget
// Aquí NO usamos koa-proxies para evitar "Http response closed while proxying"
// ---------------------------------------------------------------------
router.get("/proxy/widget", async (ctx: Context) => {
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
    copyUpstreamHeaders(upstream, ctx);

    // CSP válida para storefront/admin
    const isDev = process.env.NODE_ENV !== "production";
    const forwardedHost = ctx.headers['x-forwarded-host'];
    const csp = [
      "default-src 'self' https:",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""} https:`,
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      `frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com https://${forwardedHost || 'actual-moda-dev.myshopify.com'}`,
      "frame-src https://admin.shopify.com https://*.myshopify.com https://app.adrian-ortiz.com https://app.adrian-ortiz.com/picker",
    ].join("; ");
    ctx.set("Content-Security-Policy", csp);
    ctx.remove("X-Frame-Options");
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    ctx.set("Access-Control-Allow-Credentials", "true");
    ctx.status = upstream.status;
    ctx.body = await upstream.text(); // devolvemos el HTML
  } catch (e: unknown) {
    console.error("⚠️ /proxy/widget error:", e);
    ctx.status = 502;
    ctx.body = "Proxy error";
  }
});

router.get("/proxy/picker", async (ctx: Context) => {
  try {
    const qs = ctx.querystring ? `?${ctx.querystring}` : "";
    const upstreamUrl = `${NEXT_TARGET}/picker${qs}`;

    const upstream = await fetch(upstreamUrl, {
      headers: {
        "x-forwarded-host": ctx.host,
        "x-forwarded-proto": ctx.secure ? "https" : "http",
      },
    });

    copyUpstreamHeaders(upstream, ctx);

    const isDev = process.env.NODE_ENV !== "production";
    const forwardedHost = ctx.headers['x-forwarded-host'];
    const csp = [
      "default-src 'self' https:",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline' https:",
      `script-src 'self' ${isDev ? "'unsafe-inline' 'unsafe-eval'" : ""} https:`,
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss:",
      `frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com https://${forwardedHost || 'actual-moda-dev.myshopify.com'}`,
      "frame-src https://admin.shopify.com https://*.myshopify.com",
    ].join("; ");
    ctx.set("Content-Security-Policy", csp);
    ctx.remove("X-Frame-Options");
    ctx.set("Access-Control-Allow-Origin", "*");
    ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    ctx.set("Access-Control-Allow-Credentials", "true");
    ctx.status = upstream.status;
    ctx.body = await upstream.text();
  } catch (e: unknown) {
    console.error("⚠️ /proxy/picker error:", e);
    ctx.status = 502;
    ctx.body = "Proxy error";
  }
});

// ----------------------------------------------------
// Rutas utilitarias
// ----------------------------------------------------
router.get("/health", (ctx: Context) => {
  ctx.body = "ok";
});

// Evitar 404 al abrir raíz del túnel
router.get("/", (ctx: Context) => ctx.redirect("/admin"));

router.get("/api/session/resolve-shop", async (ctx: Context) => {
  const hostParam = normalizeHostParam(ctx.query.host);

  if (!hostParam) {
    ctx.status = 400;
    ctx.body = { error: "Missing host" };
    return;
  }

  const shop = await getShopByAdminHost(hostParam);

  if (!shop) {
    ctx.status = 404;
    ctx.body = { error: "Unknown host" };
    return;
  }

  await persistAdminHostIfNeeded(shop, hostParam);

  ctx.body = { shop };
});

// ----------------------------------------------------
// OAuth Shopify
// ----------------------------------------------------
router.get("/api/auth", async (ctx: Context) => {
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

router.get("/api/auth/callback", async (ctx: Context) => {
  try {
    const result = await shopify.auth.callback({
      rawRequest: ctx.req,
      rawResponse: ctx.res,
    });

    const hostParam = normalizeHostParam(ctx.query.host);

    type ShopifySession = {
      shop: string;
      accessToken?: string;
      isOnline?: boolean;
      scope?: string;
    };

    const sess = result.session as ShopifySession | undefined;

    if (!sess?.shop) {
      throw new Error("Missing shop in Shopify session");
    }

    // Normalizar scope (puede venir undefined)
    const scope = String(sess.scope || process.env.SCOPES || "");

    if (!sess.accessToken) {
      throw new Error("Missing access token in Shopify session");
    }

    // Guardar token offline en DB
    await saveShopSession({
      shop: sess.shop,
      accessToken: sess.accessToken,
      scope,
      isOnline: !!sess.isOnline,
      adminHost: hostParam || null,
    });

    console.log("🔐 Session guardada en DB:", {
      shop: sess.shop,
      scope,
      isOnline: sess.isOnline,
      hostParam,
    });

    // Tras OAuth, redirigir al dashboard embebido
    const redirectHost = hostParam
      ? `&host=${encodeURIComponent(hostParam)}`
      : "";
    ctx.redirect(`/admin?shop=${encodeURIComponent(sess.shop)}${redirectHost}`);
  } catch (err: unknown) {
    console.error("⚠️ Error en callback OAuth:", err);
    ctx.status = 500;
    ctx.body = "OAuth error";
  }
});

// ----------------------------------------------------
// API: Logging del probador virtual
// POST /api/tryon/log   { shop, productId, action, ... }
// ----------------------------------------------------
router.post("/api/tryon/log", async (ctx: Context) => {
  try {
    type TryOnLogBody = {
      shop?: string;
      host?: string;
      productId?: string;
      externalId?: string;
      variantId?: string;
      customerId?: string;
      action?: string;
      metadata?: Record<string, unknown>;
    };

    const {
      shop,
      host,
      productId,
      externalId,
      variantId,
      customerId,
      action,
      metadata,
    } = (ctx.request as { body?: TryOnLogBody }).body ?? {};

    const resolved = await resolveShopFromParams({ shop, host });
    const resolvedShop = resolved.shop;

    if (!resolvedShop || !productId || !action) {
      ctx.status = 400;
      ctx.body = { error: "shop, productId y action son requeridos" };
      return;
    }

    if (resolved.from) {
      await persistAdminHostIfNeeded(resolvedShop, resolved.host ?? host);
    }

    const log = await prisma.tryOnLog.create({
      data: {
        shop: resolvedShop,
        productId,
        externalId,
        variantId,
        customerId,
        action,
        metadata,
      },
    });

    ctx.body = { ok: true, id: log.id };
  } catch (e: unknown) {
    console.error("⚠️ /api/tryon/log error:", e);
    ctx.status = 500;
    ctx.body = { error: "Internal error", detail: getErrorMessage(e) };
  }
});

// POST /api/tryon/save
router.post("/api/tryon/save", async (ctx: Context) => {
  try {
    const body = ctx.request.body as {
      shop?: string;
      products?: Array<{ id: string; title?: string; handle?: string }>;
    };
    const shop = body.shop ?? String(ctx.query.shop ?? "");
    const products = Array.isArray(body.products) ? body.products : [];

    if (!shop || products.length === 0) {
      ctx.status = 400;
      ctx.body = { error: "shop and products are required" };
      return;
    }

    const serialized = JSON.stringify(products);

    const existing = await prisma.tryOnSelection.findFirst({
      where: { shop },
      orderBy: { createdAt: "desc" },
    });

    if (existing) {
      await prisma.tryOnSelection.update({
        where: { id: existing.id },
        data: { productsJson: serialized },
      });
      ctx.body = { ok: true, id: existing.id, updated: true };
    } else {
      const record = await prisma.tryOnSelection.create({
        data: {
          shop,
          productsJson: serialized,
        },
      });

      ctx.body = { ok: true, id: record.id, created: true };
    }
  } catch (e) {
    const message = getErrorMessage(e);
    console.error("⚠️ /api/tryon/save error:", e);
    if (message.toLowerCase().includes("readonly")) {
      ctx.status = 500;
      ctx.body = {
        error: "Database is read-only",
        detail:
          "La base de datos de la app está en modo solo lectura. Reinicia el servidor o define DATABASE_URL hacia un directorio escribible.",
      };
      return;
    }

    ctx.status = 500;
    ctx.body = { error: "Internal error", detail: message };
  }
});

router.get("/api/tryon/selection", async (ctx: Context) => {
  const resolution = await resolveShopFromParams({
    shop: ctx.query.shop,
    host: ctx.query.host,
  });

  const shop = resolution.shop;

  if (!shop) {
    ctx.status = 400;
    ctx.body = { error: "Missing shop" };
    return;
  }

  if (resolution.from) {
    await persistAdminHostIfNeeded(
      shop,
      resolution.host ?? normalizeHostParam(ctx.query.host),
    );
  }

  try {
    const existing = await prisma.tryOnSelection.findFirst({
      where: { shop },
      orderBy: { createdAt: "desc" },
    });

    if (!existing) {
      ctx.body = { shop, products: [] };
      return;
    }

    try {
      const parsed = JSON.parse(existing.productsJson ?? "[]");
      ctx.body = { shop, products: Array.isArray(parsed) ? parsed : [] };
    } catch (err: unknown) {
      console.error("⚠️ /api/tryon/selection parse error:", err);
      ctx.status = 500;
      ctx.body = { error: "Invalid stored selection" };
    }
  } catch (e: unknown) {
    console.error("⚠️ /api/tryon/selection error:", e);
    ctx.status = 500;
    ctx.body = { error: "Internal error", detail: getErrorMessage(e) };
  }
});

// ----------------------------------------------------
// API: Productos (Admin GraphQL real) con logs detallados
// GET /api/products?shop=<shop.myshopify.com>[&debug=1]
// ----------------------------------------------------
router.get("/api/products", async (ctx: Context) => {
  const resolution = await resolveShopFromParams({
    shop: ctx.query.shop,
    host: ctx.query.host,
  });

  const shop = resolution.shop;
  if (!shop) {
    ctx.status = 400;
    ctx.body = { error: "Missing shop" };
    return;
  }

  if (resolution.from) {
    await persistAdminHostIfNeeded(
      shop,
      resolution.host ?? normalizeHostParam(ctx.query.host),
    );
  }

  try {
    const token = await getShopToken(shop);

    if (!token) {
      // Token offline no encontrado -> pide reinstalar/auth
      ctx.status = 401;
      ctx.body = { error: "No session for this shop – reinstall the app" };
      return;
    }

    // Si pasas ?debug=1 hago una query mínima, útil para aislar el problema de permisos/campos
    const minimal = String(ctx.query.debug || "") === "1";

    const limitParam = Number(ctx.query.limit ?? 20);
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 50)
        : 20;
    const direction =
      String(ctx.query.direction ?? "next") === "prev" ? "prev" : "next";
    const rawCursor = String(ctx.query.cursor ?? "").trim();
    const cursor = rawCursor ? rawCursor.replace(/"/g, '\\"') : "";

    const connectionArgs: string[] = [];
    if (direction === "prev") {
      connectionArgs.push(`last: ${limit}`);
      if (cursor) {
        connectionArgs.push(`before: "${cursor}"`);
      }
    } else {
      connectionArgs.push(`first: ${limit}`);
      if (cursor) {
        connectionArgs.push(`after: "${cursor}"`);
      }
    }

    const connection = connectionArgs.join(", ");

    const baseProductFields = `
      id
      title
      handle
      updatedAt
      featuredImage { ${SHOPIFY_IMAGE_FIELDS} }
      featuredMedia {
        ${MEDIA_IMAGE_FRAGMENT}
        ${MEDIA_PREVIEW_FRAGMENTS}
      }
      media(first: 2) {
        nodes {
          ${MEDIA_IMAGE_FRAGMENT}
          ${MEDIA_PREVIEW_FRAGMENTS}
        }
      }
      featuredMedia {
        ${MEDIA_BASE_SELECTION}
      }
      media(first: 2) {
        nodes {
          ${MEDIA_BASE_SELECTION}
        }
      }
      images(first: 3) { edges { node { ${SHOPIFY_IMAGE_FIELDS} } } }
    `;

    const query = minimal
      ? `
        query {
          products(sortKey: UPDATED_AT, reverse: true, ${connection}) {
            edges {
              cursor
              node {
                ${baseProductFields}
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `
      : `
        query {
          products(sortKey: UPDATED_AT, reverse: true, ${connection}) {
            edges {
              cursor
              node {
                ${baseProductFields}
                variants(first: 5) { edges { node { id title sku } } }
                metafields(first: 10, namespace: "internal") { edges { node { key value } } }
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
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
      console.error("⚠️ Admin GraphQL upstream error:", resp.status, text);
      ctx.status = resp.status;
      ctx.body = { error: "Upstream error", status: resp.status, detail: text };
      return;
    }

    const json = (await resp.json()) as any;

    if (json.errors) {
      console.error(
        "⚠️ Admin GraphQL JSON errors:",
        JSON.stringify(json.errors, null, 2),
      );
      ctx.status = 500;
      ctx.body = { error: "GraphQL errors", detail: json.errors };
      return;
    }

    const edges = json.data?.products?.edges ?? [];
    const nodes = edges
      .map((edge: any) => {
        if (!edge?.node) return null;

        const node = edge.node;
        const featuredImage = sanitizeImage(node.featuredImage);
        const featuredMediaImage = sanitizeMediaPreview(node.featuredMedia);
        const mediaImages = sanitizeMediaNodes(node.media);
        const imageEdges = sanitizeImageEdges(node.images);

        const firstGalleryImage =
          imageEdges.length > 0 ? (imageEdges[0]?.node ?? null) : null;
        const firstMediaImage = mediaImages.length > 0 ? mediaImages[0] : null;

        const thumbnailUrl =
          featuredMediaImage?.url ??
          featuredImage?.url ??
          featuredMediaImage?.originalSrc ??
          featuredImage?.originalSrc ??
          firstMediaImage?.url ??
          firstMediaImage?.originalSrc ??
          firstGalleryImage?.url ??
          firstGalleryImage?.originalSrc ??
          null;

        const thumbnailAlt =
          featuredMediaImage?.altText ??
          featuredImage?.altText ??
          firstMediaImage?.altText ??
          firstGalleryImage?.altText ??
          (typeof node.title === "string" ? node.title : null);

        return {
          ...node,
          cursor: edge.cursor ?? null,
          featuredImage,
          featuredMediaPreview: featuredMediaImage,
          mediaPreviews: mediaImages,
          images: { edges: imageEdges },
          thumbnailUrl,
          thumbnailAlt,
        };
      })
      .filter(Boolean);
    const pageInfo = json.data?.products?.pageInfo ?? null;

    ctx.body = {
      shop,
      products: nodes,
      pageInfo:
        pageInfo && typeof pageInfo === "object"
          ? {
              hasNextPage: Boolean(pageInfo.hasNextPage),
              hasPreviousPage: Boolean(pageInfo.hasPreviousPage),
              startCursor: pageInfo.startCursor ?? null,
              endCursor: pageInfo.endCursor ?? null,
            }
          : {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
      limit,
      direction,
    };
  } catch (e: unknown) {
    console.error("⚠️ /api/products exception:", e);
    ctx.status = 500;
    ctx.body = { error: "Internal error", detail: getErrorMessage(e) };
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