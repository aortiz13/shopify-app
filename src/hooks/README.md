# Hooks

Este directorio contiene **custom hooks de React** reutilizables para la aplicación.

## Propósito

Los hooks personalizados encapsulan lógica de estado y efectos secundarios que se reutiliza en múltiples componentes, siguiendo el principio DRY (Don't Repeat Yourself).

## Convenciones

- **Naming:** Todos los hooks deben empezar con `use` (ej: `useShopParams.ts`)
- **Un hook por archivo:** Cada archivo debe exportar un solo hook principal
- **Documentación:** Incluir JSDoc con descripción, parámetros y valor de retorno

## Hooks Planificados

### `useShopParams.ts`
Maneja la obtención y resolución de parámetros `shop` y `host` desde la URL.

**Uso:**
```typescript
const { shop, adminHost, loading } = useShopParams();
```

### `useProducts.ts`
Maneja la carga de productos desde la API de Shopify con paginación.

**Uso:**
```typescript
const { products, loading, error, loadMore } = useProducts({ shop, host });
```

### `useProductSelection.ts`
Maneja el estado de selección de productos (para el probador virtual).

**Uso:**
```typescript
const { selected, toggle, selectAll, clearAll } = useProductSelection();
```

### `useTryOnLogs.ts`
Maneja la carga de logs de interacciones con el probador virtual.

**Uso:**
```typescript
const { logs, loading, error, refresh } = useTryOnLogs({ shop });
```

## Ejemplo de Implementación

```typescript
// src/hooks/useShopParams.ts
import { useState, useEffect } from 'react';

export function useShopParams() {
  const [shop, setShop] = useState<string>("");
  const [adminHost, setAdminHost] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lógica de resolución de parámetros
  }, []);

  return { shop, adminHost, loading };
}
```
