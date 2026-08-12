import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { font, radius } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

export type BarDatum = {
  label: string;
  value: number; // 0-100
  highlight?: boolean;
};

export default function WeeklyBarChart({ data, height = 96, color }: { data: BarDatum[]; height?: number; color?: string }) {
  const { colors } = useTheme();
  const barColor = color ?? colors.accentBlue;

  return (
    <View style={styles.wrap}>
      <View style={[styles.chartRow, { height }]}>
        {data.map((d, i) => (
          <Bar key={i} datum={d} index={i} height={height} color={d.highlight ? colors.ink : barColor} trackColor={colors.surfaceStrong} />
        ))}
      </View>
      <View style={styles.labelsRow}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.label, { color: d.highlight ? colors.ink : colors.mutedSoft }]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({
  datum,
  index,
  height,
  color,
  trackColor,
}: {
  datum: BarDatum;
  index: number;
  height: number;
  color: string;
  trackColor: string;
}) {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withDelay(index * 60, withTiming(datum.value / 100, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [datum.value]);

  const style = useAnimatedStyle(() => ({
    height: Math.max(4, anim.value * height),
  }));

  return (
    <View style={[localStyles.barTrack, { height, backgroundColor: trackColor }]}>
      <Animated.View style={[localStyles.barFill, style, { backgroundColor: color }]} />
    </View>
  );
}

const localStyles = StyleSheet.create({
  barTrack: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: radius.sm,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: radius.sm,
  },
});

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end' },
  labelsRow: { flexDirection: 'row', marginTop: 8 },
  label: { flex: 1, textAlign: 'center', ...font.caption, fontSize: 10, marginHorizontal: 4 },
});
