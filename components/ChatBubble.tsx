import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { radius, font, spacing, ThemeColors } from '../lib/theme';
import { useTheme } from '../context/ThemeContext';
import { ChatMessage } from '../lib/gemini';

export default function ChatBubble({ message }: { message: ChatMessage }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isUser = message.role === 'user';

  return (
    <Animated.View entering={FadeInDown.duration(220)} style={[styles.row, isUser ? styles.rowUser : styles.rowModel]}>
      {!isUser && (
        <View style={[styles.avatar, message.error && { backgroundColor: colors.errorSoft }]}>
          <Ionicons name={message.error ? 'alert' : 'sparkles'} size={13} color={message.error ? colors.error : colors.accentViolet} />
        </View>
      )}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleModel,
          message.error && { backgroundColor: colors.errorSoft, borderColor: colors.error },
        ]}
      >
        <Text style={[styles.text, isUser ? styles.textUser : styles.textModel, message.error && { color: colors.error }]}>
          {message.text}
        </Text>
      </View>
    </Animated.View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', marginBottom: spacing.sm, maxWidth: '100%' },
    rowUser: { justifyContent: 'flex-end' },
    rowModel: { justifyContent: 'flex-start' },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.accentVioletSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
      marginTop: 2,
    },
    bubble: {
      maxWidth: '78%',
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radius.lg,
    },
    bubbleUser: {
      backgroundColor: colors.primary,
      borderBottomRightRadius: 4,
    },
    bubbleModel: {
      backgroundColor: colors.surfaceCard,
      borderWidth: 1,
      borderColor: colors.hairline,
      borderBottomLeftRadius: 4,
    },
    text: { ...font.bodySm, lineHeight: 20 },
    textUser: { color: colors.onPrimary },
    textModel: { color: colors.ink },
  });
}
