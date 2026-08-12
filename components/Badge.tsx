import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { radius, font, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export default function Badge({
  label,
  color,
  bg,
  small,
}: {
  label: string;
  color?: string;
  bg?: string;
  small?: boolean;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const resolvedColor = color ?? colors.accentBlue;
  return (
    <View style={[styles.base, { backgroundColor: bg ?? resolvedColor + '26' }, small && { paddingVertical: 2, paddingHorizontal: 8 }]}>
      <Text style={[styles.label, { color: resolvedColor }, small && { fontSize: 11 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      borderRadius: radius.pill,
      paddingVertical: 4,
      paddingHorizontal: 12,
      alignSelf: 'flex-start',
    },
    label: { ...font.caption },
  });
}
