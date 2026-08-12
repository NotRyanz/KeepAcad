import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { loadItem, saveItem, uid, todayISODate } from '../lib/storage';
import { mondayIndexOfDate } from '../lib/dateUtils';
import { Subject, Resource, ClassSession, AttendanceRecord, NoteEntry, Task, RoutineItem, RoutineLog } from '../lib/types';

type AppState = {
  ready: boolean;
  subjects: Subject[];
  resources: Resource[];
  sessions: ClassSession[];
  attendance: AttendanceRecord[];
  notes: NoteEntry[];
  tasks: Task[];
  routines: RoutineItem[];
  routineLogs: RoutineLog[];
};

type AppContextValue = AppState & {
  addSubject: (name: string, code?: string) => Subject;
  updateSubject: (id: string, patch: Partial<Omit<Subject, 'id'>>) => void;
  removeSubject: (id: string) => void;
  addResource: (r: Omit<Resource, 'id' | 'createdAt'>) => void;
  updateResource: (id: string, patch: Partial<Omit<Resource, 'id' | 'createdAt'>>) => void;
  removeResource: (id: string) => void;
  addSession: (s: Omit<ClassSession, 'id'>) => void;
  updateSession: (id: string, patch: Partial<Omit<ClassSession, 'id'>>) => void;
  removeSession: (id: string) => void;
  setAttendance: (sessionId: string, subjectId: string, date: string, status: AttendanceRecord['status']) => void;
  addNote: (n: Omit<NoteEntry, 'id' | 'createdAt'>) => NoteEntry;
  updateNote: (id: string, patch: Partial<NoteEntry>) => void;
  removeNote: (id: string) => void;
  addTask: (t: Omit<Task, 'id' | 'createdAt' | 'completed'>) => void;
  updateTask: (id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => void;
  toggleTask: (id: string) => void;
  removeTask: (id: string) => void;
  addRoutine: (r: Omit<RoutineItem, 'id' | 'createdAt' | 'archived'>) => void;
  updateRoutine: (id: string, patch: Partial<Omit<RoutineItem, 'id' | 'createdAt'>>) => void;
  removeRoutine: (id: string) => void;
  setRoutineDone: (routineId: string, date: string, done: boolean) => void;
  isRoutineDone: (routineId: string, date: string) => boolean;
  isRoutineScheduled: (routine: RoutineItem, date: string) => boolean;
};

const AppContext = createContext<AppContextValue | null>(null);

const SEED_SUBJECTS: Subject[] = [
  { id: 's1', name: 'Data Structures', code: 'CS201', colorSeed: 'ds' },
  { id: 's2', name: 'Thermodynamics', code: 'ME210', colorSeed: 'th' },
  { id: 's3', name: 'Linear Algebra', code: 'MA150', colorSeed: 'la' },
  { id: 's4', name: 'Digital Electronics', code: 'EC220', colorSeed: 'de' },
];

const SEED_SESSIONS: ClassSession[] = [
  { id: uid(), subjectId: 's1', day: 0, startMinute: 9 * 60, endMinute: 10 * 60 + 30, location: 'Room 204' },
  { id: uid(), subjectId: 's3', day: 0, startMinute: 11 * 60, endMinute: 12 * 60, location: 'Room 110' },
  { id: uid(), subjectId: 's2', day: 1, startMinute: 10 * 60, endMinute: 11 * 60 + 30, location: 'Lab B' },
  { id: uid(), subjectId: 's4', day: 2, startMinute: 9 * 60, endMinute: 10 * 60, location: 'Room 305' },
  { id: uid(), subjectId: 's1', day: 2, startMinute: 14 * 60, endMinute: 15 * 60 + 30, location: 'Room 204' },
  { id: uid(), subjectId: 's3', day: 3, startMinute: 11 * 60, endMinute: 12 * 60, location: 'Room 110' },
  { id: uid(), subjectId: 's2', day: 4, startMinute: 13 * 60, endMinute: 14 * 60 + 30, location: 'Lab B' },
  { id: uid(), subjectId: 's4', day: 4, startMinute: 15 * 60, endMinute: 16 * 60, location: 'Room 305' },
];

const SEED_TASKS: Task[] = [
  {
    id: uid(),
    title: 'Submit DS Assignment 3',
    subjectId: 's1',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 20).toISOString(),
    notes: 'Cover AVL trees and heap sort complexity analysis.',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(),
    title: 'Thermo lab report',
    subjectId: 's2',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2.5).toISOString(),
    notes: 'Include Carnot cycle efficiency calculations.',
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: uid(),
    title: 'Linear Algebra problem set 5',
    subjectId: 's3',
    deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 6).toISOString(),
    notes: '',
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

const SEED_ROUTINES: RoutineItem[] = [
  { id: uid(), title: 'Review today\u2019s lecture notes', icon: 'book-outline', colorSeed: 'rev', frequency: 'daily', createdAt: new Date().toISOString() },
  { id: uid(), title: 'Solve 5 practice problems', icon: 'barbell-outline', colorSeed: 'prac', frequency: 'weekdays', createdAt: new Date().toISOString() },
  { id: uid(), title: 'Read for 30 minutes', icon: 'library-outline', colorSeed: 'read', frequency: 'daily', createdAt: new Date().toISOString() },
  { id: uid(), title: 'Plan tomorrow\u2019s schedule', icon: 'sunny-outline', colorSeed: 'plan', frequency: 'daily', createdAt: new Date().toISOString() },
];

function seedRoutineLogs(routines: RoutineItem[]): RoutineLog[] {
  const logs: RoutineLog[] = [];
  const today = new Date();
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    routines.forEach((r) => {
      const chance = Math.random();
      if (chance > 0.25) {
        logs.push({ id: uid(), routineId: r.id, date: iso, done: true });
      }
    });
  }
  return logs;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [attendance, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [routines, setRoutines] = useState<RoutineItem[]>([]);
  const [routineLogs, setRoutineLogs] = useState<RoutineLog[]>([]);

  useEffect(() => {
    (async () => {
      const seededRoutines = SEED_ROUTINES;
      const [su, re, se, at, no, ta, ro, rl] = await Promise.all([
        loadItem('subjects', SEED_SUBJECTS),
        loadItem('resources', [] as Resource[]),
        loadItem('sessions', SEED_SESSIONS),
        loadItem('attendance', [] as AttendanceRecord[]),
        loadItem('notes', [] as NoteEntry[]),
        loadItem('tasks', SEED_TASKS),
        loadItem('routines', seededRoutines),
        loadItem('routineLogs', null as RoutineLog[] | null),
      ]);
      setSubjects(su);
      setResources(re);
      setSessions(se);
      setAttendanceList(at);
      setNotes(no);
      setTasks(ta);
      setRoutines(ro);
      setRoutineLogs(rl ?? seedRoutineLogs(ro));
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) saveItem('subjects', subjects);
  }, [subjects, ready]);
  useEffect(() => {
    if (ready) saveItem('resources', resources);
  }, [resources, ready]);
  useEffect(() => {
    if (ready) saveItem('sessions', sessions);
  }, [sessions, ready]);
  useEffect(() => {
    if (ready) saveItem('attendance', attendance);
  }, [attendance, ready]);
  useEffect(() => {
    if (ready) saveItem('notes', notes);
  }, [notes, ready]);
  useEffect(() => {
    if (ready) saveItem('tasks', tasks);
  }, [tasks, ready]);
  useEffect(() => {
    if (ready) saveItem('routines', routines);
  }, [routines, ready]);
  useEffect(() => {
    if (ready) saveItem('routineLogs', routineLogs);
  }, [routineLogs, ready]);

  const addSubject = useCallback((name: string, code?: string) => {
    const s: Subject = { id: uid(), name, code, colorSeed: name + uid() };
    setSubjects((prev) => [...prev, s]);
    return s;
  }, []);

  const updateSubject = useCallback((id: string, patch: Partial<Omit<Subject, 'id'>>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeSubject = useCallback((id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setResources((prev) => prev.filter((r) => r.subjectId !== id));
    setSessions((prev) => prev.filter((s) => s.subjectId !== id));
  }, []);

  const addResource = useCallback((r: Omit<Resource, 'id' | 'createdAt'>) => {
    setResources((prev) => [{ ...r, id: uid(), createdAt: new Date().toISOString() }, ...prev]);
  }, []);

  const updateResource = useCallback((id: string, patch: Partial<Omit<Resource, 'id' | 'createdAt'>>) => {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeResource = useCallback((id: string) => {
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addSession = useCallback((s: Omit<ClassSession, 'id'>) => {
    setSessions((prev) => [...prev, { ...s, id: uid() }]);
  }, []);

  const updateSession = useCallback((id: string, patch: Partial<Omit<ClassSession, 'id'>>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setAttendanceList((prev) => prev.filter((a) => a.sessionId !== id));
  }, []);

  const setAttendance = useCallback(
    (sessionId: string, subjectId: string, date: string, status: AttendanceRecord['status']) => {
      setAttendanceList((prev) => {
        const existingIdx = prev.findIndex((a) => a.sessionId === sessionId && a.date === date);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = { ...copy[existingIdx], status };
          return copy;
        }
        return [...prev, { id: uid(), sessionId, subjectId, date, status }];
      });
    },
    []
  );

  const addNote = useCallback((n: Omit<NoteEntry, 'id' | 'createdAt'>) => {
    const entry: NoteEntry = { ...n, id: uid(), createdAt: new Date().toISOString() };
    setNotes((prev) => [entry, ...prev]);
    return entry;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<NoteEntry>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }, []);

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addTask = useCallback((t: Omit<Task, 'id' | 'createdAt' | 'completed'>) => {
    setTasks((prev) => [...prev, { ...t, id: uid(), completed: false, createdAt: new Date().toISOString() }]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addRoutine = useCallback((r: Omit<RoutineItem, 'id' | 'createdAt' | 'archived'>) => {
    setRoutines((prev) => [...prev, { ...r, id: uid(), createdAt: new Date().toISOString() }]);
  }, []);

  const updateRoutine = useCallback((id: string, patch: Partial<Omit<RoutineItem, 'id' | 'createdAt'>>) => {
    setRoutines((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  const removeRoutine = useCallback((id: string) => {
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    setRoutineLogs((prev) => prev.filter((l) => l.routineId !== id));
  }, []);

  const setRoutineDone = useCallback((routineId: string, date: string, done: boolean) => {
    setRoutineLogs((prev) => {
      const idx = prev.findIndex((l) => l.routineId === routineId && l.date === date);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], done };
        return copy;
      }
      return [...prev, { id: uid(), routineId, date, done }];
    });
  }, []);

  const isRoutineDone = useCallback(
    (routineId: string, date: string) => {
      return routineLogs.some((l) => l.routineId === routineId && l.date === date && l.done);
    },
    [routineLogs]
  );

  const isRoutineScheduled = useCallback((routine: RoutineItem, date: string) => {
    const weekdayIdx = mondayIndexOfDate(new Date(date + 'T00:00:00'));
    if (routine.frequency === 'daily') return true;
    if (routine.frequency === 'weekdays') return weekdayIdx <= 4;
    if (routine.frequency === 'custom') return (routine.customDays ?? []).includes(weekdayIdx);
    return true;
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      subjects,
      resources,
      sessions,
      attendance,
      notes,
      tasks,
      routines,
      routineLogs,
      addSubject,
      updateSubject,
      removeSubject,
      addResource,
      updateResource,
      removeResource,
      addSession,
      updateSession,
      removeSession,
      setAttendance,
      addNote,
      updateNote,
      removeNote,
      addTask,
      updateTask,
      toggleTask,
      removeTask,
      addRoutine,
      updateRoutine,
      removeRoutine,
      setRoutineDone,
      isRoutineDone,
      isRoutineScheduled,
    }),
    [ready, subjects, resources, sessions, attendance, notes, tasks, routines, routineLogs]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export { todayISODate };
