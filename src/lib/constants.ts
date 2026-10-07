export interface CategoryMeta {
  id: string;
  name: string;
  color: string;
  iconName: string;
}

export const EXPENSE_CATEGORIES: CategoryMeta[] = [
  { id: 'food', name: 'อาหารและเครื่องดื่ม', color: '#f97316', iconName: 'Utensils' },
  { id: 'transport', name: 'เดินทาง/ค่าน้ำมัน', color: '#0284c7', iconName: 'Car' },
  { id: 'housing', name: 'ที่อยู่อาศัย/ค่าเช่า', color: '#8b5cf6', iconName: 'Home' },
  { id: 'bills', name: 'บิลและสาธารณูปโภค', color: '#eab308', iconName: 'Zap' },
  { id: 'shopping', name: 'ช้อปปิ้งและของใช้', color: '#ec4899', iconName: 'ShoppingBag' },
  { id: 'entertainment', name: 'บันเทิงและการพักผ่อน', color: '#06b6d4', iconName: 'Gamepad2' },
  { id: 'health', name: 'สุขภาพและยารักษา', color: '#10b981', iconName: 'HeartPulse' },
  { id: 'education', name: 'การศึกษาและหนังสือ', color: '#6366f1', iconName: 'GraduationCap' },
  { id: 'family', name: 'ครอบครัวและการกุศล', color: '#f43f5e', iconName: 'Users' },
  { id: 'other_expense', name: 'อื่นๆ', color: '#64748b', iconName: 'MoreHorizontal' },
];

export const INCOME_CATEGORIES: CategoryMeta[] = [
  { id: 'salary', name: 'เงินเดือนประจำ', color: '#10b981', iconName: 'Briefcase' },
  { id: 'freelance', name: 'ธุรกิจและฟรีแลนซ์', color: '#06b6d4', iconName: 'Laptop' },
  { id: 'bonus', name: 'โบนัสและเบี้ยขยัน', color: '#f59e0b', iconName: 'Award' },
  { id: 'investment', name: 'ผลตอบแทนการลงทุน', color: '#8b5cf6', iconName: 'TrendingUp' },
  { id: 'side_income', name: 'ขายของ/รายได้เสริม', color: '#3b82f6', iconName: 'Store' },
  { id: 'gift', name: 'ของขวัญและเงินช่วยเหลือ', color: '#ec4899', iconName: 'Gift' },
  { id: 'other_income', name: 'รายรับอื่นๆ', color: '#64748b', iconName: 'PlusCircle' },
];

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'เงินสด', icon: 'Banknote' },
  { id: 'transfer', label: 'โอนเงิน / สแกนจ่าย', icon: 'Smartphone' },
  { id: 'credit_card', label: 'บัตรเครดิต', icon: 'CreditCard' },
  { id: 'other', label: 'อื่นๆ', icon: 'Wallet' },
];

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export function formatThaiDate(dateStr: string): string {
  if (!dateStr) return '';
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);
  const buddhistYear = year + 543;
  return `${day} ${THAI_MONTHS_SHORT[month] || ''} ${buddhistYear}`;
}

export function formatThaiMonth(monthStr: string): string {
  if (!monthStr) return '';
  const [yearStr, monthStrNum] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStrNum, 10) - 1;
  const buddhistYear = year + 543;
  return `${THAI_MONTHS[month] || ''} ${buddhistYear}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('th-TH', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
