import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      // Initial session check with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );

      const sessionPromise = supabase.auth.getSession();

      const { data: { session } } = await Promise.race([
        sessionPromise,
        timeoutPromise,
      ]) as any;

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setIsReady(true);
      }
    } catch (error: any) {
      console.error('Auth initialization error:', error);
      
      // Retry logic for network errors
      if (retryCount < 3 && error.message?.includes('timeout')) {
        setRetryCount(retryCount + 1);
        setTimeout(() => initializeAuth(), 2000 * (retryCount + 1));
        return;
      }

      // If still failing, allow app to load
      Alert.alert(
        'Connection Issue',
        'Unable to connect to server. You can continue offline.',
        [{ text: 'OK', onPress: () => setIsReady(true) }]
      );
      setIsReady(true);
    }

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        
        if (event === 'SIGNED_IN' && session?.user) {
          try {
            await fetchUserProfile(session.user.id);
          } catch (error) {
            console.error('Profile fetch error:', error);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setUser(data);
      } else if (error) {
        console.error('User profile error:', error);
        // Don't throw - allow app to continue
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsReady(true);
    }
  };

  // Handle navigation based on auth state
  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    
    // If no user and not in auth group, go to welcome
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/welcome');
      return;
    }

    // If user exists, navigate to their role-specific screen
    if (user && inAuthGroup) {
      if (user.role === 'student') {
        router.replace('/(student)');
      } else if (user.role === 'vendor') {
        // Use type assertion to bypass TypeScript check
        router.replace('/(vendor)' as any);
      }
    }
  }, [user, isReady, segments]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="(vendor)" />
      </Stack>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
});