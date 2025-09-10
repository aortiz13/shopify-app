import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    if (process.env.HOST?.includes("ngrok")) {
      return [
        {
          source: "/:path*",
          headers: [{ key: "ngrok-skip-browser-warning", value: "true" }],
        },
      ];
    }

    return [];
    return [
      {
        source: "/:path*",
        headers: [{ key: "ngrok-skip-browser-warning", value: "true" }],
      },
    ];
  },
};

export default nextConfig;
