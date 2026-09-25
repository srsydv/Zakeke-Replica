import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const apiPort = process.env.API_PORT || "3001";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  serverExternalPackages: ["postgres", "drizzle-orm"],
  async rewrites() {
    return [{ source: "/api/:path*", destination: `http://127.0.0.1:${apiPort}/api/:path*` }];
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: ["**/node_modules/**", "**/.next/**", "**/data/**"],
      };
    }
    return config;
  },
};

export default nextConfig;
