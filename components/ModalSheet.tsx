import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

const OPEN_DURATION = 280;
const CLOSE_DURATION = 220;

export default function ModalSheet({
  visible,
  onClose,
  title,
  children,
  maxHeight,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxHeight?: number;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translate = useSharedValue(60);
  const opacity = useSharedValue(0);
  // Keep the RN Modal mounted for the duration of the exit animation, then
  // unmount it — this avoids the abrupt cut that happens when `visible`
  // flips to false and RN's own Modal fade fights with our slide animation.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      translate.value = withTiming(0, { duration: OPEN_DURATION, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: OPEN_DURATION, easing: Easing.out(Easing.cubic) });
    } else if (mounted) {
      translate.value = withTiming(60, { duration: CLOSE_DURATION, easing: Easing.in(Easing.cubic) });
      opacity.value = withTiming(0, { duration: CLOSE_DURATION, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(setMounted)(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translate.value }],
    opacity: opacity.value,
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[styles.sheet, sheetStyle, maxHeight ? { maxHeight } : null]}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.body} />
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
    sheet: {
      marginTop: 'auto',
      backgroundColor: colors.bgElevated,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingHorizontal: spacing.lg,
      paddingTop: 10,
      paddingBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderBottomWidth: 0,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.surfaceStrong,
      alignSelf: 'center',
      marginBottom: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: { ...font.titleLg, color: colors.ink },
    closeBtn: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.surfaceCardAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
