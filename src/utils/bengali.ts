const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

const BENGALI_MONTHS = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

/**
 * Converts English number to Bengali digits string
 */
export function toBengaliNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '০';
  const str = String(val);
  return str.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[parseInt(digit, 10)]);
}

/**
 * Formats a number as Bengali currency with Taka symbol (৳ ১,৫০০)
 */
export function formatBengaliCurrency(amount: number | null | undefined): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const formattedWithCommas = num.toLocaleString('en-IN');
  return `৳ ${toBengaliNumber(formattedWithCommas)}`;
}

/**
 * Formats YYYY-MM-DD to "১৯ অক্টোবর, ২০২৬"
 */
export function formatBengaliDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const bengaliDay = toBengaliNumber(day);
    const bengaliMonth = BENGALI_MONTHS[monthIdx] || parts[1];
    const bengaliYear = toBengaliNumber(year);

    return `${bengaliDay} ${bengaliMonth}, ${bengaliYear}`;
  } catch {
    return dateStr;
  }
}

/**
 * Returns today's date formatted as YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns current month string in YYYY-MM format
 */
export function getCurrentMonthString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Formats YYYY-MM to "অক্টোবর ২০২৬"
 */
export function formatBengaliMonthYear(monthStr: string): string {
  if (!monthStr || !monthStr.includes('-')) return monthStr;
  const [year, month] = monthStr.split('-');
  const monthIdx = parseInt(month, 10) - 1;
  const monthName = BENGALI_MONTHS[monthIdx] || month;
  return `${monthName} ${toBengaliNumber(year)}`;
}

/**
 * Generates past 12 months for selector
 */
export function getPastMonthsOptions(count = 12): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const date = new Date();

  for (let i = 0; i < count; i++) {
    const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const val = `${yyyy}-${mm}`;
    const label = formatBengaliMonthYear(val);
    options.push({ value: val, label });
  }

  return options;
}

/**
 * Checks if a task is overdue
 */
export function checkIsOverdue(dueDate: string, status: string): { isOverdue: boolean; daysOverdue: number } {
  if (status === 'completed' || !dueDate) {
    return { isOverdue: false, daysOverdue: 0 };
  }
  const today = getTodayDateString();
  if (dueDate < today) {
    const dueTime = new Date(dueDate).getTime();
    const todayTime = new Date(today).getTime();
    const diffDays = Math.ceil((todayTime - dueTime) / (1000 * 60 * 60 * 24));
    return { isOverdue: true, daysOverdue: diffDays };
  }
  return { isOverdue: false, daysOverdue: 0 };
}

/**
 * Triggers CSV download with UTF-8 BOM for proper Bengali text rendering in Excel
 */
export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const processCell = (cell: string | number) => {
    let str = cell === null || cell === undefined ? '' : String(cell);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      str = `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(processCell).join(','),
    ...rows.map(row => row.map(processCell).join(','))
  ].join('\r\n');

  // \uFEFF is UTF-8 Byte Order Mark (BOM)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export type ReportPeriod = '1_month' | '2_months' | '3_months' | '5_months' | '1_year' | 'all' | 'custom';

/**
 * Returns date range (startDate, endDate) and Bengali label for standard report periods
 */
export function getPeriodDateRange(
  period: ReportPeriod,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string; label: string } {
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];

  if (period === 'all') {
    return { startDate: '1970-01-01', endDate, label: 'সব সময়ের কাজের রিপোর্ট' };
  }

  if (period === 'custom') {
    const s = customStart || endDate;
    const e = customEnd || endDate;
    return {
      startDate: s,
      endDate: e,
      label: `কাস্টম তারিখ সীমা: ${formatBengaliDate(s)} থেকে ${formatBengaliDate(e)}`
    };
  }

  const d = new Date(today);
  let monthsBack = 1;
  let label = 'বিগত ১ মাসের রিপোর্ট';

  switch (period) {
    case '1_month':
      monthsBack = 1;
      label = '১ মাসের রিপোর্ট (বিগত ১ মাস)';
      break;
    case '2_months':
      monthsBack = 2;
      label = '২ মাসের রিপোর্ট (বিগত ২ মাস)';
      break;
    case '3_months':
      monthsBack = 3;
      label = '৩ মাসের রিপোর্ট (বিগত ৩ মাস / কোয়ার্টার)';
      break;
    case '5_months':
      monthsBack = 5;
      label = '৫ মাসের রিপোর্ট (একসাথে বিগত ৫ মাস)';
      break;
    case '1_year':
      monthsBack = 12;
      label = 'গোটা বছরের রিপোর্ট (বিগত ১২ মাস / ১ বছর)';
      break;
    default:
      monthsBack = 1;
  }

  d.setMonth(d.getMonth() - monthsBack);
  const startDate = d.toISOString().split('T')[0];
  return { startDate, endDate, label };
}
