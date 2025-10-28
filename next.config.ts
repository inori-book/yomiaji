import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',                 // 静的exportは使わない（APIを残す）
  productionBrowserSourceMaps: false,   // ビルド軽量化
  images: { unoptimized: true },        // 画像最適化オフで軽量化
  experimental: { forceSwcTransforms: true },
};

export default nextConfig;
