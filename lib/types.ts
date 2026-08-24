export type Subject = {
  id: string;
  name: string;
  code?: string;
  colorSeed: string;
};

export type ResourceType = 'pdf' | 'link' | 'image' | 'book' | 'file';

export type Resource = {
  id: string;
  subjectId: string;
  title: string;
  author?: string;
  type: ResourceType;
  uri?: string;
  fileName?: string;
  createdAt: string;
};

export type AttachmentKind = 'image' | 'file';

export type Attachment = {
  id: string;
  uri: string;
  name: string;
  mimeType?: string;
  kind: AttachmentKind;
};

export type ClassSession = {
  id: string;
  subjectId: string;
  day: number; // 0 = Monday ... 5 = Saturday
  startMinute: number; // minutes from 00:00
  endMinute: number;
  location?: string;
};

export type AttendanceStatus = 'present' | 'absent' | 'cancelled';

export type AttendanceRecord = {
  id: string;
  sessionId: string;
  subjectId: string;
  date: string; // yyyy-mm-dd
  status: AttendanceStatus;
};

export type NoteEntryType = 'audio' | 'photo' | 'text' | 'file';

export type NoteEntry = {
  id: string;
  date: string; // yyyy-mm-dd
  type: NoteEntryType;
  uri?: string;
  transcript?: string;
  title?: string;
  durationMs?: number;
  createdAt: string;
};

export type Task = {
  id: string;
  title: string;
  subjectId?: string;
  deadline: string; // ISO
  notes?: string;
  completed: boolean;
  createdAt: string;
  attachments?: Attachment[];
};

export type RoutineFrequency = 'daily' | 'weekdays' | 'custom';

export type RoutineItem = {
  id: string;
  title: string;
  icon: string; // Ionicons name
  colorSeed: string;
  frequency: RoutineFrequency;
  customDays?: number[]; // 0 = Monday ... 6 = Sunday, used when frequency === 'custom'
  createdAt: string;
  archived?: boolean;
};

export type RoutineLog = {
  id: string;
  routineId: string;
  date: string; // yyyy-mm-dd
  done: boolean;
};
