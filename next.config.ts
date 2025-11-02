import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel用: output: 'standalone'は削除（Vercelが自動的に最適化）
  productionBrowserSourceMaps: false,   // ビルド軽量化
  images: { unoptimized: true },        // 画像最適化オフで軽量化
  experimental: { forceSwcTransforms: true },
};

export default nextConfig;
