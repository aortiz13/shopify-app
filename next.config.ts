import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
<<<<<<< ours
    if (process.env.HOST?.includes("ngrok")) {
      return [
        {
          source: "/:path*",
          headers: [{ key: "ngrok-skip-browser-warning", value: "true" }],
        },
      ];
    }

    return [];
=======
    return [
      {
        source: "/:path*",
        headers: [{ key: "ngrok-skip-browser-warning", value: "true" }],
      },
    ];
>>>>>>> theirs
  },
};

export default nextConfig;
