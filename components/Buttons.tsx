import React, { useMemo } from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, ActivityIndicator, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { radius, font, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import Ionicons from '@expo/vector-icons/Ionicons';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function useTapScale() {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => {
    scale.value = withTiming(0.96, { duration: 90 });
  };
  const onPressOut = () => {
    scale.value = withTiming(1, { duration: 140 });
  };
  return { style, onPressIn, onPressOut };
}

function haptic() {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

type BtnProps = {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  full?: boolean;
};

export function PrimaryButton({ label, onPress, icon, disabled, loading, style, full }: BtnProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { style: animStyle, onPressIn, onPressOut } = useTapScale();
  return (
    <AnimatedPressable
      disabled={disabled || loading}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        styles.primary,
        full && { width: '100%' },
        disabled && { backgroundColor: colors.primaryDisabled },
        animStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.onPrimary} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={16} color={disabled ? colors.mutedSoft : colors.onPrimary} style={{ marginRight: 8 }} />}
          <Text style={[styles.primaryLabel, disabled && { color: colors.mutedSoft }]}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

export function SecondaryButton({ label, onPress, icon, disabled, style, full }: BtnProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { style: animStyle, onPressIn, onPressOut } = useTapScale();
  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={() => {
        haptic();
        onPress?.();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.secondary, full && { width: '100%' }, animStyle, style]}
    >
      {icon && <Ionicons name={icon} size={16} color={colors.ink} style={{ marginRight: 8 }} />}
      <Text style={styles.secondaryLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

export function IconButton({
  icon,
  onPress,
  size = 36,
  color,
  bg,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  bg?: string;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const { style: animStyle, onPressIn, onPressOut } = useTapScale();
  return (
    <AnimatedPressable
      onPress={() => {
        haptic();
        onPress?.();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[
        {
          width: size,
          height: size,
          borderRadius: radius.full,
          backgroundColor: bg ?? colors.surfaceCardAlt,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: colors.hairline,
        },
        animStyle,
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={color ?? colors.ink} />
    </AnimatedPressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    primary: {
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 20,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryLabel: { ...font.button, color: colors.onPrimary },
    secondary: {
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.md,
      paddingVertical: 12,
      paddingHorizontal: 20,
      height: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    secondaryLabel: { ...font.button, color: colors.ink },
  });
}
