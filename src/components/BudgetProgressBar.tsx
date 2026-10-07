import React from 'react';
import { formatCurrency } from '../lib/constants';
import { Target, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  budget: number;
  spent: number;
  onOpenBudgetModal: () => void;
}

export const BudgetProgressBar: React.FC<Props> = ({ budget, spent, onOpenBudgetModal }) => {
  if (budget <= 0) {
    return (
      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Target className="w-4 h-4 text-slate-400" />
          <span>ยังไม่ได้ตั้งค่างบประมาณรายจ่ายประจำเดือน</span>
        </div>
        <button
          onClick={onOpenBudgetModal}
          className="text-xs font-medium text-slate-900 hover:text-slate-700 underline underline-offset-2"
        >
          ตั้งงบประมาณ
        </button>
      </div>
    );
  }

  const percent = Math.min((spent / budget) * 100, 100);
  const remaining = budget - spent;
  const isOver = remaining < 0;
  const isWarning = !isOver && percent >= 80;

  let barColor = 'bg-emerald-500';
  if (isOver) barColor = 'bg-rose-500';
  else if (isWarning) barColor = 'bg-amber-500';

  return (
    <div className="p-3.5 bg-white border border-slate-200 rounded-lg">
      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1.5 font-medium text-slate-700">
          <Target className="w-3.5 h-3.5 text-slate-500" />
          <span>เป้าหมายงบประมาณรายจ่ายเดือนนี้</span>
        </div>
        <div className="flex items-center gap-2">
          {isOver ? (
            <span className="flex items-center gap-1 text-rose-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              เกินงบ ฿{formatCurrency(Math.abs(remaining))}
            </span>
          ) : isWarning ? (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              ใกล้เต็มงบ (เหลือ ฿{formatCurrency(remaining)})
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              คงเหลืองบ ฿{formatCurrency(remaining)}
            </span>
          )}
          <button
            onClick={onOpenBudgetModal}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline ml-1"
          >
            แก้ไข
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-1.5">
        <div
          className={`h-full transition-all duration-300 ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
        <span>ใช้ไป ฿{formatCurrency(spent)} ({((spent / budget) * 100).toFixed(0)}%)</span>
        <span>เพดานงบ ฿{formatCurrency(budget)}</span>
      </div>
    </div>
  );
};
