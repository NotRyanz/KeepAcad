import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { persistPickedFile, fileExtensionLabel } from '../lib/fileStorage';
import { uid } from '../lib/storage';
import { Attachment } from '../lib/types';
import { SecondaryButton } from './Buttons';

// A reusable "attach a file or photo" control used anywhere a user can
// build up a list of attachments (tasks, resources, etc). Handles picking,
// persisting the file into permanent app storage, and rendering removable
// chips for whatever has been attached so far.
export default function AttachmentField({
  attachments,
  onChange,
  label = 'Attachments',
}: {
  attachments: Attachment[];
  onChange: (next: Attachment[]) => void;
  label?: string;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      const { uri, name } = await persistPickedFile(asset.uri, asset.name);
      const attachment: Attachment = { id: uid(), uri, name, mimeType: asset.mimeType, kind: 'file' };
      onChange([...attachments, attachment]);
    } catch (e) {
      Alert.alert('Could not attach file', 'Please try again.');
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
      const attachment: Attachment = { id: uid(), uri, name, mimeType: asset.mimeType, kind: 'image' };
      onChange([...attachments, attachment]);
    } catch (e) {
      Alert.alert('Could not attach photo', 'Please try again.');
    }
  };

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pickRow}>
        <SecondaryButton label="Attach file" icon="document-attach-outline" onPress={pickDocument} style={{ flex: 1 }} />
        <SecondaryButton label="Attach photo" icon="image-outline" onPress={pickImage} style={{ flex: 1 }} />
      </View>

      {attachments.length > 0 && (
        <View style={styles.chipsWrap}>
          {attachments.map((a) => (
            <View key={a.id} style={styles.chip}>
              <Ionicons name={a.kind === 'image' ? 'image' : 'document-text'} size={13} color={colors.accentBlue} />
              <Text style={styles.chipText} numberOfLines={1}>
                {a.name}
              </Text>
              <Pressable onPress={() => removeAttachment(a.id)} hitSlop={8}>
                <Ionicons name="close-circle" size={15} color={colors.mutedSoft} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    fieldLabel: { ...font.caption, color: colors.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    pickRow: { flexDirection: 'row', gap: 10 },
    chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceCardAlt,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.hairline,
      paddingVertical: 6,
      paddingHorizontal: 10,
      maxWidth: 220,
    },
    chipText: { ...font.caption, color: colors.body, flexShrink: 1 },
  });
}
