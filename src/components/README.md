# Components

Este directorio contiene **componentes React reutilizables** organizados por funcionalidad.

## Propósito

Componentes que:
- Se reutilizan en múltiples páginas
- Tienen lógica de presentación separada de lógica de negocio
- Son testeables de forma aislada
- Siguen principios de componentes controlados

## Estructura

```
components/
├── ui/          # Componentes de UI básicos (botones, inputs, modals)
├── products/    # Componentes relacionados a productos
├── admin/       # Componentes del panel de administración
└── auth/        # Componentes de autenticación
```

## Convenciones

- **Naming:** PascalCase (ej: `ProductCard.tsx`)
- **Co-location:** Estilos y tests junto al componente si es necesario
- **Props interface:** Siempre definir tipos explícitos
- **Exports:** Usar named exports, no default exports

## Sub-directorios

### `ui/`
Componentes de interfaz genéricos y reutilizables.

**Ejemplos planificados:**
- `Button.tsx` - Botón con variantes (primary, secondary, etc.)
- `Modal.tsx` - Modal reutilizable
- `Input.tsx` - Input con validación
- `Table.tsx` - Tabla con paginación
- `Spinner.tsx` - Loading spinner

### `products/`
Componentes específicos para manejo de productos.

**Ejemplos:**
- `ProductList.tsx` - Lista de productos
- `ProductCard.tsx` - Card individual de producto
- `ProductSelector.tsx` - Checkbox de selección
- `ProductPagination.tsx` - Controles de paginación

### `admin/`
Componentes del panel de administración.

**Ejemplos:**
- `AdminHeader.tsx` - Header del admin
- `AdminNav.tsx` - Navegación del admin
- `StatsCard.tsx` - Card de estadísticas

### `auth/`
Componentes de autenticación.

**Ejemplos:**
- `LoginForm.tsx` - Formulario de login
- `RegisterForm.tsx` - Formulario de registro
- `AuthGuard.tsx` - Protección de rutas

## Ejemplo

```typescript
// components/products/ProductCard.tsx
import type { Product } from '@/types/shopify';

interface ProductCardProps {
  product: Product;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export function ProductCard({ product, selected, onSelect }: ProductCardProps) {
  return (
    <div className="product-card">
      {product.thumbnailUrl && (
        <img src={product.thumbnailUrl} alt={product.title} />
      )}
      <h3>{product.title}</h3>
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(product.id)}
        />
      )}
    </div>
  );
}
```

## Reglas de Componentes

1. **Mantener componentes pequeños** (< 200 líneas)
2. **Extraer lógica compleja a hooks** (no dentro del componente)
3. **Usar Tailwind classes** en lugar de estilos inline
4. **Documentar props complejos** con JSDoc
5. **Memoizar componentes pesados** con `React.memo`
