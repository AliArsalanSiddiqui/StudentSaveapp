import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const { user, setUser } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setIsReady(true);
      }
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, 'User:', session?.user?.email);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsReady(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setUser(data);
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
        router.replace('/(vendor)');
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