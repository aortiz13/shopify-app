// ~/shopify-app/next.config.ts
import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = 'cheap-module-source-map'
    }
    return config
  },
  outputFileTracingRoot: path.join(process.cwd()),
     
  // Headers para permitir embedding en Shopify
  async headers() {
    return [
      {
        // Ruta existente del picker
        source: '/picker',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com",
          },
        ],
      },
      {
        // 🔥 NUEVA: Ruta del probador virtual
        source: '/widget',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)',
          },
        ],
      },
      {
        // 🔥 NUEVA: Para todas las sub-rutas del widget (por si acaso)
        source: '/widget/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)',
          },
        ],
      },
      {
        // 🔥 NUEVA: Para la ruta específica del tryon-widget
        source: '/tryon-widget',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)',
          },
        ],
      },
      {
        // 🔥 NUEVA: Para sub-rutas de tryon-widget
        source: '/tryon-widget/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(self), fullscreen=(self), clipboard-read=(self), clipboard-write=(self)',
          },
        ],
      }
    ]
  },
};

export default nextConfig;