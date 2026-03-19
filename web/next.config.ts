import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://136.109.153.177:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
