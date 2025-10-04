'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import RatingModal from '../../../components/RatingModal';
import RadarChart from '../../../components/RadarChart';
import WordCloud from '../../../components/WordCloud';

interface RakutenBookInfo {
  title: string | null;
  author: string | null;
  publisher: string | null;
  publicationDate: string | null;
  price: number | null;
  imageUrl: string | null;
  description: string | null;
  itemUrl: string | null;
  affiliateUrl: string | null;
}

interface BookData {
  erotic: number;
  grotesque: number;
  insane: number;
  paranomal: number;
  esthetic: number;
  action: number;
  painful: number;
  mystery: number;
}

interface DatabaseBookInfo {
  title: string;
  author: string;
  genre: string;
  review: string;
}

export default function BookDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isbn = params.isbn as string;
  const query = searchParams.get('q') || '';

  const [bookData, setBookData] = useState<BookData | null>(null);
  const [rakutenInfo, setRakutenInfo] = useState<RakutenBookInfo | null>(null);
  const [databaseInfo, setDatabaseInfo] = useState<DatabaseBookInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [keywordCount, setKeywordCount] = useState(0);

  useEffect(() => {
    const fetchBookData = async () => {
      try {
        // データベースから書籍データを取得
        const response = await fetch(`/api/book-data?isbn=${isbn}`);
        if (response.ok) {
          const data = await response.json();
          setBookData(data);
        }

        // データベースから基本情報を取得
        const databaseResponse = await fetch(`/api/book-info?isbn=${isbn}`);
        if (databaseResponse.ok) {
          const databaseData = await databaseResponse.json();
          // データベースに情報がある場合は設定（titleがnullでも他の情報があれば設定）
          if (databaseData.title || databaseData.author || databaseData.genre || databaseData.review) {
            setDatabaseInfo({
              title: databaseData.title || '',
              author: databaseData.author || '',
              genre: databaseData.genre || '',
              review: databaseData.review || ''
            });
          }
        }

        // 楽天APIから情報を取得
        const rakutenResponse = await fetch(`/api/rakuten?isbn=${isbn}`);
        if (rakutenResponse.ok) {
          const rakutenData = await rakutenResponse.json();
          setRakutenInfo(rakutenData);
        }

        // 評価データを取得
        const ratingsResponse = await fetch(`/api/ratings?isbn=${isbn}`);
        if (ratingsResponse.ok) {
          const ratingsData = await ratingsResponse.json();
          setAverageRating(ratingsData.averageRating);
          setTotalRatings(ratingsData.totalRatings);
        }

        // 検索クエリがある場合は、キーワード登場回数を取得
        if (query) {
          const searchResponse = await fetch('/api/search', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          });
          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const currentBook = searchData.results.find((result: any) => result.isbn === isbn);
            if (currentBook) {
              setKeywordCount(currentBook.keyword_count || 0);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'データの取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    if (isbn) {
      fetchBookData();
    }
  }, [isbn]);

  const handleRatingSubmitted = (newAverageRating: number, newTotalRatings: number) => {
    setAverageRating(newAverageRating);
    setTotalRatings(newTotalRatings);
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
        <span key={`empty-${i}`} style={{ color: '#CCCCCC' }}>★</span>
      );
    }
    
    return stars;
  };

  // 表示用のタイトルと著者を決定（楽天データを優先、なければデータベースデータ）
  const displayTitle = rakutenInfo?.title || databaseInfo?.title || 'タイトル不明';
  const displayAuthor = rakutenInfo?.author || databaseInfo?.author || '著者不明';
  

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl">読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl text-red-500">エラー: {error}</div>
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
              defaultValue={query}
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
          <Link href={`/results?q=${encodeURIComponent(query)}`} className="text-orange-500 hover:text-orange-400">
            検索キーワード「{query}」
          </Link>
          <span className="mx-2">&gt;</span>
          <span className="text-white">『{displayTitle}』</span>
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

        {/* 書籍情報 */}
        <div className="bg-gray-900 p-6 rounded-lg">
          <div className="flex flex-col md:flex-row gap-6">
            {/* 書影 */}
            {rakutenInfo?.imageUrl && (
              <div className="flex-shrink-0 mx-auto md:mx-0">
                <Image
                  src={rakutenInfo.imageUrl}
                  alt={displayTitle}
                  width={200}
                  height={280}
                  className="rounded shadow-lg"
                />
              </div>
            )}

            {/* 書籍詳細 */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-2 text-center md:text-left">{displayTitle}</h1>
              <p className="text-lg text-gray-300 mb-4 text-center md:text-left">著者: {displayAuthor}</p>
              
              <div className="space-y-2 mb-4">
                <p><span className="font-semibold">出版社:</span> {rakutenInfo?.publisher || '情報なし'}</p>
                <p><span className="font-semibold">発行日:</span> {rakutenInfo?.publicationDate || '情報なし'}</p>
                <p><span className="font-semibold">定価:</span> {rakutenInfo?.price ? `¥${rakutenInfo.price.toLocaleString()}` : '価格情報なし'}</p>
                {databaseInfo?.genre && (
                  <p><span className="font-semibold">ジャンル:</span> {databaseInfo.genre}</p>
                )}
                {query && keywordCount > 0 && (
                  <p><span className="font-semibold">キーワード登場回数:</span> {keywordCount}回</p>
                )}
              </div>

              {/* ユーザー評価 */}
              <div className="mb-4">
                <div className="flex items-center mb-2">
                  <span className="font-semibold mr-2">ユーザー評価:</span>
                  <div className="flex">
                    {renderStars(averageRating)}
                    {averageRating > 0 && (
                      <span className="ml-2 text-sm text-gray-300">
                        ({totalRatings}件)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 作品紹介 */}
              {rakutenInfo?.description && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">作品紹介</h3>
                  <p className="text-gray-300 leading-relaxed">
                    {rakutenInfo.description}
                  </p>
                </div>
              )}


              {/* 楽天ブックスリンク */}
              {rakutenInfo?.affiliateUrl && (
                <div className="mb-4">
                  <a
                    href={rakutenInfo.affiliateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block w-full md:w-auto px-6 py-3 bg-orange-500 text-black font-bold rounded hover:bg-orange-600 transition-colors text-center"
                  >
                    商品ページを開く<br />（楽天ブックス）
                  </a>
                </div>
              )}

              {/* この本を評価するボタン */}
              <div className="mb-4">
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="w-full md:w-auto px-6 py-3 bg-orange-500 text-black font-bold rounded hover:bg-orange-600 transition-colors"
                >
                  この本を評価する
                </button>
              </div>
              
              {/* 感想を投稿するボタン */}
              <div className="mb-4">
                <button
                  onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScbARW9Cf18epK-a3mXcjoM4llCeOgvM4htsbrsldxNJ_gqAw/viewform?usp=header', '_blank')}
                  className="w-full md:w-auto px-6 py-3 bg-orange-500 text-black font-bold rounded hover:bg-orange-600 transition-colors"
                >
                  感想を投稿する
                </button>
              </div>

              {/* 読み味レーダーチャート */}
              {bookData && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                    読み味レーダーチャート
                  </h3>
                  <div className="flex justify-center md:justify-start">
                    <RadarChart data={bookData} />
                  </div>
                </div>
              )}

              {/* 感想ワードクラウド */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                  感想ワードクラウド
                </h3>
                <div className="flex justify-center md:justify-start">
                  <WordCloud isbn={isbn} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 評価モーダル */}
        <RatingModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          isbn={isbn}
          bookTitle={displayTitle}
          onRatingSubmitted={handleRatingSubmitted}
        />
      </div>
    </div>
  );
}
