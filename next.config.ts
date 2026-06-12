import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PptxGenJS is server-only (used in app/api/pptx); keep it out of the
  // bundler so its Node internals (fs, jszip) resolve at runtime instead.
  serverExternalPackages: ["pptxgenjs"],
};

export default nextConfig;
