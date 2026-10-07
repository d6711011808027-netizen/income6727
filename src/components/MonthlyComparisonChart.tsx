import React from 'react';
import { formatCurrency, formatThaiMonth } from '../lib/constants';

export interface MonthSummaryData {
  month: string; // YYYY-MM
  income: number;
  expense: number;
  net: number;
}

interface Props {
  data: MonthSummaryData[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
}

export const MonthlyComparisonChart: React.FC<Props> = ({
  data,
  selectedMonth,
  onSelectMonth,
}) => {
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.income, d.expense)),
    1000
  );

  return (
    <div className="w-full">
      <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 border-b border-slate-200">
        {data.map((item) => {
          const incHeight = maxVal > 0 ? (item.income / maxVal) * 100 : 0;
          const expHeight = maxVal > 0 ? (item.expense / maxVal) * 100 : 0;
          const isSelected = item.month === selectedMonth;

          return (
            <button
              key={item.month}
              type="button"
              onClick={() => onSelectMonth(item.month)}
              className={`flex-1 flex flex-col justify-end items-center h-full group p-1.5 rounded transition-all ${
                isSelected ? 'bg-slate-100 ring-1 ring-slate-300' : 'hover:bg-slate-50'
              }`}
            >
              <div className="w-full flex items-end justify-center gap-1.5 h-full">
                {/* Income Bar */}
                <div
                  style={{ height: `${Math.max(incHeight, 2)}%` }}
                  className={`w-full max-w-[14px] rounded-t-sm transition-all ${
                    isSelected ? 'bg-emerald-600' : 'bg-emerald-400 group-hover:bg-emerald-500'
                  }`}
                  title={`รายรับ: ฿${formatCurrency(item.income)}`}
                />
                {/* Expense Bar */}
                <div
                  style={{ height: `${Math.max(expHeight, 2)}%` }}
                  className={`w-full max-w-[14px] rounded-t-sm transition-all ${
                    isSelected ? 'bg-rose-600' : 'bg-rose-400 group-hover:bg-rose-500'
                  }`}
                  title={`รายจ่าย: ฿${formatCurrency(item.expense)}`}
                />
              </div>

              {/* Month label */}
              <span className={`text-[11px] font-medium mt-2 truncate w-full text-center ${
                isSelected ? 'text-slate-900 font-semibold' : 'text-slate-500'
              }`}>
                {formatThaiMonth(item.month).split(' ')[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected month comparative metrics */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
            <span>รายรับ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-rose-500" />
            <span>รายจ่าย</span>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">
          คลิกที่แท่งเพื่อสลับดูข้อมูลรายเดือน
        </span>
      </div>
    </div>
  );
};
