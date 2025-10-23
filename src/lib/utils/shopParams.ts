/**
 * Utilidades para manejo de parámetros de tienda Shopify
 *
 * Este módulo contiene funciones para:
 * - Decodificar el parámetro "host" de Shopify
 * - Almacenar y recuperar shops desde sessionStorage
 * - Normalizar parámetros de shop/host
 */

/**
 * Prefijo para keys de sessionStorage
 */
export const STORAGE_PREFIX = "tryon-shop-for-host::";

/**
 * Guarda la asociación entre un host y una tienda en sessionStorage
 *
 * @param host - El parámetro host codificado de Shopify
 * @param shop - El dominio de la tienda (ej: "mi-tienda.myshopify.com")
 */
export function rememberShopForHost(host: string, shop: string): void {
  if (!host || !shop) return;

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.setItem(`${STORAGE_PREFIX}${host}`, shop);
    }
  } catch (error) {
    console.warn("No se pudo guardar la tienda en sessionStorage", error);
  }
}

/**
 * Recupera la tienda asociada a un host desde sessionStorage
 *
 * @param host - El parámetro host codificado de Shopify
 * @returns El dominio de la tienda o null si no existe
 */
export function getStoredShopForHost(host: string): string | null {
  if (!host) return null;

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      const value = window.sessionStorage.getItem(`${STORAGE_PREFIX}${host}`);
      return value ? value : null;
    }
  } catch (error) {
    console.warn("No se pudo leer la tienda desde sessionStorage", error);
  }

  return null;
}

/**
 * Decodifica el parámetro "host" de Shopify a un dominio de tienda
 *
 * El parámetro host viene en formato base64url y puede contener:
 * - Dominio directo: "mi-tienda.myshopify.com"
 * - Formato store: "/store/mi-tienda"
 * - Formato legacy: "/mi-tienda/app/"
 *
 * @param hostParam - El parámetro host codificado en base64url
 * @returns El dominio completo de la tienda (ej: "mi-tienda.myshopify.com") o null si falla
 *
 * @example
 * ```typescript
 * const shop = decodeHostShop("bXktdGllbmRhLm15c2hvcGlmeS5jb20");
 * // => "mi-tienda.myshopify.com"
 * ```
 */
export function decodeHostShop(hostParam: string): string | null {
  try {
    // Convertir base64url a base64 estándar
    const normalized = hostParam.replace(/-/g, "+").replace(/_/g, "/");

    // Añadir padding si es necesario
    const padding =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(4 - (normalized.length % 4));

    // Decodificar
    const decoded = window.atob(`${normalized}${padding}`);

    // Intentar extraer el dominio directo
    const directDomain = decoded.match(/([\w-]+\.myshopify\.com)/);
    if (directDomain?.[1]) {
      return directDomain[1];
    }

    // Intentar extraer desde formato "/store/..."
    const storeSegment = decoded.match(/\/store\/([^/]+)/);
    if (storeSegment?.[1]) {
      const slug = storeSegment[1];
      return slug.endsWith(".myshopify.com") ? slug : `${slug}.myshopify.com`;
    }

    // Intentar extraer desde formato legacy "/slug/app/..."
    const legacySegment = decoded.match(/\/([^/]+)\/app\//);
    if (legacySegment?.[1]) {
      const slug = legacySegment[1];
      return slug.endsWith(".myshopify.com") ? slug : `${slug}.myshopify.com`;
    }
  } catch (error) {
    console.warn("No se pudo decodificar el parámetro host", error);
  }

  return null;
}
