# Types

Este directorio contiene **definiciones de tipos TypeScript** compartidos en toda la aplicación.

## Propósito

Tipos que:
- Se usan en múltiples archivos
- Representan entidades del dominio
- Definen contratos entre capas (API, servicios, componentes)
- Mejoran la seguridad de tipos y autocompletado

## Convenciones

- **Naming:** PascalCase para interfaces y types (ej: `Product`, `ShopSession`)
- **Un dominio por archivo:** Agrupar tipos relacionados
- **Usar interfaces para objetos:** `interface` sobre `type` cuando sea posible
- **Documentar campos complejos:** JSDoc para campos no obvios

## Archivos Planificados

### `shopify.ts`
Tipos relacionados a Shopify y productos.

```typescript
export interface Product {
  id: string;
  title: string;
  handle?: string;
  thumbnailUrl?: string | null;
  thumbnailAlt?: string | null;
  cursor?: string | null;
}

export interface ProductImage {
  url?: string | null;
  originalSrc?: string | null;
  altText?: string | null;
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}
```

### `tryon.ts`
Tipos del probador virtual.

```typescript
export interface TryOnLog {
  id: number;
  shop: string;
  productId: string;
  externalId?: string | null;
  variantId?: string | null;
  customerId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface TryOnSelection {
  shop: string;
  products: Array<{
    id: string;
    title?: string;
    handle?: string;
  }>;
}
```

### `api.ts`
Tipos para request/response de APIs.

```typescript
export interface GetProductsParams {
  shop: string;
  host?: string;
  cursor?: string;
  direction?: 'next' | 'prev';
  limit?: number;
}

export interface GetProductsResponse {
  shop: string;
  products: Product[];
  pageInfo: PageInfo;
  limit: number;
  direction: string;
}

export interface ApiError {
  error: string;
  detail?: string;
  status?: number;
}
```

### `auth.ts`
Tipos de autenticación (extendiendo NextAuth).

```typescript
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      whatsapp?: string | null;
      profileComplete?: boolean;
    } & DefaultSession['user'];
  }
}
```

## Buenas Prácticas

1. **DRY:** No duplicar tipos, importar desde aquí
2. **Nullability explícita:** Usar `null` o `undefined` explícitamente
3. **Utility types:** Usar `Partial<T>`, `Pick<T>`, `Omit<T>` cuando sea apropiado
4. **Evitar `any`:** Usar `unknown` si el tipo no se conoce
5. **Export all:** Exportar todos los tipos para facilitar imports

## Ejemplo de Uso

```typescript
// En un componente
import type { Product, PageInfo } from '@/types/shopify';

interface ProductListProps {
  products: Product[];
  pageInfo: PageInfo;
}

// En un servicio
import type { GetProductsParams, GetProductsResponse } from '@/types/api';

export async function getProducts(
  params: GetProductsParams
): Promise<GetProductsResponse> {
  // ...
}
```
