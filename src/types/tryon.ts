/**
 * Tipos relacionados con el probador virtual (Try-On)
 *
 * Este archivo centraliza tipos para logs de interacciones,
 * selecciones de productos y configuración del probador.
 */

/**
 * Log de interacción con el probador virtual
 *
 * Registro de una acción del usuario con el probador.
 */
export interface TryOnLog {
  /** ID único del log */
  id: number;
  /** Timestamp de creación */
  createdAt: string;
  /** ID del producto probado */
  productId: string | null;
  /** ID externo (si aplica) */
  externalId: string | null;
  /** ID de la variante del producto */
  variantId: string | null;
  /** ID del cliente */
  customerId: string | null;
  /** Acción realizada (ej: "view", "add_to_cart", etc.) */
  action: string | null;
  /** Metadata adicional en formato JSON */
  metadata: unknown;
}

/**
 * Log parseado con información extraída del metadata
 *
 * Extiende TryOnLog con campos útiles extraídos del JSON metadata.
 */
export interface ParsedLog extends TryOnLog {
  /** Nombre del producto extraído del metadata */
  productName: string;
  /** Nombre de la variante extraído del metadata */
  variantName: string;
  /** Nombre del cliente extraído del metadata */
  customerName: string;
  /** Teléfono del cliente extraído del metadata */
  customerPhone: string;
  /** Detalles adicionales formateados */
  additionalDetails: string;
  /** Campos personalizados extraídos del metadata */
  customFields: Record<string, string>;
}

/**
 * Producto en el contexto del probador
 *
 * Versión simplificada de producto para el popup de try-on.
 */
export interface TryOnProduct {
  /** ID del producto */
  id: string;
  /** Nombre del producto */
  name: string;
}

/**
 * Producto seleccionado para el picker
 *
 * Estructura usada en el widget picker para seleccionar productos.
 */
export interface PickerProduct {
  /** ID del producto (opcional) */
  id?: string | null;
  /** Título del producto */
  title?: string | null;
  /** Handle del producto */
  handle?: string | null;
}

/**
 * Selección de productos guardada
 *
 * Estructura que se guarda cuando el usuario selecciona
 * productos para habilitar el probador.
 */
export interface TryOnSelection {
  /** Dominio de la tienda */
  shop: string;
  /** Array de productos seleccionados */
  products: Array<{
    id: string;
    title?: string;
    handle?: string;
  }>;
}

/**
 * Columna personalizada en la tabla de logs
 *
 * Permite al usuario añadir columnas basadas en metadata.
 */
export interface CustomColumn {
  /** Clave del campo en el metadata */
  key: string;
  /** Etiqueta para mostrar en la UI */
  label: string;
}

/**
 * Filtros para la tabla de logs
 *
 * Parámetros de filtrado en la vista de base de datos.
 */
export interface LogFilters {
  /** Filtrar por acción específica */
  action: string;
  /** Filtrar por producto específico */
  product: string;
  /** Búsqueda de texto libre */
  search: string;
  /** Fecha de inicio del rango */
  startDate: string;
  /** Fecha de fin del rango */
  endDate: string;
}
