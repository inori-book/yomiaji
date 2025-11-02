import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 静的エクスポート（Serverless Functionsを完全に回避）
  output: 'export',
  trailingSlash: true,
  productionBrowserSourceMaps: false,   // ビルド軽量化
  images: { unoptimized: true },        // 画像最適化オフで軽量化
  experimental: { forceSwcTransforms: true },
};

export default nextConfig;
