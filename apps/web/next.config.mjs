import("./env.mjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  bundlePagesRouterDependencies: true,
  serverExternalPackages: [
    /* for logging */
    "pino",
    "pino-pretty",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    tsconfigPath: "./tsconfig.build.json",
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
