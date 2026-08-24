import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { font, spacing, radius, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { getMonthMatrix, formatMonthYear, WEEKDAY_LABELS } from '../lib/dateUtils';
import { todayISODate } from '../lib/storage';
import { IconButton } from './Buttons';
import { RoutineItem } from '../lib/types';

type DayStatus = 'done' | 'missed' | 'upcoming' | 'none';

export default function HabitMonthCalendar({
  routine,
  isRoutineDone,
  isRoutineScheduled,
  onToggleDate,
  onMonthChange,
}: {
  routine: RoutineItem;
  isRoutineDone: (routineId: string, date: string) => boolean;
  isRoutineScheduled: (routine: RoutineItem, date: string) => boolean;
  onToggleDate?: (iso: string) => void;
  onMonthChange?: (year: number, month: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const today = todayISODate();

  const weeks = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const createdAtIso = routine.createdAt ? routine.createdAt.slice(0, 10) : null;

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
    onMonthChange?.(y, m);
  };

  const statusFor = (iso: string): DayStatus => {
    if (createdAtIso && iso < createdAtIso) return 'none';
    if (!isRoutineScheduled(routine, iso)) return 'none';
    if (isRoutineDone(routine.id, iso)) return 'done';
    if (iso > today) return 'upcoming';
    return 'missed';
  };

  return (
    <View>
      <View style={styles.monthRow}>
        <IconButton icon="chevron-back" size={30} onPress={() => goMonth(-1)} />
        <Text style={styles.monthLabel}>{formatMonthYear(viewYear, viewMonth)}</Text>
        <IconButton icon="chevron-forward" size={30} onPress={() => goMonth(1)} />
      </View>
      <View style={styles.weekLabelsRow}>
        {WEEKDAY_LABELS.map((l, i) => (
          <Text key={i} style={styles.weekLabel}>
            {l}
          </Text>
        ))}
      </View>
      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((cell) => {
            const status = statusFor(cell.iso);
            const isToday = cell.iso === today;
            const disabled = status === 'none' || status === 'upcoming' || !cell.inMonth;
            return (
              <Pressable
                key={cell.iso}
                style={styles.dayCell}
                disabled={disabled}
                onPress={() => onToggleDate?.(cell.iso)}
              >
                <View
                  style={[
                    styles.dayCircle,
                    status === 'done' && { backgroundColor: colors.success },
                    status === 'missed' && { backgroundColor: colors.errorSoft, borderWidth: 1, borderColor: colors.error },
                    status === 'upcoming' && { borderWidth: 1, borderColor: colors.hairlineStrong },
                    isToday && status !== 'done' && { borderWidth: 1.5, borderColor: colors.accentBlue },
                  ]}
                >
                  {status === 'done' ? (
                    <Ionicons name="checkmark" size={13} color={colors.bg} />
                  ) : (
                    <Text
                      style={[
                        styles.dayNumber,
                        !cell.inMonth && styles.dayNumberOutside,
                        status === 'missed' && { color: colors.error },
                        isToday && { color: colors.accentBlue, fontWeight: '700' },
                      ]}
                    >
                      {cell.date.getDate()}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      <View style={styles.legendRow}>
        <LegendDot color={colors.success} label="Done" />
        <LegendDot color={colors.error} label="Missed" outline />
        <LegendDot color={colors.hairlineStrong} label="Upcoming" outline />
      </View>
    </View>
  );
}

function LegendDot({ color, label, outline }: { color: string; label: string; outline?: boolean }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, outline ? { borderWidth: 1.5, borderColor: color } : { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    monthLabel: { ...font.titleMd, color: colors.ink },
    weekLabelsRow: { flexDirection: 'row', marginBottom: 6 },
    weekLabel: { flex: 1, textAlign: 'center', ...font.caption, color: colors.mutedSoft },
    weekRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    dayCircle: { width: 30, height: 30, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
    dayNumber: { ...font.bodySm, color: colors.body, fontSize: 12 },
    dayNumberOutside: { color: colors.mutedSoft, opacity: 0.3 },
    legendRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, marginTop: spacing.md },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendLabel: { ...font.caption, color: colors.mutedSoft, fontSize: 11 },
  });
}
