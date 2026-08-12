import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { font, radius, spacing, subjectColor, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import ModalSheet from './ModalSheet';
import Card from './Card';
import HabitMonthCalendar from './HabitMonthCalendar';
import { SecondaryButton, PrimaryButton } from './Buttons';
import { RoutineItem } from '../lib/types';
import {
  computeRoutineCurrentStreak,
  computeRoutineBestStreak,
  computeRoutineOverallStats,
  computeRoutineMonthStats,
} from '../lib/routineStats';

export default function RoutineDetailModal({
  routine,
  visible,
  onClose,
  isRoutineDone,
  isRoutineScheduled,
  onToggleDate,
  onDelete,
  onEdit,
}: {
  routine: RoutineItem | null;
  visible: boolean;
  onClose: () => void;
  isRoutineDone: (routineId: string, date: string) => boolean;
  isRoutineScheduled: (routine: RoutineItem, date: string) => boolean;
  onToggleDate: (routineId: string, date: string) => void;
  onDelete: (routineId: string) => void;
  onEdit: (routine: RoutineItem) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = new Date();
  const [monthYear, setMonthYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());

  if (!routine) return null;
  const color = subjectColor(routine.colorSeed, colors);

  const currentStreak = computeRoutineCurrentStreak(routine, isRoutineDone, isRoutineScheduled);
  const bestStreak = computeRoutineBestStreak(routine, isRoutineDone, isRoutineScheduled);
  const overall = computeRoutineOverallStats(routine, isRoutineDone, isRoutineScheduled);
  const monthStats = computeRoutineMonthStats(routine, isRoutineDone, isRoutineScheduled, monthYear, monthIdx);

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Habit analytics" maxHeight={720}>
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
          <Ionicons name={routine.icon as any} size={20} color={color} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>{routine.title}</Text>
          <Text style={styles.subtitle}>{frequencyLabel(routine)}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Ionicons name="flame" size={16} color={colors.accentOrange} />
          <Text style={styles.statNumber}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Current streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="trophy" size={16} color={colors.accentAmber} />
          <Text style={styles.statNumber}>{bestStreak}</Text>
          <Text style={styles.statLabel}>Best streak</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="analytics" size={16} color={colors.accentBlue} />
          <Text style={styles.statNumber}>{Math.round(overall.percent)}%</Text>
          <Text style={styles.statLabel}>Last 90 days</Text>
        </Card>
      </View>

      <Card style={{ marginBottom: spacing.md }}>
        <View style={styles.monthStatsRow}>
          <Text style={styles.cardTitle}>Consistency calendar</Text>
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>
              {monthStats.done}/{monthStats.scheduled} this month
            </Text>
          </View>
        </View>
        <Text style={styles.cardSubtitle}>Tap a past day to toggle it done or missed</Text>
        <View style={{ marginTop: spacing.sm }}>
          <HabitMonthCalendar
            routine={routine}
            isRoutineDone={isRoutineDone}
            isRoutineScheduled={isRoutineScheduled}
            onToggleDate={(iso) => onToggleDate(routine.id, iso)}
            onMonthChange={(y, m) => {
              setMonthYear(y);
              setMonthIdx(m);
            }}
          />
        </View>
      </Card>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <PrimaryButton label="Edit habit" icon="pencil-outline" style={{ flex: 1 }} onPress={() => onEdit(routine)} />
        <SecondaryButton
          label="Delete"
          icon="trash-outline"
          style={{ flex: 1, backgroundColor: colors.errorSoft, borderColor: colors.errorSoft }}
          onPress={() =>
            Alert.alert('Remove habit', `Delete "${routine.title}" and its history?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  onDelete(routine.id);
                  onClose();
                },
              },
            ])
          }
        />
      </View>
    </ModalSheet>
  );
}

function frequencyLabel(routine: RoutineItem) {
  if (routine.frequency === 'daily') return 'Every day';
  if (routine.frequency === 'weekdays') return 'Weekdays only';
  return 'Custom schedule';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    iconWrap: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
    title: { ...font.titleLg, color: colors.ink },
    subtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: 14, gap: 4 },
    statNumber: { ...font.titleLg, color: colors.ink, marginTop: 2 },
    statLabel: { ...font.caption, color: colors.mutedSoft, fontSize: 9, textAlign: 'center' },
    cardTitle: { ...font.titleMd, color: colors.ink },
    cardSubtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 4 },
    monthStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    monthBadge: { backgroundColor: colors.accentBlueSoft, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
    monthBadgeText: { ...font.caption, color: colors.accentBlue, fontSize: 11, fontWeight: '700' },
  });
}
