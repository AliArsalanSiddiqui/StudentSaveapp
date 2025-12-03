import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
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
            <Text style={styles.title}>
              Unlock{'\n'}
              Exclusive{'\n'}
              Student{'\n'}
              Discounts
            </Text>
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

          <TouchableOpacity
            style={styles.textButton}
            onPress={() => router.push('/(auth)/admin-login')}
          >
            <Text style={styles.textButtonText}>Admin Login</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
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
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  heroEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    lineHeight: 56,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#c084fc',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  benefitsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
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
    paddingBottom: 48,
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
  textButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  textButtonText: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '600',
  },
});