"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

const NAV_ITEMS = [
  { href: "/admin/productos", label: "Productos habilitados" },
  { href: "/admin/base-de-datos", label: "Base de datos" },
];

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#f9fafb",
        color: "#111827",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      <nav
        aria-label="Secciones de la aplicación"
        style={{
          width: 240,
          padding: "32px 20px",
          borderRight: "1px solid #e5e7eb",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span style={{ fontSize: 12, textTransform: "uppercase", color: "#6b7280" }}>
          Panel
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const href = queryString ? `${item.href}?${queryString}` : item.href;
            return (
              <Link
                key={item.href}
                href={href}
                aria-current={active ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontWeight: active ? 600 : 500,
                  color: active ? "#111827" : "#374151",
                  background: active ? "#e0f2fe" : "transparent",
                  transition: "background 0.2s ease, color 0.2s ease",
                }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main style={{ flex: 1, padding: "32px 40px" }}>{children}</main>
    </div>
  );
}
