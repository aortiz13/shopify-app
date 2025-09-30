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
        minHeight: "100vh",
        background: "#f3f4f6",
        color: "#111827",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e5e7eb",
          padding: "16px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <Link
            href={queryString ? `/admin/productos?${queryString}` : "/admin/productos"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
              color: "#0f172a",
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: 0.2,
              }}
            >
              Panel de la app
            </span>
          </Link>
          <nav aria-label="Secciones de la aplicación">
            <ul
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const href = queryString ? `${item.href}?${queryString}` : item.href;

                return (
                  <li key={item.href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "8px 16px",
                        borderRadius: 9999,
                        textDecoration: "none",
                        fontWeight: 500,
                        fontSize: 14,
                        color: active ? "#0f172a" : "#475569",
                        background: active ? "#e0f2fe" : "transparent",
                        border: active ? "1px solid #bae6fd" : "1px solid transparent",
                        transition: "background 0.2s ease, color 0.2s ease, border 0.2s ease",
                      }}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </header>
      <main
        style={{
          flex: 1,
          padding: "32px 40px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
