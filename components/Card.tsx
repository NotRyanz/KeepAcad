import React, { useMemo } from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { radius, ThemeColors } from '../lib/theme';

type Props = ViewProps & { elevated?: boolean; muted?: boolean };

export default function Card({ style, elevated, muted, children, ...rest }: Props) {
  const { colors, shadow } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.base, muted && { backgroundColor: colors.surfaceSoft }, elevated && shadow.card, style]} {...rest}>
      {children}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      backgroundColor: colors.surfaceCard,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: 16,
    },
  });
}
