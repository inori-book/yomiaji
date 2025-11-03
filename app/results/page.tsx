'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
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

export default function ResultsPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rakutenInfo, setRakutenInfo] = useState<{ [isbn: string]: RakutenBookInfo }>({});
  const [expandedBooks, setExpandedBooks] = useState<{ [isbn: string]: boolean }>({});
  const [rakutenLoading, setRakutenLoading] = useState(false);
  const [rakutenProgress, setRakutenProgress] = useState({ current: 0, total: 0 });
  const [ratings, setRatings] = useState<{ [isbn: string]: { averageRating: number; totalRatings: number } }>({});

  // URLパラメータをクライアント側で取得（output: 'export'ではuseSearchParamsが使えない）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get('q');
      if (q) {
        setQuery(q);
      } else {
        setError('検索クエリが指定されていません');
        setLoading(false);
      }
    }
  }, []);

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
    if (!query) {
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
        
        // 優先度制御：キーワード登場回数でソート（既にソート済み）
        const prioritizedResults = data.results.slice(0, 8); // 上位8件まで拡張
        
        // 楽天APIの取得開始
        setRakutenLoading(true);
        setRakutenProgress({ current: 0, total: prioritizedResults.length });

        // 楽天ブックスAPIから情報を取得（キャッシュ機能付き）
        const rakutenData: { [isbn: string]: RakutenBookInfo } = {};
        
        // キャッシュ機能付きの楽天API呼び出し関数
        const fetchRakutenWithCache = async (isbn: string): Promise<RakutenBookInfo> => {
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
          
          try {
            // キャッシュAPIを使用
            const response = await fetch(`/api/rakuten-cache?isbn=${encodeURIComponent(isbn)}`);
            
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const info = await response.json();
            console.log(`楽天API取得成功 (ISBN: ${isbn}, キャッシュ: ${info.cached ? 'Yes' : 'No'})`);
            return info;
          } catch (error) {
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
        };
        
        // 優先度順に楽天APIを呼び出し（キャッシュ機能付き）
        for (let i = 0; i < prioritizedResults.length; i++) {
          const result = prioritizedResults[i];
          rakutenData[result.isbn] = await fetchRakutenWithCache(result.isbn);
          setRakutenProgress({ current: i + 1, total: prioritizedResults.length });
          // キャッシュ機能により待機時間を短縮
          await new Promise(resolve => setTimeout(resolve, 200));
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
  }, [query]);

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
      <div className="min-h-screen bg-teal-900">
        <main className="max-w-[375px] mx-auto bg-gray-900 min-h-screen px-4 py-4">
          <div className="text-center text-white">
            <div className="text-xl">検索結果が見つかりませんでした</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-900">
      <main className="max-w-[375px] lg:max-w-[800px] xl:max-w-[1200px] mx-auto bg-gray-900 min-h-screen px-4 py-4">
        {/* ヘッダー */}
        <div className="flex flex-col md:flex-row items-center mb-6 gap-2">
          <button
            onClick={() => router.back()}
            className="w-full md:w-auto px-3 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 flex-shrink-0 text-sm"
          >
            ← 戻る
          </button>
          <div className="flex w-full gap-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="検索キーワードを入力"
              defaultValue={searchResults?.query || ''}
              className="flex-1 px-3 py-2 bg-gray-800 text-white rounded border border-gray-600 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = e.currentTarget.value.trim();
                  if (query) {
                    // 静的エクスポート環境ではwindow.location.hrefを使用
                    window.location.href = `/results?q=${encodeURIComponent(query)}`;
                  }
                }
              }}
            />
            <button 
              onClick={(e) => {
                e.preventDefault();
                const query = searchInputRef.current?.value.trim();
                if (query) {
                  // 静的エクスポート環境ではwindow.location.hrefを使用
                  window.location.href = `/results?q=${encodeURIComponent(query)}`;
                }
              }}
              type="button"
              className="px-4 py-2 bg-orange-500 text-black font-bold rounded hover:bg-orange-600 flex-shrink-0 text-sm"
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
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
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
      </main>
    </div>
  );
}
