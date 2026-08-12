import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { font, radius, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { IconButton } from './Buttons';

export default function Stepper({
  label,
  value,
  onDecrement,
  onIncrement,
}: {
  label: string;
  value: string;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <IconButton icon="remove" size={32} onPress={onDecrement} />
        <Text style={styles.value}>{value}</Text>
        <IconButton icon="add" size={32} onPress={onIncrement} />
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: 12,
      alignItems: 'center',
      flex: 1,
    },
    label: { ...font.caption, color: colors.muted, marginBottom: 8, textTransform: 'uppercase' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    value: { ...font.titleMd, color: colors.ink, minWidth: 76, textAlign: 'center' },
  });
}
