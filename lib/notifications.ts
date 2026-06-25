// lib/notifications.ts
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Show alert/sound/badge when a notification arrives while the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Requests permission, grabs an Expo push token, and saves it to the
 * current user's row in `users.push_token`. Call this once after login
 * (and it's safe to call again on every app open — it just upserts).
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c084fc',
      });
    }

    if (!Device.isDevice) {
      console.log('Push notifications require a physical device (not a simulator).');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    // Save (or update) token against this user
    await supabase.from('users').update({ push_token: token }).eq('id', userId);

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

/**
 * Clears the saved push token for a user (call on sign out so a shared/
 * reset device doesn't keep receiving a previous user's notifications).
 */
export async function clearPushToken(userId: string): Promise<void> {
  try {
    await supabase.from('users').update({ push_token: null }).eq('id', userId);
  } catch (error) {
    console.error('Error clearing push token:', error);
  }
}

/**
 * Listens for taps on a push notification (including when the app was
 * killed and opened via the notification) and returns the data payload.
 */
export function addNotificationResponseListener(
  callback: (data: Record<string, any>) => void
) {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification.request.content.data ?? {});
  });
}
