/**
 * Middleware de Content Security Policy (CSP) y logging
 *
 * Configura headers de seguridad para permitir embedding en Shopify Admin
 * y storefronts, además de logging unificado de requests.
 */

import type { Context, Next } from "koa";

/**
 * Middleware CSP dinámico que permite embedding desde Shopify
 */
export async function cspMiddleware(ctx: Context, next: Next) {
  // Logging unificado
  console.log("➡️", ctx.method, ctx.path);

  // Obtener el HOST actual (permite usar túneles temporales)
  const appHost = process.env.HOST || "https://app.adrian-ortiz.com";

  // CSP más permisivo para permitir embedding desde storefronts
  const dynamicCSP = [
    "default-src 'self' https:",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline' https:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: wss: ws:",
    "frame-ancestors https://*.myshopify.com https://admin.shopify.com", // Permite admin Y storefronts
    `frame-src https://admin.shopify.com https://*.myshopify.com ${appHost}`,
  ].join("; ");

  ctx.set("Content-Security-Policy", dynamicCSP);

  // Añadir Permissions-Policy para resolver las advertencias de camera/microphone
  ctx.set("Permissions-Policy", "camera=(), microphone=(), fullscreen=(), clipboard-read=(), clipboard-write=()");

  await next();
}
