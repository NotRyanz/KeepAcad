import React, { useEffect, useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, LayoutChangeEvent, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { radius, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

const ICONS: Record<string, { active: any; inactive: any }> = {
  CalendarTab: { active: 'calendar', inactive: 'calendar-outline' },
  ScheduleTab: { active: 'grid', inactive: 'grid-outline' },
  RoutineTab: { active: 'flame', inactive: 'flame-outline' },
  LibraryTab: { active: 'library', inactive: 'library-outline' },
  TasksTab: { active: 'checkmark-done', inactive: 'checkmark-done-outline' },
};

type ItemLayout = { x: number; width: number };

export default function TabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [layouts, setLayouts] = useState<Record<number, ItemLayout>>({});

  const translateX = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillOpacity = useSharedValue(0);

  useEffect(() => {
    const l = layouts[state.index];
    if (l) {
      translateX.value = withTiming(l.x, { duration: 260, easing: Easing.out(Easing.cubic) });
      pillWidth.value = withTiming(l.width, { duration: 260, easing: Easing.out(Easing.cubic) });
      pillOpacity.value = withTiming(1, { duration: 180 });
    }
  }, [state.index, layouts]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: pillWidth.value,
    opacity: pillOpacity.value,
  }));

  const onItemLayout = (index: number, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setLayouts((prev) => {
      const existing = prev[index];
      if (existing && existing.x === x && existing.width === width) return prev;
      return { ...prev, [index]: { x, width } };
    });
  };

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 14) }]} pointerEvents="box-none">
      <View style={styles.barShadowWrap} pointerEvents="box-none">
        <View style={styles.bar}>
          <Animated.View style={[styles.activePill, pillStyle]} />
          {state.routes.map((route: any, index: number) => {
            const focused = state.index === index;
            const iconSet = ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

            const onPress = () => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <Pressable key={route.key} onPress={onPress} onLayout={(e) => onItemLayout(index, e)} style={styles.item}>
                <Ionicons
                  name={focused ? iconSet.active : iconSet.inactive}
                  size={23}
                  color={focused ? colors.ink : colors.mutedSoft}
                />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 28,
      backgroundColor: 'transparent',
    },
    barShadowWrap: {
      borderRadius: radius.xl,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.32,
      shadowRadius: 22,
      elevation: 14,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgElevated,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingVertical: 12,
      paddingHorizontal: 14,
      gap: 8,
      position: 'relative',
    },
    activePill: {
      position: 'absolute',
      top: 8,
      bottom: 8,
      left: 0,
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceCardAlt,
      borderWidth: 1,
      borderColor: colors.hairlineStrong,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, zIndex: 1 },
  });
}
