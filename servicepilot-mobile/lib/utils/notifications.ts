// lib/utils/notifications.ts
// Registers the device for Expo push notifications and returns the push token.
// Call once after a successful login. Safe to call multiple times — no-ops if
// permissions are already granted and a token is already stored.

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { authApi } from '@/lib/api/auth';

const PUSH_TOKEN_KEY = 'sp-push-token';

/** Configure how notifications should be presented while the app is foregrounded. */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

/**
 * Request permission, fetch the Expo push token, and register it with the backend.
 * Returns the token string on success, or null if permissions were denied or
 * something went wrong (safe to ignore — push is a nice-to-have).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Expo Go / simulator has limited support — skip silently on non-device builds
  if (!Constants.isDevice) return null;

  // Android needs a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D4C92',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null; // User denied — do not nag
  }

  // Fetch token (uses your app's EAS project ID from app.json / expo.extra)
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ??
                    Constants.easConfig?.projectId;

  const { data: token } = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );

  // Persist locally so we can unregister on logout
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);

  // Register with backend — best-effort, don't let it break login
  try {
    await authApi.registerDeviceToken(token);
  } catch {
    // Backend endpoint is optional; ignore if not implemented yet
  }

  return token;
}

/** Unregister the stored push token from the backend on logout. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await SecureStore.getItemAsync(PUSH_TOKEN_KEY);
    if (token) {
      await authApi.unregisterDeviceToken(token);
      await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
    }
  } catch {
    // Best-effort
  }
}
