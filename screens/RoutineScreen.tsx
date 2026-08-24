import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, FadeInDown, Layout } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { radius, font, spacing, subjectColor, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { DAY_NAMES_SHORT, mondayIndexOfDate } from '../lib/dateUtils';
import { todayISODate, toISODate } from '../lib/storage';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { PrimaryButton, IconButton } from '../components/Buttons';
import ScreenHeader from '../components/ScreenHeader';
import ModalSheet from '../components/ModalSheet';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import WeeklyBarChart from '../components/WeeklyBarChart';
import SettingsButton from '../components/SettingsButton';
import AssistantButton from '../components/AssistantButton';
import RoutineDetailModal from '../components/RoutineDetailModal';
import { computeRoutineCurrentStreak } from '../lib/routineStats';
import { RoutineItem, RoutineFrequency } from '../lib/types';

const ICON_CHOICES: (keyof typeof Ionicons.glyphMap)[] = [
  'book-outline',
  'barbell-outline',
  'library-outline',
  'sunny-outline',
  'water-outline',
  'walk-outline',
  'moon-outline',
  'code-slash-outline',
  'musical-notes-outline',
  'nutrition-outline',
  'flask-outline',
  'bulb-outline',
];

export default function RoutineScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { routines, routineLogs, addRoutine, updateRoutine, removeRoutine, setRoutineDone, isRoutineDone, isRoutineScheduled } = useApp();
  const today = todayISODate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [addVisible, setAddVisible] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<RoutineItem | null>(null);
  const [detailRoutine, setDetailRoutine] = useState<RoutineItem | null>(null);

  const last7Dates = useMemo(() => {
    const arr: string[] = [];
    const base = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(base);
      d.setDate(d.getDate() - i);
      arr.push(toISODate(d));
    }
    return arr;
  }, []);

  const completionForDate = (dateIso: string) => {
    const scheduled = routines.filter((r) => !r.archived && isRoutineScheduled(r, dateIso));
    if (scheduled.length === 0) return null;
    const done = scheduled.filter((r) => isRoutineDone(r.id, dateIso)).length;
    return (done / scheduled.length) * 100;
  };

  const scheduledToday = useMemo(
    () => routines.filter((r) => !r.archived && isRoutineScheduled(r, selectedDate)),
    [routines, selectedDate, isRoutineScheduled]
  );

  const weeklyData = useMemo(
    () =>
      last7Dates.map((d) => {
        const pct = completionForDate(d);
        const dt = new Date(d + 'T00:00:00');
        return { label: DAY_NAMES_SHORT[mondayIndexOfDate(dt)].slice(0, 1), value: pct ?? 0, highlight: d === today };
      }),
    [last7Dates, routines, routineLogs]
  );

  const currentStreak = useMemo(() => {
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 120; i++) {
      const iso = toISODate(cursor);
      const scheduled = routines.filter((r) => !r.archived && isRoutineScheduled(r, iso));
      if (scheduled.length > 0) {
        const allDone = scheduled.every((r) => isRoutineDone(r.id, iso));
        if (allDone) {
          streak += 1;
        } else if (iso === today) {
          // today not finished yet — don't break streak display, just don't count it
        } else {
          break;
        }
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [routines, routineLogs]);

  const bestStreak = useMemo(() => {
    let best = 0;
    let running = 0;
    const cursor = new Date();
    cursor.setDate(cursor.getDate() - 59);
    for (let i = 0; i < 60; i++) {
      const iso = toISODate(cursor);
      const scheduled = routines.filter((r) => !r.archived && isRoutineScheduled(r, iso));
      if (scheduled.length > 0) {
        const allDone = scheduled.every((r) => isRoutineDone(r.id, iso));
        if (allDone) {
          running += 1;
          best = Math.max(best, running);
        } else {
          running = 0;
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return best;
  }, [routines, routineLogs]);

  const weeklyAvg = useMemo(() => {
    const vals = last7Dates.map((d) => completionForDate(d)).filter((v): v is number => v !== null);
    if (vals.length === 0) return 0;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [last7Dates, routines, routineLogs]);

  const handleToggle = (routineId: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRoutineDone(routineId, selectedDate, !isRoutineDone(routineId, selectedDate));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        eyebrow="Daily habits"
        title="Routine"
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 10 }}
          style={{ marginBottom: spacing.md }}
        >
          {last7Dates.map((iso) => {
            const dt = new Date(iso + 'T00:00:00');
            const pct = completionForDate(iso);
            const selected = iso === selectedDate;
            const isToday = iso === today;
            return (
              <Pressable key={iso} onPress={() => setSelectedDate(iso)} style={styles.dateChipWrap}>
                <View
                  style={[
                    styles.dateChip,
                    selected && styles.dateChipSelected,
                    !selected && isToday && styles.dateChipToday,
                  ]}
                >
                  <Text style={[styles.dateChipDay, selected && styles.dateChipDaySelected]}>
                    {DAY_NAMES_SHORT[mondayIndexOfDate(dt)].slice(0, 1)}
                  </Text>
                  <Text style={[styles.dateChipNum, selected && styles.dateChipNumSelected]}>{dt.getDate()}</Text>
                  {pct !== null && (
                    <View
                      style={[
                        styles.dateChipDot,
                        { backgroundColor: pct >= 100 ? colors.success : pct > 0 ? colors.warning : colors.hairlineStrong },
                      ]}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Card style={{ marginBottom: spacing.md }}>
            <View style={styles.checklistHeaderRow}>
              <Text style={styles.cardTitle}>
                {selectedDate === today ? "Today's checklist" : `Checklist · ${selectedDate}`}
              </Text>
              <Text style={styles.checklistCount}>
                {scheduledToday.filter((r) => isRoutineDone(r.id, selectedDate)).length}/{scheduledToday.length}
              </Text>
            </View>
            {scheduledToday.length === 0 ? (
              <EmptyState icon="bed-outline" title="Rest day" subtitle="No habits are scheduled for this day." />
            ) : (
              scheduledToday.map((routine, i) => (
                <Animated.View key={routine.id} entering={FadeInDown.delay(i * 40).duration(240)} layout={Layout}>
                  <RoutineRow
                    routine={routine}
                    done={isRoutineDone(routine.id, selectedDate)}
                    streak={computeRoutineCurrentStreak(routine, isRoutineDone, isRoutineScheduled)}
                    onToggle={() => handleToggle(routine.id)}
                    onOpenDetail={() => setDetailRoutine(routine)}
                  />
                </Animated.View>
              ))
            )}
          </Card>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Ionicons name="flame" size={18} color={colors.accentOrange} />
              <Text style={styles.statNumber}>{currentStreak}</Text>
              <Text style={styles.statLabel}>Day streak</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="trophy" size={18} color={colors.accentAmber} />
              <Text style={styles.statNumber}>{bestStreak}</Text>
              <Text style={styles.statLabel}>Best streak</Text>
            </Card>
            <Card style={styles.statCard}>
              <Ionicons name="stats-chart" size={18} color={colors.accentBlue} />
              <Text style={styles.statNumber}>{Math.round(weeklyAvg)}%</Text>
              <Text style={styles.statLabel}>Weekly avg</Text>
            </Card>
          </View>

          <Card>
            <Text style={styles.cardTitle}>This week</Text>
            <Text style={styles.chartSubtitle}>Daily habit completion rate</Text>
            <View style={{ marginTop: spacing.md }}>
              <WeeklyBarChart data={weeklyData} color={colors.accentEmerald} />
            </View>
          </Card>
        </View>
      </ScrollView>

      <AddRoutineModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={(r) => {
          addRoutine(r);
          setAddVisible(false);
        }}
      />

      <AddRoutineModal
        visible={!!editingRoutine}
        onClose={() => setEditingRoutine(null)}
        initialRoutine={editingRoutine}
        onSave={(r) => {
          if (editingRoutine) updateRoutine(editingRoutine.id, r);
          setEditingRoutine(null);
        }}
      />

      <RoutineDetailModal
        routine={detailRoutine}
        visible={!!detailRoutine}
        onClose={() => setDetailRoutine(null)}
        isRoutineDone={isRoutineDone}
        isRoutineScheduled={isRoutineScheduled}
        onToggleDate={(routineId, iso) => setRoutineDone(routineId, iso, !isRoutineDone(routineId, iso))}
        onDelete={(routineId) => removeRoutine(routineId)}
        onEdit={(routine) => {
          setDetailRoutine(null);
          setEditingRoutine(routine);
        }}
      />
    </SafeAreaView>
  );
}

function RoutineRow({
  routine,
  done,
  streak,
  onToggle,
  onOpenDetail,
}: {
  routine: RoutineItem;
  done: boolean;
  streak: number;
  onToggle: () => void;
  onOpenDetail: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = subjectColor(routine.colorSeed, colors);

  const handleToggle = () => {
    scale.value = withSpring(1.12, { damping: 8, stiffness: 220 }, () => {
      scale.value = withSpring(1, { damping: 10, stiffness: 200 });
    });
    onToggle();
  };

  const swipeableRef = React.useRef<any>(null);

  const handleFocusSwipe = () => {
    swipeableRef.current?.close();
    navigation.navigate('FocusSession', { taskTitle: routine.title });
  };

  const renderLeftActions = () => {
    return (
      <View style={[styles.swipeAction, { backgroundColor: colors.accentBlue }]}>
        <Ionicons name="timer-outline" size={24} color={colors.bg} />
        <Text style={styles.swipeActionText}>Focus</Text>
      </View>
    );
  };

  return (
    <Swipeable 
      ref={swipeableRef}
      renderLeftActions={renderLeftActions} 
      overshootLeft={true}
      onSwipeableOpen={handleFocusSwipe}
    >
      <View style={styles.routineRow}>
        <Pressable onPress={onOpenDetail} style={styles.routineMainArea}>
          <View style={[styles.routineIconWrap, { backgroundColor: color + '1f' }]}>
            <Ionicons name={routine.icon as any} size={17} color={color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.routineTitle, done && styles.routineTitleDone]} numberOfLines={1}>
              {routine.title}
            </Text>
            <View style={styles.routineMetaRow}>
              <Text style={styles.routineFrequency}>{frequencyLabel(routine)}</Text>
              {streak > 0 && (
                <>
                  <Text style={styles.dotSep}>·</Text>
                  <Ionicons name="flame" size={11} color={colors.accentOrange} />
                  <Text style={styles.streakText}>{streak}</Text>
                </>
              )}
              <Text style={styles.dotSep}>·</Text>
              <Ionicons name="stats-chart-outline" size={10} color={colors.mutedSoft} />
            </View>
          </View>
        </Pressable>
        <Pressable onPress={handleToggle} hitSlop={8}>
          <Animated.View style={animStyle}>
            <View style={[styles.checkbox, done && { backgroundColor: colors.success, borderColor: colors.success }]}>
              {done && <Ionicons name="checkmark" size={15} color={colors.bg} />}
            </View>
          </Animated.View>
        </Pressable>
      </View>
    </Swipeable>
  );
}

function frequencyLabel(routine: RoutineItem) {
  if (routine.frequency === 'daily') return 'Every day';
  if (routine.frequency === 'weekdays') return 'Weekdays';
  const days = (routine.customDays ?? []).map((d) => DAY_NAMES_SHORT[d].slice(0, 1)).join(' ');
  return days || 'Custom';
}

function AddRoutineModal({
  visible,
  onClose,
  onSave,
  initialRoutine,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (r: { title: string; icon: string; colorSeed: string; frequency: RoutineFrequency; customDays?: number[] }) => void;
  initialRoutine?: RoutineItem | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEdit = !!initialRoutine;
  const [title, setTitle] = useState('');
  const [icon, setIcon] = useState<keyof typeof Ionicons.glyphMap>(ICON_CHOICES[0]);
  const [frequency, setFrequency] = useState<RoutineFrequency>('daily');
  const [customDays, setCustomDays] = useState<number[]>([0, 1, 2, 3, 4]);

  React.useEffect(() => {
    if (visible) {
      if (initialRoutine) {
        setTitle(initialRoutine.title);
        setIcon(initialRoutine.icon as keyof typeof Ionicons.glyphMap);
        setFrequency(initialRoutine.frequency);
        setCustomDays(initialRoutine.customDays ?? [0, 1, 2, 3, 4]);
      } else {
        setTitle('');
        setIcon(ICON_CHOICES[0]);
        setFrequency('daily');
        setCustomDays([0, 1, 2, 3, 4]);
      }
    }
  }, [visible, initialRoutine]);

  const reset = () => {
    setTitle('');
    setIcon(ICON_CHOICES[0]);
    setFrequency('daily');
    setCustomDays([0, 1, 2, 3, 4]);
  };

  const toggleCustomDay = (idx: number) => {
    setCustomDays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx].sort()));
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Please name this habit.');
      return;
    }
    onSave({
      title: title.trim(),
      icon,
      colorSeed: initialRoutine?.colorSeed ?? title.trim() + Date.now(),
      frequency,
      customDays: frequency === 'custom' ? customDays : undefined,
    });
    reset();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title={isEdit ? 'Edit habit' : 'New habit'}
      maxHeight={640}
    >
      <FormField label="Habit title" placeholder="e.g. Revise flashcards" value={title} onChangeText={setTitle} />

      <Text style={styles.fieldLabel}>Icon</Text>
      <View style={styles.iconGrid}>
        {ICON_CHOICES.map((ic) => (
          <Pressable
            key={ic}
            onPress={() => setIcon(ic)}
            style={[styles.iconChoice, icon === ic && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Ionicons name={ic} size={18} color={icon === ic ? colors.onPrimary : colors.body} />
          </Pressable>
        ))}
      </View>

      <Text style={styles.fieldLabel}>Frequency</Text>
      <View style={styles.chipsWrap}>
        {(['daily', 'weekdays', 'custom'] as RoutineFrequency[]).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFrequency(f)}
            style={[styles.chip, frequency === f && { backgroundColor: colors.primary, borderColor: colors.primary }]}
          >
            <Text style={[styles.chipText, frequency === f && { color: colors.onPrimary }]}>
              {f === 'daily' ? 'Daily' : f === 'weekdays' ? 'Weekdays' : 'Custom'}
            </Text>
          </Pressable>
        ))}
      </View>

      {frequency === 'custom' && (
        <View style={[styles.chipsWrap, { marginTop: -4 }]}>
          {DAY_NAMES_SHORT.map((d, i) => (
            <Pressable
              key={d}
              onPress={() => toggleCustomDay(i)}
              style={[styles.dayToggle, customDays.includes(i) && { backgroundColor: colors.accentBlueSoft, borderColor: colors.accentBlue }]}
            >
              <Text style={[styles.dayToggleText, customDays.includes(i) && { color: colors.accentBlue }]}>{d.slice(0, 1)}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <PrimaryButton label={isEdit ? 'Save changes' : 'Add habit'} onPress={handleSave} full style={{ marginTop: spacing.lg }} />
    </ModalSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    addBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    dateChipWrap: { alignItems: 'center' },
    dateChip: {
      width: 46,
      paddingVertical: 10,
      borderRadius: radius.lg,
      alignItems: 'center',
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      gap: 4,
    },
    dateChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    dateChipToday: { borderColor: colors.accentBlue },
    dateChipDay: { ...font.caption, fontSize: 10, color: colors.mutedSoft },
    dateChipDaySelected: { color: colors.onPrimary },
    dateChipNum: { ...font.titleSm, color: colors.ink },
    dateChipNumSelected: { color: colors.onPrimary },
    dateChipDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
    checklistHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    cardTitle: { ...font.titleMd, color: colors.ink },
    checklistCount: { ...font.titleSm, color: colors.muted },
    chartSubtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    routineRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.hairlineSoft },
    routineMainArea: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    routineIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    routineTitle: { ...font.titleSm, color: colors.ink },
    routineTitleDone: { color: colors.mutedSoft, textDecorationLine: 'line-through' },
    routineMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 },
    routineFrequency: { ...font.caption, color: colors.mutedSoft },
    dotSep: { ...font.caption, color: colors.mutedSoft, marginHorizontal: 2 },
    streakText: { ...font.caption, color: colors.accentOrange, fontWeight: '700' },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.hairlineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
    statNumber: { ...font.titleLg, color: colors.ink, marginTop: 2 },
    statLabel: { ...font.caption, color: colors.mutedSoft, fontSize: 10 },
    fieldLabel: { ...font.caption, color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    iconChoice: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCardAlt,
    },
    chipText: { ...font.bodySm, color: colors.body, fontWeight: '600' },
    dayToggle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayToggleText: { ...font.caption, fontWeight: '700', color: colors.mutedSoft },
    swipeAction: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: colors.hairlineSoft,
      width: 80,
    },
    swipeActionText: { ...font.caption, color: colors.bg, fontWeight: '700', marginTop: 4 },
  });
}
