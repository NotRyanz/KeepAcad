import { Subject, ClassSession, AttendanceRecord, Task, RoutineItem } from './types';
import { formatCountdown, minutesToLabel, DAY_NAMES_SHORT } from './dateUtils';
import { todayISODate } from './storage';

type BuildParams = {
  subjects: Subject[];
  sessions: ClassSession[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  routines: RoutineItem[];
  isRoutineDone: (routineId: string, date: string) => boolean;
  isRoutineScheduled: (routine: RoutineItem, date: string) => boolean;
};

/**
 * Builds a compact plain-text snapshot of the user's current academic data
 * (subjects, timetable, attendance, tasks, habits) to hand to Gemini as a
 * system instruction. This lets the assistant answer grounded questions
 * like "what's due soon" or "how's my attendance in Thermo" without any
 * server-side integration — everything stays on-device and is only sent to
 * Google's API alongside the user's own message when they choose to chat.
 */
export function buildAppContextPrompt(params: BuildParams): string {
  const { subjects, sessions, attendance, tasks, routines, isRoutineDone, isRoutineScheduled } = params;
  const today = todayISODate();
  const subjectMap = Object.fromEntries(subjects.map((s) => [s.id, s]));

  const lines: string[] = [];
  lines.push(
    "You are the built-in study assistant inside a student's Academic Manager app. " +
      "Be concise, warm, and practical. Use the live data below to answer questions about " +
      "the student's subjects, timetable, attendance, deadlines, and habits. " +
      "If asked something unrelated to academics/productivity, you can still help, but keep answers brief. " +
      "Never invent data that isn't listed below — say you don't have that information instead."
  );
  lines.push(`Today's date: ${today}`);

  // Subjects
  if (subjects.length > 0) {
    lines.push('\nSUBJECTS:');
    subjects.forEach((s) => lines.push(`- ${s.name}${s.code ? ` (${s.code})` : ''}`));
  }

  // Timetable
  if (sessions.length > 0) {
    lines.push('\nWEEKLY TIMETABLE:');
    const byDay: Record<number, ClassSession[]> = {};
    sessions.forEach((s) => {
      byDay[s.day] = byDay[s.day] || [];
      byDay[s.day].push(s);
    });
    Object.keys(byDay)
      .map(Number)
      .sort()
      .forEach((day) => {
        const dayName = DAY_NAMES_SHORT[day] ?? `Day ${day}`;
        const classesStr = byDay[day]
          .sort((a, b) => a.startMinute - b.startMinute)
          .map((s) => `${subjectMap[s.subjectId]?.name ?? 'Unknown'} ${minutesToLabel(s.startMinute)}-${minutesToLabel(s.endMinute)}${s.location ? ` @${s.location}` : ''}`)
          .join('; ');
        lines.push(`- ${dayName}: ${classesStr}`);
      });
  }

  // Attendance
  if (attendance.length > 0) {
    lines.push('\nATTENDANCE (percentage present, excluding cancelled classes):');
    subjects.forEach((subj) => {
      const records = attendance.filter((a) => a.subjectId === subj.id && a.status !== 'cancelled');
      if (records.length === 0) return;
      const present = records.filter((a) => a.status === 'present').length;
      const pct = Math.round((present / records.length) * 100);
      lines.push(`- ${subj.name}: ${pct}% (${present}/${records.length} classes attended)`);
    });
  }

  // Tasks
  const pendingTasks = tasks.filter((t) => !t.completed);
  if (pendingTasks.length > 0) {
    lines.push('\nPENDING TASKS / DEADLINES:');
    pendingTasks
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .forEach((t) => {
        const { label } = formatCountdown(t.deadline);
        const subjName = t.subjectId ? subjectMap[t.subjectId]?.name : undefined;
        lines.push(`- "${t.title}"${subjName ? ` [${subjName}]` : ''} — ${label} (deadline: ${new Date(t.deadline).toLocaleString()})`);
      });
  }
  const completedCount = tasks.length - pendingTasks.length;
  if (completedCount > 0) {
    lines.push(`(${completedCount} other task(s) already marked complete.)`);
  }

  // Routines / habits
  if (routines.length > 0) {
    lines.push('\nDAILY HABITS / ROUTINE:');
    routines
      .filter((r) => !r.archived)
      .forEach((r) => {
        const doneToday = isRoutineScheduled(r, today) ? (isRoutineDone(r.id, today) ? 'done today' : 'not done yet today') : 'not scheduled today';
        lines.push(`- ${r.title} (${r.frequency}) — ${doneToday}`);
      });
  }

  if (subjects.length === 0 && tasks.length === 0 && routines.length === 0) {
    lines.push('\nThe student has not added any data yet — encourage them to start by adding a subject, task, or habit.');
  }

  return lines.join('\n');
}
