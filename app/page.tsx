'use client';

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [searchText, setSearchText] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [loadingKeywords, setLoadingKeywords] = useState(true);

  const isSearchActive = searchText.trim() !== "" || selectedOption !== "";

  // ウォームアップ: Python APIを非同期で叩く
  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' }).catch(() => {});
  }, []);

  // キーワード一覧を取得
  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        console.log('キーワード取得開始: /api/keywords');
        const response = await fetch('/api/keywords');
        console.log('レスポンスステータス:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('取得データ:', data);
          const keywordsArray = data.keywords || data || [];
          console.log('キーワード配列:', keywordsArray);
          setKeywords(keywordsArray);
        } else {
          console.error('キーワード取得失敗:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('エラーレスポンス:', errorText);
        }
      } catch (error) {
        console.error('キーワード取得エラー:', error);
      } finally {
        setLoadingKeywords(false);
      }
    };

    fetchKeywords();
  }, []);

  const handleSearch = () => {
    if (isSearchActive) {
      const query = searchText.trim() || selectedOption;
      router.push(`/results?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="font-sans min-h-screen bg-teal-900">
      <main className="max-w-[375px] lg:max-w-[800px] xl:max-w-[1200px] mx-auto bg-gray-900 min-h-screen px-4 py-4">
        <div className="relative w-full mb-6">
          <Image
            src="/images/top.png"
            alt="YOMIAJI: βテスト版 - 一読み味で探す毒書体験"
            width={375}
            height={200}
            priority
            className="w-full h-auto"
          />
          <div 
            className="absolute text-white font-bold text-[28px] sm:text-[32px] leading-none"
            style={{
              fontFamily: 'var(--font-noto-serif-jp)',
              left: '20px',
              top: '50px'
            }}
          >
            YOMIAJI：βテスト版
          </div>
          <div 
            className="absolute text-white font-bold text-[20px] sm:text-[24px] leading-none"
            style={{
              fontFamily: 'var(--font-noto-serif-jp)',
              left: '40px',
              top: '120px'
            }}
          >
            －読み味で探す"毒書"体験
          </div>
        </div>
        <div 
          className="text-white text-[14px] sm:text-[16px] leading-relaxed mb-6 text-left md:text-center"
          style={{
            fontFamily: 'var(--font-noto-serif-jp)',
            padding: '10px 0px'
          }}
        >
          読む前の自分には戻れなくなるような"毒書"を取り揃えております。<br />
          読後感（読み味）からあなたに合った1冊を探してください。
        </div>
        <div className="flex flex-col md:flex-row gap-2 mb-6">
          <div className="flex-1">
            <div
              className="text-white text-[12px] sm:text-[14px] font-semibold mb-2"
              style={{
                fontFamily: 'var(--font-noto-serif-jp)'
              }}
            >
              フリーテキストで検索
            </div>
            <input
              type="text"
              placeholder="例）怖い"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-3 py-2 text-[12px] sm:text-[14px] bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#94A3B8] placeholder-[#94A3B8]"
              style={{
                fontFamily: 'var(--font-inter)',
                color: '#000000'
              }}
            />
          </div>
          <div className="flex-1">
            <div
              className="text-white text-[12px] sm:text-[14px] font-semibold mb-2"
              style={{
                fontFamily: 'var(--font-noto-serif-jp)'
              }}
            >
              候補から検索
            </div>
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-3 py-2 text-[12px] sm:text-[14px] bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#94A3B8] text-[#94A3B8] appearance-none"
              style={{
                fontFamily: 'var(--font-inter)'
              }}
              disabled={loadingKeywords}
            >
              <option value="" disabled>
                {loadingKeywords ? '読み込み中...' : '選択してください'}
              </option>
              {keywords.map((keyword, index) => (
                <option key={index} value={keyword} style={{ color: '#000000' }}>
                  {keyword}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="w-full mb-6">
          <button
            onClick={handleSearch}
            disabled={!isSearchActive}
            className={`w-full px-6 py-3 rounded-md font-bold text-[14px] sm:text-[16px] transition-colors ${
              isSearchActive
                ? 'bg-orange-500 text-black hover:bg-orange-600'
                : 'bg-gray-500 text-gray-300 cursor-not-allowed'
            }`}
            style={{
              fontFamily: 'var(--font-noto-serif-jp)'
            }}
          >
            検索
          </button>
        </div>
        
        <div className="w-full space-y-3">
          <div 
            className="text-left md:text-center text-[14px] sm:text-[16px] leading-relaxed" 
            style={{ 
              fontFamily: 'var(--font-noto-serif-jp)', 
              color: '#FFFFFF',
              padding: '10px 0px'
            }}
          >
            読んだ本の感想をぜひ投稿してください。<br />あなたの感想がサービスを育てます。
          </div>
          
          <button
            onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScbARW9Cf18epK-a3mXcjoM4llCeOgvM4htsbrsldxNJ_gqAw/viewform?usp=header', '_blank')}
            className="w-full px-6 py-3 rounded-md font-bold text-[14px] sm:text-[16px] transition-colors bg-orange-500 text-black hover:bg-orange-600"
            style={{
              fontFamily: 'var(--font-noto-serif-jp)'
            }}
          >
            感想を投稿する
          </button>
        </div>
      </main>
    </div>
  );
}
