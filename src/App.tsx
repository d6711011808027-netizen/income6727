/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  handleFirestoreError,
  OperationType,
  type Transaction,
  type MonthlyBudget,
} from './lib/firebase';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  THAI_MONTHS,
  formatCurrency,
  formatThaiDate,
  formatThaiMonth,
} from './lib/constants';
import { generateSampleTransactions } from './lib/mockSeed';
import { CategoryIcon } from './components/CategoryIcon';
import { CategoryDonutChart } from './components/CategoryDonutChart';
import { DailyActivityChart } from './components/DailyActivityChart';
import { MonthlyComparisonChart, type MonthSummaryData } from './components/MonthlyComparisonChart';
import { BudgetProgressBar } from './components/BudgetProgressBar';
import { TransactionModal } from './components/TransactionModal';
import { BudgetModal } from './components/BudgetModal';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
  Trash2,
  Edit2,
  LogIn,
  LogOut,
  Calendar,
  Sparkles,
  Database,
  ArrowUpDown,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'history'>('overview');

  // Selected Month (Format: YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  // Monthly Budget State
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, number>>({});

  // Modals
  const [isTxModalOpen, setIsTxModalOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  // Notification Banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Sync Transactions from Firestore
  useEffect(() => {
    if (!currentUser) {
      // Check local storage for offline/guest mode
      const saved = localStorage.getItem('local_transactions');
      if (saved) {
        try {
          setTransactions(JSON.parse(saved));
        } catch {
          setTransactions([]);
        }
      } else {
        // Pre-seed initial sample data for first-time visitors
        const samples = generateSampleTransactions('local_user').map((t, idx) => ({
          ...t,
          id: `local_${idx}_${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));
        setTransactions(samples);
        localStorage.setItem('local_transactions', JSON.stringify(samples));
      }

      const savedBudgets = localStorage.getItem('local_budgets');
      if (savedBudgets) {
        try {
          setMonthlyBudgets(JSON.parse(savedBudgets));
        } catch {
          setMonthlyBudgets({});
        }
      }
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const q = query(
      collection(db, 'transactions'),
      where('userId', '==', currentUser.uid)
    );

    const unsubTx = onSnapshot(
      q,
      (snapshot) => {
        const txList: Transaction[] = [];
        snapshot.forEach((docSnap) => {
          txList.push({ id: docSnap.id, ...docSnap.data() } as Transaction);
        });
        setTransactions(txList);
        setIsLoadingData(false);
      },
      (error) => {
        setIsLoadingData(false);
        handleFirestoreError(error, OperationType.LIST, 'transactions');
      }
    );

    // Sync Budgets
    const budgetQ = query(
      collection(db, 'budgets'),
      where('userId', '==', currentUser.uid)
    );

    const unsubBudget = onSnapshot(
      budgetQ,
      (snapshot) => {
        const bMap: Record<string, number> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MonthlyBudget;
          bMap[data.month] = data.targetAmount;
        });
        setMonthlyBudgets(bMap);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'budgets');
      }
    );

    return () => {
      unsubTx();
      unsubBudget();
    };
  }, [currentUser]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      showToast(`เข้าสู่ระบบสำเร็จ: ${result.user.displayName || result.user.email}`);

      // If user had local data, offer to migrate
      const localData = localStorage.getItem('local_transactions');
      if (localData) {
        try {
          const parsed: Transaction[] = JSON.parse(localData);
          if (parsed.length > 0 && parsed[0].userId === 'local_user') {
            for (const item of parsed) {
              const newDocId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              await setDoc(doc(db, 'transactions', newDocId), {
                userId: result.user.uid,
                type: item.type,
                amount: item.amount,
                category: item.category,
                title: item.title,
                date: item.date,
                paymentMethod: item.paymentMethod || 'transfer',
                note: item.note || '',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
            localStorage.removeItem('local_transactions');
            showToast('ย้ายข้อมูลบันทึกเข้าสู่ระบบ Firebase เรียบร้อย');
          }
        } catch (e) {
          console.error('Error syncing local items:', e);
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError('ไม่สามารถเข้าสู่ระบบด้วย Google ได้ในขณะนี้');
    }
  };

  // Handle Google Sign Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('ออกจากระบบเรียบร้อย');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  // Add or Edit Transaction
  const handleSaveTransaction = async (
    data: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
  ) => {
    if (currentUser) {
      try {
        if (editingTx) {
          // Update
          const targetDoc = doc(db, 'transactions', editingTx.id);
          await setDoc(
            targetDoc,
            {
              userId: currentUser.uid,
              type: data.type,
              amount: data.amount,
              category: data.category,
              title: data.title,
              date: data.date,
              paymentMethod: data.paymentMethod || 'transfer',
              note: data.note || '',
              createdAt: editingTx.createdAt,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          showToast('แก้ไขรายการสำเร็จ');
        } else {
          // Create
          const docId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await setDoc(doc(db, 'transactions', docId), {
            userId: currentUser.uid,
            type: data.type,
            amount: data.amount,
            category: data.category,
            title: data.title,
            date: data.date,
            paymentMethod: data.paymentMethod || 'transfer',
            note: data.note || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          showToast('บันทึกรายการเรียบร้อย');
        }
      } catch (err) {
        handleFirestoreError(err, editingTx ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
      }
    } else {
      // Local Mode
      let updated: Transaction[];
      if (editingTx) {
        updated = transactions.map((t) =>
          t.id === editingTx.id
            ? { ...t, ...data, updatedAt: new Date().toISOString() }
            : t
        );
        showToast('แก้ไขรายการสำเร็จ (โหมดจำลอง)');
      } else {
        const newTx: Transaction = {
          ...data,
          id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: 'local_user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        updated = [newTx, ...transactions];
        showToast('บันทึกรายการเรียบร้อย (โหมดจำลอง)');
      }
      setTransactions(updated);
      localStorage.setItem('local_transactions', JSON.stringify(updated));
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    if (currentUser) {
      try {
        await deleteDoc(doc(db, 'transactions', id));
        showToast('ลบรายการเรียบร้อย');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
      }
    } else {
      const updated = transactions.filter((t) => t.id !== id);
      setTransactions(updated);
      localStorage.setItem('local_transactions', JSON.stringify(updated));
      showToast('ลบรายการเรียบร้อย');
    }
    setDeletingTxId(null);
  };

  // Save Monthly Budget
  const handleSaveBudget = async (amount: number) => {
    if (currentUser) {
      try {
        const budgetDocId = `b_${currentUser.uid}_${selectedMonth}`;
        await setDoc(
          doc(db, 'budgets', budgetDocId),
          {
            userId: currentUser.uid,
            month: selectedMonth,
            category: 'all',
            targetAmount: amount,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        showToast('บันทึกงบประมาณสำเร็จ');
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, 'budgets');
      }
    } else {
      const updated = { ...monthlyBudgets, [selectedMonth]: amount };
      setMonthlyBudgets(updated);
      localStorage.setItem('local_budgets', JSON.stringify(updated));
      showToast('บันทึกงบประมาณสำเร็จ (โหมดจำลอง)');
    }
  };

  // Seed sample transactions
  const handleSeedData = async () => {
    const samples = generateSampleTransactions(currentUser?.uid || 'local_user');
    if (currentUser) {
      try {
        for (const item of samples) {
          const docId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          await setDoc(doc(db, 'transactions', docId), {
            ...item,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        showToast('นำเข้าชุดข้อมูลจำลองเข้าสู่ Firebase สำเร็จ');
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, 'transactions');
      }
    } else {
      const formatted = samples.map((t, idx) => ({
        ...t,
        id: `local_${Date.now()}_${idx}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      const combined = [...formatted, ...transactions];
      setTransactions(combined);
      localStorage.setItem('local_transactions', JSON.stringify(combined));
      showToast('นำเข้าชุดข้อมูลจำลองเรียบร้อย');
    }
  };

  // Month Navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let prevY = y;
    let prevM = m - 1;
    if (prevM < 1) {
      prevM = 12;
      prevY -= 1;
    }
    setSelectedMonth(`${prevY}-${String(prevM).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let nextY = y;
    let nextM = m + 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    setSelectedMonth(`${nextY}-${String(nextM).padStart(2, '0')}`);
  };

  // Month Filtered Transactions
  const monthTransactions = useMemo(() => {
    return transactions.filter((t) => t.date && t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Monthly Metrics Calculation
  const monthlyMetrics = useMemo(() => {
    let income = 0;
    let expense = 0;
    let incomeCount = 0;
    let expenseCount = 0;

    monthTransactions.forEach((t) => {
      if (t.type === 'income') {
        income += t.amount;
        incomeCount++;
      } else {
        expense += t.amount;
        expenseCount++;
      }
    });

    const net = income - expense;
    const savingsRate = income > 0 ? (net / income) * 100 : 0;

    return {
      income,
      expense,
      net,
      incomeCount,
      expenseCount,
      savingsRate,
    };
  }, [monthTransactions]);

  // Category Breakdown for Selected Month
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number; color: string }> = {};

    monthTransactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        if (!map[t.category]) {
          const meta = EXPENSE_CATEGORIES.find((c) => c.name === t.category);
          map[t.category] = {
            amount: 0,
            count: 0,
            color: meta ? meta.color : '#94a3b8',
          };
        }
        map[t.category].amount += t.amount;
        map[t.category].count += 1;
      });

    return Object.entries(map)
      .map(([category, info]) => ({
        category,
        amount: info.amount,
        count: info.count,
        color: info.color,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions]);

  // Income Category Breakdown
  const incomeCategoryBreakdown = useMemo(() => {
    const map: Record<string, { amount: number; count: number; color: string }> = {};

    monthTransactions
      .filter((t) => t.type === 'income')
      .forEach((t) => {
        if (!map[t.category]) {
          const meta = INCOME_CATEGORIES.find((c) => c.name === t.category);
          map[t.category] = {
            amount: 0,
            count: 0,
            color: meta ? meta.color : '#10b981',
          };
        }
        map[t.category].amount += t.amount;
        map[t.category].count += 1;
      });

    return Object.entries(map)
      .map(([category, info]) => ({
        category,
        amount: info.amount,
        count: info.count,
        color: info.color,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthTransactions]);

  // Daily Activity Data
  const dailyActivityData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return {
        day,
        dateStr,
        income: 0,
        expense: 0,
        net: 0,
      };
    });

    monthTransactions.forEach((t) => {
      const dayNum = parseInt(t.date.split('-')[2], 10);
      if (dayNum >= 1 && dayNum <= daysInMonth) {
        if (t.type === 'income') {
          days[dayNum - 1].income += t.amount;
        } else {
          days[dayNum - 1].expense += t.amount;
        }
      }
    });

    days.forEach((d) => {
      d.net = d.income - d.expense;
    });

    return days;
  }, [selectedMonth, monthTransactions]);

  // Historical 6-Months Summary
  const monthlyHistoryData = useMemo<MonthSummaryData[]>(() => {
    const [curYear, curMonth] = selectedMonth.split('-').map(Number);
    const result: MonthSummaryData[] = [];

    // Collect 6 months ending in current selected month
    for (let i = 5; i >= 0; i--) {
      let targetM = curMonth - i;
      let targetY = curYear;
      while (targetM <= 0) {
        targetM += 12;
        targetY -= 1;
      }
      const mStr = `${targetY}-${String(targetM).padStart(2, '0')}`;

      let income = 0;
      let expense = 0;
      transactions.forEach((t) => {
        if (t.date && t.date.startsWith(mStr)) {
          if (t.type === 'income') income += t.amount;
          else expense += t.amount;
        }
      });

      result.push({
        month: mStr,
        income,
        expense,
        net: income - expense,
      });
    }

    return result;
  }, [transactions, selectedMonth]);

  // Filtered & Sorted Transactions for Ledger/Table
  const filteredTransactions = useMemo(() => {
    return monthTransactions
      .filter((t) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = t.title.toLowerCase().includes(q);
          const matchCat = t.category.toLowerCase().includes(q);
          const matchNote = t.note ? t.note.toLowerCase().includes(q) : false;
          if (!matchTitle && !matchCat && !matchNote) return false;
        }

        // Type filter
        if (filterType !== 'all' && t.type !== filterType) return false;

        // Category filter
        if (filterCategory !== 'all' && t.category !== filterCategory) return false;

        // Payment method filter
        if (filterPayment !== 'all' && (t.paymentMethod || 'transfer') !== filterPayment) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'date_desc') return b.date.localeCompare(a.date);
        if (sortOrder === 'date_asc') return a.date.localeCompare(b.date);
        if (sortOrder === 'amount_desc') return b.amount - a.amount;
        if (sortOrder === 'amount_asc') return a.amount - b.amount;
        return 0;
      });
  }, [monthTransactions, searchQuery, filterType, filterCategory, filterPayment, sortOrder]);

  // Export CSV
  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับดาวน์โหลด');
      return;
    }

    const headers = ['วันที่', 'ประเภท', 'หมวดหมู่', 'ชื่อรายการ', 'จำนวนเงิน', 'ช่องทางชำระ', 'หมายเหตุ'];
    const rows = filteredTransactions.map((t) => [
      t.date,
      t.type === 'income' ? 'รายรับ' : 'รายจ่าย',
      t.category,
      `"${t.title.replace(/"/g, '""')}"`,
      t.amount,
      PAYMENT_METHODS.find((p) => p.id === t.paymentMethod)?.label || 'อื่นๆ',
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `financial_report_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ดาวน์โหลดไฟล์ CSV เรียบร้อยแล้ว');
  };

  // Current month's budget
  const currentMonthBudget = monthlyBudgets[selectedMonth] || 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs font-medium rounded-lg shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-tight shadow-xs">
              ฿
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight block">
                Income & Expense Tracker
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:block">
                ระบบจัดการรายรับรายจ่าย · โปรเจกต์ income6727
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links / View Tabs */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ภาพรวมรายเดือน
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'analytics'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              กราฟวิเคราะห์ข้อมูล
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'history'
                  ? 'bg-slate-100 text-slate-900 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              บันทึกรายการ
            </button>
          </nav>

          {/* Zone 3: Actions (Google Auth + New Transaction) */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-xs text-slate-700 bg-slate-100 py-1 px-2.5 rounded-md">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="max-w-[100px] truncate hidden md:inline">
                    {currentUser.displayName || currentUser.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    title="ออกจากระบบ"
                    className="text-slate-400 hover:text-rose-600 ml-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                title="เข้าสู่ระบบเพื่อซิงค์ข้อมูลกับ Firebase income6727"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">เชื่อมต่อ Firebase</span>
              </button>
            )}

            <button
              onClick={() => {
                setEditingTx(null);
                setIsTxModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors shadow-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>บันทึกรายการ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Firebase Storage Indicator Banner if not signed in */}
        {!currentUser && (
          <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-900">
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                กำลังทำงานในโหมดตัวอย่าง (Offline / Local Storage) · คุณสามารถทดลองใช้งาน หรือเข้าสู่ระบบเพื่อบันทึกข้อมูลลง Firebase ในโปรเจกต์ <strong>income6727</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleSeedData}
                className="px-2.5 py-1 text-[11px] font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded transition-colors"
              >
                ใส่ข้อมูลจำลอง
              </button>
              <button
                onClick={handleGoogleLogin}
                className="px-3 py-1 text-[11px] font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors"
              >
                เข้าสู่ระบบ Google
              </button>
            </div>
          </div>
        )}

        {/* Month Selector Bar */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="เดือนก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <h2 className="text-lg font-bold text-slate-900">
                {formatThaiMonth(selectedMonth)}
              </h2>
            </div>

            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
              title="เดือนถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {selectedMonth !== currentMonthStr && (
              <button
                onClick={() => setSelectedMonth(currentMonthStr)}
                className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2 ml-1"
              >
                กลับไปเดือนปัจจุบัน
              </button>
            )}
          </div>

          {/* Quick Monthly Summary Kicker */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>
              จำนวน {monthTransactions.length} รายการ
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              รายรับ {monthlyMetrics.incomeCount} รายการ
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-700">
              รายจ่าย {monthlyMetrics.expenseCount} รายการ
            </span>
          </div>
        </section>

        {/* 4 Key Financial Metrics Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Total Income */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">รายรับรวม (Total Income)</span>
              <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mb-1">
              ฿{formatCurrency(monthlyMetrics.income)}
            </div>
            <div className="text-[11px] text-slate-400">
              {monthlyMetrics.incomeCount > 0 ? `${monthlyMetrics.incomeCount} รายการในเดือนนี้` : 'ยังไม่มีรายรับในเดือนนี้'}
            </div>
          </div>

          {/* 2. Total Expense */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">รายจ่ายรวม (Total Expense)</span>
              <div className="w-7 h-7 rounded-md bg-rose-50 text-rose-600 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mb-1">
              ฿{formatCurrency(monthlyMetrics.expense)}
            </div>
            <div className="text-[11px] text-slate-400">
              {monthlyMetrics.expenseCount > 0 ? `${monthlyMetrics.expenseCount} รายการในเดือนนี้` : 'ยังไม่มีรายจ่ายในเดือนนี้'}
            </div>
          </div>

          {/* 3. Net Balance */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">คงเหลือสุทธิ (Net Savings)</span>
              <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold font-mono tabular-nums mb-1 ${
              monthlyMetrics.net >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {monthlyMetrics.net >= 0 ? '+' : ''}฿{formatCurrency(monthlyMetrics.net)}
            </div>
            <div className="text-[11px] text-slate-400">
              {monthlyMetrics.net >= 0 ? 'กระแสเงินสดเป็นบวก' : 'รายจ่ายเกินรายรับในเดือนนี้'}
            </div>
          </div>

          {/* 4. Savings Rate */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500">อัตราการออม (Savings Rate)</span>
              <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PiggyBank className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mb-1">
              {monthlyMetrics.income > 0 ? `${monthlyMetrics.savingsRate.toFixed(1)}%` : '0.0%'}
            </div>
            <div className="text-[11px] text-slate-400">
              เป้าหมายที่แนะนำ: 20% ขึ้นไป
            </div>
          </div>
        </section>

        {/* Budget Tracker Progress */}
        <BudgetProgressBar
          budget={currentMonthBudget}
          spent={monthlyMetrics.expense}
          onOpenBudgetModal={() => setIsBudgetModalOpen(true)}
        />

        {/* Tab Content 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Split layout: Donut Chart + Daily Bar Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Category Expense Donut (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                      สัดส่วนรายจ่ายตามหมวดหมู่
                    </h3>
                    <span className="text-xs text-slate-400">
                      {categoryBreakdown.length} หมวดหมู่
                    </span>
                  </div>
                  <CategoryDonutChart
                    data={categoryBreakdown}
                    totalAmount={monthlyMetrics.expense}
                    title="รายจ่ายรวม"
                  />
                </div>
              </div>

              {/* Daily Activity Chart (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-slate-900">
                      แนวโน้มรายรับ-รายจ่ายรายวัน
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                        <span>รายรับ</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded bg-rose-500" />
                        <span>รายจ่าย</span>
                      </div>
                    </div>
                  </div>
                  <DailyActivityChart
                    data={dailyActivityData}
                    monthStr={selectedMonth}
                  />
                </div>
              </div>
            </div>

            {/* Recent 5 Transactions in Selected Month */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  รายการล่าสุดในเดือนนี้
                </h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  ดูรายการทั้งหมด ({monthTransactions.length}) &rarr;
                </button>
              </div>

              {monthTransactions.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <p className="text-sm mb-3">ยังไม่มีการบันทึกรายการในเดือนนี้</p>
                  <button
                    onClick={() => {
                      setEditingTx(null);
                      setIsTxModalOpen(true);
                    }}
                    className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    + บันทึกรายการแรก
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {monthTransactions.slice(0, 5).map((t) => {
                    const isIncome = t.type === 'income';
                    return (
                      <div
                        key={t.id}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/60 px-2 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-600'
                                : 'bg-rose-50 text-rose-600'
                            }`}
                          >
                            <CategoryIcon
                              name={
                                (isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).find(
                                  (c) => c.name === t.category
                                )?.iconName || 'Wallet'
                              }
                              className="w-4 h-4"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-slate-900 truncate">
                              {t.title}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                              <span>{t.category}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatThaiDate(t.date)}</span>
                              {t.paymentMethod && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span>
                                    {PAYMENT_METHODS.find((p) => p.id === t.paymentMethod)?.label}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-4">
                          <div
                            className={`text-sm font-mono tabular-nums font-semibold ${
                              isIncome ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {isIncome ? '+' : '-'}฿{formatCurrency(t.amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content 2: Comprehensive Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* 6-Month Comparison */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    เปรียบเทียบแนวโน้มการเงินย้อนหลัง 6 เดือน
                  </h3>
                  <p className="text-xs text-slate-500">
                    วิเคราะห์กระแสเงินสดและสัดส่วนรายรับเทียบกับรายจ่ายในแต่ละเดือน
                  </p>
                </div>
              </div>
              <MonthlyComparisonChart
                data={monthlyHistoryData}
                selectedMonth={selectedMonth}
                onSelectMonth={(m) => setSelectedMonth(m)}
              />
            </div>

            {/* Dual Donut: Expense vs Income Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Expense Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  วิเคราะห์หมวดหมู่รายจ่าย (Expenses)
                </h3>
                <CategoryDonutChart
                  data={categoryBreakdown}
                  totalAmount={monthlyMetrics.expense}
                  title="รายจ่ายรวม"
                />
              </div>

              {/* Income Breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">
                  วิเคราะห์หมวดหมู่รายรับ (Income Streams)
                </h3>
                <CategoryDonutChart
                  data={incomeCategoryBreakdown}
                  totalAmount={monthlyMetrics.income}
                  title="รายรับรวม"
                />
              </div>
            </div>

            {/* Payment Channel Breakdown */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">
                สัดส่วนการชำระเงินตามช่องทาง
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                {PAYMENT_METHODS.map((pm) => {
                  const channelTotal = monthTransactions
                    .filter((t) => (t.paymentMethod || 'transfer') === pm.id)
                    .reduce((sum, t) => sum + t.amount, 0);
                  const channelCount = monthTransactions.filter(
                    (t) => (t.paymentMethod || 'transfer') === pm.id
                  ).length;

                  return (
                    <div
                      key={pm.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>{pm.label}</span>
                      </div>
                      <div className="text-base font-semibold font-mono tabular-nums text-slate-900">
                        ฿{formatCurrency(channelTotal)}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {channelCount} รายการ
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab Content 3: Full Transactions History / Ledger */}
        {activeTab === 'history' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Filter Controls Header */}
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ค้นหาตามชื่อรายการ, หมวดหมู่, หรือหมายเหตุ..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                {/* Right utility buttons: Export CSV + Add */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>ส่งออก CSV</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingTx(null);
                      setIsTxModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มรายการ</span>
                  </button>
                </div>
              </div>

              {/* Filter Tabs & Dropdowns */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Type Segmented Control */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      filterType === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({monthTransactions.length})
                  </button>
                  <button
                    onClick={() => setFilterType('income')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      filterType === 'income'
                        ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    รายรับ ({monthlyMetrics.incomeCount})
                  </button>
                  <button
                    onClick={() => setFilterType('expense')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      filterType === 'expense'
                        ? 'bg-white text-rose-700 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    รายจ่าย ({monthlyMetrics.expenseCount})
                  </button>
                </div>

                {/* Category Filter */}
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  {[...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Payment Method Filter */}
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
                >
                  <option value="all">ทุกช่องทางชำระเงิน</option>
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.label}
                    </option>
                  ))}
                </select>

                {/* Sort Order */}
                <div className="ml-auto flex items-center gap-1.5 text-slate-500">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-700"
                  >
                    <option value="date_desc">วันที่: ใหม่ล่าสุด</option>
                    <option value="date_asc">วันที่: เก่าที่สุด</option>
                    <option value="amount_desc">จำนวนเงิน: มากไปน้อย</option>
                    <option value="amount_asc">จำนวนเงิน: น้อยไปมาก</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Transaction Data Table */}
            {filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="text-sm">ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterType('all');
                    setFilterCategory('all');
                    setFilterPayment('all');
                  }}
                  className="text-xs text-slate-700 underline mt-2"
                >
                  ล้างตัวกรอง
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                      <th className="py-2.5 px-4">วันที่</th>
                      <th className="py-2.5 px-4">รายการ</th>
                      <th className="py-2.5 px-4">หมวดหมู่</th>
                      <th className="py-2.5 px-4">ช่องทางชำระ</th>
                      <th className="py-2.5 px-4 text-right">จำนวนเงิน</th>
                      <th className="py-2.5 px-4 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTransactions.map((tx) => {
                      const isIncome = tx.type === 'income';
                      const pm = PAYMENT_METHODS.find((p) => p.id === tx.paymentMethod);

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Date */}
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            {formatThaiDate(tx.date)}
                          </td>

                          {/* Title & Note */}
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 max-w-xs truncate">
                              {tx.title}
                            </div>
                            {tx.note && (
                              <div className="text-[11px] text-slate-400 truncate max-w-xs">
                                {tx.note}
                              </div>
                            )}
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            <span className="flex items-center gap-1.5">
                              <CategoryIcon
                                name={
                                  (isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).find(
                                    (c) => c.name === tx.category
                                  )?.iconName || 'Wallet'
                                }
                                className="w-3.5 h-3.5 text-slate-400"
                              />
                              <span>{tx.category}</span>
                            </span>
                          </td>

                          {/* Payment Method */}
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                            {pm?.label || 'อื่นๆ'}
                          </td>

                          {/* Amount */}
                          <td
                            className={`py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                              isIncome ? 'text-emerald-600' : 'text-slate-900'
                            }`}
                          >
                            {isIncome ? '+' : '-'}฿{formatCurrency(tx.amount)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingTx(tx);
                                  setIsTxModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-200 transition-colors"
                                title="แก้ไข"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setDeletingTxId(tx.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            <span>Income & Expense Tracker · ระบบจัดการรายรับรายจ่ายรายเดือน</span>
          </div>
          <div className="flex items-center gap-4">
            <span>ฐานข้อมูล Firestore: income6727</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">พุทธศักราช {new Date().getFullYear() + 543}</span>
          </div>
        </div>
      </footer>

      {/* Transaction Modal (Add / Edit) */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleSaveTransaction}
        initialData={editingTx}
        defaultDate={`${selectedMonth}-01`}
      />

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        currentBudget={currentMonthBudget}
        monthStr={selectedMonth}
        onSave={handleSaveBudget}
      />

      {/* Delete Confirmation Modal */}
      {deletingTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 max-w-xs w-full text-center">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 mb-1">
              ยืนยันการลบรายการ?
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              รายการนี้จะถูกลบออกจากฐานข้อมูลและไม่สามารถกู้คืนได้
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDeletingTxId(null)}
                className="flex-1 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => handleDeleteTransaction(deletingTxId)}
                className="flex-1 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors font-medium"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
