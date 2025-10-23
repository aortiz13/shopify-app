# Lib

Este directorio contiene **utilidades generales** y código compartido que no depende de React.

## Estructura

```
lib/
├── utils/        # Funciones utilitarias puras
├── validators/   # Validación de datos (Zod schemas, etc.)
└── constants/    # Constantes y configuraciones
```

## Propósito

Código reutilizable que:
- No depende de React (sin hooks, sin JSX)
- Es puro y testeable
- Se puede usar tanto en cliente como en servidor
- No tiene efectos secundarios (pure functions)

## Sub-directorios

### `utils/`
Funciones utilitarias para operaciones comunes.

**Ejemplos planificados:**
- `shopParams.ts` - Normalización y decodificación de shop/host
- `formatting.ts` - Formateo de fechas, números, etc.
- `storage.ts` - Helpers para localStorage/sessionStorage
- `url.ts` - Construcción y parsing de URLs

### `validators/`
Schemas de validación usando Zod o similares.

**Ejemplos:**
- `shopParams.schema.ts`
- `product.schema.ts`
- `tryonLog.schema.ts`

### `constants/`
Valores constantes usados en toda la aplicación.

**Ejemplos:**
- `routes.ts` - Rutas de la aplicación
- `config.ts` - Configuración general
- `storage-keys.ts` - Keys para localStorage

## Ejemplo

```typescript
// lib/utils/shopParams.ts
/**
 * Decodifica el parámetro host de Shopify a un dominio de tienda
 */
export function decodeHostShop(hostParam: string): string | null {
  try {
    const normalized = hostParam.replace(/-/g, "+").replace(/_/g, "/");
    const padding = normalized.length % 4 === 0
      ? ""
      : "=".repeat(4 - (normalized.length % 4));
    const decoded = atob(`${normalized}${padding}`);

    const directDomain = decoded.match(/([\w-]+\.myshopify\.com)/);
    return directDomain?.[1] ?? null;
  } catch {
    return null;
  }
}
```
