// app/(auth)/vendor-login.tsx - WITH TEST DUMMY DATA
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

  const handleSkipLogin = async () => {
    try {
      // Create test vendor data in Supabase
      const testVendorId = 'test-vendor-' + Date.now();
      const testUserId = 'test-user-' + Date.now();
      
      // First, create test user in users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: testUserId,
          email: 'testvendor@example.com',
          name: 'Test Vendor Owner',
          phone: '+92 300 1234567',
          role: 'vendor',
          verified: true,
        });

      if (userError) {
        console.log('User already exists or error:', userError);
      }

      // Then create test vendor
      const { error: vendorError } = await supabase
        .from('vendors')
        .insert({
          id: testVendorId,
          owner_id: testUserId,
          name: 'Test Pizza Palace',
          category: 'Restaurant',
          description: 'The best pizza in town! Fresh ingredients, authentic recipes, and amazing taste.',
          discount_percentage: 25,
          discount_text: '25% OFF',
          logo_url: '🍕',
          location: 'Gulshan-e-Iqbal, Block 13-D, Karachi',
          rating: 4.5,
          total_reviews: 127,
          opening_hours: JSON.stringify({
            monday: '11:00 AM - 11:00 PM',
            tuesday: '11:00 AM - 11:00 PM',
            wednesday: '11:00 AM - 11:00 PM',
            thursday: '11:00 AM - 11:00 PM',
            friday: '11:00 AM - 12:00 AM',
            saturday: '11:00 AM - 12:00 AM',
            sunday: '11:00 AM - 11:00 PM',
          }),
          terms: 'Valid on dine-in only. Cannot be combined with other offers. Student ID required.',
          active: true,
          qr_code: `VENDOR_${testVendorId}_${Date.now()}`,
        });

      if (vendorError) {
        console.log('Vendor already exists or error:', vendorError);
      }

      // Create mock user object for auth store
      const mockVendorUser = {
        id: testUserId,
        email: 'testvendor@example.com',
        name: 'Test Vendor Owner',
        phone: '+92 300 1234567',
        role: 'vendor' as const,
        verified: true,
        created_at: new Date().toISOString(),
      };
      
      const { setUser } = require('../../store/authStore').useAuthStore.getState();
      setUser(mockVendorUser);
      
      router.replace('/(vendor)' as any);
    } catch (error) {
      console.error('Skip login error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to create test vendor. Please try again.',
      });
    }
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

        console.log('Starting vendor signup...');

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            emailRedirectTo: undefined,
            data: {},
          },
        });

        if (authError) {
          console.error('Auth signup error:', authError);
          throw authError;
        }

        if (!authData.user) {
          throw new Error('User creation failed - no user returned');
        }

        console.log('Auth user created:', authData.user.id);

        // Step 2: Wait for trigger to create user record
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 3: Update user profile
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: ownerName.trim(),
            phone: phone.trim(),
            role: 'vendor',
            verified: true,
          })
          .eq('id', authData.user.id);

        if (updateError) {
          console.error('User profile update error:', updateError);
        }

        console.log('User profile updated');

        // Step 4: Create vendor profile
        const { error: vendorError } = await supabase.from('vendors').insert({
          owner_id: authData.user.id,
          name: businessName.trim(),
          category: category,
          location: location.trim(),
          discount_percentage: 20,
          discount_text: '20% OFF',
          qr_code: `VENDOR_${authData.user.id}_${Date.now()}`,
          active: false,
          rating: 0,
          total_reviews: 0,
        });

        if (vendorError) {
          console.error('Vendor profile error:', vendorError);
          throw new Error('Failed to create vendor profile. Please contact support.');
        }

        console.log('Vendor profile created successfully');

        // Step 5: Sign out and back in
        await supabase.auth.signOut();

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (signInError) {
          console.error('Auto sign-in error:', signInError);
          throw new Error('Account created but auto-login failed. Please login manually.');
        }

        console.log('Auto sign-in successful');

        showAlert({
          type: 'success',
          title: 'Account Created! 🎉',
          message: 'Your vendor account has been created successfully. Pending admin approval to go live.',
          buttons: [
            {
              text: 'Continue',
              onPress: () => {
                router.replace('/(vendor)' as any);
              },
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

        console.log('Attempting vendor login...');

        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          console.error('Login error:', error);
          throw error;
        }

        if (!data.user) {
          throw new Error('Login failed - no user returned');
        }

        console.log('Login successful:', data.user.id);

        // Fetch user profile to verify role
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError || !userProfile) {
          console.error('Profile fetch error:', profileError);
          throw new Error('Failed to load user profile');
        }

        console.log('User profile loaded:', userProfile.role);

        // Verify user is a vendor
        if (userProfile.role !== 'vendor') {
          await supabase.auth.signOut();
          showAlert({
            type: 'error',
            title: 'Invalid Account',
            message: 'This account is not registered as a vendor. Please use the student login.',
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
        message: error.message || 'Authentication failed. Please try again.',
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
                  ? '🏪 Your account will be active immediately. Admin approval required to go live.'
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