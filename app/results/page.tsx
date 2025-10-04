'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface SearchResult {
  index: number;
  title: string;
  author: string;
  genre: string;
  review: string;
  isbn: string;
  keyword_count: number;
  keywords: string[];
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_count: number;
}

interface RakutenBookInfo {
  title: string | null;
  author: string | null;
  publisher: string | null;
  publicationDate: string | null;
  price: number | null;
  imageUrl: string | null;
  description: string | null;
}

function ResultsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rakutenInfo, setRakutenInfo] = useState<{ [isbn: string]: RakutenBookInfo }>({});
  const [expandedBooks, setExpandedBooks] = useState<{ [isbn: string]: boolean }>({});
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenProgress, setRakutenProgress] = useState({ current: 0, total: 0 });
  const [ratings, setRatings] = useState<{ [isbn: string]: { averageRating: number; totalRatings: number } }>({});

  const fetchRatings = async (results: SearchResult[]) => {
    const ratingsData: { [isbn: string]: { averageRating: number; totalRatings: number } } = {};
    for (const result of results) {
      // ISBNが空の場合はスキップ
      if (!result.isbn || result.isbn.trim() === '') {
        console.warn('空のISBNをスキップ:', result);
        ratingsData[result.isbn] = { averageRating: 0, totalRatings: 0 };
        continue;
      }
      
      try {
        const response = await fetch(`/api/ratings?isbn=${result.isbn}`);
        if (response.ok) {
          const ratingData = await response.json();
          ratingsData[result.isbn] = {
            averageRating: ratingData.averageRating,
            totalRatings: ratingData.totalRatings
          };
        }
      } catch (error) {
        console.error(`評価データ取得エラー (ISBN: ${result.isbn}):`, error);
        ratingsData[result.isbn] = { averageRating: 0, totalRatings: 0 };
      }
    }
    setRatings(ratingsData);
    return ratingsData;
  };

  useEffect(() => {
    const query = searchParams.get('q');
    if (!query) {
      setError('検索クエリが指定されていません');
      setLoading(false);
      return;
    }

    const performSearch = async () => {
      // キャッシュチェック
      const cacheKey = `search_${query}`;
      const cachedData = sessionStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          setSearchResults(parsedData.searchResults);
          setRakutenInfo(parsedData.rakutenInfo);
          setLoading(false);
          
          // 評価データは常に最新を取得
          await fetchRatings(parsedData.searchResults.results);
          return;
        } catch (error) {
          console.error("キャッシュデータの解析エラー:", error);
          sessionStorage.removeItem(cacheKey);
        }
      }
      try {
        const response = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setSearchResults(data);
        
        // 楽天APIの取得開始
        setRakutenLoading(true);
        setRakutenProgress({ current: 0, total: data.results.length });

        // 楽天ブックスAPIから情報を取得（リトライ機能付き）
        const rakutenData: { [isbn: string]: RakutenBookInfo } = {};
        
        // リトライ機能付きの楽天API呼び出し関数
        const fetchRakutenWithRetry = async (isbn: string, maxRetries: number = 3): Promise<RakutenBookInfo> => {
          // ISBNが空の場合はスキップ
          if (!isbn || isbn.trim() === '') {
            console.warn('空のISBNをスキップ:', isbn);
            return {
              title: null,
              author: null,
              publisher: null,
              publicationDate: null,
              price: null,
              imageUrl: null,
              description: null
            };
          }
          
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              const response = await fetch(`/api/rakuten?isbn=${isbn}`);
              if (response.ok) {
                return await response.json();
              } else if (response.status === 429 && attempt < maxRetries) {
                // レート制限の場合は待機してリトライ
                const waitTime = Math.pow(2, attempt) * 1000; // 指数バックオフ
                console.log(`楽天API レート制限 (ISBN: ${isbn}), ${waitTime}ms待機してリトライ (${attempt}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                continue;
              } else {
                throw new Error(`HTTP ${response.status}`);
              }
            } catch (error) {
              if (attempt === maxRetries) {
                console.error(`楽天API取得失敗 (ISBN: ${isbn}):`, error);
                return {
                  title: null,
                  author: null,
                  publisher: null,
                  publicationDate: null,
                  price: null,
                  imageUrl: null,
                  description: null
                };
              }
              const waitTime = Math.pow(2, attempt) * 1000;
              console.log(`楽天API エラー (ISBN: ${isbn}), ${waitTime}ms待機してリトライ (${attempt}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
          return {
            title: null,
            author: null,
            publisher: null,
            publicationDate: null,
            price: null,
            imageUrl: null,
            description: null
          };
        };
        
        for (let i = 0; i < data.results.length; i++) {
          const result = data.results[i];
          rakutenData[result.isbn] = await fetchRakutenWithRetry(result.isbn);
          setRakutenProgress({ current: i + 1, total: data.results.length });
          // レート制限回避のため少し待機
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        setRakutenInfo(rakutenData);
        setRakutenLoading(false);
        
        // 評価データを取得
        const ratingsData = await fetchRatings(data.results);
        
        // キャッシュに保存
        const cacheData = {
          searchResults: data,
          rakutenInfo: rakutenData,
          ratings: ratingsData
        };
        sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (err) {
        setError(err instanceof Error ? err.message : '検索中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchParams]);

  const toggleExpanded = (isbn: string) => {
    setExpandedBooks(prev => ({
      ...prev,
      [isbn]: !prev[isbn]
    }));
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} style={{ color: '#FFD700' }}>★</span>
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <span key="half" style={{ color: '#FFD700' }}>☆</span>
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} style={{ color: '#ddd' }}>☆</span>
      );
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">検索中...</div>
          {rakutenLoading && (
            <div className="text-sm text-gray-400">
              楽天ブックス情報取得中... ({rakutenProgress.current}/{rakutenProgress.total})
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4 text-red-400">エラーが発生しました</div>
          <div className="text-gray-400 mb-4">{error}</div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  if (!searchResults) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">検索結果が見つかりませんでした</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto py-8 px-4 max-w-full">
        {/* ヘッダー */}
        <div className="flex items-center mb-6 gap-2" style={{ width: 'calc(100% - 8px)' }}>
          <button
            onClick={() => router.back()}
            className="px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 flex-shrink-0"
            style={{ width: '80px' }}
          >
            ← 戻る
          </button>
          <div className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder="検索キーワードを入力"
              defaultValue={searchResults.query}
              className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-l rounded-r-none border border-gray-600"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = e.currentTarget.value.trim();
                  if (query) {
                    router.push(`/results?q=${encodeURIComponent(query)}`);
                  }
                }
              }}
            />
            <button 
              onClick={() => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                const query = input?.value.trim();
                if (query) {
                  router.push(`/results?q=${encodeURIComponent(query)}`);
                }
              }}
              className="px-4 py-2 bg-orange-500 text-black font-bold rounded-r rounded-l-none hover:bg-orange-600 flex-shrink-0"
              style={{ width: '80px' }}
            >
              検索
            </button>
          </div>
        </div>

        {/* パンくずリスト */}
        <div className="mb-6">
          <Link href="/" className="text-orange-500 hover:text-orange-400">TOP</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-white">検索キーワード「{searchResults.query}」</span>
        </div>

        {/* 注意書き */}
        <div className="mb-6 p-4 bg-gray-800 rounded">
          <p className="text-xs text-gray-300 mb-2">
            ※ 価格等は変動する可能性があります。最新情報は各販売サイトでご確認ください。
          </p>
          <p className="text-xs text-gray-300">
            ※ 楽天ブックスに登録がない書籍に関しては、書影その他情報が表示されない場合があります。
          </p>
        </div>

        {/* 検索結果 */}
        <div>
        <div className="text-lg mb-4">
          「{searchResults.query}」が感想に登場する書籍: {searchResults.total_count}件
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {searchResults.results.map((result) => {
            const bookInfo = rakutenInfo[result.isbn] || {};
            
            return (
              <div
                key={result.index}
                className="bg-gray-900 rounded-lg p-4 border border-gray-700"
              >
                <div className="flex flex-col md:flex-row gap-4">
                  {/* 書影 */}
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                    {bookInfo.imageUrl ? (
                      <img 
                        src={bookInfo.imageUrl} 
                        alt={bookInfo.title || result.title}
                        className="w-24 h-32 object-cover rounded border border-gray-600"
                      />
                    ) : (
                      <div className="w-24 h-32 bg-gray-700 rounded border border-gray-600 flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>

                  {/* 書籍情報 */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {/* 左側の情報 */}
                      <div className="space-y-2">
                        {/* タイトル */}
                        <div>
                          <div className="text-sm text-gray-400 mb-1">タイトル</div>
                          <div className="text-white font-medium">
                            {bookInfo.title || result.title}
                          </div>
                        </div>

                        {/* 著者 */}
                        <div>
                          <div className="text-sm text-gray-400 mb-1">著者</div>
                          <div className="text-white">
                            {bookInfo.author || result.author}
                          </div>
                        </div>

                        {/* キーワード登場回数 */}
                        <div>
                          <div className="text-sm text-gray-400 mb-1">キーワード登場回数</div>
                          <div className="text-white">
                            {result.keyword_count}回
                          </div>
                        </div>
                      </div>

                      {/* 右側の情報 */}
                      <div className="space-y-2">
                        {/* ジャンル */}
                        <div>
                          <div className="text-sm text-gray-400 mb-1">ジャンル</div>
                          <div className="text-white">
                            {result.genre}
                          </div>
                        </div>

                        {/* ユーザー平均評価 */}
                        <div>
                          <div className="text-sm text-gray-400 mb-1">ユーザー平均評価</div>
                          <div className="flex items-center">
                            {renderStars(ratings[result.isbn]?.averageRating || 0)}
                            {ratings[result.isbn]?.averageRating > 0 && (
                              <span className="ml-2 text-xs text-gray-400">
                                ({ratings[result.isbn]?.totalRatings || 0}件)
                              </span>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* 定価 */}
                    <div className="mb-4 text-sm">
                      <div>
                        <span className="text-gray-400">定価: </span>
                        <span className="text-white">{bookInfo.price ? `${bookInfo.price}円` : '情報なし'}</span>
                      </div>
                    </div>

                    {/* 作品紹介 */}
                    {bookInfo.description && (
                      <div>
                        <div className="text-sm text-gray-400 mb-2">作品紹介</div>
                        <div className="text-white text-sm leading-relaxed">
                          {expandedBooks[result.isbn] ? (
                            <div>
                              <p>{bookInfo.description}</p>
                              <button
                                onClick={() => toggleExpanded(result.isbn)}
                                className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                              >
                                折りたたむ
                              </button>
                            </div>
                          ) : (
                            <div>
                              <p>
                                {bookInfo.description.length > 200 
                                  ? `${bookInfo.description.substring(0, 200)}...` 
                                  : bookInfo.description
                                }
                              </p>
                              {bookInfo.description.length > 200 && (
                                <button
                                  onClick={() => toggleExpanded(result.isbn)}
                                  className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                                >
                                  続きを読む
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* タイトルクリックで詳細画面へ */}
                    <div className="mt-4">
                      {result.isbn && result.isbn.trim() !== '' ? (
                        <button
                          onClick={() => {
                            try {
                              const query = searchResults?.query || "";
                              console.log('Button clicked:', { isbn: result.isbn, query });
                              const url = `/results/${result.isbn}?q=${encodeURIComponent(query)}`;
                              window.location.href = url;
                            } catch (error) {
                              console.error('Navigation error:', error);
                            }
                          }}
                          className="w-full py-2 px-4 bg-orange-500 text-black font-bold rounded hover:bg-orange-400 transition-colors"
                        >
                          {bookInfo.title || result.title}
                        </button>
                      ) : (
                        <div className="w-full py-2 px-4 bg-gray-600 text-gray-300 font-bold rounded text-center">
                          {bookInfo.title || result.title}
                          <div className="text-xs text-gray-400 mt-1">詳細情報なし</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {searchResults.results.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">検索結果が見つかりませんでした</p>
            <p className="text-sm text-gray-500">
              別のキーワードで検索してみてください
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}


export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="text-xl">読み込み中...</div>
      </div>
    </div>}>
      <ResultsPageContent />
    </Suspense>
  );
}
