import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { font, spacing, radius, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { getMonthMatrix, formatMonthYear, WEEKDAY_LABELS } from '../lib/dateUtils';
import { todayISODate } from '../lib/storage';
import { IconButton } from './Buttons';

export default function MonthCalendar({
  selectedIso,
  onSelect,
  markedDates,
}: {
  selectedIso: string;
  onSelect: (iso: string) => void;
  markedDates?: Record<string, boolean>;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const base = selectedIso ? new Date(selectedIso + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(base.getFullYear());
  const [viewMonth, setViewMonth] = useState(base.getMonth());
  const today = todayISODate();

  const weeks = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);

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
            const selected = cell.iso === selectedIso;
            const isToday = cell.iso === today;
            return (
              <Pressable key={cell.iso} style={styles.dayCell} onPress={() => onSelect(cell.iso)}>
                <View style={[styles.dayCircle, selected && styles.dayCircleSelected, !selected && isToday && styles.dayCircleToday]}>
                  <Text
                    style={[
                      styles.dayNumber,
                      !cell.inMonth && styles.dayNumberOutside,
                      selected && styles.dayNumberSelected,
                      !selected && isToday && styles.dayNumberToday,
                    ]}
                  >
                    {cell.date.getDate()}
                  </Text>
                </View>
                {markedDates?.[cell.iso] && <View style={styles.dot} />}
              </Pressable>
            );
          })}
        </View>
      ))}
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
    dayCircle: { width: 32, height: 32, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
    dayCircleSelected: { backgroundColor: colors.primary },
    dayCircleToday: { borderWidth: 1.5, borderColor: colors.accentBlue },
    dayNumber: { ...font.bodySm, color: colors.body },
    dayNumberOutside: { color: colors.mutedSoft, opacity: 0.4 },
    dayNumberSelected: { color: colors.onPrimary, fontWeight: '700' },
    dayNumberToday: { color: colors.accentBlue, fontWeight: '700' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accentBlue, marginTop: 2, position: 'absolute', bottom: 2 },
  });
}
