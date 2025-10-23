/**
 * Funciones de sanitización para datos de Shopify GraphQL
 *
 * Estas funciones transforman las respuestas de la API GraphQL de Shopify
 * en formatos seguros y tipados para el cliente.
 */

export type SanitizedImage = {
  url: string | null;
  originalSrc: string | null;
  altText: string | null;
};

/**
 * Campos de imagen de Shopify para queries GraphQL
 */
export const SHOPIFY_IMAGE_FIELDS =
  "url(transform: {maxWidth: 200, maxHeight: 200, crop: CENTER}) originalSrc altText";

/**
 * Fragmento GraphQL para MediaImage
 */
export const MEDIA_IMAGE_FRAGMENT = `
  ... on MediaImage {
    image { ${SHOPIFY_IMAGE_FIELDS} }
  }
`;

/**
 * Fragmentos GraphQL para previews de media
 */
export const MEDIA_PREVIEW_FRAGMENTS = `
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

/**
 * Selección base de media para queries GraphQL
 */
export const MEDIA_BASE_SELECTION = `
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

/**
 * Sanitiza un objeto de imagen de Shopify
 */
export function sanitizeImage(image: unknown): SanitizedImage | null {
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

/**
 * Sanitiza un array de edges de imágenes (formato GraphQL connection)
 */
export function sanitizeImageEdges(images: unknown): Array<{ node: SanitizedImage }> {
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

/**
 * Sanitiza una imagen de preview
 */
export function sanitizePreviewImage(preview: unknown): SanitizedImage | null {
  if (!preview || typeof preview !== "object") {
    return null;
  }

  const image = (preview as { image?: unknown }).image;
  return sanitizeImage(image);
}

/**
 * Sanitiza un media node con preview o imagen directa
 */
export function sanitizeMediaPreview(media: unknown): SanitizedImage | null {
  if (!media || typeof media !== "object") {
    return null;
  }

  const previewImage = sanitizePreviewImage((media as { preview?: unknown }).preview);
  if (previewImage) {
    return previewImage;
  }

  return sanitizeImage((media as { image?: unknown }).image);
}

/**
 * Sanitiza un array de nodes de media
 */
export function sanitizeMediaNodes(media: unknown): SanitizedImage[] {
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
