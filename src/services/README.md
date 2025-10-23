# Services

Este directorio contiene la **capa de servicios** que maneja la comunicación con APIs externas y lógica de negocio compleja.

## Propósito

Los servicios encapsulan:
- Llamadas a APIs (internas y externas)
- Lógica de negocio que no pertenece a componentes
- Transformación de datos entre capas
- Manejo de errores y retry logic

## Estructura

```
services/
├── api/          # Servicios para APIs internas (/api/*)
├── shopify/      # Servicios para la API de Shopify
└── tryon/        # Servicios del probador virtual
```

## Convenciones

- **Exports nombrados:** Exportar objetos de servicio, no clases
- **Async/await:** Todas las funciones que hacen fetch deben ser async
- **Type-safe:** Usar tipos específicos para request/response
- **Error handling:** Lanzar errores descriptivos, no retornar null

## Ejemplo de Estructura

### `services/api/products.ts`
```typescript
export const productsService = {
  async getProducts(params: GetProductsParams): Promise<Product[]> {
    const response = await fetch(`/api/products?${new URLSearchParams(params)}`);
    if (!response.ok) {
      throw new Error('Failed to load products');
    }
    return response.json();
  },

  async saveSelection(params: SaveSelectionParams): Promise<void> {
    const response = await fetch('/api/tryon/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error('Failed to save selection');
    }
  },
};
```

### `services/shopify/graphql.ts`
```typescript
export const shopifyGraphQL = {
  async query<T>(shop: string, query: string): Promise<T> {
    // Implementación de query GraphQL
  }
};
```

## Beneficios

- ✅ **Reutilización:** Misma lógica de API en múltiples componentes
- ✅ **Testing:** Fácil de mockear en tests
- ✅ **Mantenimiento:** Cambios en API en un solo lugar
- ✅ **Type-safety:** Tipos centralizados para requests/responses
