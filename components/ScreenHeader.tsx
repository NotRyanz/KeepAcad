import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export default function ScreenHeader({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingTop: 12,
      paddingBottom: spacing.md,
    },
    eyebrow: { ...font.caption, color: colors.mutedSoft, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    title: { ...font.displayMd, color: colors.ink },
  });
}
