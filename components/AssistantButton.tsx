import React from 'react';
import { useNavigation } from '@react-navigation/native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { useAI } from '../context/AIContext';
import { IconButton } from './Buttons';
import { View, StyleSheet } from 'react-native';

export default function AssistantButton() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const ai = useAI();

  return (
    <View>
      <IconButton
        icon="sparkles"
        color={colors.accentViolet}
        bg={colors.accentVioletSoft}
        onPress={() => navigation.navigate('Assistant')}
      />
      {ai.connected && <View style={[styles.dot, { backgroundColor: colors.success, borderColor: colors.bgElevated }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
});
