/**
 * Tipos para requests y responses de API
 *
 * Este archivo centraliza los tipos de entrada/salida de todas
 * las rutas de API de la aplicación.
 */

import type { Product, PageInfo } from './shopify';
import type { TryOnLog, TryOnSelection } from './tryon';

/**
 * Parámetros para obtener productos
 */
export interface GetProductsParams {
  /** Dominio de la tienda (ej: "mi-tienda.myshopify.com") */
  shop: string;
  /** Parámetro host de Shopify (opcional) */
  host?: string;
  /** Cursor para paginación */
  cursor?: string;
  /** Dirección de paginación */
  direction?: 'next' | 'prev';
  /** Límite de productos por página */
  limit?: number;
}

/**
 * Respuesta al obtener productos
 */
export interface GetProductsResponse {
  /** Dominio de la tienda */
  shop: string;
  /** Array de productos */
  products: Product[];
  /** Información de paginación */
  pageInfo: PageInfo;
  /** Límite usado */
  limit: number;
  /** Dirección usada */
  direction: string;
}

/**
 * Parámetros para guardar selección de productos
 */
export interface SaveSelectionParams {
  /** Dominio de la tienda */
  shop: string;
  /** Parámetro host (opcional) */
  host?: string;
  /** Productos seleccionados */
  products: Array<{
    id: string;
    title?: string;
    handle?: string;
  }>;
}

/**
 * Parámetros para obtener logs de try-on
 */
export interface GetLogsParams {
  /** Dominio de la tienda */
  shop: string;
  /** Parámetro host (opcional) */
  host?: string;
}

/**
 * Respuesta al obtener logs
 */
export interface GetLogsResponse extends Array<TryOnLog> {}

/**
 * Parámetros para guardar un log de try-on
 */
export interface SaveLogParams {
  /** Dominio de la tienda */
  shop: string;
  /** ID del producto */
  productId: string;
  /** ID externo (opcional) */
  externalId?: string;
  /** ID de la variante (opcional) */
  variantId?: string;
  /** ID del cliente (opcional) */
  customerId?: string;
  /** Acción realizada */
  action: string;
  /** Metadata adicional (opcional) */
  metadata?: Record<string, unknown>;
}

/**
 * Parámetros para obtener selección guardada
 */
export interface GetSelectionParams {
  /** Dominio de la tienda */
  shop: string;
  /** Parámetro host (opcional) */
  host?: string;
}

/**
 * Respuesta al obtener selección guardada
 */
export interface GetSelectionResponse {
  /** Productos seleccionados */
  products: Array<{
    id?: string | null;
    title?: string | null;
    handle?: string | null;
  }>;
}

/**
 * Error estándar de API
 */
export interface ApiError {
  /** Mensaje de error */
  error: string;
  /** Detalle adicional del error (opcional) */
  detail?: string;
  /** Código de estado HTTP (opcional) */
  status?: number;
}
