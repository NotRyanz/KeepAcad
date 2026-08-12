import React, { useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export default function FormField({ label, style, ...rest }: TextInputProps & { label: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.mutedSoft} style={[styles.input, style]} {...rest} />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: { ...font.caption, color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.ink,
      fontSize: 15,
    },
  });
}
