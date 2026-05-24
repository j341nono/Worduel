/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@worduel/shared",
    "@worduel/game-core",
    "@worduel/word-dictionary",
  ],
  webpack: (config) => {
    // NodeNext-style ESM imports inside our workspace packages use ".js" suffixes
    // even though the source files are .ts. Tell webpack to try .ts/.tsx first.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
