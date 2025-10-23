# Styles

Este directorio contiene **estilos compartidos** y configuraciones CSS globales.

## Propósito

Estilos que:
- Se reutilizan en múltiples componentes
- No son específicos de Tailwind
- Necesitan ser globales o compartidos
- Son demasiado complejos para inline styles

## Estado Actual

La aplicación usa principalmente **estilos inline** con `React.CSSProperties`.

**Problema:**
- No se aprovecha Tailwind (ya configurado)
- Estilos duplicados en múltiples archivos
- Difícil mantener consistencia visual

## Plan de Migración

### Fase 1: Extraer estilos comunes
Crear archivos de estilos compartidos para patrones repetidos.

```css
/* styles/components.css */
.button-primary {
  @apply rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white;
  @apply transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60;
}

.modal-overlay {
  @apply fixed inset-0 bg-slate-900/45 flex items-center justify-center p-6 z-50;
}
```

### Fase 2: Migrar a Tailwind
Reemplazar estilos inline con clases de Tailwind.

**ANTES:**
```typescript
<button style={{
  padding: "8px 14px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  cursor: "pointer",
}}>
  Click me
</button>
```

**DESPUÉS:**
```typescript
<button className="px-3.5 py-2 rounded-lg border border-gray-300 bg-white cursor-pointer hover:bg-gray-50">
  Click me
</button>
```

### Fase 3: Componentes de UI
Crear componentes reutilizables en `components/ui/` que encapsulen los estilos.

```typescript
// components/ui/Button.tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children }: ButtonProps) {
  const baseClasses = "px-4 py-2 rounded-lg font-semibold transition";
  const variantClasses = variant === 'primary'
    ? "bg-slate-900 text-white hover:bg-slate-800"
    : "bg-white text-slate-900 border border-gray-300 hover:bg-gray-50";

  return (
    <button className={`${baseClasses} ${variantClasses}`}>
      {children}
    </button>
  );
}
```

## Archivos Planificados

```
styles/
├── globals.css        # Estilos globales (ya existe en app/)
├── components.css     # Clases compartidas de componentes
├── utilities.css      # Utility classes personalizadas
└── theme.css          # Variables de tema (colores, espaciado)
```

## Beneficios

- ✅ **Consistencia visual** en toda la app
- ✅ **Menos código** (no repetir estilos inline)
- ✅ **Performance** (clases CSS son más rápidas que inline styles)
- ✅ **Mantenibilidad** (cambios de diseño en un lugar)
- ✅ **Theme support** (facilita dark mode en el futuro)

## Notas

Este directorio es **opcional** en Fase 1. La prioridad es crear la estructura base. La migración de estilos puede hacerse gradualmente en fases posteriores.
