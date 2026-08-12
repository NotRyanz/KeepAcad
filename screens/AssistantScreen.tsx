import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeIn } from 'react-native-reanimated';

import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useAI } from '../context/AIContext';
import { useApp } from '../context/AppContext';
import { buildAppContextPrompt } from '../lib/aiContextBuilder';
import { PrimaryButton, IconButton } from '../components/Buttons';
import ChatBubble from '../components/ChatBubble';
import TypingDots from '../components/TypingDots';
import EmptyState from '../components/EmptyState';

const SUGGESTIONS = [
  "What's due soon?",
  "How's my attendance?",
  'Plan my next 3 hours',
  'Summarize my habits streak',
];

const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';

export default function AssistantScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const ai = useAI();
  const app = useApp();

  const systemPrompt = useMemo(
    () =>
      buildAppContextPrompt({
        subjects: app.subjects,
        sessions: app.sessions,
        attendance: app.attendance,
        tasks: app.tasks,
        routines: app.routines,
        isRoutineDone: app.isRoutineDone,
        isRoutineScheduled: app.isRoutineScheduled,
      }),
    [app.subjects, app.sessions, app.attendance, app.tasks, app.routines, app.routineLogs]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="sparkles" size={16} color={colors.accentViolet} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Study Assistant</Text>
            <Text style={styles.headerSubtitle}>{ai.connected ? 'Powered by Gemini · optional feature' : 'Not connected'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {ai.connected && ai.messages.length > 0 && (
            <IconButton
              icon="refresh-outline"
              size={34}
              onPress={() =>
                Alert.alert('Clear conversation', 'This will erase the chat history on this device.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => ai.clearConversation() },
                ])
              }
            />
          )}
          <IconButton icon="close" size={34} onPress={() => navigation.goBack()} />
        </View>
      </View>

      {ai.connected ? (
        <ChatView
          systemPrompt={systemPrompt}
          onDisconnect={() =>
            Alert.alert('Disconnect Gemini', 'Remove the saved API key from this device?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Disconnect', style: 'destructive', onPress: () => ai.disconnect() },
            ])
          }
        />
      ) : (
        <SetupView />
      )}
    </SafeAreaView>
  );
}

function ChatView({ systemPrompt, onDisconnect }: { systemPrompt: string; onDisconnect: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ai = useAI();
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const handleSend = (text?: string) => {
    const toSend = (text ?? input).trim();
    if (!toSend || ai.sending) return;
    setInput('');
    ai.sendMessage(toSend, systemPrompt);
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={ai.messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <ChatBubble message={item} />}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.md, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState
              icon="sparkles-outline"
              title="Ask me anything about your semester"
              subtitle="I can see your subjects, timetable, attendance, tasks, and habits to give grounded answers."
            />
            <View style={styles.suggestionsWrap}>
              {SUGGESTIONS.map((s) => (
                <Pressable key={s} style={styles.suggestionChip} onPress={() => handleSend(s)}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={ai.sending ? <TypingDots /> : null}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message your assistant..."
          placeholderTextColor={colors.mutedSoft}
          style={styles.input}
          multiline
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={() => handleSend()}
        />
        <Pressable
          style={[styles.sendBtn, (!input.trim() || ai.sending) && { backgroundColor: colors.primaryDisabled }]}
          onPress={() => handleSend()}
          disabled={!input.trim() || ai.sending}
        >
          <Ionicons name="arrow-up" size={18} color={!input.trim() || ai.sending ? colors.mutedSoft : colors.onPrimary} />
        </Pressable>
      </View>

      <Pressable style={styles.disconnectLink} onPress={onDisconnect}>
        <Ionicons name="log-out-outline" size={12} color={colors.mutedSoft} />
        <Text style={styles.disconnectLinkText}>Disconnect Gemini API key</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function SetupView() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const ai = useAI();
  const [key, setKey] = useState('');

  const handleConnect = async () => {
    const ok = await ai.connect(key);
    if (ok) setKey('');
  };

  const handleSaveAnyway = async () => {
    const ok = await ai.saveKeyWithoutVerifying(key);
    if (ok) setKey('');
  };

  const isRateLimited = ai.connectErrorStatus === 429;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeIn.duration(300)} style={styles.setupCard}>
          <View style={styles.setupIconWrap}>
            <Ionicons name="sparkles" size={26} color={colors.accentViolet} />
          </View>
          <Text style={styles.setupTitle}>Connect a free Gemini API key</Text>
          <Text style={styles.setupBody}>
            This is a completely optional feature. Bring your own free Google Gemini API key and chat with an
            assistant that can see your subjects, timetable, attendance, tasks, and habits — all processed
            on-device, with your key stored securely and never shared.
          </Text>

          <Pressable style={styles.linkRow} onPress={() => Linking.openURL(GEMINI_KEY_URL)}>
            <Ionicons name="open-outline" size={14} color={colors.accentBlue} />
            <Text style={styles.linkText}>Get a free API key from Google AI Studio</Text>
          </Pressable>

          <TextInput
            value={key}
            onChangeText={setKey}
            placeholder="Paste your Gemini API key"
            placeholderTextColor={colors.mutedSoft}
            style={styles.keyInput}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />

          {ai.connectError && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{ai.connectError}</Text>
            </View>
          )}

          <PrimaryButton
            label={ai.connecting ? 'Verifying...' : 'Connect & start chatting'}
            icon={ai.connecting ? undefined : 'checkmark-circle-outline'}
            loading={ai.connecting}
            onPress={handleConnect}
            full
            style={{ marginTop: spacing.md }}
          />

          {isRateLimited && (
            <Pressable style={styles.skipRow} onPress={handleSaveAnyway}>
              <Ionicons name="play-skip-forward-outline" size={13} color={colors.accentBlue} />
              <Text style={styles.skipText}>Skip verification and save this key anyway</Text>
            </Pressable>
          )}

          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.mutedSoft} />
            <Text style={styles.privacyText}>Your key is stored only on this device and used only to call Gemini directly.</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.hairlineSoft,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    headerIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accentVioletSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { ...font.titleSm, color: colors.ink },
    headerSubtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 1, fontSize: 11 },
    headerActions: { flexDirection: 'row', gap: 6 },
    suggestionsWrap: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.lg },
    suggestionChip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.hairline,
      backgroundColor: colors.surfaceCardAlt,
    },
    suggestionText: { ...font.bodySm, color: colors.body, fontWeight: '600', fontSize: 12.5 },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 10,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: 6,
      borderTopWidth: 1,
      borderTopColor: colors.hairlineSoft,
    },
    input: {
      flex: 1,
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: 16,
      paddingVertical: 11,
      color: colors.ink,
      fontSize: 15,
      maxHeight: 120,
    },
    sendBtn: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    disconnectLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10 },
    disconnectLinkText: { ...font.caption, color: colors.mutedSoft, fontSize: 11 },
    setupCard: {
      backgroundColor: colors.surfaceCard,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.hairline,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
    setupIconWrap: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: colors.accentVioletSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    setupTitle: { ...font.titleLg, color: colors.ink, marginBottom: 8 },
    setupBody: { ...font.bodySm, color: colors.muted, lineHeight: 20, marginBottom: spacing.md },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.lg },
    linkText: { ...font.bodySm, color: colors.accentBlue, fontWeight: '600' },
    keyInput: {
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.ink,
      fontSize: 14,
      marginBottom: spacing.sm,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      backgroundColor: colors.errorSoft,
      borderRadius: radius.md,
      padding: 10,
      marginBottom: spacing.sm,
    },
    errorText: { ...font.caption, color: colors.error, flex: 1, lineHeight: 16 },
    skipRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: spacing.md, paddingVertical: 6 },
    skipText: { ...font.caption, color: colors.accentBlue, fontWeight: '600' },
    privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.md },
    privacyText: { ...font.caption, color: colors.mutedSoft, flex: 1, lineHeight: 15, fontSize: 11 },
  });
}
