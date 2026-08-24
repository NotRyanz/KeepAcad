import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import {
  useAudioRecorder,
  useAudioPlayer,
  useAudioPlayerStatus,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { persistPickedFile, openFileOrLink } from '../lib/fileStorage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  FadeInDown,
  Layout,
} from 'react-native-reanimated';

import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { getMonthMatrix, formatMonthYear, formatDayHeading, WEEKDAY_LABELS } from '../lib/dateUtils';
import { todayISODate } from '../lib/storage';
import { useApp } from '../context/AppContext';
import Card from '../components/Card';
import { PrimaryButton, IconButton } from '../components/Buttons';
import ScreenHeader from '../components/ScreenHeader';
import ModalSheet from '../components/ModalSheet';
import EmptyState from '../components/EmptyState';
import SettingsButton from '../components/SettingsButton';
import AssistantButton from '../components/AssistantButton';
import { NoteEntry } from '../lib/types';

export default function CalendarScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { notes, addNote, updateNote, removeNote } = useApp();
  const today = todayISODate();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedIso, setSelectedIso] = useState(today);

  const [recordVisible, setRecordVisible] = useState(false);
  const [transcriptFor, setTranscriptFor] = useState<NoteEntry | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState('');

  const weeks = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const entriesByDate = useMemo(() => {
    const map: Record<string, number> = {};
    notes.forEach((n) => {
      map[n.date] = (map[n.date] || 0) + 1;
    });
    return map;
  }, [notes]);

  const dayEntries = useMemo(
    () => notes.filter((n) => n.date === selectedIso).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [notes, selectedIso]
  );

  const isToday = selectedIso === today;

  const goMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  const handleAddPhoto = async (fromCamera: boolean) => {
    try {
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow access to continue.');
        return;
      }
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 0.7, allowsEditing: false })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsEditing: false, mediaTypes: ['images'] });
      if (result.canceled) return;
      const asset = result.assets[0];
      const fallbackName = `photo-${Date.now()}.jpg`;
      const { uri, name } = await persistPickedFile(asset.uri, asset.fileName || fallbackName);
      addNote({ date: selectedIso, type: 'photo', uri, title: name });
    } catch (e) {
      Alert.alert('Could not add photo', 'Something went wrong accessing your media.');
    }
  };

  const handleAddFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const { uri, name } = await persistPickedFile(asset.uri, asset.name);
      addNote({ date: selectedIso, type: 'file', uri, title: name });
    } catch (e) {
      Alert.alert('Could not attach file', 'Something went wrong.');
    }
  };

  const openTranscriptEditor = (entry: NoteEntry) => {
    setTranscriptFor(entry);
    setTranscriptDraft(entry.transcript ?? '');
  };

  const saveTranscript = () => {
    if (transcriptFor) {
      updateNote(transcriptFor.id, { transcript: transcriptDraft });
    }
    setTranscriptFor(null);
    setTranscriptDraft('');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={dayEntries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <ScreenHeader
              eyebrow="This semester"
              title="Calendar"
              right={
                <View style={styles.headerActions}>
                  <AssistantButton />
                  <SettingsButton />
                  <IconButton
                    icon="today-outline"
                    onPress={() => {
                      setViewYear(now.getFullYear());
                      setViewMonth(now.getMonth());
                      setSelectedIso(today);
                    }}
                  />
                </View>
              }
            />

            <Card style={{ marginHorizontal: spacing.lg, marginBottom: spacing.md }}>
              <View style={styles.monthRow}>
                <IconButton icon="chevron-back" size={32} onPress={() => goMonth(-1)} />
                <Text style={styles.monthLabel}>{formatMonthYear(viewYear, viewMonth)}</Text>
                <IconButton icon="chevron-forward" size={32} onPress={() => goMonth(1)} />
              </View>

              <View style={styles.weekLabelsRow}>
                {WEEKDAY_LABELS.map((l, i) => (
                  <Text key={i} style={styles.weekLabel}>
                    {l}
                  </Text>
                ))}
              </View>

              {weeks.map((week, wi) => (
                <View key={wi} style={styles.weekRow}>
                  {week.map((cell) => {
                    const selected = cell.iso === selectedIso;
                    const isTodayCell = cell.iso === today;
                    const hasEntries = !!entriesByDate[cell.iso];
                    return (
                      <Pressable key={cell.iso} style={styles.dayCell} onPress={() => setSelectedIso(cell.iso)}>
                        <View
                          style={[
                            styles.dayCircle,
                            selected && styles.dayCircleSelected,
                            !selected && isTodayCell && styles.dayCircleToday,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              !cell.inMonth && styles.dayNumberOutside,
                              selected && styles.dayNumberSelected,
                              !selected && isTodayCell && styles.dayNumberToday,
                            ]}
                          >
                            {cell.date.getDate()}
                          </Text>
                        </View>
                        <View style={[styles.dot, hasEntries ? { opacity: 1 } : { opacity: 0 }]} />
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </Card>

            <View style={styles.selectedHeaderRow}>
              <View>
                <Text style={styles.selectedTitle}>{formatDayHeading(selectedIso)}</Text>
                {isToday && <Text style={styles.todayTag}>Today</Text>}
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable
                style={[styles.actionBtn, !isToday && styles.actionBtnDisabled]}
                onPress={() => {
                  if (!isToday) {
                    Alert.alert('Recording locked', 'Live audio recording is only available on the current date.');
                    return;
                  }
                  setRecordVisible(true);
                }}
              >
                <Ionicons name="mic" size={18} color={isToday ? colors.accentBlue : colors.mutedSoft} />
                <Text style={[styles.actionLabel, !isToday && { color: colors.mutedSoft }]}>Record</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleAddPhoto(false)}>
                <Ionicons name="image" size={18} color={colors.accentEmerald} />
                <Text style={styles.actionLabel}>Photo</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => handleAddPhoto(true)}>
                <Ionicons name="camera" size={18} color={colors.accentViolet} />
                <Text style={styles.actionLabel}>Cam</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={handleAddFile}>
                <Ionicons name="document-attach" size={18} color={colors.accentAmber} />
                <Text style={styles.actionLabel}>File</Text>
              </Pressable>
              <Pressable
                style={styles.actionBtn}
                onPress={() => {
                  const entry = addNote({ date: selectedIso, type: 'text', title: 'Quick note', transcript: '' });
                  openTranscriptEditor(entry);
                }}
              >
                <Ionicons name="create" size={18} color={colors.accentOrange} />
                <Text style={styles.actionLabel}>Note</Text>
              </Pressable>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <Animated.View entering={FadeInDown.duration(280)} layout={Layout} style={{ paddingHorizontal: spacing.lg }}>
            <NoteCard
              entry={item}
              onEditTranscript={() => openTranscriptEditor(item)}
              onDelete={() => removeNote(item.id)}
            />
          </Animated.View>
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No entries for this day"
            subtitle="Record a lecture, snap a photo of your notes, or jot a quick note."
          />
        }
        contentContainerStyle={{ paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      />

      <RecordModal
        visible={recordVisible}
        onClose={() => setRecordVisible(false)}
        onSaved={(entry) => {
          setRecordVisible(false);
          openTranscriptEditor(entry);
        }}
        date={selectedIso}
      />

      <ModalSheet visible={!!transcriptFor} onClose={saveTranscript} title="Edit transcript" maxHeight={520}>
        <Text style={styles.transcriptHint}>
          Tip: tap the microphone icon on your keyboard to dictate speech-to-text, or type manually.
        </Text>
        <TranscriptInput value={transcriptDraft} onChange={setTranscriptDraft} />
        <PrimaryButton label="Save transcript" onPress={saveTranscript} full style={{ marginTop: spacing.md }} />
      </ModalSheet>
    </SafeAreaView>
  );
}

function TranscriptInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { colors } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder="Start typing or dictate your lecture transcript here..."
      placeholderTextColor={colors.mutedSoft}
      multiline
      textAlignVertical="top"
      style={{
        minHeight: 220,
        backgroundColor: colors.surfaceCardAlt,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: 14,
        color: colors.ink,
        fontSize: 15,
        lineHeight: 22,
      }}
    />
  );
}

function NoteCard({
  entry,
  onEditTranscript,
  onDelete,
}: {
  entry: NoteEntry;
  onEditTranscript: () => void;
  onDelete: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const player = useAudioPlayer(entry.type === 'audio' && entry.uri ? entry.uri : null);
  const status = useAudioPlayerStatus(player);
  const playing = status.playing;

  // Reset playback to the start once a clip finishes, so tapping play again
  // restarts from 0 instead of doing nothing (the player stays "loaded" but
  // paused at the end position otherwise).
  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish]);

  const togglePlay = () => {
    if (!entry.uri) return;
    try {
      if (playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (e) {
      Alert.alert('Playback error', 'Could not play this recording.');
    }
  };

  const icon = entry.type === 'audio' ? 'mic' : entry.type === 'photo' ? 'image' : entry.type === 'file' ? 'document-attach' : 'document-text';
  const iconColor = entry.type === 'audio' ? colors.accentBlue : entry.type === 'photo' ? colors.accentEmerald : entry.type === 'file' ? colors.accentAmber : colors.accentOrange;

  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <View style={styles.noteHeaderRow}>
        <View style={[styles.noteIconWrap, { backgroundColor: iconColor + '22' }]}>
          <Ionicons name={icon as any} size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.noteTitle}>{entry.title || (entry.type === 'audio' ? 'Lecture recording' : 'Note')}</Text>
          <Text style={styles.noteTime}>{new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={16} color={colors.mutedSoft} />
        </Pressable>
      </View>

      {entry.type === 'audio' && (
        <View style={styles.audioRow}>
          <Pressable style={styles.playBtn} onPress={togglePlay}>
            <Ionicons name={playing ? 'pause' : 'play'} size={16} color={colors.onPrimary} />
          </Pressable>
          <View style={styles.waveform}>
            {Array.from({ length: 24 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 3,
                  marginHorizontal: 1.5,
                  borderRadius: 2,
                  height: 6 + ((i * 37) % 20),
                  backgroundColor: colors.hairlineStrong,
                }}
              />
            ))}
          </View>
        </View>
      )}

      {entry.type === 'photo' && entry.uri && (
        <Pressable onPress={() => openFileOrLink(entry.uri)}>
          <Image source={{ uri: entry.uri }} style={styles.photoThumb} contentFit="cover" />
        </Pressable>
      )}

      {entry.type === 'file' && entry.uri && (
        <Pressable onPress={() => openFileOrLink(entry.uri)} style={styles.fileBoxWrap}>
          <View style={styles.fileBox}>
            <Ionicons name="document-attach" size={20} color={colors.accentAmber} />
            <Text style={styles.fileBoxText} numberOfLines={1}>{entry.title || 'Attached File'}</Text>
          </View>
        </Pressable>
      )}

      <Pressable onPress={onEditTranscript} style={styles.transcriptBox}>
        <Text style={entry.transcript ? styles.transcriptText : styles.transcriptPlaceholder} numberOfLines={4}>
          {entry.transcript || 'Tap to add transcript / notes...'}
        </Text>
      </Pressable>
    </Card>
  );
}

function RecordModal({
  visible,
  onClose,
  onSaved,
  date,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: (entry: NoteEntry) => void;
  date: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { addNote } = useApp();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      pulse.value = withRepeat(withSequence(withTiming(1.18, { duration: 650 }), withTiming(1, { duration: 650 })), -1, true);
    } else {
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    if (!visible) {
      stopEverything();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const stopEverything = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setSeconds(0);
    if (isRecording) {
      try {
        await recorder.stop();
      } catch (e) {}
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      const perm = await requestRecordingPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone permission needed', 'Please allow microphone access to record lectures.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (e) {
      Alert.alert('Could not start recording', 'Your device or browser may not support audio recording here.');
    }
  };

  const stopRecording = async () => {
    if (!isRecording) return;
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      await recorder.stop();
      const uri = recorder.uri;
      const entry = addNote({
        date,
        type: 'audio',
        uri: uri ?? undefined,
        title: 'Lecture recording',
        durationMs: seconds * 1000,
        transcript: '',
      });
      setIsRecording(false);
      setSeconds(0);
      onSaved(entry);
    } catch (e) {
      Alert.alert('Could not save recording', 'Something went wrong while saving the audio.');
    }
  };

  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');

  return (
    <ModalSheet visible={visible} onClose={onClose} title="Record lecture audio">
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <Text style={styles.timerText}>
          {mm}:{ss}
        </Text>
        <Animated.View style={[styles.micOuter, pulseStyle, isRecording && { borderColor: colors.error }]}>
          <Pressable style={[styles.micInner, isRecording && { backgroundColor: colors.error }]} onPress={isRecording ? stopRecording : startRecording}>
            <Ionicons name={isRecording ? 'stop' : 'mic'} size={30} color={colors.onPrimary} />
          </Pressable>
        </Animated.View>
        <Text style={styles.micHint}>
          {isRecording ? 'Recording... tap to stop and save' : 'Tap to start recording your class'}
        </Text>
      </View>
    </ModalSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerActions: { flexDirection: 'row', gap: 8 },
    monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
    monthLabel: { ...font.titleMd, color: colors.ink },
    weekLabelsRow: { flexDirection: 'row', marginBottom: 6 },
    weekLabel: { flex: 1, textAlign: 'center', ...font.caption, color: colors.mutedSoft },
    weekRow: { flexDirection: 'row' },
    dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
    dayCircle: { width: 34, height: 34, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
    dayCircleSelected: { backgroundColor: colors.primary },
    dayCircleToday: { borderWidth: 1.5, borderColor: colors.accentBlue },
    dayNumber: { ...font.bodySm, color: colors.body },
    dayNumberOutside: { color: colors.mutedSoft, opacity: 0.4 },
    dayNumberSelected: { color: colors.onPrimary, fontWeight: '700' },
    dayNumberToday: { color: colors.accentBlue, fontWeight: '700' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.accentBlue, marginTop: 2 },
    selectedHeaderRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
    selectedTitle: { ...font.titleLg, color: colors.ink },
    todayTag: { ...font.caption, color: colors.accentBlue, marginTop: 2 },
    actionRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: 10 },
    actionBtn: {
      flex: 1,
      backgroundColor: colors.surfaceCard,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.hairline,
      alignItems: 'center',
      paddingVertical: 12,
      gap: 6,
    },
    actionBtnDisabled: { opacity: 0.55 },
    actionLabel: { ...font.caption, color: colors.body },
    noteHeaderRow: { flexDirection: 'row', alignItems: 'center' },
    noteIconWrap: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    noteTitle: { ...font.titleSm, color: colors.ink },
    noteTime: { ...font.caption, color: colors.mutedSoft, marginTop: 1 },
    audioRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    playBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    waveform: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    photoThumb: { width: '100%', height: 160, borderRadius: radius.md, marginTop: 12, backgroundColor: colors.surfaceCardAlt },
    transcriptBox: {
      marginTop: 12,
      backgroundColor: colors.surfaceSoft,
      borderRadius: radius.md,
      padding: 12,
      borderWidth: 1,
      borderColor: colors.hairlineSoft,
    },
    transcriptText: { ...font.bodySm, color: colors.body, lineHeight: 19 },
    transcriptPlaceholder: { ...font.bodySm, color: colors.mutedSoft, fontStyle: 'italic' },
    transcriptHint: { ...font.bodySm, color: colors.mutedSoft, marginBottom: spacing.sm, lineHeight: 18 },
    fileBoxWrap: { marginTop: 12 },
    fileBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceCardAlt, padding: 12, borderRadius: radius.md, gap: 10 },
    fileBoxText: { ...font.bodyMd, color: colors.ink, flexShrink: 1 },
    timerText: { ...font.displayLg, color: colors.ink, marginBottom: spacing.lg, fontVariant: ['tabular-nums'] },
    micOuter: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 1.5,
      borderColor: colors.hairlineStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micInner: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.accentBlue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    micHint: { ...font.bodySm, color: colors.mutedSoft, marginTop: spacing.lg, textAlign: 'center' },
  });
}
