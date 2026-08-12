import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { openFileOrLink, fileExtensionLabel } from '../lib/fileStorage';
import { Attachment } from '../lib/types';

// Read-only, tappable display of a task/resource's attachments — tapping
// one hands it off to the OS share/open sheet so it can be viewed in
// whatever app supports that particular format.
export default function AttachmentRow({ attachments }: { attachments: Attachment[] }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!attachments || attachments.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {attachments.map((a) => (
        <Pressable key={a.id} style={styles.chip} onPress={() => openFileOrLink(a.uri)}>
          <Ionicons name={a.kind === 'image' ? 'image' : 'document-text'} size={13} color={colors.accentBlue} />
          <Text style={styles.chipText} numberOfLines={1}>
            {a.name}
          </Text>
          {a.kind === 'file' && <Text style={styles.chipExt}>{fileExtensionLabel(a.name)}</Text>}
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.accentBlueSoft,
      borderRadius: radius.pill,
      paddingVertical: 5,
      paddingHorizontal: 9,
      maxWidth: 200,
    },
    chipText: { ...font.caption, color: colors.accentBlue, fontSize: 11, flexShrink: 1, fontWeight: '600' },
    chipExt: { ...font.caption, color: colors.accentBlue, fontSize: 9, opacity: 0.7 },
  });
}
