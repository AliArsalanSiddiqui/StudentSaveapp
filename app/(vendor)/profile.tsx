// app/(vendor)/profile.tsx - FIXED SCROLLING ISSUE IN EDIT MODAL
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ChevronLeft,
  Store,
  Mail,
  Phone,
  MapPin,
  Edit2,
  HelpCircle,
  LogOut,
  ChevronRight,
  Tag,
  Upload,
  Camera,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import CustomAlert, { useCustomAlert } from '@/components/CustomAlert';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function VendorProfile() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { alertConfig, showAlert, Alert } = useCustomAlert();
  
  const [vendorRegistration, setVendorRegistration] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [editData, setEditData] = useState({
    business_name: '',
    location: '',
    phone: '',
    description: '',
    discount_percentage: 20,
    terms: '',
    category: 'Restaurant',
    logo_url: '',
  });

  const categories = ['Restaurant', 'Cafe', 'Arcade', 'Clothing', 'Entertainment'];

  useEffect(() => {
    loadVendorData();
  }, [user]);

  const loadVendorData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('vendor_registrations')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (data && !error) {
        setVendorRegistration(data);
        setEditData({
          business_name: data.business_name,
          location: data.location,
          phone: data.phone || user.phone || '',
          description: data.description || '',
          discount_percentage: data.discount_percentage,
          terms: data.terms || '',
          category: data.category,
          logo_url: data.logo_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showAlert({
          type: 'error',
          title: 'Permission Required',
          message: 'Please grant photo library access to upload logo',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadLogo(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to pick image: ' + error.message,
      });
    }
  };

  const uploadLogo = async (imageUri: string): Promise<void> => {
    if (!user?.id || !vendorRegistration?.id) return;

    setUploadingLogo(true);

    try {
      const fileExt = imageUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${vendorRegistration.id}/${Date.now()}.${fileExt}`;

      console.log('📤 Uploading logo:', fileName);

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('vendor-logos')
        .createSignedUploadUrl(fileName);

      if (signedUrlError || !signedUrlData) {
        console.error('Signed URL error:', signedUrlError);
        throw new Error('Failed to create upload URL');
      }

      const uploadResult = await FileSystem.uploadAsync(
        signedUrlData.signedUrl,
        imageUri,
        {
          httpMethod: 'PUT',
          uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
          headers: {
            'Content-Type': `image/${fileExt}`,
          },
        }
      );

      if (uploadResult.status !== 200) {
        throw new Error(`Upload failed: ${uploadResult.status}`);
      }

      console.log('✅ Logo uploaded successfully');

      const { data: publicData } = supabase.storage
        .from('vendor-logos')
        .getPublicUrl(fileName);

      const logoUrl = publicData.publicUrl;
      console.log('🔗 Public URL:', logoUrl);

      const { error: updateError } = await supabase
        .from('vendor_registrations')
        .update({
          logo_url: logoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendorRegistration.id);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw updateError;
      }

      if (vendorRegistration.verified) {
        await supabase
          .from('vendors')
          .update({ logo_url: logoUrl })
          .eq('id', vendorRegistration.id);
      }

      console.log('✅ Database updated with logo URL');

      setEditData({ ...editData, logo_url: logoUrl });
      await loadVendorData();

      showAlert({
        type: 'success',
        title: 'Success! 🎉',
        message: 'Logo uploaded successfully',
      });

    } catch (error: any) {
      console.error('❌ Logo upload error:', error);
      
      let errorMessage = 'Failed to upload logo';
      
      if (error.message?.includes('BUCKET_NOT_FOUND')) {
        errorMessage = 'Storage bucket not configured. Please contact support.';
      } else if (error.message?.includes('PERMISSION')) {
        errorMessage = 'Storage permissions error. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert({
        type: 'error',
        title: 'Upload Failed',
        message: errorMessage,
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!vendorRegistration?.id) return;

    try {
      const { error: regError } = await supabase
        .from('vendor_registrations')
        .update({
          business_name: editData.business_name,
          location: editData.location,
          description: editData.description,
          discount_percentage: editData.discount_percentage,
          discount_text: `${editData.discount_percentage}% OFF`,
          terms: editData.terms,
          category: editData.category,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendorRegistration.id);

      if (regError) throw regError;

      const { error: userError } = await supabase
        .from('users')
        .update({ phone: editData.phone })
        .eq('id', user?.id);

      if (userError) throw userError;

      if (vendorRegistration.verified) {
        await supabase
          .from('vendors')
          .update({
            name: editData.business_name,
            location: editData.location,
            description: editData.description,
            discount_percentage: editData.discount_percentage,
            discount_text: `${editData.discount_percentage}% OFF`,
            terms: editData.terms,
            category: editData.category,
          })
          .eq('id', vendorRegistration.id);
      }

      await loadVendorData();
      setShowEditModal(false);

      showAlert({
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully',
      });
    } catch (error: any) {
      showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'Failed to update profile',
      });
    }
  };

  const handleLogout = () => {
    showAlert({
      type: 'warning',
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ],
    });
  };

  if (!vendorRegistration) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const getStatusInfo = () => {
    if (vendorRegistration.rejected) {
      return { text: 'Rejected', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' };
    }
    if (!vendorRegistration.verified) {
      return { text: 'Pending Approval', color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.2)' };
    }
    return { text: 'Verified', color: '#22c55e', bgColor: 'rgba(34, 197, 94, 0.2)' };
  };

  const statusInfo = getStatusInfo();

  const menuItems = [
    {
      icon: Edit2,
      label: 'Edit Profile',
      onPress: () => setShowEditModal(true),
      disabled: !vendorRegistration.verified,
    },
    {
      icon: HelpCircle,
      label: 'Help & Support ',
      onPress: () =>
        showAlert({
          type: 'info',
          title: 'Support',
          message: 'Email: studentsave25@gmail.com \n Phone: 03332859061',
        }),
    },
  ];

  return (
    <LinearGradient colors={['#1e1b4b', '#581c87', '#1e1b4b']} style={styles.container}>
      <Alert />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            style={styles.logoUploadContainer}
            onPress={pickImage}
            disabled={uploadingLogo}
          >
            {editData.logo_url ? (
              <Image
                source={{ uri: editData.logo_url }}
                style={styles.logoImage}
              />
            ) : (
              <View style={styles.avatarContainer}>
                <Store color="#1e1b4b" size={48} />
              </View>
            )}
            
            {uploadingLogo ? (
              <View style={styles.uploadingOverlay}>
                <ActivityIndicator color="#f59e0b" size="large" />
                <Text style={styles.uploadingText}>Uploading...</Text>
              </View>
            ) : (
              <View style={styles.cameraButton}>
                <Camera color="white" size={20} />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={pickImage} disabled={uploadingLogo}>
            <Text style={styles.changeLogoText}>
              {editData.logo_url ? 'Change Logo' : 'Upload Logo'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.vendorName}>{vendorRegistration.business_name}</Text>
          <Text style={styles.vendorEmail}>{user?.email} </Text>

          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.text}</Text>
          </View>

          {vendorRegistration.rejected && vendorRegistration.rejection_reason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{vendorRegistration.rejection_reason}</Text>
            </View>
          )}
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Tag color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{vendorRegistration.category}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MapPin color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{vendorRegistration.location}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Phone color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{vendorRegistration.phone || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Tag color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Discount</Text>
                <Text style={styles.infoValue}>{vendorRegistration.discount_text}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, item.disabled && styles.menuItemDisabled]}
                  onPress={item.onPress}
                  disabled={item.disabled}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <Icon color={item.disabled ? '#64748b' : '#f59e0b'} size={20} />
                    </View>
                    <Text style={[styles.menuItemText, item.disabled && styles.menuItemTextDisabled]}>
                      {item.label}
                    </Text>
                  </View>
                  <ChevronRight color={item.disabled ? '#64748b' : '#c084fc'} size={20} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut color="#ef4444" size={20} />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* FIXED EDIT MODAL */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
              overScrollMode="always"
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={editData.business_name}
                  onChangeText={(text) => setEditData({ ...editData, business_name: text })}
                  placeholder="Enter business name"
                  placeholderTextColor="#c084fc"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.categoryChip, editData.category === cat && styles.categoryChipActive]}
                      onPress={() => setEditData({ ...editData, category: cat })}
                    >
                      <Text style={[styles.categoryText, editData.category === cat && styles.categoryTextActive]}>
                        {cat} </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput
                  style={styles.input}
                  value={editData.location}
                  onChangeText={(text) => setEditData({ ...editData, location: text })}
                  placeholder="Enter location"
                  placeholderTextColor="#c084fc"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={editData.phone}
                  onChangeText={(text) => setEditData({ ...editData, phone: text })}
                  placeholder="+92 300 1234567"
                  placeholderTextColor="#c084fc"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editData.description}
                  onChangeText={(text) => setEditData({ ...editData, description: text })}
                  placeholder="Describe your business"
                  placeholderTextColor="#c084fc"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount Percentage</Text>
                <TextInput
                  style={styles.input}
                  value={editData.discount_percentage.toString()}
                  onChangeText={(text) =>
                    setEditData({
                      ...editData,
                      discount_percentage: parseInt(text) || 0,
                    })
                  }
                  placeholder="20"
                  placeholderTextColor="#c084fc"
                  keyboardType="number-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Terms & Conditions</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={editData.terms}
                  onChangeText={(text) => setEditData({ ...editData, terms: text })}
                  placeholder="Enter terms and conditions"
                  placeholderTextColor="#c084fc"
                  multiline
                  numberOfLines={4}
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>

              {/* CRITICAL: Large bottom spacing for Android */}
              <View style={{ height: 200 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16 },
  content: { padding: 24, paddingTop: 60 },
  profileCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 24, padding: 32, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  logoUploadContainer: { position: 'relative', marginBottom: 12 },
  avatarContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: 120, height: 120, borderRadius: 60 },
  uploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  uploadingText: { color: 'white', fontSize: 12, marginTop: 8 },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#1e1b4b' },
  changeLogoText: { color: '#f59e0b', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  vendorName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  vendorEmail: { color: '#c084fc', fontSize: 14, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '600' },
  rejectionBox: { marginTop: 16, backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 8, width: '100%', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  rejectionTitle: { color: '#ef4444', fontSize: 12, fontWeight: '600', marginBottom: 4 },
  rejectionText: { color: '#ef4444', fontSize: 12, lineHeight: 18 },
  section: { marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  infoCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { color: '#c084fc', fontSize: 12, marginBottom: 2 },
  infoValue: { color: 'white', fontSize: 16 },
  menuContainer: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  menuItemDisabled: { opacity: 0.5 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.2)', justifyContent: 'center', alignItems: 'center' },
  menuItemText: { color: 'white', fontSize: 16 },
  menuItemTextDisabled: { color: '#64748b' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', gap: 8 },
  logoutButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  
  // COMPLETELY FIXED MODAL STYLES
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#1e1b4b', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    height: '95%', // Fixed height instead of maxHeight
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#1e1b4b',
  },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  modalCloseButton: { 
    width: 32, 
    height: 32, 
    borderRadius: 16, 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalCloseText: { color: 'white', fontSize: 18 },
  modalBody: { 
    flex: 1,
  },
  modalBodyContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 150, // Much larger bottom padding
  },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.2)', 
    borderRadius: 12, 
    padding: 16, 
    color: 'white', 
    fontSize: 16 
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  categoriesScroll: { flexGrow: 0 },
  categoryChip: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.2)', 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 20, 
    marginRight: 8 
  },
  categoryChipActive: { backgroundColor: '#c084fc', borderColor: '#c084fc' },
  categoryText: { color: 'white', fontSize: 14 },
  categoryTextActive: { color: '#1e1b4b', fontWeight: '600' },
  saveButton: { 
    backgroundColor: '#f59e0b', 
    padding: 16, 
    borderRadius: 12, 
    alignItems: 'center', 
    marginTop: 10,
    marginBottom: 20, // Added margin bottom
  },
  saveButtonText: { color: '#1e1b4b', fontSize: 16, fontWeight: 'bold' },
});