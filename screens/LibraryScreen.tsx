import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { radius, font, spacing, subjectColor, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { PrimaryButton } from '../components/Buttons';
import ModalSheet from '../components/ModalSheet';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import SettingsButton from '../components/SettingsButton';
import AssistantButton from '../components/AssistantButton';

export default function LibraryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { subjects, resources, addSubject } = useApp();
  const navigation = useNavigation<any>();
  const [addVisible, setAddVisible] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const countBySubject = useMemo(() => {
    const map: Record<string, number> = {};
    resources.forEach((r) => (map[r.subjectId] = (map[r.subjectId] || 0) + 1));
    return map;
  }, [resources]);

  const handleAdd = () => {
    if (!name.trim()) return;
    addSubject(name.trim(), code.trim() || undefined);
    setName('');
    setCode('');
    setAddVisible(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        eyebrow="Reference material"
        title="Library"
        right={
          <View style={styles.headerActions}>
            <AssistantButton />
            <SettingsButton />
            <Pressable style={styles.addBtn} onPress={() => setAddVisible(true)}>
              <Ionicons name="add" size={20} color={colors.onPrimary} />
            </Pressable>
          </View>
        }
      />
      <FlatList
        data={subjects}
        keyExtractor={(s) => s.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ paddingBottom: 150, gap: spacing.md }}
        ListEmptyComponent={
          <EmptyState icon="library-outline" title="No subjects yet" subtitle="Add a subject to start collecting references." />
        }
        renderItem={({ item, index }) => {
          const color = subjectColor(item.colorSeed, colors);
          return (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(280)} style={{ flex: 1 }}>
              <Pressable onPress={() => navigation.navigate('SubjectDetail', { subjectId: item.id })}>
                <Card style={{ minHeight: 128 }}>
                  <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
                    <Ionicons name="book" size={18} color={color} />
                  </View>
                  <Text style={styles.subjectName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.code ? <Text style={styles.subjectCode}>{item.code}</Text> : null}
                  <Text style={styles.resourceCount}>{countBySubject[item.id] || 0} resources</Text>
                </Card>
              </Pressable>
            </Animated.View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      <ModalSheet visible={addVisible} onClose={() => setAddVisible(false)} title="Add subject">
        <FormField label="Subject name" placeholder="e.g. Organic Chemistry" value={name} onChangeText={setName} />
        <FormField label="Code (optional)" placeholder="e.g. CH301" value={code} onChangeText={setCode} />
        <PrimaryButton label="Add subject" onPress={handleAdd} full />
      </ModalSheet>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    subjectName: { ...font.titleSm, color: colors.ink, marginBottom: 2 },
    subjectCode: { ...font.caption, color: colors.mutedSoft, marginBottom: 8 },
    resourceCount: { ...font.caption, color: colors.muted, marginTop: 'auto' },
  });
}
