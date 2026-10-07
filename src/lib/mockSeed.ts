import type { Transaction } from './firebase';

export function generateSampleTransactions(userId: string): Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Days in current month
  const d = (day: number) => `${year}-${month}-${String(day).padStart(2, '0')}`;

  return [
    {
      userId,
      type: 'income',
      amount: 45000,
      category: 'เงินเดือนประจำ',
      title: 'เงินเดือนประจำงวด',
      date: d(1),
      paymentMethod: 'transfer',
      note: 'โอนเข้าบัญชีธนาคารกสิกรไทย',
    },
    {
      userId,
      type: 'expense',
      amount: 8500,
      category: 'ที่อยู่อาศัย/ค่าเช่า',
      title: 'ค่าเช่าคอนโดมิเนียม',
      date: d(1),
      paymentMethod: 'transfer',
      note: 'รวมค่าส่วนกลางรายเดือน',
    },
    {
      userId,
      type: 'expense',
      amount: 1450,
      category: 'บิลและสาธารณูปโภค',
      title: 'ค่าไฟและค่าน้ำประปา',
      date: d(2),
      paymentMethod: 'transfer',
      note: 'สแกน QR Code ผ่านแอป',
    },
    {
      userId,
      type: 'expense',
      amount: 120,
      category: 'อาหารและเครื่องดื่ม',
      title: 'ข้าวแกงปักษ์ใต้ + กาแฟโบราณ',
      date: d(2),
      paymentMethod: 'cash',
      note: 'มื้อเช้า',
    },
    {
      userId,
      type: 'expense',
      amount: 250,
      category: 'อาหารและเครื่องดื่ม',
      title: 'ก๋วยเตี๋ยวเรือ + ชานมไข่มุก',
      date: d(3),
      paymentMethod: 'transfer',
      note: 'มื้อกลางวันกับเพื่อนร่วมงาน',
    },
    {
      userId,
      type: 'expense',
      amount: 1200,
      category: 'เดินทาง/ค่าน้ำมัน',
      title: 'เติมน้ำมันรถยนต์ E20 เต็มถัง',
      date: d(4),
      paymentMethod: 'credit_card',
      note: 'ปั๊ม ปตท.',
    },
    {
      userId,
      type: 'expense',
      amount: 690,
      category: 'บิลและสาธารณูปโภค',
      title: 'ค่าอินเทอร์เน็ตไฟเบอร์',
      date: d(5),
      paymentMethod: 'transfer',
    },
    {
      userId,
      type: 'income',
      amount: 7500,
      category: 'ธุรกิจและฟรีแลนซ์',
      title: 'รับงานออกแบบกราฟิกหน้าเว็บ',
      date: d(5),
      paymentMethod: 'transfer',
      note: 'ลูกค้าตรวจรับงานเรียบร้อย',
    },
    {
      userId,
      type: 'expense',
      amount: 1650,
      category: 'ช้อปปิ้งและของใช้',
      title: 'ซื้อของใช้ในบ้านและวัตถุดิบทำอาหาร',
      date: d(6),
      paymentMethod: 'credit_card',
      note: 'Tops Supermarket',
    },
    {
      userId,
      type: 'expense',
      amount: 320,
      category: 'บันเทิงและการพักผ่อน',
      title: 'ตั๋วชมภาพยนตร์ + ป๊อปคอร์น',
      date: d(7),
      paymentMethod: 'credit_card',
    },
  ];
}
