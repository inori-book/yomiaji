'use client';

import React, { useEffect, useState } from 'react';

interface WordCloudProps {
  isbn: string;
}

interface WordData {
  word: string;
  count: number;
}

const WordCloud: React.FC<WordCloudProps> = ({ isbn }) => {
  const [words, setWords] = useState<WordData[]>([]);
  const [loading, setLoading] = useState(true);

  // ワードクラウドのサイズを定義
  const cloudSize = 300; // レーダーチャートと同じサイズに調整
  const centerX = cloudSize / 2;
  const centerY = cloudSize / 2;

  useEffect(() => {
    const fetchWords = async () => {
      try {
        const response = await fetch(`/api/wordcloud?isbn=${isbn}`);
        if (response.ok) {
          const data = await response.json();
          setWords(data.words || []);
        }
      } catch (error) {
        console.error('Failed to fetch word cloud data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isbn) {
      fetchWords();
    }
  }, [isbn]);

  if (loading) {
    return (
      <div style={{ 
        width: `${cloudSize}px`, 
        height: `${cloudSize}px`, 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          color: '#666',
          fontSize: '16px',
          fontFamily: 'var(--font-geist-sans)'
        }}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div style={{ 
        width: `${cloudSize}px`, 
        height: `${cloudSize}px`, 
        backgroundColor: '#f5f5f5', 
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ 
          color: '#666',
          fontSize: '16px',
          fontFamily: 'var(--font-geist-sans)'
        }}>
          キーワードが見つかりませんでした
        </div>
      </div>
    );
  }
  
  // フォントサイズの範囲を定義
  const minFontSize = 12;
  const maxFontSize = 48;
  const maxCount = Math.max(...words.map(w => w.count));
  const minCount = Math.min(...words.map(w => w.count));

  // 単語の配置を計算（より自然な配置）
  const getWordPosition = (index: number, total: number, fontSize: number) => {
    // 頻度の高い単語ほど中央に近く配置
    const centerWeight = fontSize / maxFontSize;
    const baseRadius = 50 + (1 - centerWeight) * 80;
    
    // 角度を少しずつずらして重複を避ける
    const angle = (index / total) * 2 * Math.PI + (index * 0.1);
    const radius = baseRadius + (index % 3) * 15;
    
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    return { x, y };
  };

  // フォントサイズを計算
  const getFontSize = (count: number) => {
    if (maxCount === minCount) return (minFontSize + maxFontSize) / 2;
    const ratio = (count - minCount) / (maxCount - minCount);
    return minFontSize + ratio * (maxFontSize - minFontSize);
  };

  // 色を計算
  const getColor = (index: number) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
    ];
    return colors[index % colors.length];
  };

  return (
    <div style={{ 
      width: `${cloudSize}px`, 
      height: `${cloudSize}px`, 
      backgroundColor: '#f5f5f5', 
      borderRadius: '8px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <svg width={cloudSize} height={cloudSize} style={{ position: 'absolute', top: 0, left: 0 }}>
        {words.map((wordData, index) => {
          const fontSize = getFontSize(wordData.count);
          const position = getWordPosition(index, words.length, fontSize);
          const color = getColor(index);
          
          return (
            <text
              key={index}
              x={position.x}
              y={position.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={fontSize}
              fill={color}
              fontFamily="var(--font-geist-sans)"
              fontWeight="bold"
              style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
              }}
            >
              {wordData.word}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default WordCloud;
