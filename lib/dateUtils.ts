import { toISODate } from './storage';

export const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type MonthCell = { date: Date; iso: string; inMonth: boolean };

export function getMonthMatrix(year: number, month: number): MonthCell[][] {
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first index: 0=Mon ... 6=Sun
  const jsDay = firstOfMonth.getDay(); // 0 = Sun
  const leadingEmpty = (jsDay + 6) % 7;
  const startDate = new Date(year, month, 1 - leadingEmpty);

  const weeks: MonthCell[][] = [];
  let cursor = new Date(startDate);
  for (let w = 0; w < 6; w++) {
    const week: MonthCell[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({ date: new Date(cursor), iso: toISODate(cursor), inMonth: cursor.getMonth() === month });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function formatMonthYear(year: number, month: number) {
  return `${MONTH_NAMES[month]} ${year}`;
}

export function formatDayHeading(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const dayName = DAY_NAMES_SHORT[(d.getDay() + 6) % 7];
  return `${dayName}, ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function mondayIndexOfDate(d: Date) {
  return (d.getDay() + 6) % 7;
}

export function minutesToLabel(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m > 0 ? ':' + m.toString().padStart(2, '0') : ''} ${period}`;
}

export function formatCountdown(deadlineISO: string): { label: string; urgency: 'overdue' | 'critical' | 'soon' | 'normal' } {
  const now = Date.now();
  const deadline = new Date(deadlineISO).getTime();
  const diffMs = deadline - now;
  const diffHrs = diffMs / (1000 * 60 * 60);

  if (diffMs <= 0) {
    const overdueHrs = Math.abs(diffHrs);
    if (overdueHrs < 24) return { label: 'Overdue today', urgency: 'overdue' };
    const days = Math.floor(overdueHrs / 24);
    return { label: `Overdue ${days}d`, urgency: 'overdue' };
  }
  if (diffHrs < 24) {
    const h = Math.max(1, Math.round(diffHrs));
    return { label: `Due in ${h}h`, urgency: 'critical' };
  }
  if (diffHrs < 72) {
    const d = Math.round(diffHrs / 24);
    return { label: `Due in ${d}d`, urgency: 'critical' };
  }
  if (diffHrs < 24 * 7) {
    const d = Math.round(diffHrs / 24);
    return { label: `Due in ${d}d`, urgency: 'soon' };
  }
  const d = Math.round(diffHrs / 24);
  return { label: `Due in ${d}d`, urgency: 'normal' };
}
