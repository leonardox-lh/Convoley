import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Logos (2 MB), payment vouchers (5 MB, HU-14) and a new product with its 5 photos of 2 MB
    // go through server actions (default: 1 MB).
    serverActions: { bodySizeLimit: "11mb" },
  },
  turbopack: {
    // This app lives in a worktree under another checkout with its own lockfile; without a
    // fixed root Turbopack watches the parent and its own dev logs trigger endless reloads.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
