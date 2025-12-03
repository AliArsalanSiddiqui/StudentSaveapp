// app/_layout.tsx
import '../lib/polyfills'; // Import polyfills FIRST
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator, StyleSheet, Alert, Text } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorText}>{error?.message || 'Unknown error'}</Text>
      <Text 
        style={styles.errorButton} 
        onPress={resetErrorBoundary}
      >
        Try Again
      </Text>
    </View>
  );
}

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

      const { data: { session }, error: sessionError } = await Promise.race([
        sessionPromise,
        timeoutPromise,
      ]) as any;

      if (sessionError) {
        console.error('Session error:', sessionError);
        setIsReady(true);
        return;
      }

      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setIsReady(true);
      }
    } catch (error: any) {
      console.error('Auth initialization error:', error);
      
      // Retry logic for network errors
      if (retryCount < 2 && error.message?.includes('timeout')) {
        setRetryCount(retryCount + 1);
        setTimeout(() => initializeAuth(), 2000);
        return;
      }

      // Allow app to load even if auth fails
      setIsReady(true);
    }

    // Auth state listener
    try {
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
    } catch (error) {
      console.error('Auth listener error:', error);
    }
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
        router.replace('/(vendor)' as any);
      }
    }
  }, [user, isReady, segments]);

  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
        <Text style={styles.loadingText}>Loading StudentSave...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="(vendor)" />
        </Stack>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorText: {
    color: '#c084fc',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButton: {
    color: '#c084fc',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});