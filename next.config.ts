import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/replay",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
