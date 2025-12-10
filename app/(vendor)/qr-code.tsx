// app/(vendor)/qr-code.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Download, Share2, RefreshCw, Copy, Check } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import * as Clipboard from 'expo-clipboard';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import CustomAlert, { useCustomAlert } from '@/components/CustomAlert';

export default function VendorQRCodeScreen() {
  const user = useAuthStore((state) => state.user);
  const qrRef = useRef<View>(null);
  const { alertConfig, showAlert, Alert } = useCustomAlert();
  
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchVendorData();
  }, [user]);

  const fetchVendorData = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (data && !error) {
        setVendor(data);
      } else {
        showAlert({
          type: 'error',
          title: 'Error',
          message: 'Failed to load vendor data',
        });
      }
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyQRCode = async () => {
    if (!vendor?.qr_code) return;
    
    await Clipboard.setStringAsync(vendor.qr_code);
    setCopied(true);
    
    showAlert({
      type: 'success',
      title: 'Copied!',
      message: 'QR code data copied to clipboard',
    });

    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareQRCode = async () => {
    if (!vendor) return;

    try {
      await Share.share({
        message: `Scan this QR code to get ${vendor.discount_text} discount at ${vendor.name}!\nQR Code: ${vendor.qr_code}`,
        title: `${vendor.name} - Student Discount`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDownloadQRCode = async () => {
    if (!qrRef.current) return;

    setDownloading(true);

    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert({
          type: 'error',
          title: 'Permission Required',
          message: 'Please grant photo library access to save QR code',
        });
        setDownloading(false);
        return;
      }

      // Capture the QR code as image
      const uri = await captureRef(qrRef, {
        format: 'png',
        quality: 1,
      });

      // Save to device
      const asset = await MediaLibrary.createAssetAsync(uri);
      await MediaLibrary.createAlbumAsync('StudentSave', asset, false);

      showAlert({
        type: 'success',
        title: 'Saved!',
        message: 'QR code saved to your photo library',
      });
    } catch (error) {
      console.error('Download error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to save QR code',
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleRegenerateQRCode = async () => {
    if (!vendor?.id) return;

    showAlert({
      type: 'warning',
      title: 'Regenerate QR Code?',
      message: 'This will invalidate your current QR code. Continue?',
      buttons: [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Regenerate',
          style: 'destructive',
          onPress: async () => {
            try {
              const newQRCode = `VENDOR_${vendor.id}_${Date.now()}`;
              
              const { error } = await supabase
                .from('vendors')
                .update({ qr_code: newQRCode })
                .eq('id', vendor.id);

              if (error) throw error;

              await fetchVendorData();
              
              showAlert({
                type: 'success',
                title: 'Success',
                message: 'QR code regenerated successfully',
              });
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Error',
                message: 'Failed to regenerate QR code',
              });
            }
          },
        },
      ],
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading QR Code...</Text>
      </View>
    );
  }

  if (!vendor) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Vendor not found </Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1e1b4b', '#581c87', '#1e1b4b']} style={styles.container}>
      <Alert />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your QR Code</Text>
          <Text style={styles.subtitle}>Students scan this to redeem discounts</Text>
        </View>

        {/* QR Code Card */}
        <View style={styles.qrCard} ref={qrRef}>
          <View style={styles.qrContainer}>
            <QRCode
              value={vendor.qr_code}
              size={280}
              backgroundColor="white"
              color="#1e1b4b"
              logo={require('../../assets/icon.png')}
              logoSize={60}
              logoBackgroundColor="white"
            />
          </View>

          <View style={styles.qrInfo}>
            <Text style={styles.vendorName}>{vendor.name}</Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{vendor.discount_text}</Text>
            </View>
          </View>
        </View>

        {/* QR Code Data */}
        <View style={styles.dataCard}>
          <Text style={styles.dataLabel}>QR Code Data:</Text>
          <View style={styles.dataRow}>
            <Text style={styles.dataValue} numberOfLines={1}>
              {vendor.qr_code}
            </Text>
            <TouchableOpacity onPress={handleCopyQRCode} style={styles.copyButton}>
              {copied ? (
                <Check color="#22c55e" size={20} />
              ) : (
                <Copy color="#c084fc" size={20} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareQRCode}
          >
            <Share2 color="#c084fc" size={24} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleDownloadQRCode}
            disabled={downloading}
          >
            <Download color="#c084fc" size={24} />
            <Text style={styles.actionButtonText}>
              {downloading ? 'Saving...' : 'Download'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRegenerateQRCode}
          >
            <RefreshCw color="#c084fc" size={24} />
            <Text style={styles.actionButtonText}>Regenerate</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 How It Works</Text>
          <Text style={styles.instructionItem}>
            1. Display this QR code at your checkout counter
          </Text>
          <Text style={styles.instructionItem}>
            2. Students scan the code with their StudentSave app
          </Text>
          <Text style={styles.instructionItem}>
            3. They show you the confirmation screen
          </Text>
          <Text style={styles.instructionItem}>
            4. Apply the discount and complete the transaction
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <Text style={styles.tipItem}>
            • Print the QR code and place it visibly at your counter
          </Text>
          <Text style={styles.tipItem}>
            • You can regenerate your QR code if it's compromised
          </Text>
          <Text style={styles.tipItem}>
            • Each student can redeem once per day
          </Text>
          <Text style={styles.tipItem}>
            • Track your scans in the Analytics tab
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, backgroundColor: '#1e1b4b', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', fontSize: 16 },
  errorText: { color: '#ef4444', fontSize: 16 },
  content: { padding: 24, paddingTop: 60 },
  header: { marginBottom: 32, alignItems: 'center' },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#c084fc', fontSize: 16, textAlign: 'center' },
  qrCard: { backgroundColor: 'white', borderRadius: 24, padding: 24, alignItems: 'center', marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 12 },
  qrContainer: { marginBottom: 24 },
  qrInfo: { alignItems: 'center', width: '100%' },
  vendorName: { color: '#1e1b4b', fontSize: 24, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  discountBadge: { backgroundColor: '#22c55e', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  discountText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  dataCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  dataLabel: { color: '#c084fc', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  dataRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dataValue: { color: 'white', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', flex: 1 },
  copyButton: { padding: 8 },
  actionsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionButton: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)', gap: 8 },
  actionButtonText: { color: 'white', fontSize: 12, fontWeight: '600' },
  instructionsCard: { backgroundColor: 'rgba(192, 132, 252, 0.1)', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.3)' },
  instructionsTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  instructionItem: { color: '#c084fc', fontSize: 14, marginBottom: 10, lineHeight: 20 },
  tipsCard: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' },
  tipsTitle: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  tipItem: { color: '#f59e0b', fontSize: 14, marginBottom: 10, lineHeight: 20 },
});