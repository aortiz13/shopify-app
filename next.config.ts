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
  
  // AGREGAR ESTO:
  async headers() {
    return [
      {
        source: '/picker',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://admin.shopify.com https://*.myshopify.com;",
          },
        ],
      },
    ]
  },
};

export default nextConfig;