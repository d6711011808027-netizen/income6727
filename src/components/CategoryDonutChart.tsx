import React, { useState } from 'react';
import { formatCurrency } from '../lib/constants';

interface CategoryData {
  category: string;
  amount: number;
  color: string;
  count: number;
}

interface Props {
  data: CategoryData[];
  totalAmount: number;
  title: string;
}

export const CategoryDonutChart: React.FC<Props> = ({ data, totalAmount, title }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (data.length === 0 || totalAmount === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <p className="text-sm">ไม่มีข้อมูลการใช้จ่ายในหมวดหมู่นี้</p>
      </div>
    );
  }

  // Calculate angles for donut chart
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;
  const slices = data.map((item, idx) => {
    const percent = item.amount / totalAmount;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;
    return {
      ...item,
      percent,
      strokeDasharray,
      strokeDashoffset,
      idx,
    };
  });

  const activeItem = hoveredIdx !== null ? slices[hoveredIdx] : null;

  return (
    <div className="flex flex-col md:flex-row items-center gap-6">
      {/* SVG Donut */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice) => {
            const isHovered = hoveredIdx === slice.idx;
            return (
              <circle
                key={slice.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={slice.strokeDasharray}
                strokeDashoffset={slice.strokeDashoffset}
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(slice.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
          <span className="text-xs text-slate-500 font-medium truncate max-w-[120px]">
            {activeItem ? activeItem.category : title}
          </span>
          <span className="text-base font-semibold text-slate-900 font-mono tabular-nums">
            ฿{formatCurrency(activeItem ? activeItem.amount : totalAmount)}
          </span>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {activeItem ? `${(activeItem.percent * 100).toFixed(1)}%` : `${data.length} หมวดหมู่`}
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
        {slices.map((item) => {
          const isHovered = hoveredIdx === item.idx;
          return (
            <div
              key={item.category}
              onMouseEnter={() => setHoveredIdx(item.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between text-xs py-1.5 px-2 rounded cursor-pointer transition-colors ${
                isHovered ? 'bg-slate-100' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-700 font-medium truncate">{item.category}</span>
                <span className="text-slate-400 font-mono">({item.count})</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-2">
                <span className="text-slate-900 font-mono tabular-nums font-medium">
                  ฿{formatCurrency(item.amount)}
                </span>
                <span className="text-slate-500 font-mono tabular-nums w-11 text-right">
                  {(item.percent * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
