'use client';

import React from 'react';

interface RadarChartProps {
  data: {
    erotic: number;
    grotesque: number;
    insane: number;
    paranomal: number;
    esthetic: number;
    action: number;
    painful: number;
    mystery: number;
  };
}

const RadarChart: React.FC<RadarChartProps> = ({ data }) => {
  const categories = [
    { key: 'erotic', label: 'エロ', value: data.erotic },
    { key: 'grotesque', label: 'グロ', value: data.grotesque },
    { key: 'insane', label: '人怖', value: data.insane },
    { key: 'paranomal', label: '霊怖', value: data.paranomal },
    { key: 'esthetic', label: '耽美', value: data.esthetic },
    { key: 'action', label: 'アクション', value: data.action },
    { key: 'painful', label: '感動', value: data.painful },
    { key: 'mystery', label: '謎', value: data.mystery },
  ];

  const maxValue = 5;
  const svgSize = 300; // SVGサイズを300x300に縮小
  const centerX = svgSize / 2;
  const centerY = svgSize / 2;
  const radius = 90; // 半径も比例して縮小
  const labelRadius = 110; // ラベル半径も比例して縮小

  // 各カテゴリの角度を計算（8分割）
  const getAngle = (index: number) => (index * 2 * Math.PI) / 8 - Math.PI / 2;

  // データポイントの座標を計算
  const getPoint = (index: number, value: number) => {
    const angle = getAngle(index);
    const distance = (value / maxValue) * radius;
    const x = centerX + distance * Math.cos(angle);
    const y = centerY + distance * Math.sin(angle);
    return { x, y };
  };

  // レーダーチャートのパスを生成
  const getPath = () => {
    const points = categories.map((_, index) => {
      const point = getPoint(index, categories[index].value);
      return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
    });
    return points.join(' ') + ' Z';
  };

  // グリッドラインのパスを生成
  const getGridPath = (level: number) => {
    const points = categories.map((_, index) => {
      const angle = getAngle(index);
      const distance = (level / maxValue) * radius;
      const x = centerX + distance * Math.cos(angle);
      const y = centerY + distance * Math.sin(angle);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    });
    return points.join(' ') + ' Z';
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
      <svg width={svgSize} height={svgSize} style={{ backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        {/* グリッドライン */}
        {[1, 2, 3, 4, 5].map((level) => (
          <path
            key={level}
            d={getGridPath(level)}
            fill="none"
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        ))}
        
        {/* 軸線 */}
        {categories.map((_, index) => {
          const angle = getAngle(index);
          const endX = centerX + radius * Math.cos(angle);
          const endY = centerY + radius * Math.sin(angle);
          return (
            <line
              key={index}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          );
        })}
        
        {/* データエリア */}
        <path
          d={getPath()}
          fill="rgba(135, 206, 235, 0.3)"
          stroke="#87CEEB"
          strokeWidth="2"
        />
        
        {/* データポイント */}
        {categories.map((_, index) => {
          const point = getPoint(index, categories[index].value);
          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="4"
              fill="#87CEEB"
            />
          );
        })}
        
        {/* ラベル */}
        {categories.map((category, index) => {
          const angle = getAngle(index);
          const labelX = centerX + labelRadius * Math.cos(angle);
          const labelY = centerY + labelRadius * Math.sin(angle);
          
          return (
            <text
              key={index}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="12"
              fill="#333"
              fontFamily="var(--font-geist-sans)"
            >
              {category.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

export default RadarChart;
