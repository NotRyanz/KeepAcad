import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// SecureStore isn't available on web, so we transparently fall back to
// AsyncStorage there. Native platforms (iOS/Android) get real encrypted
// keychain/keystore storage for the API key.
const PREFIX = 'academic-manager-secure:';

export async function getSecureItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(PREFIX + key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (e) {
    return null;
  }
}

export async function setSecureItem(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(PREFIX + key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (e) {
    // best-effort
  }
}

export async function deleteSecureItem(key: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(PREFIX + key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (e) {
    // best-effort
  }
}
