import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
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

  const handleAuth = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return;
    }

    // Validate university email
    if (!email.includes('.edu') && !email.includes('university')) {
      Alert.alert(
        'Invalid Email',
        'Please use your university email address'
      );
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // Sign up flow
        if (!name.trim() || !university.trim() || !password.trim()) {
          Alert.alert('Error', 'Please fill all fields');
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          Alert.alert('Error', 'Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        console.log('Starting signup process...');

        // Add timeout wrapper for signup
        const signupWithTimeout = Promise.race([
          supabase.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
              data: {
                name: name.trim(),
                university: university.trim(),
                role: 'student',
              },
              emailRedirectTo: 'studentsave://auth/callback',
            },
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Signup timeout - please try again')), 30000)
          )
        ]);

        const { data: authData, error: authError } = await signupWithTimeout as any;

        console.log('Signup response:', { authData, authError });

        if (authError) {
          console.error('Auth error:', authError);
          
          // Handle specific errors
          if (authError.message?.includes('User already registered')) {
            Alert.alert(
              'Account Exists',
              'This email is already registered. Please sign in instead.'
            );
            setIsSignUp(false);
          } else if (authError.message?.includes('timeout')) {
            Alert.alert(
              'Connection Timeout',
              'The server is taking too long to respond. Please check your internet connection and try again.'
            );
          } else if (authError.status === 429) {
            Alert.alert(
              'Too Many Attempts',
              'Please wait a few minutes before trying again.'
            );
          } else {
            Alert.alert('Error', authError.message || 'Signup failed');
          }
          setLoading(false);
          return;
        }

        if (authData.user) {
          console.log('User created:', authData.user.id);

          // Check if user needs email confirmation
          if (authData.user.identities && authData.user.identities.length === 0) {
            Alert.alert(
              'Account Exists',
              'This email is already registered. Please sign in instead.'
            );
            setIsSignUp(false);
            setLoading(false);
            return;
          }

          // Wait a moment for Supabase to process the user
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Create user profile - use upsert to handle existing profiles
          try {
            const { error: profileError } = await supabase
              .from('users')
              .upsert({
                id: authData.user.id,
                email: email.trim(),
                name: name.trim(),
                university: university.trim(),
                role: 'student',
                verified: false,
                created_at: new Date().toISOString(),
              }, {
                onConflict: 'id',
                ignoreDuplicates: false
              });

            if (profileError) {
              console.error('Profile creation error:', profileError);
              // Don't fail the signup - profile can be created later
            } else {
              console.log('Profile created successfully');
            }
          } catch (profileErr) {
            console.error('Profile creation failed:', profileErr);
            // Continue anyway
          }

          // Show success message
          Alert.alert(
            'Check Your Email! 📧',
            'We sent a verification link to your email. Please verify your email before signing in.\n\nCheck your spam folder if you don\'t see it.',
            [
              {
                text: 'OK',
                onPress: () => {
                  setIsSignUp(false);
                  setPassword('');
                  setName('');
                  setUniversity('');
                },
              },
            ]
          );
        }
      } else {
        // Login flow
        if (!password.trim()) {
          Alert.alert('Error', 'Please enter your password');
          setLoading(false);
          return;
        }

        console.log('Starting login process...');

        // Add timeout wrapper for login
        const loginWithTimeout = Promise.race([
          supabase.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim(),
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login timeout - please try again')), 30000)
          )
        ]);

        const { data, error } = await loginWithTimeout as any;

        console.log('Login response:', { data, error });

        if (error) {
          console.error('Login error:', error);
          
          if (error.message?.includes('Invalid login credentials')) {
            Alert.alert('Error', 'Invalid email or password');
          } else if (error.message?.includes('Email not confirmed')) {
            Alert.alert(
              'Email Not Verified',
              'Please verify your email before logging in. Check your inbox for the verification link.',
              [{ text: 'OK' }]
            );
          } else if (error.message?.includes('timeout')) {
            Alert.alert(
              'Connection Timeout',
              'The server is taking too long to respond. Please check your internet connection and try again.'
            );
          } else {
            Alert.alert('Error', error.message || 'Login failed');
          }
          setLoading(false);
          return;
        }

        if (data.user) {
          console.log('Login successful:', data.user.id);
          
          // Check if email is confirmed
          if (!data.user.email_confirmed_at) {
            Alert.alert(
              'Email Not Verified',
              'Please verify your email before logging in. Check your inbox for the verification link.',
              [{ text: 'OK' }]
            );
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }

          // Ensure user profile exists
          const { data: userProfile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !userProfile) {
            console.log('Creating missing profile...');
            // Create profile if it doesn't exist
            const { error: createError } = await supabase
              .from('users')
              .upsert({
                id: data.user.id,
                email: data.user.email,
                name: data.user.user_metadata?.name || '',
                university: data.user.user_metadata?.university || '',
                role: 'student',
                verified: true,
                created_at: new Date().toISOString(),
              }, {
                onConflict: 'id',
                ignoreDuplicates: false
              });

            if (createError) {
              console.error('Error creating profile:', createError);
            }
          }

          // Navigation will be handled by _layout.tsx
          console.log('Login complete, waiting for navigation...');
        }
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      let errorMessage = 'Authentication failed';
      
      if (error.message?.includes('timeout')) {
        errorMessage = 'Connection timeout. Please check your internet connection and try again.';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message?.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Verification email sent! Check your inbox.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification email');
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
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>S</Text>
              </View>
            </View>

            <Text style={styles.title}>
              {isSignUp ? 'Create Account' : 'Welcome Back'}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp
                ? 'Sign up with your university email'
                : 'Sign in to access exclusive student discounts'}
            </Text>

            {/* Form */}
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
                    placeholder="student@university.edu"
                    placeholderTextColor="#c084fc"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
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

              {!isSignUp && (
                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendVerification}
                  disabled={loading}
                >
                  <Text style={styles.resendButtonText}>
                    Didn't receive verification email? Resend
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Info */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {isSignUp
                  ? "🎓 You'll receive a verification email after signing up"
                  : '🔐 Your data is secure and encrypted'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    marginBottom: 20,
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
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    backgroundColor: '#c084fc',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  title: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#c084fc',
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    position: 'relative',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 18,
    zIndex: 1,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    color: 'white',
    fontSize: 16,
  },
  inputWithIcon: {
    paddingLeft: 48,
  },
  submitButton: {
    backgroundColor: '#c084fc',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  toggleButtonText: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginTop: 4,
  },
  resendButtonText: {
    color: '#c084fc',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  infoBox: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  infoText: {
    color: '#c084fc',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});