import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { font } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function ProgressRing({
  percent,
  size = 64,
  strokeWidth = 7,
  color,
  label,
  centerComponent,
  glassEffect = false,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  centerComponent?: React.ReactNode;
  glassEffect?: boolean;
}) {
  const { colors } = useTheme();
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = useSharedValue(0);
  const ringColor = color ?? (percent >= 75 ? colors.success : percent >= 60 ? colors.warning : colors.error);

  useEffect(() => {
    progress.value = withTiming(percent / 100, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [percent]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {glassEffect && (
        <View style={{ position: 'absolute', width: size - strokeWidth, height: size - strokeWidth, borderRadius: (size - strokeWidth) / 2, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
          <BlurView 
            tint="dark"
            intensity={25} 
            style={StyleSheet.absoluteFill} 
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
        </View>
      )}
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={glassEffect ? 'rgba(255,255,255,0.1)' : colors.surfaceStrong} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}, ${circumference}`}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {centerComponent ? (
            centerComponent
          ) : (
            <>
              <Text style={[font.titleSm, { color: colors.ink }]}>{Math.round(percent)}%</Text>
              {label ? <Text style={[font.caption, { color: colors.mutedSoft, fontSize: 9 }]}>{label}</Text> : null}
            </>
          )}
        </View>
      </View>
    </View>
  );
}
