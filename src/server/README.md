# Server

Este directorio contiene el código del **servidor Koa** refactorizado y organizado por responsabilidades.

## Propósito

Organizar el servidor en módulos separados para:
- Mejorar mantenibilidad
- Facilitar testing
- Separar responsabilidades
- Reutilizar código

## Estructura

```
server/
├── routes/        # Definiciones de rutas
├── middleware/    # Middleware de Koa
├── controllers/   # Controladores (lógica de rutas)
└── services/      # Servicios del servidor (GraphQL, etc.)
```

## Estado Actual

El archivo `src/server/index.ts` (1,033 líneas) contiene todo mezclado.

## Plan de Refactorización

### ANTES: `index.ts` (1,033 líneas)
```
- Configuración
- CSP middleware
- Proxies
- OAuth
- API de productos
- API de try-on
- Queries GraphQL
- Sanitización
- Utilidades
```

### DESPUÉS: Dividido en módulos

#### `middleware/`
- `csp.ts` - Content Security Policy
- `proxy.ts` - Proxies a Next.js
- `session.ts` - Configuración de sesión

#### `routes/`
- `auth.ts` - Rutas de OAuth Shopify
- `products.ts` - API de productos
- `tryon.ts` - API del probador virtual
- `health.ts` - Health check

#### `controllers/`
- `authController.ts` - Lógica de OAuth
- `productsController.ts` - Lógica de productos
- `tryonController.ts` - Lógica de try-on

#### `services/`
- `shopifyGraphql.ts` - Queries GraphQL
- `sanitizers.ts` - Sanitización de datos
- `paramResolvers.ts` - Resolución de shop/host

## Ejemplo de Migración

### ANTES (en index.ts)
```typescript
// Todo mezclado en 1,033 líneas
router.get("/api/products", async (ctx: Context) => {
  // 200+ líneas de lógica aquí
});
```

### DESPUÉS

**routes/products.ts**
```typescript
import Router from '@koa/router';
import { productsController } from '../controllers/productsController';

const router = new Router();

router.get('/api/products', productsController.getProducts);

export { router as productsRouter };
```

**controllers/productsController.ts**
```typescript
import type { Context } from 'koa';
import { shopifyGraphql } from '../services/shopifyGraphql';
import { resolveShopFromParams } from '../services/paramResolvers';

export const productsController = {
  async getProducts(ctx: Context) {
    const { shop, host } = await resolveShopFromParams(ctx.query);
    const products = await shopifyGraphql.getProducts(shop);
    ctx.body = { shop, products };
  }
};
```

**services/shopifyGraphql.ts**
```typescript
import { getShopToken } from './db';

export const shopifyGraphql = {
  async getProducts(shop: string) {
    const token = await getShopToken(shop);
    // Lógica de query GraphQL
    return products;
  }
};
```

## Beneficios

- ✅ **Archivos pequeños** (< 200 líneas cada uno)
- ✅ **Testing fácil** (mockear servicios/controllers)
- ✅ **Reutilización** (servicios compartidos)
- ✅ **Mantenimiento** (encontrar código específico)
- ✅ **Escalabilidad** (añadir features sin tocar todo)

## Archivos Existentes

- `auth.ts` - Configuración NextAuth (mantener)
- `db.ts` - Cliente Prisma y helpers (mantener)
- `shopify.ts` - Configuración API Shopify (mantener)
- `index.ts` - **A REFACTORIZAR** en Fase 1.4
