import React, { useState, useEffect } from 'react';
import { X, Target, Check } from 'lucide-react';
import { formatCurrency } from '../lib/constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentBudget: number;
  monthStr: string;
  onSave: (amount: number) => Promise<void>;
}

export const BudgetModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentBudget,
  monthStr,
  onSave,
}) => {
  const [budgetVal, setBudgetVal] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBudgetVal(currentBudget > 0 ? currentBudget.toString() : '');
    setError(null);
  }, [currentBudget, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(budgetVal);
    if (isNaN(parsed) || parsed < 0) {
      setError('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave(parsed);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกงบประมาณ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="relative w-full max-w-sm bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900">
              ตั้งค่างบประมาณรายจ่าย
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-2.5 text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              งบประมาณรายจ่ายสูงสุดสำหรับเดือนนี้ (บาท)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono">
                ฿
              </span>
              <input
                type="number"
                step="100"
                min="0"
                required
                value={budgetVal}
                onChange={(e) => setBudgetVal(e.target.value)}
                placeholder="เช่น 25000"
                className="w-full pl-8 pr-3 py-2 text-base font-mono tabular-nums text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5">
              ระบบจะช่วยแจ้งเตือนความคืบหน้าเมื่อค่าใช้จ่ายใกล้ถึงเพดานงบประมาณ
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>บันทึกงบประมาณ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
