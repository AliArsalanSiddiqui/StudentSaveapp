// app/(auth)/vendor-login.tsx - FIXED VERSION
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
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mail, Store, Phone, MapPin } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import CustomAlert, { useCustomAlert } from '@/components/CustomAlert';

export default function VendorLogin() {
  const router = useRouter();
  const { alertConfig, showAlert, Alert } = useCustomAlert();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Sign up fields
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Restaurant');

  const categories = ['Restaurant', 'Cafe', 'Arcade', 'Clothing', 'Entertainment'];

  const handleSkipLogin = () => {
    const mockVendorUser = {
      id: 'test-vendor-' + Date.now(),
      email: 'vendor@test.com',
      name: 'Test Vendor',
      role: 'vendor' as const,
      verified: true,
      created_at: new Date().toISOString(),
    };
    
    const { setUser } = require('../../store/authStore').useAuthStore.getState();
    setUser(mockVendorUser);
    router.replace('/(vendor)' as any);
  };

  const handleAuth = async () => {
    if (!email.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter your email' });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // ============== SIGN UP FLOW ==============
        if (!businessName.trim() || !ownerName.trim() || !phone.trim() || !location.trim()) {
          showAlert({ type: 'error', title: 'Error', message: 'Please fill all fields' });
          setLoading(false);
          return;
        }

        if (!password.trim() || password.length < 6) {
          showAlert({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters' });
          setLoading(false);
          return;
        }

        // Create auth user with vendor role
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              name: ownerName.trim(),
              role: 'vendor', // CRITICAL: This triggers auto-verification
            },
            emailRedirectTo: undefined, // Disable email verification redirect
          },
        });

        if (authError) throw authError;

        if (!authData.user) {
          throw new Error('User creation failed');
        }

        // Create user profile in users table
        const { error: userError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: email.trim(),
          name: ownerName.trim(),
          phone: phone.trim(),
          role: 'vendor',
          verified: false, // Will be set to true by admin approval
        });

        if (userError) {
          console.error('User profile error:', userError);
          // Try to clean up auth user if profile creation fails
          await supabase.auth.admin.deleteUser(authData.user.id);
          throw new Error('Failed to create user profile. Please try again.');
        }

        // Create vendor profile
        const { error: vendorError } = await supabase.from('vendors').insert({
          owner_id: authData.user.id,
          name: businessName.trim(),
          category: category,
          location: location.trim(),
          discount_percentage: 20,
          discount_text: '20% OFF',
          qr_code: `VENDOR_${authData.user.id}_${Date.now()}`,
          active: false, // Pending admin approval
          rating: 0,
          total_reviews: 0,
        });

        if (vendorError) {
          console.error('Vendor profile error:', vendorError);
          throw new Error('Failed to create vendor profile. Please try again.');
        }

        // Success - Sign in automatically
        showAlert({
          type: 'success',
          title: 'Account Created! 🎉',
          message: 'Your vendor account has been created. Pending admin approval.',
          buttons: [
            {
              text: 'Continue to Dashboard',
              onPress: () => router.replace('/(vendor)' as any),
              style: 'default',
            },
          ],
        });

      } else {
        // ============== LOGIN FLOW ==============
        if (!password.trim()) {
          showAlert({ type: 'error', title: 'Error', message: 'Please enter your password' });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) throw error;

        if (!data.user) {
          throw new Error('Login failed');
        }

        // Fetch user profile to verify role
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !userProfile) {
          throw new Error('Failed to load user profile');
        }

        // Verify user is a vendor
        if (userProfile.role !== 'vendor') {
          await supabase.auth.signOut();
          showAlert({
            type: 'error',
            title: 'Invalid Account',
            message: 'This account is not registered as a vendor',
          });
          setLoading(false);
          return;
        }

        // Success - navigate to vendor dashboard
        router.replace('/(vendor)' as any);
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'Authentication failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#1e1b4b', '#581c87', '#1e1b4b']} style={styles.container}>
      <Alert />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Store color="white" size={40} />
              </View>
            </View>

            <Text style={styles.title}>{isSignUp ? 'Register Business' : 'Vendor Login'}</Text>
            <Text style={styles.subtitle}>
              {isSignUp ? 'Join StudentSave and reach more customers' : 'Sign in to manage your discounts'}
            </Text>

            {/* Form */}
            <View style={styles.form}>
              {isSignUp && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Business Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter business name"
                      placeholderTextColor="#c084fc"
                      value={businessName}
                      onChangeText={setBusinessName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Owner Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter owner name"
                      placeholderTextColor="#c084fc"
                      value={ownerName}
                      onChangeText={setOwnerName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.inputWrapper}>
                      <Phone color="#c084fc" size={20} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="+92 300 1234567"
                        placeholderTextColor="#c084fc"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Location</Text>
                    <View style={styles.inputWrapper}>
                      <MapPin color="#c084fc" size={20} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="Enter business address"
                        placeholderTextColor="#c084fc"
                        value={location}
                        onChangeText={setLocation}
                        autoCapitalize="words"
                        editable={!loading}
                      />
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Category</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                          onPress={() => setCategory(cat)}
                          disabled={loading}
                        >
                          <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Business Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail color="#c084fc" size={20} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, styles.inputWithIcon]}
                    placeholder="business@email.com"
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
                  placeholder={isSignUp ? 'Create password (min 6 characters)' : 'Enter password'}
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
                  {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleButton}
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setPassword('');
                  setBusinessName('');
                  setOwnerName('');
                  setPhone('');
                  setLocation('');
                }}
                disabled={loading}
              >
                <Text style={styles.toggleButtonText}>
                  {isSignUp ? 'Already registered? Sign In' : 'New vendor? Register Now'}
                </Text>
              </TouchableOpacity>

              {/* Skip Login for Testing */}
              <TouchableOpacity style={styles.skipButton} onPress={handleSkipLogin}>
                <Text style={styles.skipButtonText}>⚡ Skip Login (Testing)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {isSignUp
                  ? '🏪 Applications are reviewed within 24-48 hours'
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
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  header: { paddingTop: 48, paddingHorizontal: 16, marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 80, height: 80, backgroundColor: '#f59e0b', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#c084fc', fontSize: 16, marginBottom: 32, textAlign: 'center', lineHeight: 24 },
  form: { gap: 20 },
  inputContainer: { gap: 8 },
  label: { color: 'white', fontSize: 14, fontWeight: '600' },
  inputWrapper: { position: 'relative' },
  inputIcon: { position: 'absolute', left: 16, top: 18, zIndex: 1 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, padding: 16, color: 'white', fontSize: 16 },
  inputWithIcon: { paddingLeft: 48 },
  categoriesScroll: { flexGrow: 0 },
  categoryChip: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  categoryChipActive: { backgroundColor: '#c084fc', borderColor: '#c084fc' },
  categoryText: { color: 'white', fontSize: 14 },
  categoryTextActive: { color: '#1e1b4b', fontWeight: '600' },
  submitButton: { backgroundColor: '#c084fc', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#1e1b4b', fontSize: 18, fontWeight: 'bold' },
  toggleButton: { alignItems: 'center', paddingVertical: 8 },
  toggleButtonText: { color: '#c084fc', fontSize: 14, fontWeight: '600' },
  skipButton: { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  skipButtonText: { color: '#f59e0b', fontSize: 14, fontWeight: '600' },
  infoBox: { backgroundColor: 'rgba(192, 132, 252, 0.1)', borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.3)', borderRadius: 12, padding: 16, marginTop: 24 },
  infoText: { color: '#c084fc', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});