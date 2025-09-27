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

  // キーワード一覧を取得
  useEffect(() => {
    const fetchKeywords = async () => {
      try {
        const response = await fetch('/api/keywords');
        if (response.ok) {
          const data = await response.json();
          setKeywords(data.keywords || []);
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
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start max-w-[375px] w-full">
        <div className="relative w-full">
          <Image
            src="/images/top.png"
            alt="YOMIAJI: βテスト版 - 一読み味で探す毒書体験"
            width={375}
            height={200}
            priority
            className="w-full h-auto"
          />
          <div 
            className="absolute text-white font-bold text-[32px] leading-none"
            style={{
              fontFamily: 'var(--font-noto-serif-jp)',
              left: '27px',
              top: '64px'
            }}
          >
            YOMIAJI：βテスト版
          </div>
          <div 
            className="absolute text-white font-bold text-[24px] leading-none"
            style={{
              fontFamily: 'var(--font-noto-serif-jp)',
              left: '62px',
              top: '149px'
            }}
          >
            －読み味で探す"毒書"体験
          </div>
        </div>
        <div 
          className="text-white text-[16px] leading-relaxed"
          style={{
            fontFamily: 'var(--font-noto-serif-jp)',
            padding: '10px 20px'
          }}
        >
          読む前の自分には戻れなくなるような"毒書"を取り揃えております。<br />
          読後感（読み味）からあなたに合った1冊を探してください。
        </div>
        <div className="flex gap-[1px]">
          <div
            style={{
              width: '187px',
              padding: '10px 10px'
            }}
          >
            <div
              className="text-white text-[14px] font-semibold mb-2"
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
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#94A3B8] placeholder-[#94A3B8]"
              style={{
                fontFamily: 'var(--font-inter)',
                color: '#000000'
              }}
            />
          </div>
          <div
            style={{
              width: '187px',
              padding: '10px 10px'
            }}
          >
            <div
              className="text-white text-[14px] font-semibold mb-2"
              style={{
                fontFamily: 'var(--font-noto-serif-jp)'
              }}
            >
              候補から検索
            </div>
            <select
              value={selectedOption}
              onChange={(e) => setSelectedOption(e.target.value)}
              className="w-full px-3 py-2 text-[14px] bg-white border border-[#CBD5E1] rounded-md focus:outline-none focus:border-[#94A3B8] text-[#94A3B8] appearance-none"
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
        <div className="w-full mt-5">
          <button
            onClick={handleSearch}
            disabled={!isSearchActive}
            className={`w-full px-6 py-2 rounded-md font-bold text-[16px] transition-colors ${
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
      </main>
    </div>
  );
}
