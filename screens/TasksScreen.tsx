import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown, FadeOutLeft, Layout } from 'react-native-reanimated';

import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { formatCountdown, minutesToLabel } from '../lib/dateUtils';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { PrimaryButton } from '../components/Buttons';
import ScreenHeader from '../components/ScreenHeader';
import ModalSheet from '../components/ModalSheet';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import SegmentedControl from '../components/SegmentedControl';
import MonthCalendar from '../components/MonthCalendar';
import Stepper from '../components/Stepper';
import ProgressRing from '../components/ProgressRing';
import SettingsButton from '../components/SettingsButton';
import AssistantButton from '../components/AssistantButton';
import AttachmentField from '../components/AttachmentField';
import AttachmentRow from '../components/AttachmentRow';
import { Task, Attachment } from '../lib/types';
import { toISODate } from '../lib/storage';

export default function TasksScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tasks, subjects, addTask, updateTask, toggleTask, removeTask } = useApp();
  const [filter, setFilter] = useState(0);
  const [addVisible, setAddVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const subjectMap = useMemo(() => Object.fromEntries(subjects.map((s) => [s.id, s])), [subjects]);

  const urgencyColor: Record<string, string> = {
    overdue: colors.error,
    critical: colors.error,
    soon: colors.warning,
    normal: colors.accentEmerald,
  };

  const filtered = useMemo(() => {
    let list = tasks;
    if (filter === 1) list = list.filter((t) => !t.completed);
    if (filter === 2) list = list.filter((t) => t.completed);
    return [...list].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [tasks, filter]);

  const pendingCount = tasks.filter((t) => !t.completed).length;
  const urgentCount = tasks.filter((t) => {
    if (t.completed) return false;
    const { urgency } = formatCountdown(t.deadline);
    return urgency === 'overdue' || urgency === 'critical';
  }).length;
  const completionPercent = tasks.length > 0 ? (tasks.filter((t) => t.completed).length / tasks.length) * 100 : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        eyebrow="Deadlines"
        title="Tasks"
        right={
          <View style={styles.headerActions}>
            <AssistantButton />
            <SettingsButton />
            <Pressable style={styles.addBtn} onPress={() => setAddVisible(true)}>
              <Ionicons name="add" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
        }
      />

      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </Card>
        <Card style={[styles.summaryCard, urgentCount > 0 && { borderColor: colors.error }]}>
          <Text style={[styles.summaryNumber, urgentCount > 0 && { color: colors.error }]}>{urgentCount}</Text>
          <Text style={styles.summaryLabel}>Urgent</Text>
        </Card>
        <Card style={[styles.summaryCard, styles.ringSummaryCard]}>
          <ProgressRing percent={completionPercent} size={44} strokeWidth={5} />
          <Text style={styles.summaryLabel}>Completed</Text>
        </Card>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md }}>
        <SegmentedControl options={['All', 'Pending', 'Done']} selected={filter} onChange={setFilter} />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 150, gap: spacing.sm }}
        ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="Nothing here" subtitle="Add a task to start tracking deadlines." />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40).duration(260)} exiting={FadeOutLeft.duration(200)} layout={Layout}>
            <TaskRow
              task={item}
              subjectName={item.subjectId ? subjectMap[item.subjectId]?.name : undefined}
              urgencyColor={urgencyColor}
              onToggle={() => toggleTask(item.id)}
              onEdit={() => setEditingTask(item)}
              onDelete={() =>
                Alert.alert('Delete task', `Remove "${item.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => removeTask(item.id) },
                ])
              }
            />
          </Animated.View>
        )}
        showsVerticalScrollIndicator={false}
      />

      <TaskFormModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        subjects={subjects}
        onSave={(t) => {
          addTask(t);
          setAddVisible(false);
        }}
      />

      <TaskFormModal
        visible={!!editingTask}
        onClose={() => setEditingTask(null)}
        subjects={subjects}
        initialTask={editingTask}
        onSave={(t) => {
          if (editingTask) updateTask(editingTask.id, t);
          setEditingTask(null);
        }}
      />
    </SafeAreaView>
  );
}

function TaskRow({
  task,
  subjectName,
  urgencyColor,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  subjectName?: string;
  urgencyColor: Record<string, string>;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { label, urgency } = formatCountdown(task.deadline);
  const barColor = task.completed ? colors.mutedSoft : urgencyColor[urgency];

  return (
    <Card style={[styles.taskCard, { borderLeftWidth: 3, borderLeftColor: barColor }]}>
      <View style={styles.taskRow}>
        <Pressable onPress={onToggle} style={[styles.checkbox, task.completed && { backgroundColor: colors.success, borderColor: colors.success }]}>
          {task.completed && <Ionicons name="checkmark" size={14} color={colors.bg} />}
        </Pressable>
        <Pressable style={{ flex: 1, marginLeft: 12 }} onPress={onEdit}>
          <Text style={[styles.taskTitle, task.completed && styles.taskTitleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          <View style={styles.metaRow}>
            {subjectName && <Text style={styles.taskSubject}>{subjectName}</Text>}
            {subjectName && <Text style={styles.dotSep}>·</Text>}
            <Text style={[styles.taskDeadline, { color: task.completed ? colors.mutedSoft : barColor }]}>{label}</Text>
          </View>
          {task.notes ? (
            <Text style={styles.taskNotes} numberOfLines={2}>
              {task.notes}
            </Text>
          ) : null}
          <AttachmentRow attachments={task.attachments ?? []} />
        </Pressable>
        <Pressable onPress={onEdit} hitSlop={8} style={{ marginLeft: 8 }}>
          <Ionicons name="pencil-outline" size={16} color={colors.mutedSoft} />
        </Pressable>
        <Pressable onPress={onDelete} hitSlop={8} style={{ marginLeft: 12 }}>
          <Ionicons name="trash-outline" size={16} color={colors.mutedSoft} />
        </Pressable>
      </View>
    </Card>
  );
}

function TaskFormModal({
  visible,
  onClose,
  subjects,
  onSave,
  initialTask,
}: {
  visible: boolean;
  onClose: () => void;
  subjects: { id: string; name: string }[];
  onSave: (t: { title: string; subjectId?: string; deadline: string; notes?: string; attachments: Attachment[] }) => void;
  initialTask?: Task | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEdit = !!initialTask;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>(subjects[0]?.id);
  const [dateIso, setDateIso] = useState(toISODate(new Date()));
  const [timeMinutes, setTimeMinutes] = useState(17 * 60);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [step, setStep] = useState<'form' | 'date'>('form');

  const reset = () => {
    setTitle('');
    setNotes('');
    setSubjectId(subjects[0]?.id);
    setDateIso(toISODate(new Date()));
    setTimeMinutes(17 * 60);
    setAttachments([]);
    setStep('form');
  };

  React.useEffect(() => {
    if (visible) {
      if (initialTask) {
        const d = new Date(initialTask.deadline);
        setTitle(initialTask.title);
        setNotes(initialTask.notes ?? '');
        setSubjectId(initialTask.subjectId);
        setDateIso(toISODate(d));
        setTimeMinutes(d.getHours() * 60 + d.getMinutes());
        setAttachments(initialTask.attachments ?? []);
      } else {
        setTitle('');
        setNotes('');
        setSubjectId(subjects[0]?.id);
        setDateIso(toISODate(new Date()));
        setTimeMinutes(17 * 60);
        setAttachments([]);
      }
      setStep('form');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialTask]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Please name this task.');
      return;
    }
    const [y, m, d] = dateIso.split('-').map(Number);
    const deadline = new Date(y, m - 1, d, Math.floor(timeMinutes / 60), timeMinutes % 60).toISOString();
    onSave({ title: title.trim(), subjectId, deadline, notes: notes.trim() || undefined, attachments });
    reset();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title={step === 'date' ? 'Pick deadline date' : isEdit ? 'Edit task' : 'New task'}
      maxHeight={700}
    >
      {step === 'form' ? (
        <View>
          <FormField label="Task title" placeholder="e.g. Submit lab report" value={title} onChangeText={setTitle} />

          <Text style={styles.fieldLabel}>Subject (optional)</Text>
          <View style={styles.chipsWrap}>
            {subjects.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => setSubjectId(subjectId === s.id ? undefined : s.id)}
                style={[styles.chip, subjectId === s.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              >
                <Text style={[styles.chipText, subjectId === s.id && { color: colors.onPrimary }]}>{s.name}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable style={styles.dateRow} onPress={() => setStep('date')}>
            <Ionicons name="calendar-outline" size={16} color={colors.accentBlue} />
            <Text style={styles.dateRowText}>{dateIso}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.mutedSoft} />
          </Pressable>

          <Stepper
            label="Time"
            value={minutesToLabel(timeMinutes)}
            onDecrement={() => setTimeMinutes((v) => (v - 30 + 1440) % 1440)}
            onIncrement={() => setTimeMinutes((v) => (v + 30) % 1440)}
          />

          <View style={{ marginTop: spacing.md }}>
            <FormField
              label="Notes (optional)"
              placeholder="Any details..."
              value={notes}
              onChangeText={setNotes}
              multiline
              style={{ height: 80, textAlignVertical: 'top' }}
            />
          </View>

          <AttachmentField attachments={attachments} onChange={setAttachments} label="Attach file or photo (optional)" />

          <PrimaryButton label={isEdit ? 'Save changes' : 'Add task'} onPress={handleSave} full style={{ marginTop: spacing.sm }} />
        </View>
      ) : (
        <View>
          <MonthCalendar selectedIso={dateIso} onSelect={setDateIso} />
          <PrimaryButton label="Confirm date" onPress={() => setStep('form')} full style={{ marginTop: spacing.md }} />
        </View>
      )}
    </ModalSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    summaryRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg },
    summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 14 },
    ringSummaryCard: { gap: 6 },
    summaryNumber: { ...font.displaySm, color: colors.ink },
    summaryLabel: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    taskCard: {},
    taskRow: { flexDirection: 'row', alignItems: 'flex-start' },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.hairlineStrong,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    taskTitle: { ...font.titleSm, color: colors.ink },
    taskTitleDone: { textDecorationLine: 'line-through', color: colors.mutedSoft },
    metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' },
    taskSubject: { ...font.caption, color: colors.muted },
    dotSep: { ...font.caption, color: colors.mutedSoft, marginHorizontal: 5 },
    taskDeadline: { ...font.caption, fontWeight: '700' },
    taskNotes: { ...font.bodySm, color: colors.mutedSoft, marginTop: 6 },
    fieldLabel: { ...font.caption, color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.surfaceCardAlt },
    chipText: { ...font.bodySm, color: colors.body, fontWeight: '600' },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: 14,
      paddingVertical: 12,
      marginBottom: spacing.md,
    },
    dateRowText: { ...font.bodyMd, color: colors.ink, flex: 1 },
  });
}
