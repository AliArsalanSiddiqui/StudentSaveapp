// app/(student)/scanner.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { QrCode, Lock, Crown } from 'lucide-react-native';
import QRScanner from '../../components/QRScanner';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { ScrollView } from 'react-native-gesture-handler';

export default function ScannerScreen() {
  const [showScanner, setShowScanner] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // Re-check subscription when screen comes into focus
  useEffect(() => {
    checkSubscription();
    
    // Set up interval to re-check when returning to screen
    const interval = setInterval(() => {
      if (!showScanner) {
        checkSubscription();
      }
    }, 1000); // Check every second when on this screen

    return () => clearInterval(interval);
  }, [user?.id, showScanner]);

  const checkSubscription = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .gte('end_date', new Date().toISOString())
        .single();

      const isActive = !!data && !error;
      setHasSubscription(isActive);
      
      // Debug log
      console.log('Subscription check:', { isActive, data, error });
    } catch (error) {
      console.error('Subscription check error:', error);
      setHasSubscription(false);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSuccess = (vendorId: string) => {
    setShowScanner(false);
    router.push(`/(student)/vendors/${vendorId}`);
  };

  const handleScanPress = () => {
    if (hasSubscription) {
      setShowScanner(true);
    } else {
      // Show subscribe prompt
      return;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
    <SafeAreaView style={{flex:1}}>
    <View>
      <View style={styles.content}>
        {!hasSubscription ? (
          // No Subscription - Show Subscribe Prompt
          <>
            <View style={styles.lockIconContainer}>
              <Lock color="#c084fc" size={80} />
            </View>
            <Text style={styles.title}>Subscription Required</Text>
            <Text style={styles.subtitle}>
              Subscribe to unlock QR code scanning and start saving on your favorite vendors
            </Text>

            <View style={styles.benefitsCard}>
              <View style={styles.benefitRow}>
                <Crown color="#fbbf24" size={24} fill="#fbbf24" />
                <Text style={styles.benefitText}>Unlimited QR scans</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>💰</Text>
                <Text style={styles.benefitText}>20-30% off at all vendors</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>⚡</Text>
                <Text style={styles.benefitText}>Instant discount redemption</Text>
              </View>
              <View style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>🎁</Text>
                <Text style={styles.benefitText}>Exclusive student deals</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={() => router.push('/(student)/subscription')}
            >
              <Text style={styles.subscribeButtonText}>View Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/(student)')}
            >
              <Text style={styles.exploreButtonText}>Browse Vendors</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Has Subscription - Show Scanner
          <>
            <View style={styles.iconContainer}>
              <QrCode color="#c084fc" size={100} />
            </View>
            <Text style={styles.title}>Scan QR Code</Text>
            <Text style={styles.subtitle}>
              Point your camera at the vendor's QR code to redeem your discount
            </Text>

            <View style={styles.activeSubscriptionBadge}>
              <Crown color="#22c55e" size={20} fill="#22c55e" />
              <Text style={styles.activeSubscriptionText}>
                Premium Active
              </Text>
            </View>

            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanPress}
            >
              <Text style={styles.scanButtonText}>Open Scanner</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push('/(student)/subscription')}
            >
              <Text style={styles.manageButtonText}>Manage Subscription </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal visible={showScanner} animationType="slide">
        <QRScanner
          onClose={() => setShowScanner(false)}
          onSuccess={handleScanSuccess}
        />
      </Modal>
    </View>
    </SafeAreaView>
    </ScrollView>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    paddingTop: 50,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  // Locked State Styles
  lockIconContainer: {
    width: 160,
    height: 160,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  benefitsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitEmoji: {
    fontSize: 24,
  },
  benefitText: {
    color: 'white',
    fontSize: 16,
    flex: 1,
  },
  subscribeButton: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  exploreButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c084fc',
    marginBottom: 70
  },
  exploreButtonText: {
    color: '#c084fc',
    fontSize: 16,
    fontWeight: '600',
  },
  // Active State Styles
  iconContainer: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#c084fc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  activeSubscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 32,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  activeSubscriptionText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  scanButton: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  scanButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manageButton: {
    paddingVertical: 12,
  },
  manageButtonText: {
    color: '#c084fc',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});