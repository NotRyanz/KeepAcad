import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { font, radius, spacing, ThemeColors } from '../lib/theme';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useAI } from '../context/AIContext';
import ModalSheet from './ModalSheet';

const OPTIONS: { key: ThemeMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'light', label: 'Light', icon: 'sunny' },
  { key: 'dark', label: 'Dark', icon: 'moon' },
  { key: 'system', label: 'Auto', icon: 'phone-portrait-outline' },
];

export default function SettingsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, mode, setMode, scheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ai = useAI();
  const navigation = useNavigation<any>();

  const openAssistant = () => {
    onClose();
    navigation.navigate('Assistant');
  };

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Settings">
      <Text style={styles.sectionLabel}>AI Assistant</Text>
      <Pressable style={styles.aiRow} onPress={openAssistant}>
        <View style={[styles.aiIconWrap, { backgroundColor: colors.accentVioletSoft }]}>
          <Ionicons name="sparkles" size={18} color={colors.accentViolet} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aiTitle}>Study Assistant</Text>
          <Text style={styles.aiSubtitle}>{ai.connected ? 'Connected · Gemini' : 'Optional · Not connected'}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: ai.connected ? colors.success : colors.hairlineStrong }]} />
        <Ionicons name="chevron-forward" size={16} color={colors.mutedSoft} style={{ marginLeft: 6 }} />
      </Pressable>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>Appearance</Text>
      <View style={styles.optionsRow}>
        {OPTIONS.map((opt) => {
          const active = mode === opt.key;
          return (
            <Pressable key={opt.key} onPress={() => setMode(opt.key)} style={[styles.optionCard, active && styles.optionCardActive]}>
              <View style={[styles.optionIconWrap, active && { backgroundColor: colors.ink + '14' }]}>
                <Ionicons name={opt.icon} size={18} color={active ? colors.ink : colors.mutedSoft} />
              </View>
              <Text style={[styles.optionLabel, active && { color: colors.ink }]}>{opt.label}</Text>
              {active && (
                <View style={styles.checkDot}>
                  <Ionicons name="checkmark" size={10} color={colors.onPrimary} />
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.hint}>
        Auto follows your device's system appearance. Currently rendering in {scheme === 'dark' ? 'dark' : 'light'} mode.
      </Text>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>About</Text>
      <View style={styles.aboutRow}>
        <View style={styles.aboutIconWrap}>
          <Ionicons name="school" size={18} color={colors.accentBlue} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.aboutTitle}>Academic Manager</Text>
          <Text style={styles.aboutSubtitle}>Version 1.0 · Built for focused, organized semesters</Text>
        </View>
      </View>
    </ModalSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    sectionLabel: { ...font.caption, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
    optionsRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.sm },
    optionCard: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 16,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCardAlt,
      position: 'relative',
    },
    optionCardActive: {
      borderColor: colors.hairlineStrong,
      backgroundColor: colors.surfaceSoft,
    },
    optionIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.surfaceStrong + '55',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    optionLabel: { ...font.bodySm, fontWeight: '600', color: colors.mutedSoft },
    checkDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.ink,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: { ...font.caption, color: colors.mutedSoft, lineHeight: 17, marginBottom: spacing.lg },
    divider: { height: 1, backgroundColor: colors.hairlineSoft, marginBottom: spacing.lg },
    aboutRow: { flexDirection: 'row', alignItems: 'center' },
    aboutIconWrap: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: colors.accentBlueSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    aboutTitle: { ...font.titleSm, color: colors.ink },
    aboutSubtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    aiRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: 12,
      marginBottom: spacing.lg,
    },
    aiIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    aiTitle: { ...font.titleSm, color: colors.ink },
    aiSubtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
  });
}
