import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { radius, font, spacing, subjectColor, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { DAY_NAMES_SHORT, minutesToLabel, mondayIndexOfDate } from '../lib/dateUtils';
import { todayISODate, toISODate as dateToISO } from '../lib/storage';
import { useApp } from '../context/AppContext';
import { assignLanes } from '../lib/scheduleUtils';
import Card from '../components/Card';
import { PrimaryButton, SecondaryButton, IconButton } from '../components/Buttons';
import ScreenHeader from '../components/ScreenHeader';
import ModalSheet from '../components/ModalSheet';
import EmptyState from '../components/EmptyState';
import SegmentedControl from '../components/SegmentedControl';
import FormField from '../components/FormField';
import Stepper from '../components/Stepper';
import ProgressRing from '../components/ProgressRing';
import MonthCalendar from '../components/MonthCalendar';
import WeeklyBarChart from '../components/WeeklyBarChart';
import SettingsButton from '../components/SettingsButton';
import AssistantButton from '../components/AssistantButton';
import { ClassSession } from '../lib/types';

const GRID_START = 8 * 60;
const GRID_END = 21 * 60;
const TOTAL_HOURS = (GRID_END - GRID_START) / 60;
const HOUR_WIDTH = 72;
const GRID_CONTENT_WIDTH = TOTAL_HOURS * HOUR_WIDTH;
const DAY_LABEL_WIDTH = 52;
const HEADER_HEIGHT = 28;
const LANE_GAP = 3;
const LANE_HEIGHT_TARGET = 46;
const MIN_ROW_HEIGHT = 68;

// Discrete 30-minute tap targets covering the whole grid. Using fixed,
// pre-computed slots (instead of converting a raw tap x-coordinate into a
// minute value) guarantees the "add class" flow always opens with the exact
// start time that was tapped, with zero risk of pixel-math drift between
// platforms (this was the source of the previous start-time bug).
const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const SLOT_WIDTH = HOUR_WIDTH / SLOTS_PER_HOUR;
const TOTAL_SLOTS = TOTAL_HOURS * SLOTS_PER_HOUR;

// Given how many overlapping lanes a day-row needs, compute a row height
// that evenly fits every lane. A single-lane day (the overwhelming majority
// of cases) gets a clean baseline height and its class block fills that
// row completely edge-to-edge, with no dead space above or below it.
function computeRowHeight(laneCount: number) {
  if (laneCount <= 1) return MIN_ROW_HEIGHT;
  const natural = laneCount * LANE_HEIGHT_TARGET + (laneCount + 1) * LANE_GAP;
  return Math.max(MIN_ROW_HEIGHT, natural);
}

// Once the row height is fixed, derive the lane height so that all lanes
// (plus their small separators) sum to exactly `rowHeight` — single-lane
// rows get zero gap and fully occupy the row.
function computeLaneHeight(rowHeight: number, laneCount: number) {
  if (laneCount <= 1) return rowHeight;
  return (rowHeight - (laneCount + 1) * LANE_GAP) / laneCount;
}

function shortHourLabel(min: number) {
  const h = Math.floor(min / 60);
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${period}`;
}

export default function ScheduleScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { subjects, sessions, attendance, addSession, updateSession, removeSession, setAttendance, addSubject } = useApp();
  const [tab, setTab] = useState(0);
  const [addVisible, setAddVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<ClassSession | null>(null);
  const [detailSession, setDetailSession] = useState<ClassSession | null>(null);
  const [prefillDay, setPrefillDay] = useState(0);
  const [prefillStart, setPrefillStart] = useState(9 * 60);
  const [logDateVisible, setLogDateVisible] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(todayISODate());

  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const openAddAt = (day: number, startMinute: number) => {
    setPrefillDay(day);
    setPrefillStart(startMinute);
    setAddVisible(true);
  };

  const dayLanes = useMemo(() => {
    return Array.from({ length: 6 }).map((_, dayIdx) => assignLanes(sessions.filter((s) => s.day === dayIdx)));
  }, [sessions]);

  const rowHeights = useMemo(() => dayLanes.map(({ laneCount }) => computeRowHeight(laneCount)), [dayLanes]);

  const todayDayIdx = mondayIndexOfDate(new Date());
  const nowMinutes = (() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  })();

  const dayOfWeekIdx = mondayIndexOfDate(new Date(attendanceDate + 'T00:00:00'));
  const attendanceDateSessions = sessions.filter((s) => s.day === dayOfWeekIdx);

  const weeklyTrend = useMemo(() => {
    const days: { label: string; value: number; highlight?: boolean }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const iso = dateToISO(d);
      const dayRecords = attendance.filter((a) => a.date === iso && a.status !== 'cancelled');
      const present = dayRecords.filter((a) => a.status === 'present').length;
      const value = dayRecords.length > 0 ? (present / dayRecords.length) * 100 : 0;
      days.push({ label: DAY_NAMES_SHORT[mondayIndexOfDate(d)].slice(0, 1), value, highlight: i === 0 });
    }
    return days;
  }, [attendance]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        eyebrow="Plan & track"
        title="Schedule"
        right={
          <View style={styles.headerActions}>
            <AssistantButton />
            <SettingsButton />
          </View>
        }
      />
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <SegmentedControl options={['Timetable', 'Attendance']} selected={tab} onChange={setTab} />
      </View>

      {tab === 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <View style={styles.timetableRow}>
                <View style={{ width: DAY_LABEL_WIDTH }}>
                  <View style={{ height: HEADER_HEIGHT }} />
                  {DAY_NAMES_SHORT.slice(0, 6).map((d, i) => (
                    <View
                      key={d}
                      style={[
                        styles.dayLabelCell,
                        { height: rowHeights[i] },
                        i === todayDayIdx && { backgroundColor: colors.accentBlueSoft },
                      ]}
                    >
                      <Text style={[styles.dayLabelText, i === todayDayIdx && { color: colors.accentBlue }]}>{d}</Text>
                    </View>
                  ))}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                  <View style={{ width: GRID_CONTENT_WIDTH }}>
                    <View style={styles.hourHeaderRow}>
                      {Array.from({ length: TOTAL_HOURS }).map((_, i) => (
                        <View key={i} style={{ width: HOUR_WIDTH }}>
                          <Text style={styles.hourLabel}>{shortHourLabel(GRID_START + i * 60)}</Text>
                        </View>
                      ))}
                    </View>

                    {Array.from({ length: 6 }).map((_, dayIdx) => (
                      <DayRow
                        key={dayIdx}
                        isToday={dayIdx === todayDayIdx}
                        nowMinutes={nowMinutes}
                        rowHeight={rowHeights[dayIdx]}
                        laneCount={dayLanes[dayIdx].laneCount}
                        laned={dayLanes[dayIdx].laned}
                        subjectMap={subjectMap}
                        onEmptyPress={(startMinute) => openAddAt(dayIdx, startMinute)}
                        onBlockPress={(s) => setDetailSession(s)}
                      />
                    ))}
                  </View>
                </ScrollView>
              </View>
            </Card>
            <Text style={styles.scrollHint}>Scroll sideways to see the full day · tap an empty slot to add a class</Text>
          </View>

          <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
            <PrimaryButton label="Add class" icon="add" onPress={() => setAddVisible(true)} full />
          </View>
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: spacing.lg }}>
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.attHeaderRow}>
              <Text style={styles.cardTitle}>
                {attendanceDate === todayISODate() ? "Today's classes" : `Classes on ${attendanceDate}`}
              </Text>
              <Pressable onPress={() => setLogDateVisible(true)}>
                <Text style={styles.changeDateLink}>Change date</Text>
              </Pressable>
            </View>
            {attendanceDateSessions.length === 0 ? (
              <EmptyState icon="school-outline" title="No classes scheduled" subtitle="This day has no timetable entries." />
            ) : (
              attendanceDateSessions.map((s) => {
                const record = attendance.find((a) => a.sessionId === s.id && a.date === attendanceDate);
                return (
                  <View key={s.id} style={styles.attRow}>
                    <View style={[styles.subjectDot, { backgroundColor: subjectColor(s.subjectId, colors) }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.attSubject}>{subjectMap[s.subjectId]?.name ?? 'Subject'}</Text>
                      <Text style={styles.attTime}>
                        {formatHour(s.startMinute)} – {formatHour(s.endMinute)}
                        {s.location ? ` · ${s.location}` : ''}
                      </Text>
                    </View>
                    <View style={styles.attButtonsRow}>
                      {(['present', 'absent', 'cancelled'] as const).map((status) => (
                        <Pressable
                          key={status}
                          onPress={() => setAttendance(s.id, s.subjectId, attendanceDate, status)}
                          style={[
                            styles.attStatusBtn,
                            record?.status === status && {
                              backgroundColor: statusColor(status, colors),
                              borderColor: statusColor(status, colors),
                            },
                          ]}
                        >
                          <Ionicons
                            name={statusIcon(status)}
                            size={14}
                            color={record?.status === status ? colors.bg : colors.mutedSoft}
                          />
                        </Pressable>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </Card>

          <Card style={{ marginBottom: spacing.md }}>
            <Text style={styles.cardTitle}>Last 7 days</Text>
            <Text style={styles.chartSubtitle}>Overall attendance rate across all subjects</Text>
            <View style={{ marginTop: spacing.md }}>
              <WeeklyBarChart data={weeklyTrend} />
            </View>
          </Card>

          <Text style={styles.sectionTitle}>Per-subject analytics</Text>
          {subjects.length === 0 ? (
            <EmptyState icon="stats-chart-outline" title="No subjects yet" />
          ) : (
            subjects.map((subj) => {
              const records = attendance.filter((a) => a.subjectId === subj.id && a.status !== 'cancelled');
              const present = records.filter((a) => a.status === 'present').length;
              const total = records.length;
              const percent = total > 0 ? (present / total) * 100 : 0;
              return (
                <Card key={subj.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
                  <ProgressRing percent={percent} size={56} strokeWidth={6} />
                  <View style={{ marginLeft: spacing.md, flex: 1 }}>
                    <Text style={styles.subjectRowName}>{subj.name}</Text>
                    <Text style={styles.subjectRowMeta}>
                      {present} present / {total} tracked
                    </Text>
                  </View>
                  {total > 0 && percent < 75 && (
                    <View style={styles.warnPill}>
                      <Ionicons name="warning" size={12} color={colors.error} />
                      <Text style={styles.warnPillText}>Low</Text>
                    </View>
                  )}
                </Card>
              );
            })
          )}
        </ScrollView>
      )}

      <AddClassModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        subjects={subjects}
        onAddSubject={addSubject}
        onSave={(s) => {
          addSession(s);
          setAddVisible(false);
        }}
        defaultDay={prefillDay}
        defaultStart={prefillStart}
      />

      <AddClassModal
        visible={!!editingSession}
        onClose={() => setEditingSession(null)}
        subjects={subjects}
        onAddSubject={addSubject}
        onSave={(s) => {
          if (editingSession) updateSession(editingSession.id, s);
          setEditingSession(null);
        }}
        defaultDay={editingSession?.day ?? 0}
        defaultStart={editingSession?.startMinute ?? 9 * 60}
        initialSession={editingSession}
      />

      <ModalSheet visible={!!detailSession} onClose={() => setDetailSession(null)} title="Class details">
        {detailSession && (
          <View>
            <Text style={styles.detailSubject}>{subjectMap[detailSession.subjectId]?.name}</Text>
            <Text style={styles.detailMeta}>
              {DAY_NAMES_SHORT[detailSession.day]} · {formatHour(detailSession.startMinute)} – {formatHour(detailSession.endMinute)}
            </Text>
            {detailSession.location ? <Text style={styles.detailMeta}>{detailSession.location}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: spacing.lg }}>
              <SecondaryButton
                label="Edit"
                icon="pencil-outline"
                style={{ flex: 1 }}
                onPress={() => {
                  setEditingSession(detailSession);
                  setDetailSession(null);
                }}
              />
              <PrimaryButton
                label="Delete"
                icon="trash-outline"
                style={{ flex: 1, backgroundColor: colors.errorSoft }}
                onPress={() => {
                  removeSession(detailSession.id);
                  setDetailSession(null);
                }}
              />
            </View>
          </View>
        )}
      </ModalSheet>

      <ModalSheet visible={logDateVisible} onClose={() => setLogDateVisible(false)} title="Select date">
        <MonthCalendar
          selectedIso={attendanceDate}
          onSelect={(iso) => {
            setAttendanceDate(iso);
            setLogDateVisible(false);
          }}
        />
      </ModalSheet>
    </SafeAreaView>
  );
}

function DayRow({
  isToday,
  nowMinutes,
  rowHeight,
  laneCount,
  laned,
  subjectMap,
  onEmptyPress,
  onBlockPress,
}: {
  isToday: boolean;
  nowMinutes: number;
  rowHeight: number;
  laneCount: number;
  laned: { session: ClassSession; lane: number }[];
  subjectMap: Record<string, any>;
  onEmptyPress: (startMinute: number) => void;
  onBlockPress: (s: ClassSession) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const showNowLine = isToday && nowMinutes >= GRID_START && nowMinutes <= GRID_END;
  const nowX = ((nowMinutes - GRID_START) / 60) * HOUR_WIDTH;
  const laneHeight = computeLaneHeight(rowHeight, laneCount);
  const pxPerMin = HOUR_WIDTH / 60;

  return (
    <View style={[styles.dayRow, { height: rowHeight, width: GRID_CONTENT_WIDTH }, isToday && { backgroundColor: colors.accentBlueSoft }]}>
      {/* Discrete tap targets — each knows its own exact start time, so there
          is no coordinate math involved in determining what time was tapped. */}
      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => {
        const slotStart = GRID_START + i * SLOT_MINUTES;
        return (
          <Pressable
            key={i}
            onPress={() => onEmptyPress(slotStart)}
            style={{ position: 'absolute', left: i * SLOT_WIDTH, top: 0, width: SLOT_WIDTH, height: rowHeight }}
          />
        );
      })}

      {Array.from({ length: TOTAL_HOURS + 1 }).map((_, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{ position: 'absolute', left: i * HOUR_WIDTH, top: 0, bottom: 0, width: 1, backgroundColor: colors.hairlineSoft }}
        />
      ))}

      {showNowLine && <View pointerEvents="none" style={[styles.nowLine, { left: nowX }]} />}

      {laned.map(({ session: s, lane }) => {
        const left = (s.startMinute - GRID_START) * pxPerMin;
        const width = (s.endMinute - s.startMinute) * pxPerMin;
        const top = laneCount <= 1 ? 0 : LANE_GAP + lane * (laneHeight + LANE_GAP);
        const color = subjectColor(s.subjectId, colors);
        return (
          <Pressable
            key={s.id}
            onPress={() => onBlockPress(s)}
            style={[
              styles.block,
              {
                left,
                width,
                top,
                height: laneHeight,
                backgroundColor: color + '59',
                borderLeftWidth: 3,
                borderLeftColor: color,
              },
            ]}
          >
            <Text numberOfLines={1} style={[styles.blockText, { color: colors.ink }]}>
              {subjectMap[s.subjectId]?.code ?? subjectMap[s.subjectId]?.name?.slice(0, 8) ?? '—'}
            </Text>
            {laneHeight > 34 && (
              <Text numberOfLines={1} style={[styles.blockSubText, { color: colors.body }]}>
                {minutesToLabel(s.startMinute)} – {minutesToLabel(s.endMinute)}
              </Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

function AddClassModal({
  visible,
  onClose,
  subjects,
  onAddSubject,
  onSave,
  defaultDay,
  defaultStart,
  initialSession,
}: {
  visible: boolean;
  onClose: () => void;
  subjects: { id: string; name: string; code?: string }[];
  onAddSubject: (name: string) => { id: string };
  onSave: (s: Omit<ClassSession, 'id'>) => void;
  defaultDay: number;
  defaultStart: number;
  initialSession?: ClassSession | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEdit = !!initialSession;
  const [subjectId, setSubjectId] = useState<string>(subjects[0]?.id ?? '');
  const [day, setDay] = useState(defaultDay);
  const [start, setStart] = useState(defaultStart);
  const [durationMin, setDurationMin] = useState(60);
  const [location, setLocation] = useState('');
  const [newSubjectName, setNewSubjectName] = useState('');

  React.useEffect(() => {
    if (visible) {
      if (initialSession) {
        setSubjectId(initialSession.subjectId);
        setDay(initialSession.day);
        setStart(initialSession.startMinute);
        setDurationMin(initialSession.endMinute - initialSession.startMinute);
        setLocation(initialSession.location ?? '');
      } else {
        setDay(defaultDay);
        setStart(defaultStart);
        setDurationMin(60);
        setLocation('');
        if (!subjectId && subjects[0]) setSubjectId(subjects[0].id);
      }
      setNewSubjectName('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, defaultDay, defaultStart, initialSession]);

  // Creating the subject happens automatically on Save if the user has
  // typed a new-subject name — they no longer need to remember to tap the
  // separate "+" button first. The "+" is still available as a shortcut for
  // people who want to add the subject before filling out the rest of the
  // form, but it's optional now.
  const handleSave = () => {
    let finalSubjectId = subjectId;
    const typedName = newSubjectName.trim();
    if (typedName) {
      const existing = subjects.find((s) => s.name.toLowerCase() === typedName.toLowerCase());
      finalSubjectId = existing ? existing.id : onAddSubject(typedName).id;
    }
    if (!finalSubjectId) {
      Alert.alert('Pick a subject', 'Please select an existing subject or type a new one.');
      return;
    }
    onSave({ subjectId: finalSubjectId, day, startMinute: start, endMinute: start + durationMin, location: location || undefined });
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title={isEdit ? 'Edit class' : 'Add class'} maxHeight={640}>
      <Text style={styles.fieldLabel}>Subject</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {subjects.map((s) => (
          <Pressable
            key={s.id}
            onPress={() => {
              setSubjectId(s.id);
              setNewSubjectName('');
            }}
            style={[styles.chip, subjectId === s.id && !newSubjectName.trim() && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipText, subjectId === s.id && !newSubjectName.trim() && { color: colors.onPrimary }]}>{s.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 6 }}>
        <FormField
          label="Or type a new subject"
          placeholder="e.g. Organic Chemistry"
          value={newSubjectName}
          onChangeText={setNewSubjectName}
          returnKeyType="done"
          style={{ flex: 1 }}
        />
        <Pressable
          style={styles.addSubjectBtn}
          onPress={() => {
            if (!newSubjectName.trim()) return;
            const s = onAddSubject(newSubjectName.trim());
            setSubjectId(s.id);
            setNewSubjectName('');
          }}
        >
          <Ionicons name="add" size={18} color={colors.onPrimary} />
        </Pressable>
      </View>
      <Text style={styles.helperText}>Typing a new subject and tapping "Save class" below creates it automatically.</Text>

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Day</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
        {DAY_NAMES_SHORT.slice(0, 6).map((d, i) => (
          <Pressable
            key={d}
            onPress={() => setDay(i)}
            style={[styles.chip, day === i && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipText, day === i && { color: colors.onPrimary }]}>{d}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: spacing.md }}>
        <Stepper
          label="Start time"
          value={formatHour(start)}
          onDecrement={() => setStart((v) => Math.max(GRID_START, v - 30))}
          onIncrement={() => setStart((v) => Math.min(GRID_END - 30, v + 30))}
        />
        <Stepper
          label="Duration"
          value={`${Math.floor(durationMin / 60)}h ${durationMin % 60 ? (durationMin % 60) + 'm' : ''}`.trim()}
          onDecrement={() => setDurationMin((v) => Math.max(30, v - 30))}
          onIncrement={() => setDurationMin((v) => Math.min(240, v + 30))}
        />
      </View>

      <FormField label="Location (optional)" placeholder="Room 204" value={location} onChangeText={setLocation} />

      <PrimaryButton label={isEdit ? 'Save changes' : 'Save class'} onPress={handleSave} full style={{ marginTop: spacing.sm }} />
    </ModalSheet>
  );
}

function formatHour(min: number) {
  return minutesToLabel(min);
}

function statusColor(status: 'present' | 'absent' | 'cancelled', colors: ThemeColors) {
  if (status === 'present') return colors.success;
  if (status === 'absent') return colors.error;
  return colors.mutedSoft;
}

function statusIcon(status: 'present' | 'absent' | 'cancelled'): any {
  if (status === 'present') return 'checkmark';
  if (status === 'absent') return 'close';
  return 'ban';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    timetableRow: { flexDirection: 'row' },
    dayLabelCell: {
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.hairlineSoft,
      borderRightWidth: 1,
      borderRightColor: colors.hairline,
    },
    dayLabelText: { ...font.caption, fontWeight: '700', color: colors.body },
    hourHeaderRow: { flexDirection: 'row', height: HEADER_HEIGHT, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.hairline },
    hourLabel: { ...font.caption, fontSize: 10, color: colors.mutedSoft, textAlign: 'left', paddingLeft: 4 },
    dayRow: { position: 'relative', borderTopWidth: 1, borderTopColor: colors.hairlineSoft },
    nowLine: { position: 'absolute', top: 0, bottom: 0, width: 2, backgroundColor: colors.error, zIndex: 2 },
    block: {
      position: 'absolute',
      borderRadius: radius.md,
      paddingHorizontal: 8,
      paddingVertical: 4,
      justifyContent: 'center',
    },
    blockText: { fontSize: 10, fontWeight: '700' },
    blockSubText: { fontSize: 9, fontWeight: '500', opacity: 0.85, marginTop: 2 },
    scrollHint: { ...font.caption, color: colors.mutedSoft, fontSize: 11, marginTop: 8, textAlign: 'center' },
    cardTitle: { ...font.titleMd, color: colors.ink },
    chartSubtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    attHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    changeDateLink: { ...font.bodySm, color: colors.accentBlue },
    attRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.hairlineSoft },
    subjectDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
    attSubject: { ...font.titleSm, color: colors.ink },
    attTime: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    attButtonsRow: { flexDirection: 'row', gap: 6 },
    attStatusBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: colors.hairline,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: { ...font.titleMd, color: colors.ink, marginBottom: spacing.sm, marginTop: spacing.sm },
    subjectRowName: { ...font.titleSm, color: colors.ink },
    subjectRowMeta: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    warnPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.errorSoft,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    warnPillText: { ...font.caption, color: colors.error, fontSize: 10 },
    fieldLabel: { ...font.caption, color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    helperText: { ...font.caption, color: colors.mutedSoft, fontSize: 11, marginBottom: spacing.sm },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCardAlt,
      marginRight: 8,
    },
    chipText: { ...font.bodySm, color: colors.body, fontWeight: '600' },
    addSubjectBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 20,
    },
    detailSubject: { ...font.titleLg, color: colors.ink, marginBottom: 6 },
    detailMeta: { ...font.bodySm, color: colors.muted, marginBottom: 4 },
  });
}
