import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 静的エクスポート（Serverless Functionsを完全に回避）
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
