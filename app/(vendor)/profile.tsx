// app/(vendor)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import {
  ChevronLeft,
  Store,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  Tag,
  Clock,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { supabase } from '@/lib/supabase';
import CustomAlert, { useCustomAlert } from '@/components/CustomAlert';

export default function VendorProfile() {
  const router = useRouter();
  const { user, signOut } = useAuthStore();
  const { alertConfig, showAlert, Alert } = useCustomAlert();
  
  const [vendor, setVendor] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    location: '',
    phone: '',
    description: '',
    discount_percentage: 20,
    terms: '',
  });

  useEffect(() => {
    loadVendorData();
  }, [user]);

  const loadVendorData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (data && !error) {
        setVendor(data);
        setEditData({
          name: data.name,
          location: data.location,
          phone: user.phone || '',
          description: data.description || '',
          discount_percentage: data.discount_percentage,
          terms: data.terms || '',
        });
      }
    } catch (error) {
      console.error('Error loading vendor:', error);
    }
  };

  const handleSaveProfile = async () => {
    if (!vendor?.id) return;

    try {
      // Update vendor
      const { error: vendorError } = await supabase
        .from('vendors')
        .update({
          name: editData.name,
          location: editData.location,
          description: editData.description,
          discount_percentage: editData.discount_percentage,
          discount_text: `${editData.discount_percentage}% OFF`,
          terms: editData.terms,
        })
        .eq('id', vendor.id);

      if (vendorError) throw vendorError;

      // Update user phone
      const { error: userError } = await supabase
        .from('users')
        .update({ phone: editData.phone })
        .eq('id', user?.id);

      if (userError) throw userError;

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

  const handleToggleActive = async () => {
    if (!vendor?.id) return;

    const newStatus = !vendor.active;

    showAlert({
      type: 'warning',
      title: `${newStatus ? 'Activate' : 'Deactivate'} Vendor?`,
      message: `This will ${newStatus ? 'enable' : 'disable'} student redemptions`,
      buttons: [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('vendors')
                .update({ active: newStatus })
                .eq('id', vendor.id);

              if (error) throw error;

              await loadVendorData();
              
              showAlert({
                type: 'success',
                title: 'Success',
                message: `Vendor ${newStatus ? 'activated' : 'deactivated'}`,
              });
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Error',
                message: 'Failed to update status',
              });
            }
          },
        },
      ],
    });
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

  if (!vendor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const menuItems = [
    {
      icon: Edit2,
      label: 'Edit Profile',
      onPress: () => setShowEditModal(true),
    },
    {
      icon: Settings,
      label: 'Vendor Status',
      onPress: handleToggleActive,
      rightComponent: (
        <Switch
          value={vendor.active}
          onValueChange={handleToggleActive}
          trackColor={{ false: '#767577', true: '#22c55e' }}
          thumbColor={vendor.active ? '#fff' : '#f4f3f4'}
        />
      ),
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onPress: () =>
        showAlert({
          type: 'info',
          title: 'Support',
          message: 'Email: vendor-support@studentsave.com',
        }),
    },
  ];

  return (
    <LinearGradient colors={['#1e1b4b', '#581c87', '#1e1b4b']} style={styles.container}>
      <Alert />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Store color="#1e1b4b" size={48} />
          </View>

          <Text style={styles.vendorName}>{vendor.name}</Text>
          <Text style={styles.vendorEmail}>{user?.email}</Text>

          <View style={[styles.statusBadge, vendor.active ? styles.statusBadgeActive : styles.statusBadgeInactive]}>
            <View style={[styles.statusDot, { backgroundColor: vendor.active ? '#22c55e' : '#ef4444' }]} />
            <Text style={styles.statusText}>{vendor.active ? 'Active' : 'Inactive'}</Text>
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Information</Text>

          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Tag color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Category</Text>
                <Text style={styles.infoValue}>{vendor.category}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MapPin color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{vendor.location}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Phone color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{user?.phone || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <Tag color="#c084fc" size={20} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Discount</Text>
                <Text style={styles.infoValue}>{vendor.discount_text}</Text>
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
                  style={styles.menuItem}
                  onPress={item.onPress}
                >
                  <View style={styles.menuItemLeft}>
                    <View style={styles.menuIconContainer}>
                      <Icon color="#f59e0b" size={20} />
                    </View>
                    <Text style={styles.menuItemText}>{item.label}</Text>
                  </View>
                  {item.rightComponent || <ChevronRight color="#c084fc" size={20} />}
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

      {/* Edit Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
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

            <ScrollView style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={editData.name}
                  onChangeText={(text) => setEditData({ ...editData, name: text })}
                  placeholder="Enter business name"
                  placeholderTextColor="#c084fc"
                />
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
            </ScrollView>
          </View>
        </View>
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
  avatarContainer: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f59e0b', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  vendorName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  vendorEmail: { color: '#c084fc', fontSize: 14, marginBottom: 12 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 4 },
  statusBadgeActive: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  statusBadgeInactive: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: 'white', fontSize: 12, fontWeight: '600' },
  section: { marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  infoCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', gap: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoContent: { flex: 1 },
  infoLabel: { color: '#c084fc', fontSize: 12, marginBottom: 2 },
  infoValue: { color: 'white', fontSize: 16 },
  menuContainer: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(245, 158, 11, 0.2)', justifyContent: 'center', alignItems: 'center' },
  menuItemText: { color: 'white', fontSize: 16 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', gap: 8 },
  logoutButtonText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e1b4b', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  modalTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  modalCloseButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  modalCloseText: { color: 'white', fontSize: 18 },
  modalBody: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: 'white', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', borderRadius: 12, padding: 16, color: 'white', fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#1e1b4b', fontSize: 16, fontWeight: 'bold' },
});