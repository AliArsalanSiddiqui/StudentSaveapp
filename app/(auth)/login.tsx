// app/(auth)/login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
} from 'react-native';
import CustomAlert from '@/components/CustomAlert';
import { AlertConfig,AlertButton } from '@/types';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';

export default function StudentLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
  visible: false,
  type: 'info',
  title: '',
  message: '',
  buttons: [{ text: 'OK', onPress: () => {}, style: 'default' }],
});


  // Show custom alert
  const showAlert = (
  title: string,
  message: string,
  type: 'info' | 'success' | 'error' | 'warning' = 'info',
  buttons?: AlertButton[]
) => {
  setAlertConfig({
    visible: true,
    type,
    title,
    message,
    buttons: buttons || [{ text: 'OK', onPress: () => {}, style: 'default' }],
  });
};


  // Validate student email
  const validateStudentEmail = (email: string): boolean => {
    const lowerEmail = email.toLowerCase().trim();
    if (!lowerEmail.includes('.edu.pk')) return false;
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.edu\.pk$/;
    return emailRegex.test(lowerEmail);
  };

  const handleAuth = async () => {
    if (!email.trim()) {
      showAlert("Error", "Please enter your email", "error");
      return;
    }

    if (!validateStudentEmail(email)) {
      showAlert(
        "Invalid Email",
        "Please use your university email address ending with .edu.pk\n\nExample: student@university.edu.pk",
        "error"
      );
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim() || !university.trim() || !password.trim()) {
          showAlert("Error", "Please fill all fields", "error");
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          showAlert("Error", "Password must be at least 6 characters", "error");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: name.trim(),
              university: university.trim(),
              role: 'student',
            },
            emailRedirectTo: undefined,
          },
        });

        if (error) throw error;

        router.push({
          pathname: '/(auth)/verify',
          params: { 
            email: email.trim(),
            isSignUp: 'true'
          },
        });

        showAlert(
          "Check Your Email",
          "We sent a 6-digit verification code to your email.",
          "success"
        );

      } else {
        if (!password.trim()) {
          showAlert("Error", "Please enter your password", "error");
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        if (!data.user?.email_confirmed_at) {
          showAlert(
            "Email Not Verified",
            "Please verify your email first. Check your inbox for the verification code.",
            "warning",
            [
              { text: "Resend Code", onPress: () => handleResendVerification(), style: "default" },
              { text: "OK", onPress: () => {}, style: "cancel" }
            ]
          );
          await supabase.auth.signOut();
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      showAlert("Error", error.message || "Authentication failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      showAlert("Error", "Please enter your email address", "error");
      return;
    }

    if (!validateStudentEmail(email)) {
      showAlert("Error", "Please enter a valid university email (.edu.pk)", "error");
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        showAlert("Error", error.message, "error");
      } else {
        router.push({
          pathname: '/(auth)/verify',
          params: { 
            email: email.trim(),
            isSignUp: 'true'
          },
        });
        showAlert("Success", "Verification code sent! Check your inbox.", "success");
      }
    } catch (error: any) {
      showAlert("Error", error.message || "Failed to resend verification code", "error");
    }
  };

  return (
    <LinearGradient
      colors={['#1e1b4b', '#581c87', '#1e1b4b']}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Image source={require('../../assets/logo.png')} style={styles.logoImage}/>
              </View>
            </View>

            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up with your university email (.edu.pk)'
                : 'Sign in to access exclusive student discounts'}
            </Text>

            <View style={styles.form}>
              {isSignUp && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor="#c084fc"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>University</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your university name"
                      placeholderTextColor="#c084fc"
                      value={university}
                      onChangeText={setUniversity}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>University Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail color="#c084fc" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    placeholder="studentID@university.edu.pk"
                    placeholderTextColor="#c084fc"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
                <Text style={styles.helperText}>
                  Must end with .edu.pk
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder={isSignUp ? "(min 6 characters)" : "Enter your password"}
                  placeholderTextColor="#c084fc"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleAuth}
                disabled={loading}
              >
                <Text style={styles.submitButtonText}>
                  {loading
                    ? 'Please wait...'
                    : isSignUp
                    ? 'Create Account'
                    : 'Sign In'}
                </Text>
              </TouchableOpacity>

              {isSignUp && (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendVerification}
                  disabled={loading}
                >
                  <Text style={styles.resendButtonText}>
                    Need verification code? Resend
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                  setName('');
                  setUniversity('');
                }}
                disabled={loading}
              >
                <Text style={styles.toggleButtonText}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : "Don't have an account? Sign Up"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {isSignUp
                  ? "🎓 You'll receive a 6-digit code to verify your email"
                  : '🔐 Your data is secure and encrypted'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </LinearGradient>
  );
}

// Styles remain unchanged
const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  header: { paddingTop: 48, paddingHorizontal: 16, marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, backgroundColor: '#ffffffff', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: 80, height: 80, borderRadius: 20 },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#c084fc', fontSize: 16, marginBottom: 32, textAlign: 'center', lineHeight: 24 },
  form: { gap: 20 },
  inputContainer: { gap: 8 },
  label: { color: 'white', fontSize: 14, fontWeight: '600' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 16, top: 18, zIndex: 1 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, padding: 16, color: 'white', fontSize: 16 },
  inputWithIcon: { paddingLeft: 48 },
  helperText: { color: '#c084fc', fontSize: 12, marginTop: 4 },
  submitButton: { backgroundColor: '#c084fc', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#1e1b4b', fontSize: 18, fontWeight: 'bold' },
  toggleButton: { alignItems: 'center', paddingVertical: 8 },
  toggleButtonText: { color: '#c084fc', fontSize: 14, fontWeight: '600' },
  resendButton: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  resendButtonText: { color: '#c084fc', fontSize: 12, textDecorationLine: 'underline' },
  infoBox: { backgroundColor: 'rgba(192, 132, 252, 0.1)', borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.3)', borderRadius: 12, padding: 16, marginTop: 24 },
  infoText: { color: '#c084fc', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
