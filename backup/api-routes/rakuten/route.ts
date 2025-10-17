import { NextRequest, NextResponse } from 'next/server';

// ISBN正規化関数
function normalizeIsbn(isbn: string): string | null {
  if (!isbn) return null;
  
  // 数字以外を除去
  const cleaned = isbn.replace(/[^0-9]/g, '');
  
  // 13桁または10桁のISBNかチェック
  if (cleaned.length === 13 || cleaned.length === 10) {
    return cleaned;
  }
  
  return null;
}

// レート制限管理（初期リリース用）
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24時間
const RATE_LIMIT_MAX_REQUESTS = 600; // 1日あたり600リクエスト（初期リリース用）

function checkRateLimit(userId: string = "default"): boolean {
  const now = Date.now();
  const key = "default";
  
  const current = rateLimitMap.get(key);
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }
  
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  current.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isbn = searchParams.get('isbn');

    if (!isbn) {
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    }

    // ISBN正規化
    const normalizedIsbn = normalizeIsbn(isbn);
    if (!normalizedIsbn) {
      console.log(`無効なISBN形式: ${isbn}`);
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    }

    // レート制限チェック
    if (!checkRateLimit("user")) {
      console.log('レート制限に達しました（1日あたり600リクエスト制限）');
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    }

    // 楽天ブックスAPIの設定
    const RAKUTEN_APP_ID = process.env.RAKUTEN_APP_ID;
    
    if (!RAKUTEN_APP_ID) {
      console.error('楽天ブックスAPIキーが設定されていません');
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    }

    const AFFILIATE_ID = "49bc895f.748bd82f.49bc8960.04343aac";
    const apiUrl = `https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404?applicationId=${RAKUTEN_APP_ID}&isbn=${normalizedIsbn}&affiliateId=${AFFILIATE_ID}&format=json`;

    const response = await fetch(apiUrl);
    
    // 詳細なエラーハンドリング
    if (response.status === 401) {
      console.error('楽天APIの認証エラー');
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    } else if (response.status === 429) {
      console.log('楽天APIの利用制限に達しました');
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    } else if (response.status === 404) {
      // 404は正常なケース（本が見つからない）
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    } else if (!response.ok) {
      console.error(`楽天ブックスAPI エラー: ${response.status} ${response.statusText}`);
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    }

    const data = await response.json();
    
    // APIレスポンスの確認
    if (!data.Items || data.Items.length === 0) {
      // 本が見つからない場合は正常なケース
      return NextResponse.json({
        title: null,
        author: null,
        publisher: null,
        publicationDate: null,
        price: null,
        imageUrl: null,
        description: null,
        itemUrl: null,
        affiliateUrl: null
      });
    }

    const item = data.Items[0].Item;
    
    // 書影はlarge→medium→smallの順で最初に見つかったもの
    const imageUrl = item.largeImageUrl || item.mediumImageUrl || item.smallImageUrl || null;
    
    return NextResponse.json({
      title: item.title || null,
      author: item.author || null,
      publisher: item.publisherName || null,
      publicationDate: item.salesDate || null,
      price: item.itemPrice || null,
      imageUrl: imageUrl,
      description: item.itemCaption || null,
      itemUrl: item.itemUrl || null,
      affiliateUrl: item.affiliateUrl || null
    });

  } catch (error) {
    console.error('楽天ブックスAPIエラー:', error);
    
    // エラーが発生した場合もデフォルト値を返す（アプリケーションを停止させない）
    return NextResponse.json({
      title: null,
      author: null,
      publisher: null,
      publicationDate: null,
      price: null,
      imageUrl: null,
      description: null,
        itemUrl: null,
        affiliateUrl: null
    });
  }
}

// レート制限リセット用のエンドポイント
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'reset') {
      rateLimitMap.clear();
      console.log('レート制限をリセットしました');
      return NextResponse.json({ message: 'レート制限をリセットしました' });
    }
    
    if (action === 'status') {
      const now = Date.now();
      const key = "default";
      const current = rateLimitMap.get(key);
      
      if (!current || now > current.resetTime) {
        return NextResponse.json({ 
          status: 'available',
          remaining: RATE_LIMIT_MAX_REQUESTS,
          resetTime: now + RATE_LIMIT_WINDOW
        });
      }
      
      return NextResponse.json({
        status: 'limited',
        remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - current.count),
        resetTime: current.resetTime
      });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    
  } catch (error) {
    console.error('レート制限管理エラー:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
