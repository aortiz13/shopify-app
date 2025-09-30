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
     
  // Headers para permitir embedding en Shopify (admin Y storefronts)
  async headers() {
    return [
      {
        source: '/picker',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), fullscreen=(), clipboard-read=(), clipboard-write=()',
          },
        ],
      },
      {
        source: '/widget',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), fullscreen=(), clipboard-read=(), clipboard-write=()',
          },
        ],
      },
      {
        source: '/widget/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), fullscreen=(), clipboard-read=(), clipboard-write=()',
          },
        ],
      },
      {
        source: '/admin',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
          },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
          },
        ],
      }
    ]
  },
};

export default nextConfig;