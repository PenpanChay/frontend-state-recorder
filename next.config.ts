import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // state-recorder-sdk ships TypeScript/TSX source directly (no precompiled
  // dist/) — this tells Next.js to transpile it like first-party code
  // instead of expecting it to already be plain JS, per its README.
  transpilePackages: ["state-recorder-sdk"],
};

export default nextConfig;
