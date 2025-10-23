/**
 * Funciones para normalización y resolución de parámetros shop/host
 *
 * Estas funciones manejan la lógica de obtener la tienda correcta
 * desde parámetros de query (shop y/o host).
 */

import { getShopByAdminHost, rememberAdminHost } from "../db";

/**
 * Normaliza el parámetro shop
 */
export function normalizeShopParam(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normaliza el parámetro host
 */
export function normalizeHostParam(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

/**
 * Resuelve la tienda desde parámetros shop/host
 *
 * Prioridad:
 * 1. Si hay shop param, lo usa directamente
 * 2. Si solo hay host param, busca la tienda en la base de datos
 */
export async function resolveShopFromParams(params: {
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

/**
 * Persiste la asociación shop->adminHost si es necesario
 */
export async function persistAdminHostIfNeeded(shop: string, host?: string) {
  const adminHost = normalizeHostParam(host);
  if (!adminHost) return;

  await rememberAdminHost({ shop, adminHost });
}

/**
 * Obtiene mensaje de error de una excepción
 */
export function getErrorMessage(err: unknown): string {
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
