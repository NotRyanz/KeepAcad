import { RoutineItem } from './types';
import { toISODate } from './storage';

type IsDoneFn = (routineId: string, date: string) => boolean;
type IsScheduledFn = (routine: RoutineItem, date: string) => boolean;

export function computeRoutineCurrentStreak(
  routine: RoutineItem,
  isDone: IsDoneFn,
  isScheduled: IsScheduledFn,
  maxDays = 180
): number {
  let streak = 0;
  const cursor = new Date();
  const todayIso = toISODate(cursor);
  for (let i = 0; i < maxDays; i++) {
    const iso = toISODate(cursor);
    if (isScheduled(routine, iso)) {
      if (isDone(routine.id, iso)) {
        streak += 1;
      } else if (iso === todayIso) {
        // today not completed yet — don't break the streak display
      } else {
        break;
      }
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeRoutineBestStreak(routine: RoutineItem, isDone: IsDoneFn, isScheduled: IsScheduledFn, maxDays = 180): number {
  let best = 0;
  let running = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (maxDays - 1));
  for (let i = 0; i < maxDays; i++) {
    const iso = toISODate(cursor);
    if (isScheduled(routine, iso)) {
      if (isDone(routine.id, iso)) {
        running += 1;
        best = Math.max(best, running);
      } else {
        running = 0;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return best;
}

export function computeRoutineOverallStats(
  routine: RoutineItem,
  isDone: IsDoneFn,
  isScheduled: IsScheduledFn,
  maxDays = 90
): { scheduled: number; done: number; percent: number } {
  let scheduled = 0;
  let done = 0;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - (maxDays - 1));
  const createdAtIso = routine.createdAt ? routine.createdAt.slice(0, 10) : null;
  for (let i = 0; i < maxDays; i++) {
    const iso = toISODate(cursor);
    if ((!createdAtIso || iso >= createdAtIso) && isScheduled(routine, iso)) {
      scheduled += 1;
      if (isDone(routine.id, iso)) done += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return { scheduled, done, percent: scheduled > 0 ? (done / scheduled) * 100 : 0 };
}

export function computeRoutineMonthStats(
  routine: RoutineItem,
  isDone: IsDoneFn,
  isScheduled: IsScheduledFn,
  year: number,
  month: number
): { scheduled: number; done: number; percent: number } {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayIso = toISODate(new Date());
  let scheduled = 0;
  let done = 0;
  const createdAtIso = routine.createdAt ? routine.createdAt.slice(0, 10) : null;
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month, d);
    const iso = toISODate(dt);
    if (iso > todayIso) continue;
    if (createdAtIso && iso < createdAtIso) continue;
    if (isScheduled(routine, iso)) {
      scheduled += 1;
      if (isDone(routine.id, iso)) done += 1;
    }
  }
  return { scheduled, done, percent: scheduled > 0 ? (done / scheduled) * 100 : 0 };
}
