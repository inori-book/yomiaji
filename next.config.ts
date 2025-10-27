import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'thumbnail.image.rakuten.co.jp',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Memory optimization for Railway
  experimental: {
    memoryBasedWorkersCount: true,
    // Reduce memory usage during build
    workerThreads: false,
  },
  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Reduce memory usage
  output: 'standalone',
};

export default nextConfig;
