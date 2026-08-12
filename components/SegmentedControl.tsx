import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { radius, font, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

const PADDING = 4;

export default function SegmentedControl({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: number;
  onChange: (i: number) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [containerWidth, setContainerWidth] = useState(0);
  const translate = useSharedValue(0);
  const segWidth = containerWidth > 0 ? (containerWidth - PADDING * 2) / options.length : 0;

  useEffect(() => {
    translate.value = withTiming(selected * segWidth, { duration: 240, easing: Easing.out(Easing.cubic) });
  }, [selected, segWidth]);

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translate.value }],
    width: segWidth,
  }));

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {segWidth > 0 && <Animated.View style={[styles.pill, pillStyle]} />}
      {options.map((opt, i) => (
        <Pressable key={opt} style={styles.segment} onPress={() => onChange(i)}>
          <Text style={[styles.label, selected === i && styles.labelActive]}>{opt}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceSoft,
      borderRadius: radius.pill,
      padding: PADDING,
      position: 'relative',
      borderWidth: 1,
      borderColor: colors.hairline,
    },
    pill: {
      position: 'absolute',
      top: PADDING,
      bottom: PADDING,
      left: PADDING,
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.hairlineStrong,
    },
    segment: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
    label: { ...font.bodySm, fontWeight: '600', color: colors.mutedSoft },
    labelActive: { color: colors.ink },
  });
}
