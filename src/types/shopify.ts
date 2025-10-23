/**
 * Tipos relacionados con la API de Shopify
 *
 * Este archivo centraliza todas las definiciones de tipos para productos,
 * imágenes, paginación y otros datos de Shopify.
 */

/**
 * Imagen de producto de Shopify
 *
 * Representa una imagen con sus diferentes formatos y metadata.
 */
export interface ProductImage {
  /** URL transformada de la imagen (puede incluir resize/crop) */
  url?: string | null;
  /** URL original sin transformaciones */
  originalSrc?: string | null;
  /** Texto alternativo para accesibilidad */
  altText?: string | null;
}

/**
 * Producto de Shopify
 *
 * Representa un producto completo con toda su información.
 * Consolida campos de diferentes contextos (admin, picker, widget).
 */
export interface Product {
  /** ID único del producto (formato: gid://shopify/Product/...) */
  id: string;
  /** Nombre del producto */
  title: string;
  /** Handle URL-friendly del producto */
  handle?: string;
  /** Fecha de última actualización */
  updatedAt?: string;
  /** Imagen destacada del producto */
  featuredImage?: ProductImage | null;
  /** Preview de media destacado */
  featuredMediaPreview?: ProductImage | null;
  /** Array de previews de media */
  mediaPreviews?: ProductImage[];
  /** Imágenes en formato GraphQL connection */
  images?: {
    edges?: Array<{ node?: ProductImage | null } | null>;
  } | null;
  /** Cursor para paginación GraphQL */
  cursor?: string | null;
  /** URL del thumbnail (versión simplificada) */
  thumbnailUrl?: string | null;
  /** Texto alternativo del thumbnail */
  thumbnailAlt?: string | null;
}

/**
 * Producto en selección guardada
 *
 * Versión simplificada de Product para cuando se guarda
 * una selección de productos (puede tener campos opcionales).
 */
export interface StoredSelectionProduct {
  /** ID del producto (opcional si es nuevo) */
  id?: string | null;
  /** Título del producto */
  title?: string | null;
  /** Handle del producto */
  handle?: string | null;
}

/**
 * Información de paginación GraphQL
 *
 * Usado para navegación entre páginas de productos.
 */
export interface PageInfo {
  /** Indica si hay más páginas después */
  hasNextPage: boolean;
  /** Indica si hay páginas anteriores */
  hasPreviousPage: boolean;
  /** Cursor del primer elemento de la página */
  startCursor: string | null;
  /** Cursor del último elemento de la página */
  endCursor: string | null;
}

/**
 * Respuesta de productos de la API
 *
 * Estructura completa de la respuesta al obtener productos.
 */
export interface ProductsResponse {
  /** Dominio de la tienda */
  shop: string;
  /** Array de productos */
  products: Product[];
  /** Información de paginación */
  pageInfo: PageInfo;
  /** Límite de productos por página */
  limit: number;
  /** Dirección de paginación ('next' | 'prev') */
  direction: string;
}
