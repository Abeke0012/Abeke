import type { NextConfig } from "next";

/** `STATIC_EXPORT=1 npm run build` writes a static copy of the site to `out/`. */
const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["three"],
  ...(staticExport && { output: "export", images: { unoptimized: true } }),
};

export default nextConfig;
