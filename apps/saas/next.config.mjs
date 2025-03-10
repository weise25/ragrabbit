import("./env.mjs");

import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  functions: {
    // Jobs processing functions can take a long time:
    "app/(rag)/**/*.processing.ts": {
      maxDuration: 30,
    },
  },

  // Build fixes for various dependencies issues on Vercel:
  //bundlePagesRouterDependencies: true,
  serverExternalPackages: [
    /* for llamaindex */
    "@huggingface/transformers",
    "@xenova/transformers",
    "tiktoken",
    "onnxruntime-node",
    "sharp",
    /* For dbScraping */
    "canvas",
    "@crawlee/jsdom",
    "@crawlee/playwright",
    "jquery",
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

  // TODO: withLlamaIndex doesn't work, we get an error: Cannot find module 'replicate'
  webpack: function (webpackConfig, options) {
    webpackConfig.resolve.alias = {
      ...webpackConfig.resolve.alias,
      "@google-cloud/vertexai": false,
    };
    // Disable modules that are not supported in vercel edge runtime
    if (options?.nextRuntime === "edge") {
      //webpackConfig.resolve.alias["replicate"] = false;
    }
    // Following lines will fix issues with onnxruntime-node when using pnpm
    // See: https://github.com/vercel/next.js/issues/43433
    const externals = {
      "onnxruntime-node": "commonjs onnxruntime-node",
      sharp: "commonjs sharp",
      chromadb: "chromadb",
      unpdf: "unpdf",
    };
    if (options?.nextRuntime === "nodejs") {
      //externals.replicate = "commonjs replicate";
    }
    webpackConfig.externals.push(externals);
    return webpackConfig;
  },
};

export default withBundleAnalyzer(nextConfig);
