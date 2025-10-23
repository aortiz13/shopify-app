# Estructura del Proyecto

Este documento describe la organización del código en el directorio `src/`.

## 📁 Estructura General

```
src/
├── app/                 # Next.js App Router (páginas y rutas)
├── components/          # Componentes React reutilizables
├── hooks/              # Custom hooks de React
├── services/           # Servicios y lógica de API
├── lib/                # Utilidades y funciones puras
├── types/              # Definiciones de tipos TypeScript
├── server/             # Servidor Koa (backend)
└── styles/             # Estilos compartidos
```

## 📖 Descripción de Directorios

### `app/` - Páginas de Next.js
**Propósito:** Páginas y rutas de la aplicación usando Next.js App Router.

**Qué va aquí:**
- Páginas (`page.tsx`)
- Layouts (`layout.tsx`)
- API Routes (`route.ts`)
- Loading states (`loading.tsx`)
- Error boundaries (`error.tsx`)

**Qué NO va aquí:**
- Lógica de negocio compleja (usar `services/`)
- Hooks reutilizables (usar `hooks/`)
- Componentes compartidos (usar `components/`)

### `components/` - Componentes React
**Propósito:** Componentes reutilizables organizados por dominio.

**Subdirectorios:**
- `ui/` - Componentes de interfaz básicos (Button, Modal, Input)
- `products/` - Componentes de productos
- `admin/` - Componentes del panel admin
- `auth/` - Componentes de autenticación

Ver [components/README.md](./components/README.md) para más detalles.

### `hooks/` - Custom Hooks
**Propósito:** Lógica de React reutilizable encapsulada en hooks.

**Ejemplos:**
- `useShopParams.ts` - Obtener shop/host de URL
- `useProducts.ts` - Cargar productos
- `useProductSelection.ts` - Selección de productos
- `useTryOnLogs.ts` - Logs del probador

Ver [hooks/README.md](./hooks/README.md) para más detalles.

### `services/` - Servicios
**Propósito:** Comunicación con APIs y lógica de negocio.

**Subdirectorios:**
- `api/` - Servicios para APIs internas
- `shopify/` - Servicios de Shopify
- `tryon/` - Servicios del probador virtual

Ver [services/README.md](./services/README.md) para más detalles.

### `lib/` - Utilidades
**Propósito:** Funciones puras y utilidades que no dependen de React.

**Subdirectorios:**
- `utils/` - Funciones utilitarias (formateo, parsing, etc.)
- `validators/` - Validación de datos (Zod schemas)
- `constants/` - Constantes y configuración

Ver [lib/README.md](./lib/README.md) para más detalles.

### `types/` - Tipos TypeScript
**Propósito:** Definiciones de tipos compartidos.

**Archivos:**
- `shopify.ts` - Tipos de Shopify (Product, PageInfo)
- `tryon.ts` - Tipos del probador virtual
- `api.ts` - Tipos de request/response
- `auth.ts` - Extensiones de NextAuth

Ver [types/README.md](./types/README.md) para más detalles.

### `server/` - Servidor Koa
**Propósito:** Backend de la aplicación (actualmente monolítico).

**Archivos actuales:**
- `index.ts` - Servidor principal (1,033 líneas - **A REFACTORIZAR**)
- `auth.ts` - Configuración NextAuth
- `db.ts` - Cliente Prisma
- `shopify.ts` - Configuración API Shopify

**Subdirectorios planificados:**
- `routes/` - Definiciones de rutas
- `middleware/` - Middleware de Koa
- `controllers/` - Controladores
- `services/` - Servicios del servidor

Ver [server/README.md](./server/README.md) para más detalles.

### `styles/` - Estilos
**Propósito:** Estilos compartidos y configuración CSS.

**Estado:** Actualmente la app usa estilos inline. Migración pendiente.

Ver [styles/README.md](./styles/README.md) para más detalles.

## 🎯 Principios de Organización

### 1. Separación de Responsabilidades
Cada directorio tiene un propósito claro y específico.

### 2. Co-location
Archivos relacionados deben estar cerca (tests, styles, etc.)

### 3. Escalabilidad
La estructura debe facilitar el crecimiento del proyecto.

### 4. Descubribilidad
Debe ser fácil encontrar dónde añadir nuevo código.

## 📏 Reglas de Tamaño

- **Archivos:** Máximo 300 líneas (idealmente < 200)
- **Componentes:** Máximo 200 líneas
- **Funciones:** Máximo 50 líneas

Si un archivo excede estos límites, debe ser dividido.

## 🔄 Flujo de Datos Recomendado

```
┌─────────┐
│  Page   │ ← Obtiene datos de URL, renderiza layout
└────┬────┘
     │
     ↓
┌─────────┐
│  Hook   │ ← Maneja estado y efectos
└────┬────┘
     │
     ↓
┌─────────┐
│ Service │ ← Hace llamadas a API
└────┬────┘
     │
     ↓
┌─────────┐
│   API   │ ← Endpoint del servidor
└─────────┘
```

## 📝 Ejemplos de Uso

### Crear un nuevo componente
```typescript
// src/components/products/ProductCard.tsx
import type { Product } from '@/types/shopify';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return <div>{product.title}</div>;
}
```

### Crear un nuevo hook
```typescript
// src/hooks/useProducts.ts
import { productsService } from '@/services/api/products';

export function useProducts(shop: string) {
  const [products, setProducts] = useState<Product[]>([]);
  // ... lógica
  return { products };
}
```

### Crear un nuevo servicio
```typescript
// src/services/api/products.ts
export const productsService = {
  async getProducts(shop: string): Promise<Product[]> {
    const response = await fetch(`/api/products?shop=${shop}`);
    return response.json();
  }
};
```

## 🚀 Estado del Proyecto

### ✅ Completado
- Estructura de directorios creada
- Documentación de cada directorio

### 🔄 En Progreso
- Fase 1.3: Extraer código duplicado
- Fase 1.4: Refactorizar servidor Koa

### 📋 Pendiente
- Fase 2: Crear hooks personalizados
- Fase 2: Dividir componentes grandes
- Fase 3: Migrar estilos a Tailwind

## 📚 Referencias

- [Next.js App Router](https://nextjs.org/docs/app)
- [React Hooks](https://react.dev/reference/react/hooks)
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [Tailwind CSS](https://tailwindcss.com/docs)
