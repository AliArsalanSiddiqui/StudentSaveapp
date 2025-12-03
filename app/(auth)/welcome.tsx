import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient
        colors={['#1e1b4b', '#581c87', '#1e1b4b']}
        style={styles.gradient}
      >
        {/* Logo & Branding */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>S</Text>
            </View>
            <Text style={styles.brandName}>StudentSave</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <Text style={styles.heroEmoji}>🎓</Text>
            <Text style={styles.title}>Unlock Exclusive Student Discounts</Text>
            <Text style={styles.subtitle}>
              Connect with your favorite restaurants and cafes. Enjoy verified
              discounts designed exclusively for students at your university.
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <View style={styles.benefit}>
              <Text style={styles.benefitEmoji}>💰</Text>
              <Text style={styles.benefitText}>Save up to 30%</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitEmoji}>🏪</Text>
              <Text style={styles.benefitText}>100+ Vendors</Text>
            </View>
            <View style={styles.benefit}>
              <Text style={styles.benefitEmoji}>⚡</Text>
              <Text style={styles.benefitText}>Instant Redemption</Text>
              <TouchableOpacity
  onPress={async () => {
    await supabase.auth.signOut();
    await AsyncStorage.clear();
    Alert.alert("Cleared", "Auth data reset!");
  }}
  style={{ padding: 15, backgroundColor: 'red' }}
>
  <Text style={{ color: 'white' }}>Reset Auth</Text>
</TouchableOpacity>

            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>I'm a Student</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/vendor-login')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>I'm a Vendor</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 48,
    height: 48,
    backgroundColor: '#c084fc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  brandName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#c084fc',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    marginTop: 20,
  },
  benefit: {
    alignItems: 'center',
    flex: 1,
  },
  benefitEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  benefitText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#c084fc',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#c084fc',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c084fc',
  },
  secondaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});