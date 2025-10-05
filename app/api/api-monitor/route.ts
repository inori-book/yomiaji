import { NextRequest, NextResponse } from 'next/server';

// API利用状況の監視
interface ApiUsage {
  rakuten: {
    requests: number;
    limit: number;
    resetTime: number;
    lastRequest: number;
  };
  cache: {
    hits: number;
    misses: number;
    totalRequests: number;
  };
}

const apiUsage: ApiUsage = {
  rakuten: {
    requests: 0,
    limit: 600,
    resetTime: Date.now() + (24 * 60 * 60 * 1000), // 24時間
    lastRequest: 0
  },
  cache: {
    hits: 0,
    misses: 0,
    totalRequests: 0
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      const now = Date.now();
      const timeUntilReset = Math.max(0, apiUsage.rakuten.resetTime - now);
      const cacheHitRate = apiUsage.cache.totalRequests > 0 
        ? (apiUsage.cache.hits / apiUsage.cache.totalRequests * 100).toFixed(1)
        : '0.0';

      return NextResponse.json({
        rakuten: {
          requests: apiUsage.rakuten.requests,
          limit: apiUsage.rakuten.limit,
          remaining: Math.max(0, apiUsage.rakuten.limit - apiUsage.rakuten.requests),
          resetTime: apiUsage.rakuten.resetTime,
          timeUntilReset: timeUntilReset,
          isLimited: apiUsage.rakuten.requests >= apiUsage.rakuten.limit
        },
        cache: {
          hits: apiUsage.cache.hits,
          misses: apiUsage.cache.misses,
          totalRequests: apiUsage.cache.totalRequests,
          hitRate: `${cacheHitRate}%`
        },
        timestamp: now
      });
    }

    if (action === 'reset') {
      const now = Date.now();
      apiUsage.rakuten.requests = 0;
      apiUsage.rakuten.resetTime = now + (60 * 60 * 1000);
      apiUsage.rakuten.lastRequest = 0;
      
      return NextResponse.json({ 
        message: 'API利用状況をリセットしました',
        timestamp: now
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('API監視エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'track-rakuten') {
      const now = Date.now();
      
      // 24時間経過したらリセット
      if (now > apiUsage.rakuten.resetTime) {
        apiUsage.rakuten.requests = 0;
        apiUsage.rakuten.resetTime = now + (24 * 60 * 60 * 1000);
      }
      
      apiUsage.rakuten.requests++;
      apiUsage.rakuten.lastRequest = now;
      
      return NextResponse.json({ 
        message: '楽天API利用を記録しました',
        requests: apiUsage.rakuten.requests,
        remaining: Math.max(0, apiUsage.rakuten.limit - apiUsage.rakuten.requests)
      });
    }

    if (action === 'track-cache') {
      const { hit } = await request.json();
      
      if (hit) {
        apiUsage.cache.hits++;
      } else {
        apiUsage.cache.misses++;
      }
      apiUsage.cache.totalRequests++;
      
      return NextResponse.json({ 
        message: 'キャッシュ利用を記録しました',
        hit,
        totalRequests: apiUsage.cache.totalRequests
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('API追跡エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
