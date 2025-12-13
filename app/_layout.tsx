// app/_layout.tsx - FIXED ROLE-BASED NAVIGATION
import '../lib/polyfills';
import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { ErrorBoundary } from 'react-error-boundary';
import SplashScreen from '@/components/SplashScreen';
import * as ExpoSplashScreen from 'expo-splash-screen';

ExpoSplashScreen.preventAutoHideAsync();

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
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    ExpoSplashScreen.hideAsync();
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
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
      
      if (retryCount < 2 && error.message?.includes('timeout')) {
        setRetryCount(retryCount + 1);
        setTimeout(() => initializeAuth(), 2000);
        return;
      }

      setIsReady(true);
    }

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
        console.log('User profile loaded:', { id: data.id, role: data.role });
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

  // Handle navigation with role-based routing
  useEffect(() => {
    if (!isReady || showSplash) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inStudentGroup = segments[0] === '(student)';
    const inVendorGroup = segments[0] === '(vendor)';
    
    console.log('Navigation check:', {
      hasUser: !!user,
      userRole: user?.role,
      currentSegment: segments[0],
      inAuthGroup,
      inStudentGroup,
      inVendorGroup,
    });

    // Not logged in - redirect to auth
    if (!user && !inAuthGroup) {
      console.log('Not logged in, redirecting to welcome');
      router.replace('/(auth)/welcome');
      return;
    }

    // Logged in - check role-based access
    if (user && inAuthGroup) {
      console.log('Logged in, redirecting based on role:', user.role);
      
      if (user.role === 'student') {
        router.replace('/(student)');
      } else if (user.role === 'vendor') {
        router.replace('/(vendor)' as any);
      } else {
        // Unknown role, sign out
        console.warn('Unknown role:', user.role);
        useAuthStore.getState().signOut();
        router.replace('/(auth)/welcome');
      }
      return;
    }

    // Prevent role mismatches
    if (user) {
      if (user.role === 'student' && inVendorGroup) {
        console.log('Student accessing vendor area, redirecting');
        router.replace('/(student)');
      } else if (user.role === 'vendor' && inStudentGroup) {
        console.log('Vendor accessing student area, redirecting');
        router.replace('/(vendor)' as any);
      }
    }
  }, [user, isReady, segments, showSplash]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

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