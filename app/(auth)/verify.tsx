import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit code');
      return;
    }

    setLoading(true);

    try {
      // Verify the OTP token with timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Verification timeout')), 15000)
      );

      const verifyPromise = supabase.auth.verifyOtp({
        email: email as string,
        token: otp,
        type: 'email',
      });

      const { data, error } = await Promise.race([
        verifyPromise,
        timeoutPromise,
      ]) as any;

      if (error) throw error;

      if (data.user) {
        // Fetch user profile to get role
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          // Default to student if profile fetch fails
          router.replace('/(student)' as any);
          return;
        }

        if (userProfile) {
          // Navigate based on role with type assertion
          if (userProfile.role === 'student') {
            router.replace('/(student)');
          } else if (userProfile.role === 'vendor') {
            router.replace('/(vendor)' as any);
          } else {
            // Fallback to welcome if role is unknown
            router.replace('/(auth)/welcome');
          }
        }
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      
      let errorMessage = 'Invalid verification code';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (error.message?.includes('invalid')) {
        errorMessage = 'Verification code expired. Please request a new one.';
      }
      else if (error.message?.includes('expired')) {
        errorMessage = 'Verification code expired. Please request a new one.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const resendPromise = supabase.auth.signInWithOtp({
        email: email as string,
        options: {
          emailRedirectTo: 'studentsave://auth/callback',
        },
      });

      const { error } = await Promise.race([
        resendPromise,
        timeoutPromise,
      ]) as any;

      if (error) throw error;

      Alert.alert('Success', 'Verification code has been resent to your email');
    } catch (error: any) {
      console.error('Resend error:', error);
      
      let errorMessage = 'Failed to resend code';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet connection.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many attempts. Please wait a few minutes.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  return (
    <LinearGradient
      colors={['#1e1b4b', '#581c87', '#1e1b4b']}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✉️</Text>
        </View>

        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a 6-digit verification code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          <TextInput
            style={styles.otpInput}
            placeholder="000000"
            placeholderTextColor="#c084fc"
            value={otp}
            onChangeText={(text) => {
              // Only allow numbers
              const cleaned = text.replace(/[^0-9]/g, '');
              setOtp(cleaned.slice(0, 6));
            }}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
        </View>

        <TouchableOpacity
          style={[
            styles.verifyButton,
            (loading || otp.length !== 6) && styles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={loading || otp.length !== 6}
        >
          <Text style={styles.verifyButtonText}>
            {loading ? 'Verifying...' : 'Verify & Continue'}
          </Text>
        </TouchableOpacity>

        <View style={styles.resendContainer}>
          <Text style={styles.resendText}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendButton}>Resend Code</Text>
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Check your spam folder if you don't see the email </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    marginBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(192, 132, 252, 0.2)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    color: '#c084fc',
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  email: {
    fontWeight: '600',
    color: 'white',
  },
  otpContainer: {
    width: '100%',
    marginBottom: 32,
  },
  otpInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#c084fc',
    borderRadius: 16,
    padding: 20,
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 10,
  },
  verifyButton: {
    backgroundColor: '#c084fc',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  verifyButtonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resendText: {
    color: '#c084fc',
    fontSize: 14,
  },
  resendButton: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  infoBox: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginTop: 40,
    width: '100%',
  },
  infoText: {
    color: '#c084fc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});