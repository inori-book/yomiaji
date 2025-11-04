import type { NextConfig } from 'next';

// 本番ビルド時は静的エクスポート、開発時はリライト機能を使用
const isDevelopment = process.env.NODE_ENV !== 'production';

const nextConfig: NextConfig = {
  // 本番ビルド時のみ静的エクスポート（Netlifyで静的サイトとして配信）
  ...(!isDevelopment && { output: 'export' }),
  trailingSlash: true,
  images: { unoptimized: true },
  
  // ローカル開発時のみリライト設定（開発サーバーでのみ有効）
  ...(isDevelopment && {
    async rewrites() {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/:path*',
        },
      ];
    },
  }),
};

export default nextConfig;
