/**
 * Configuración de proxies a Next.js
 *
 * Este módulo configura todos los proxies necesarios para
 * redirigir requests de UI y assets a Next.js.
 */

import type { Context } from "koa";
import type Koa from "koa";
import proxy from "koa-proxies";

/**
 * Target de Next.js (configurable vía env)
 */
export const NEXT_TARGET = process.env.NEXT_TARGET || "http://127.0.0.1:3000";

/**
 * Eventos de proxy mejorados para limpiar headers
 */
export const proxyEvents = {
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

/**
 * Copia headers del upstream al response, excluyendo headers problemáticos
 */
export function copyUpstreamHeaders(resp: Response, ctx: Context) {
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

/**
 * Configura todos los proxies de Next.js en la aplicación
 */
export function setupProxies(app: Koa) {
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
}
