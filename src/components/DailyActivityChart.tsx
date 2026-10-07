import React, { useState } from 'react';
import { formatCurrency, formatThaiDate } from '../lib/constants';

interface DailyData {
  day: number;
  dateStr: string;
  income: number;
  expense: number;
  net: number;
}

interface Props {
  data: DailyData[];
  monthStr: string;
}

export const DailyActivityChart: React.FC<Props> = ({ data, monthStr }) => {
  const [hoveredDay, setHoveredDay] = useState<DailyData | null>(null);

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1000
  );

  return (
    <div className="w-full">
      {/* Chart Canvas */}
      <div className="relative h-56 flex items-end gap-1.5 pt-6 pb-2 border-b border-slate-200">
        {data.map((item) => {
          const incHeight = maxVal > 0 ? (item.income / maxVal) * 100 : 0;
          const expHeight = maxVal > 0 ? (item.expense / maxVal) * 100 : 0;
          const isHovered = hoveredDay?.day === item.day;
          const hasData = item.income > 0 || item.expense > 0;

          return (
            <div
              key={item.day}
              className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
              onMouseEnter={() => setHoveredDay(item)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Bars container */}
              <div className="w-full flex items-end justify-center gap-0.5 h-full">
                {/* Income Bar */}
                <div
                  style={{ height: `${Math.max(incHeight, 0)}%` }}
                  className={`w-full max-w-[8px] rounded-t-sm transition-all duration-150 ${
                    item.income > 0
                      ? isHovered
                        ? 'bg-emerald-600'
                        : 'bg-emerald-500'
                      : 'bg-transparent'
                  }`}
                />
                {/* Expense Bar */}
                <div
                  style={{ height: `${Math.max(expHeight, 0)}%` }}
                  className={`w-full max-w-[8px] rounded-t-sm transition-all duration-150 ${
                    item.expense > 0
                      ? isHovered
                        ? 'bg-rose-600'
                        : 'bg-rose-500'
                      : 'bg-transparent'
                  }`}
                />
              </div>

              {/* Day indicator dot or active marker */}
              {hasData && (
                <div
                  className={`w-1 h-1 rounded-full mt-1 ${
                    isHovered ? 'bg-slate-900' : 'bg-slate-300'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* X-axis labels (days) */}
      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-1.5 px-1">
        <span>1</span>
        <span>5</span>
        <span>10</span>
        <span>15</span>
        <span>20</span>
        <span>25</span>
        <span>{data.length}</span>
      </div>

      {/* Hover Info Banner / Tooltip */}
      <div className="mt-3 min-h-[32px] flex items-center justify-between text-xs px-2 py-1.5 bg-slate-50 rounded border border-slate-100">
        {hoveredDay ? (
          <>
            <span className="font-medium text-slate-800">
              {formatThaiDate(hoveredDay.dateStr)}
            </span>
            <div className="flex items-center gap-4 font-mono tabular-nums">
              <span className="text-emerald-600">
                รายรับ: +฿{formatCurrency(hoveredDay.income)}
              </span>
              <span className="text-rose-600">
                รายจ่าย: -฿{formatCurrency(hoveredDay.expense)}
              </span>
              <span className={hoveredDay.net >= 0 ? 'text-slate-900 font-semibold' : 'text-rose-600 font-semibold'}>
                สุทธิ: {hoveredDay.net >= 0 ? '+' : ''}฿{formatCurrency(hoveredDay.net)}
              </span>
            </div>
          </>
        ) : (
          <span className="text-slate-400">
            วางเมาส์หรือแตะที่แท่งกราฟเพื่อดูรายละเอียดรายวัน
          </span>
        )}
      </div>
    </div>
  );
};
