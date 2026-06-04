// lib/utils/notifications.ts
//
// Push notifications are NOT supported in Expo Go (SDK 53+).
// expo-notifications has been removed from the project for Expo Go compatibility.
// These functions are intentional no-ops during development.
//
// When building a production APK/AAB with EAS Build, re-add expo-notifications
// to package.json and app.json, and replace these stubs with the real implementation.

/**
 * Register for push notifications and send the token to the backend.
 * No-op in Expo Go / development — returns null.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  return null;
}

/**
 * Unregister the push token on logout.
 * No-op in Expo Go / development.
 */
export async function unregisterPushToken(): Promise<void> {
  // no-op
}
