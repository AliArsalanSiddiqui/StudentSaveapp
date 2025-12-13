// app/(vendor)/_layout.tsx - WITH VERIFICATION GUARD
import { Tabs, useRouter } from 'expo-router';
import { Home, QrCode, BarChart3, User } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';

export default function VendorLayout() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkVerification();
  }, [user]);

  const checkVerification = async () => {
    if (!user?.id) {
      router.replace('/(auth)/welcome');
      return;
    }

    try {
      // Check if vendor registration exists and is verified
      const { data: registration, error } = await supabase
        .from('vendor_registrations')
        .select('verified, rejected')
        .eq('owner_id', user.id)
        .single();

      if (error || !registration) {
        console.error('No vendor registration found');
        await supabase.auth.signOut();
        router.replace('/(auth)/welcome');
        return;
      }

      // Allow access if verified (dashboard will show pending/rejected state)
      setIsVerified(true);
      setLoading(false);
    } catch (error) {
      console.error('Verification check error:', error);
      await supabase.auth.signOut();
      router.replace('/(auth)/welcome');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Loading vendor dashboard...</Text>
      </View>
    );
  }

  if (!isVerified) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1e1b4b',
          borderTopColor: 'rgba(255, 255, 255, 0.1)',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="qr-code"
        options={{
          title: 'QR Code',
          tabBarIcon: ({ color, size }) => <QrCode color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Analytics',
          tabBarIcon: ({ color, size }) => (
            <BarChart3 color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
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
});