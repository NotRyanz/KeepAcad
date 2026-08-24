import { Alert, Linking, Platform } from 'react-native';
import { File, Directory, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as IntentLauncher from 'expo-intent-launcher';

const ATTACHMENTS_SUBDIR = 'attachments';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function getAttachmentsDir(): Directory {
  const dir = new Directory(Paths.document, ATTACHMENTS_SUBDIR);
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/**
 * Document/image pickers usually hand back a URI in a transient cache
 * location (or, on Android, a `content://` URI tied to the picker's own
 * lifecycle). Copying the picked file into the app's permanent document
 * directory ensures attachments keep working after the OS clears cache or
 * revokes the picker's temporary read grant — this is what makes "attach
 * any file" actually durable rather than breaking a day later.
 */
export async function persistPickedFile(sourceUri: string, suggestedName?: string): Promise<{ uri: string; name: string }> {
  try {
    const dir = getAttachmentsDir();
    const source = new File(sourceUri);
    const baseName = suggestedName || source.name || `file-${Date.now()}`;
    const uniqueName = `${Date.now()}-${sanitizeFileName(baseName)}`;
    const dest = new File(dir, uniqueName);
    await source.copy(dest, { overwrite: true });
    return { uri: dest.uri, name: baseName };
  } catch (e) {
    // Best effort: if copying fails for any reason (permissions, missing
    // source, etc.) fall back to the original URI so the attachment still
    // works for at least the current session instead of failing outright.
    return { uri: sourceUri, name: suggestedName || sourceUri.split('/').pop() || 'file' };
  }
}

/**
 * Opens any local file or remote link using whichever mechanism actually
 * works for that kind of URI:
 * - http(s) links open in the system browser via Linking.
 * - Local files (file://, content://) go through the native share/open
 *   sheet (expo-sharing), which lets the user pick any installed app able
 *   to view that particular format. This is what makes "every document
 *   format" work without the app needing to bundle a viewer for each type —
 *   the OS + installed apps do the viewing, we just hand off the file.
 */
export async function openFileOrLink(uri: string | undefined): Promise<void> {
  if (!uri) return;
  try {
    if (/^https?:\/\//i.test(uri)) {
      await Linking.openURL(uri);
      return;
    }

    if (Platform.OS === 'android') {
      try {
        let contentUri = uri;
        if (uri.startsWith('file://')) {
          contentUri = await FileSystem.getContentUriAsync(uri);
        }
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: contentUri,
          flags: 1,
        });
        return;
      } catch (e) {
        // Fallback to sharing if IntentLauncher fails
      }
    }

    if (Platform.OS === 'web') {
      // Browsers often falsely report Sharing as available but fail on blobs
      try {
        window.open(uri, '_blank');
      } catch (e) {
        await Linking.openURL(uri);
      }
      return;
    }

    const available = await Sharing.isAvailableAsync();
    if (!available) {
      // Web fallback / platforms without a share sheet: try a direct open.
      await Linking.openURL(uri);
      return;
    }
    // On iOS, this opens Quick Look (full screen preview) natively.
    await Sharing.shareAsync(uri);
  } catch (e) {
    Alert.alert('Could not open file', 'No app on this device could open this file format.');
  }
}

export function guessKindFromMime(mimeType?: string): 'image' | 'file' {
  if (mimeType && mimeType.startsWith('image/')) return 'image';
  return 'file';
}

export function fileExtensionLabel(name?: string): string {
  if (!name) return 'FILE';
  const parts = name.split('.');
  if (parts.length < 2) return 'FILE';
  return parts[parts.length - 1].toUpperCase().slice(0, 5);
}
