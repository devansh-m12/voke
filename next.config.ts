import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude native modules from bundling on the server side
      config.externals = config.externals || [];
      config.externals.push({
        're2': 'commonjs re2',
        'bufferutil': 'commonjs bufferutil',
        'utf-8-validate': 'commonjs utf-8-validate',
      });
    }

    // Don't bundle these packages for the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    };

    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      'instagram-private-api',
      're2',
      'insta-fetcher'
    ],
  },
};

export default nextConfig;
