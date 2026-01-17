// app/(auth)/vendor-login.tsx - FINAL FIX: NO AUTO NAVIGATION FOR UNVERIFIED
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
  const [description, setDescription] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('20');
  const [terms, setTerms] = useState('');

  const categories = ['Restaurant', 'Cafe', 'Arcade', 'Clothing', 'Entertainment'];

  const handleAuth = async () => {
    if (!email.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter your email' });
      return;
    }

    if (!password.trim()) {
      showAlert({ type: 'error', title: 'Error', message: 'Please enter your password' });
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        // ============== REGISTRATION FLOW ==============
        console.log('📝 Starting registration...');
        
        if (!businessName.trim() || !ownerName.trim() || !phone.trim() || !location.trim()) {
          showAlert({ type: 'error', title: 'Error', message: 'Please fill all required fields' });
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          showAlert({ type: 'error', title: 'Error', message: 'Password must be at least 6 characters' });
          setLoading(false);
          return;
        }

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            emailRedirectTo: undefined,
            data: {
              name: ownerName.trim(),
              role: 'vendor',
            },
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('User creation failed');

        console.log('✅ Auth user created:', authData.user.id);

        // Step 2: Wait for trigger
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 3: Update user profile
        await supabase
          .from('users')
          .update({
            name: ownerName.trim(),
            phone: phone.trim(),
            role: 'vendor',
            verified: false,
          })
          .eq('id', authData.user.id);

        // Step 4: Create vendor registration
        const discountValue = parseInt(discountPercentage) || 20;
        const { error: registrationError } = await supabase
          .from('vendor_registrations')
          .insert({
            owner_id: authData.user.id,
            business_name: businessName.trim(),
            owner_name: ownerName.trim(),
            email: email.trim(),
            phone: phone.trim(),
            location: location.trim(),
            category: category,
            description: description.trim() || null,
            discount_percentage: discountValue,
            discount_text: `${discountValue}% OFF`,
            terms: terms.trim() || 'Valid for students only. ID required.',
            verified: false,
            first_login_completed: false,
          });

        if (registrationError) {
          console.error('❌ Registration error:', registrationError);
          await supabase.auth.signOut();
          throw new Error('Failed to create vendor registration');
        }

        console.log('✅ Vendor registration created');

        // ⚠️ CRITICAL: Sign out IMMEDIATELY to prevent auto-navigation
        await supabase.auth.signOut();
        console.log('✅ Signed out after registration');

        // Clear form
        setIsSignUp(false);
        setEmail('');
        setPassword('');
        setBusinessName('');
        setOwnerName('');
        setPhone('');
        setLocation('');
        setDescription('');
        setTerms('');

        // Stop loading
        setLoading(false);

        // Show alert - NO NAVIGATION until button clicked
        showAlert({
          type: 'success',
          title: 'Registration Submitted! 🎉',
          message: 'Your vendor registration has been submitted for review.\n\nOur admin team will verify your account within 24-48 hours.\n\nYou will receive an email once approved. Please do not attempt to login until verified.',
          buttons: [
            {
              text: 'Got it!',
              onPress: () => {
                setTimeout(() => {
                  router.replace('/(auth)/welcome');
                }, 200);
              },
              style: 'default',
            },
          ],
        });

      } else {
        // ============== LOGIN FLOW ==============
        console.log('🔐 Starting login...');

        // Step 1: Try to authenticate
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        if (error) {
          console.error('❌ Login error:', error);
          throw error;
        }
        if (!data.user) throw new Error('Login failed');

        console.log('✅ Authentication successful');

        // Step 2: Check vendor registration
        const { data: registration, error: regError } = await supabase
          .from('vendor_registrations')
          .select('*')
          .eq('owner_id', data.user.id)
          .single();

        if (regError || !registration) {
          console.log('❌ No registration found');
          
          // Sign out IMMEDIATELY
          await supabase.auth.signOut();
          setLoading(false);
          
          showAlert({
            type: 'error',
            title: 'No Registration Found',
            message: 'No vendor registration exists for this account. Please sign up first.',
            buttons: [
              {
                text: 'OK',
                onPress: () => {
                  setTimeout(() => {
                    router.replace('/(auth)/welcome');
                  }, 200);
                },
                style: 'default',
              },
            ],
          });
          return;
        }

        console.log('Registration found:', {
          verified: registration.verified,
          rejected: registration.rejected,
          firstLogin: registration.first_login_completed,
        });

        // Check if rejected
        if (registration.rejected) {
          console.log('❌ Registration rejected');
          
          await supabase.auth.signOut();
          setLoading(false);
          
          showAlert({
            type: 'error',
            title: 'Registration Rejected',
            message: registration.rejection_reason || 'Your registration was rejected. Please contact support.',
            buttons: [
              {
                text: 'OK',
                onPress: () => {
                  setTimeout(() => {
                    router.replace('/(auth)/welcome');
                  }, 200);
                },
                style: 'default',
              },
            ],
          });
          return;
        }

        // ⚠️ CRITICAL CHECK: If NOT verified, sign out and show alert
        if (!registration.verified) {
          console.log('⏳ Account not verified yet');
          
          // Sign out IMMEDIATELY to prevent auto-navigation
          await supabase.auth.signOut();
          setLoading(false);
          
          showAlert({
            type: 'warning',
            title: 'Account Not Verified ⏳',
            message: 'Your vendor registration is still pending admin approval.\n\nPlease wait for verification email before attempting to login.\n\nThis usually takes 24-48 hours.',
            buttons: [
              {
                text: 'OK',
                onPress: () => {
                  setTimeout(() => {
                    router.replace('/(auth)/welcome');
                  }, 200);
                },
                style: 'default',
              },
            ],
          });
          return;
        }

        console.log('✅ Account is verified!');

        // Account is verified - check if first login
        const isFirstLogin = !registration.first_login_completed;

        if (isFirstLogin) {
          console.log('🎉 First login after verification!');
          
          // Mark first login as completed
          await supabase
            .from('vendor_registrations')
            .update({ first_login_completed: true })
            .eq('id', registration.id);

          // Stop loading
          setLoading(false);

          // Show welcome alert
          showAlert({
            type: 'success',
            title: 'Welcome to StudentSave! ✅',
            message: 'Your vendor account has been verified!\n\nYou can now access your dashboard and start offering exclusive discounts to students.',
            buttons: [
              {
                text: 'Get Started',
                onPress: () => {
                  // Small delay before navigation
                  setTimeout(() => {
                    router.replace('/(vendor)' as any);
                  }, 200);
                },
                style: 'default',
              },
            ],
          });
          return;
        }

        // Regular login - verified vendor
        console.log('✅ Regular login - navigating to dashboard');
        
        setLoading(false);
        router.replace('/(vendor)' as any);
      }
    } catch (error: any) {
      console.error('❌ Auth error:', error);
      
      // Make sure we're signed out on error
      await supabase.auth.signOut();
      setLoading(false);
      
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'Authentication failed. Please try again.',
      });
    }
  };

  return (
    <LinearGradient colors={['#1e1b4b', '#581c87', '#1e1b4b']} style={styles.container}>
      <Alert />
      
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft color="white" size={24} />
            </TouchableOpacity>
          </View>

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

            <View style={styles.form}>
              {isSignUp && (
                <>
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Business Name *</Text>
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
                    <Text style={styles.label}>Owner Name *</Text>
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
                    <Text style={styles.label}>Phone Number *</Text>
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
                    <Text style={styles.label}>Location *</Text>
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
                    <Text style={styles.label}>Category *</Text>
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

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Describe your business"
                      placeholderTextColor="#c084fc"
                      value={description}
                      onChangeText={setDescription}
                      multiline
                      numberOfLines={3}
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Discount Percentage *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="20"
                      placeholderTextColor="#c084fc"
                      value={discountPercentage}
                      onChangeText={setDiscountPercentage}
                      keyboardType="number-pad"
                      editable={!loading}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Terms & Conditions (Optional)</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Valid for students only. ID required."
                      placeholderTextColor="#c084fc"
                      value={terms}
                      onChangeText={setTerms}
                      multiline
                      numberOfLines={3}
                      editable={!loading}
                    />
                  </View>
                </>
              )}

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Business Email *</Text>
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
                <Text style={styles.label}>Password *</Text>
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
                  {loading ? 'Please wait...' : isSignUp ? 'Submit Registration' : 'Sign In'}
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
                  setDescription('');
                  setTerms('');
                }}
                disabled={loading}
              >
                <Text style={styles.toggleButtonText}>
                  {isSignUp ? 'Already registered? Sign In' : 'New vendor? Register Now'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {isSignUp
                  ? '📝 Your registration will be reviewed by our team within 24-48 hours'
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
  textArea: { height: 100, textAlignVertical: 'top' },
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
  infoBox: { backgroundColor: 'rgba(192, 132, 252, 0.1)', borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.3)', borderRadius: 12, padding: 16, marginTop: 24 },
  infoText: { color: '#c084fc', fontSize: 14, textAlign: 'center', lineHeight: 20 },
});