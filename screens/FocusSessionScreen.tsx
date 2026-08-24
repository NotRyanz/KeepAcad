import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, Layout, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

import { useTheme } from '../context/ThemeContext';
import { radius, font, spacing, ThemeColors, subjectColor, subjectSoftColor } from '../lib/theme';
import { PrimaryButton, IconButton } from '../components/Buttons';
import ProgressRing from '../components/ProgressRing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import BackgroundMedia from '../components/BackgroundMedia';

type FocusStatus = 'setup' | 'running' | 'paused' | 'finished';

const PRESET_MINUTES = [10, 25, 45, 60];

export default function FocusSessionScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation();
  const route = useRoute<any>();
  const taskTitle = route.params?.taskTitle || 'Focus Session';

  const [status, setStatus] = useState<FocusStatus>('setup');
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // in seconds

  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'audio' | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [videoFit, setVideoFit] = useState<'cover' | 'contain'>('cover');

  useEffect(() => {
    AsyncStorage.getItem('focus_media').then(val => {
      if (val) {
        const { uri, type, muted, fit } = JSON.parse(val);
        setMediaUri(uri);
        setMediaType(type);
        if (muted !== undefined) setIsMuted(muted);
        if (fit !== undefined) setVideoFit(fit);
      }
    });
  }, []);

  const pickMedia = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['video/*', 'audio/*'] });
      if (!result.canceled) {
        const asset = result.assets[0];
        const type = asset.mimeType?.startsWith('video/') ? 'video' : 'audio';
        setMediaUri(asset.uri);
        setMediaType(type);
        AsyncStorage.setItem('focus_media', JSON.stringify({ uri: asset.uri, type, muted: isMuted, fit: videoFit }));
      }
    } catch (e) {}
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (mediaUri && mediaType) {
      AsyncStorage.setItem('focus_media', JSON.stringify({ uri: mediaUri, type: mediaType, muted: next, fit: videoFit }));
    }
  };

  const toggleFit = () => {
    const next = videoFit === 'cover' ? 'contain' : 'cover';
    setVideoFit(next);
    if (mediaUri && mediaType) {
      AsyncStorage.setItem('focus_media', JSON.stringify({ uri: mediaUri, type: mediaType, muted: isMuted, fit: next }));
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (status === 'running' && timeLeft === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStatus('finished');
    }
    return () => clearInterval(interval);
  }, [status, timeLeft]);

  const startSession = () => {
    setTimeLeft(selectedMinutes * 60);
    setStatus('running');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const togglePause = () => {
    setStatus(status === 'running' ? 'paused' : 'running');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const endSession = () => {
    setStatus('finished');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeScreen = () => {
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const baseColor = useMemo(() => subjectColor(taskTitle, colors), [taskTitle, colors]);
  const softColor = useMemo(() => subjectSoftColor(taskTitle, colors), [taskTitle, colors]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 4000, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // infinite
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: status === 'running' ? 0.08 : 0.03,
  }));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: softColor }]}>
      {mediaUri && mediaType && (
        <BackgroundMedia uri={mediaUri} type={mediaType} muted={isMuted} status={status} videoFit={videoFit} />
      )}
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
        <Animated.View style={[{ position: 'absolute', width: 350, height: 350, borderRadius: 175, backgroundColor: baseColor }, pulseStyle]} />
        <Animated.View style={[{ position: 'absolute', width: 550, height: 550, borderRadius: 275, backgroundColor: baseColor }, pulseStyle]} />
        <Animated.View style={[{ position: 'absolute', width: 800, height: 800, borderRadius: 400, backgroundColor: baseColor }, pulseStyle]} />
      </View>
      <View style={styles.header} pointerEvents="box-none">
        <IconButton icon="close" onPress={closeScreen} />
      </View>

      <View style={styles.content} pointerEvents="box-none">
        <Text style={[styles.eyebrow, { color: baseColor }]}>Focusing on</Text>
        <Text style={styles.title} numberOfLines={2}>{taskTitle}</Text>

        {status === 'setup' && (
          <Animated.View entering={FadeIn} exiting={FadeOut} layout={Layout} style={styles.setupContainer}>
            <Text style={styles.prompt}>Select duration</Text>
            <View style={styles.presetGrid}>
              {PRESET_MINUTES.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => {
                    setSelectedMinutes(m);
                    Haptics.selectionAsync();
                  }}
                  style={[styles.presetBtn, selectedMinutes === m && { borderColor: baseColor, backgroundColor: softColor }]}
                >
                  <Text style={[styles.presetText, selectedMinutes === m && { color: baseColor }]}>{m}m</Text>
                </Pressable>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Pressable onPress={pickMedia} style={styles.mediaPickerBtn}>
                <Ionicons name={mediaType === 'video' ? 'videocam' : mediaType === 'audio' ? 'musical-notes' : 'add-circle-outline'} size={18} color={baseColor} />
                <Text style={[styles.mediaPickerText, { color: baseColor }]}>
                  {mediaUri ? 'Change Track' : 'Add Background Track'}
                </Text>
              </Pressable>

              {mediaType === 'video' && (
                <Pressable onPress={toggleFit} style={styles.mediaPickerBtn}>
                  <Ionicons name={videoFit === 'cover' ? 'scan' : 'expand'} size={18} color={baseColor} />
                  <Text style={[styles.mediaPickerText, { color: baseColor }]}>
                    {videoFit === 'cover' ? 'Fill Screen' : 'Fit to Screen'}
                  </Text>
                </Pressable>
              )}
            </View>

            <PrimaryButton label="Start Session" onPress={startSession} style={{ marginTop: spacing.xl, paddingHorizontal: 40 }} />
          </Animated.View>
        )}

        {(status === 'running' || status === 'paused') && (
          <Animated.View entering={FadeIn} exiting={FadeOut} layout={Layout} style={styles.timerContainer}>
            <ProgressRing
              percent={(timeLeft / (selectedMinutes * 60)) * 100}
              size={300}
              strokeWidth={14}
              color={status === 'paused' ? colors.warning : baseColor}
              centerComponent={
                <Text style={[styles.timerText, status === 'paused' && styles.timerPaused]}>
                  {formatTime(timeLeft)}
                </Text>
              }
            />
            
            <View style={styles.controlsRow}>
              {mediaUri && (
                <Pressable style={[styles.circleBtn, styles.circleBtnSmall]} onPress={toggleMute}>
                  <Ionicons name={isMuted ? 'volume-mute' : 'volume-medium'} size={20} color={colors.muted} />
                </Pressable>
              )}
              <Pressable style={styles.circleBtn} onPress={togglePause}>
                <Ionicons name={status === 'running' ? 'pause' : 'play'} size={28} color={colors.ink} />
              </Pressable>
              <Pressable style={[styles.circleBtn, { backgroundColor: colors.surfaceCardAlt }]} onPress={endSession}>
                <Ionicons name="stop" size={24} color={colors.muted} />
              </Pressable>
              {mediaUri && (
                <View style={[styles.circleBtnSmall, { opacity: 0 }]} /> 
              )}
            </View>
          </Animated.View>
        )}

        {status === 'finished' && (
          <Animated.View entering={FadeIn} layout={Layout} style={styles.finishedContainer}>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark-circle" size={80} color={colors.success} />
            </View>
            <Text style={styles.finishedTitle}>Session Complete!</Text>
            <Text style={styles.finishedSubtitle}>Great job staying focused.</Text>
            <PrimaryButton label="Done" onPress={closeScreen} style={{ marginTop: spacing.xl, paddingHorizontal: 40 }} />
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    header: { padding: spacing.md, alignItems: 'flex-start' },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingBottom: 60 },
    eyebrow: { ...font.caption, color: colors.accentBlue, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    title: { ...font.titleLg, color: colors.ink, textAlign: 'center', marginBottom: 40 },
    
    setupContainer: { alignItems: 'center', width: '100%' },
    prompt: { ...font.bodyMd, color: colors.muted, marginBottom: spacing.lg },
    presetGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
    presetBtn: {
      width: 70, height: 70, borderRadius: 35,
      backgroundColor: colors.surfaceCard,
      borderWidth: 2, borderColor: 'transparent',
      alignItems: 'center', justifyContent: 'center',
    },
    presetText: { ...font.titleMd, color: colors.muted },
    
    mediaPickerBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      marginTop: spacing.xl,
      paddingVertical: 10, paddingHorizontal: 16,
      borderRadius: radius.full,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1, borderColor: colors.hairlineSoft,
    },
    mediaPickerText: { ...font.bodySm, fontWeight: '600' },

    timerContainer: { alignItems: 'center', width: '100%' },
    timerText: { fontSize: 72, fontWeight: '800', color: colors.ink, fontVariant: ['tabular-nums'] },
    timerPaused: { opacity: 0.5 },
    controlsRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center', marginTop: 40 },
    circleBtn: {
      width: 72, height: 72, borderRadius: 36,
      backgroundColor: colors.surfaceCard,
      borderWidth: 1, borderColor: colors.hairline,
      alignItems: 'center', justifyContent: 'center',
    },
    circleBtnSmall: {
      width: 48, height: 48, borderRadius: 24,
      borderWidth: 0,
    },

    finishedContainer: { alignItems: 'center', width: '100%' },
    successCircle: { marginBottom: spacing.lg },
    finishedTitle: { ...font.titleLg, color: colors.ink, marginBottom: 8 },
    finishedSubtitle: { ...font.bodyMd, color: colors.muted },
  });
}
