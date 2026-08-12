import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { radius, font, spacing, subjectColor, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { persistPickedFile, openFileOrLink, fileExtensionLabel } from '../lib/fileStorage';
import Card from '../components/Card';
import { PrimaryButton, SecondaryButton, IconButton } from '../components/Buttons';
import ModalSheet from '../components/ModalSheet';
import FormField from '../components/FormField';
import EmptyState from '../components/EmptyState';
import { Resource, ResourceType } from '../lib/types';

export default function SubjectDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const TYPE_META: Record<ResourceType, { icon: any; color: string; label: string }> = {
    pdf: { icon: 'document-text', color: colors.accentBlue, label: 'PDF' },
    link: { icon: 'link', color: colors.accentViolet, label: 'Link' },
    image: { icon: 'image', color: colors.accentEmerald, label: 'Image' },
    book: { icon: 'book', color: colors.accentOrange, label: 'Book' },
    file: { icon: 'document-attach', color: colors.accentAmber, label: 'File' },
  };

  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { subjectId } = route.params;
  const { subjects, resources, addResource, updateResource, removeResource, updateSubject, removeSubject } = useApp();
  const subject = subjects.find((s) => s.id === subjectId);
  const [addVisible, setAddVisible] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editSubjectVisible, setEditSubjectVisible] = useState(false);

  const subjectResources = useMemo(() => resources.filter((r) => r.subjectId === subjectId), [resources, subjectId]);
  const color = subject ? subjectColor(subject.colorSeed, colors) : colors.accentBlue;

  if (!subject) return null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerRow}>
        <IconButton icon="chevron-back" onPress={() => navigation.goBack()} />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.title}>{subject.name}</Text>
          {subject.code ? <Text style={styles.subtitle}>{subject.code}</Text> : null}
        </View>
        <Pressable onPress={() => setEditSubjectVisible(true)} hitSlop={8} style={{ marginRight: 16 }}>
          <Ionicons name="pencil-outline" size={19} color={colors.mutedSoft} />
        </Pressable>
        <Pressable
          onPress={() =>
            Alert.alert('Remove subject', `Delete "${subject.name}" and all its resources?`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  removeSubject(subjectId);
                  navigation.goBack();
                },
              },
            ])
          }
        >
          <Ionicons name="trash-outline" size={20} color={colors.mutedSoft} />
        </Pressable>
      </View>

      <FlatList
        data={subjectResources}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 150, gap: spacing.sm }}
        ListEmptyComponent={
          <EmptyState icon="folder-open-outline" title="No resources yet" subtitle="Add textbooks, PDFs, or reference links for this subject." />
        }
        renderItem={({ item, index }) => {
          const meta = TYPE_META[item.type];
          return (
            <Animated.View entering={FadeInDown.delay(index * 40).duration(260)}>
              <Pressable onPress={() => openFileOrLink(item.uri)}>
                <Card style={styles.resourceRow}>
                  <View style={[styles.resIconWrap, { backgroundColor: meta.color + '22' }]}>
                    <Ionicons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.resTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.resMeta}>
                      {item.type === 'file' ? fileExtensionLabel(item.fileName) : meta.label}
                      {item.author ? ` · ${item.author}` : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => setEditingResource(item)} hitSlop={8} style={{ marginRight: 14 }}>
                    <Ionicons name="pencil-outline" size={15} color={colors.mutedSoft} />
                  </Pressable>
                  <Pressable onPress={() => removeResource(item.id)} hitSlop={8}>
                    <Ionicons name="close" size={16} color={colors.mutedSoft} />
                  </Pressable>
                </Card>
              </Pressable>
            </Animated.View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.fabWrap}>
        <PrimaryButton label="Add resource" icon="add" onPress={() => setAddVisible(true)} full />
      </View>

      <AddResourceModal visible={addVisible} onClose={() => setAddVisible(false)} onSave={(r) => addResource({ ...r, subjectId })} />

      <AddResourceModal
        visible={!!editingResource}
        onClose={() => setEditingResource(null)}
        initialResource={editingResource}
        onSave={(r) => {
          if (editingResource) updateResource(editingResource.id, r);
          setEditingResource(null);
        }}
      />

      <ModalSheet visible={editSubjectVisible} onClose={() => setEditSubjectVisible(false)} title="Edit subject">
        <EditSubjectForm
          subject={subject}
          onSave={(name, code) => {
            updateSubject(subjectId, { name, code });
            setEditSubjectVisible(false);
          }}
        />
      </ModalSheet>
    </SafeAreaView>
  );
}

function EditSubjectForm({
  subject,
  onSave,
}: {
  subject: { name: string; code?: string };
  onSave: (name: string, code?: string) => void;
}) {
  const [name, setName] = useState(subject.name);
  const [code, setCode] = useState(subject.code ?? '');

  return (
    <View>
      <FormField label="Subject name" placeholder="e.g. Organic Chemistry" value={name} onChangeText={setName} />
      <FormField label="Code (optional)" placeholder="e.g. CH301" value={code} onChangeText={setCode} />
      <PrimaryButton
        label="Save changes"
        onPress={() => {
          if (!name.trim()) return;
          onSave(name.trim(), code.trim() || undefined);
        }}
        full
      />
    </View>
  );
}

function AddResourceModal({
  visible,
  onClose,
  onSave,
  initialResource,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (r: Omit<Resource, 'id' | 'createdAt' | 'subjectId'>) => void;
  initialResource?: Resource | null;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isEdit = !!initialResource;
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [link, setLink] = useState('');
  const [pickedUri, setPickedUri] = useState<string | undefined>();
  const [pickedName, setPickedName] = useState<string | undefined>();
  const [pickedType, setPickedType] = useState<ResourceType>('link');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (visible) {
      if (initialResource) {
        setTitle(initialResource.title);
        setAuthor(initialResource.author ?? '');
        const isRemoteLink = initialResource.type === 'link' && !!initialResource.uri && /^https?:\/\//i.test(initialResource.uri);
        setLink(isRemoteLink ? initialResource.uri ?? '' : '');
        setPickedUri(isRemoteLink ? undefined : initialResource.uri);
        setPickedName(initialResource.fileName);
        setPickedType(initialResource.type);
      } else {
        setTitle('');
        setAuthor('');
        setLink('');
        setPickedUri(undefined);
        setPickedName(undefined);
        setPickedType('link');
      }
    }
  }, [visible, initialResource]);

  const reset = () => {
    setTitle('');
    setAuthor('');
    setLink('');
    setPickedUri(undefined);
    setPickedName(undefined);
    setPickedType('link');
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      const { uri, name } = await persistPickedFile(asset.uri, asset.name);
      setPickedUri(uri);
      setPickedName(name);
      setPickedType('file');
      if (!title) setTitle(name.replace(/\.[^/.]+$/, ''));
    } catch (e) {
      Alert.alert('Could not pick file', 'Please try again.');
    }
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission needed', 'Please allow access to your photos.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
      if (result.canceled) return;
      const asset = result.assets[0];
      const fallbackName = `photo-${Date.now()}.jpg`;
      const { uri, name } = await persistPickedFile(asset.uri, asset.fileName || fallbackName);
      setPickedUri(uri);
      setPickedName(name);
      setPickedType('image');
    } catch (e) {
      Alert.alert('Could not pick image', 'Please try again.');
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Add a title', 'Please give this resource a name.');
      return;
    }
    setSaving(true);
    const uri = pickedUri || (link.trim() ? link.trim() : undefined);
    const type: ResourceType = pickedUri ? pickedType : link.trim() ? 'link' : 'book';
    onSave({ title: title.trim(), author: author.trim() || undefined, type, uri, fileName: pickedName });
    setSaving(false);
    reset();
    onClose();
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={() => {
        reset();
        onClose();
      }}
      title={isEdit ? 'Edit reference' : 'Add reference'}
      maxHeight={620}
    >
      <FormField label="Title" placeholder="e.g. Introduction to Algorithms" value={title} onChangeText={setTitle} />
      <FormField label="Author / Source (optional)" placeholder="e.g. Cormen et al." value={author} onChangeText={setAuthor} />
      <FormField
        label="Link (optional)"
        placeholder="https://..."
        value={link}
        onChangeText={(v) => {
          setLink(v);
          setPickedUri(undefined);
          setPickedName(undefined);
        }}
        autoCapitalize="none"
        keyboardType="url"
      />

      <View style={styles.pickRow}>
        <SecondaryButton label="Upload file" icon="document-attach-outline" onPress={pickDocument} style={{ flex: 1 }} />
        <SecondaryButton label="Add photo" icon="image-outline" onPress={pickImage} style={{ flex: 1 }} />
      </View>

      {pickedUri && (
        <View style={styles.pickedBadge}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.pickedText} numberOfLines={1}>
            {pickedName ? `Attached: ${pickedName}` : 'File attached'}
          </Text>
        </View>
      )}

      <PrimaryButton label={isEdit ? 'Save changes' : 'Save resource'} onPress={handleSave} loading={saving} full style={{ marginTop: spacing.md }} />
    </ModalSheet>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.bg },
    headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: 8, paddingBottom: spacing.md },
    title: { ...font.titleLg, color: colors.ink },
    subtitle: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    resourceRow: { flexDirection: 'row', alignItems: 'center' },
    resIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    resTitle: { ...font.titleSm, color: colors.ink },
    resMeta: { ...font.caption, color: colors.mutedSoft, marginTop: 2 },
    fabWrap: { position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: 100 },
    pickRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.md },
    pickedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
    pickedText: { ...font.caption, color: colors.success, flexShrink: 1 },
  });
}
