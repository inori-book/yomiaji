import { NextRequest, NextResponse } from 'next/server';

// メモリキャッシュ（本番環境ではRedis等を使用推奨）
const rakutenCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24時間

// ISBN正規化関数
function normalizeIsbn(isbn: string): string | null {
  if (!isbn) return null;
  const cleaned = isbn.replace(/[^0-9]/g, '');
  if (cleaned.length === 13 || cleaned.length === 10) {
    return cleaned;
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');

    if (!isbn) {
      return NextResponse.json({ error: 'ISBNが必要です' }, { status: 400 });
    }

    const normalizedIsbn = normalizeIsbn(isbn);
    if (!normalizedIsbn) {
      return NextResponse.json({ error: '無効なISBN形式' }, { status: 400 });
    }

    // キャッシュチェック
    const cached = rakutenCache.get(normalizedIsbn);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`キャッシュヒット: ${normalizedIsbn}`);
      
      // キャッシュヒットを記録
      try {
        await fetch('/api/api-monitor?action=track-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hit: true })
        });
      } catch (error) {
        console.error('キャッシュ追跡エラー:', error);
      }
      
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cacheAge: Date.now() - cached.timestamp
      });
    }

    // 楽天APIから取得
    const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
    if (!RAKUTEN_APP_ID) {
      return NextResponse.json({ error: 'APIキーが設定されていません' }, { status: 500 });
    }

    const AFFILIATE_ID = "49bc895f.748bd82f.49bc8960.04343aac";
    const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?applicationId=${RAKUTEN_APP_ID}&isbn=${normalizedIsbn}&affiliateId=${AFFILIATE_ID}&format=json`;

    // 楽天API利用を記録
    try {
      await fetch('/api/api-monitor?action=track-rakuten', { method: 'POST' });
    } catch (error) {
      console.error('楽天API追跡エラー:', error);
    }

    const response = await fetch(apiUrl);
    
    if (response.status === 429) {
      console.log('楽天APIの利用制限に達しました');
      
      // キャッシュミスを記録
      try {
        await fetch('/api/api-monitor?action=track-cache', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hit: false })
        });
      } catch (error) {
        console.error('キャッシュ追跡エラー:', error);
      }
      
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null,
        cached: false,
        error: 'API制限'
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null,
        cached: false,
        error: 'APIエラー'
      });
    }

    const data = await response.json();
    
    let result = {
      title: null,
      author: null,
      publisher: null,
      publicationDate: null,
      price: null,
      imageUrl: null,
      description: null,
      itemUrl: null,
      affiliateUrl: null,
      cached: false
    };

    if (data.Items && data.Items.length > 0) {
      const item = data.Items[0].Item;
      const imageUrl = item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || null;
      
      result = {
        title: item.title || null,
        author: item.author || null,
        publisher: item.publisherName || null,
        publicationDate: item.salesDate || null,
        price: item.itemPrice || null,
        imageUrl: imageUrl,
        description: item.itemCaption || null,
        itemUrl: item.itemUrl || null,
        affiliateUrl: item.affiliateUrl || null,
        cached: false
      };
    }

    // キャッシュに保存
    rakutenCache.set(normalizedIsbn, {
      data: result,
      timestamp: Date.now()
    });

    // キャッシュミスを記録
    try {
      await fetch('/api/api-monitor?action=track-cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hit: false })
      });
    } catch (error) {
      console.error('キャッシュ追跡エラー:', error);
    }

    console.log(`キャッシュ保存: ${normalizedIsbn}`);
    return NextResponse.json(result);

  } catch (error) {
    console.error('楽天APIキャッシュエラー:', error);
    return NextResponse.json({
      title: null,
      author: null,
      publisher: null,
      publicationDate: null,
      price: null,
      imageUrl: null,
      description: null,
      itemUrl: null,
      affiliateUrl: null,
      cached: false,
      error: 'サーバーエラー'
    });
  }
}

// キャッシュ管理用エンドポイント
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'clear') {
      rakutenCache.clear();
      return NextResponse.json({ message: 'キャッシュをクリアしました' });
    }

    if (action === 'stats') {
      const now = Date.now();
      let validEntries = 0;
      let expiredEntries = 0;

      for (const [key, value] of rakutenCache.entries()) {
        if (now - value.timestamp < CACHE_DURATION) {
          validEntries++;
        } else {
          expiredEntries++;
        }
      }

      return NextResponse.json({
        totalEntries: rakutenCache.size,
        validEntries,
        expiredEntries,
        cacheDuration: CACHE_DURATION
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('キャッシュ管理エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
