import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'expo-router';
import CustomAlert from '@/components/CustomAlert';
import { AlertConfig } from '@/types';

interface QRScannerProps {
  onClose: () => void;
  onSuccess: (vendorId: string, vendorData: any) => void;
  restrictToVendorId?: string; // NEW: Optional vendor ID to restrict scanning
}

export default function QRScanner({ onClose, onSuccess, restrictToVendorId }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const user = useAuthStore((state) => state.user);
  const router = useRouter();
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    visible: false,
    type: 'info',
    title: '',
    message: '',
    buttons: [],
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' | 'warning' = 'info',
    buttons?: AlertConfig['buttons']
  ) => {
    setAlertConfig({
      visible: true,
      type,
      title,
      message,
      buttons:
        buttons || [
          {
            text: 'OK',
            onPress: () => setAlertConfig({ ...alertConfig, visible: false }),
            style: 'default',
          },
        ],
    });
  };

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  const resetScanner = () => {
    setTimeout(() => {
      setScanned(false);
    }, 2000);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    try {
      // Verify QR code belongs to a vendor
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('qr_code', data)
        .eq('active', true)
        .single();

      if (vendorError || !vendor) {
        showAlert('Error', 'Invalid QR code', 'error');
        resetScanner();
        return;
      }

      // NEW: Check if scanning is restricted to a specific vendor
      if (restrictToVendorId && vendor.id !== restrictToVendorId) {
        showAlert(
          'Wrong Vendor QR Code',
          'This QR code does not belong to this vendor. Please scan the correct vendor\'s QR code.',
          'warning'
        );
        resetScanner();
        return;
      }

      // Check if user has active subscription
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('active', true)
        .gte('end_date', new Date().toISOString())
        .single();

      if (subError || !subscription) {
        showAlert(
          'No Active Subscription',
          'Please subscribe to redeem discounts',
          'warning',
          [
            {
              text: 'OK',
              onPress: () => onClose(),
              style: 'default',
            },
          ]
        );
        return;
      }

      // Check if already redeemed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingTransaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('vendor_id', vendor.id)
        .gte('redeemed_at', today.toISOString())
        .single();

      if (existingTransaction) {
        showAlert('Already Redeemed', 'You have already redeemed this discount today', 'warning');
        resetScanner();
        return;
      }

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          vendor_id: vendor.id,
          discount_applied: vendor.discount_text,
          amount_saved: 0,
        });

      if (transactionError) {
        showAlert('Error', 'Failed to process transaction', 'error');
        resetScanner();
        return;
      }

      // Success - show alert before navigating
      showAlert(
        'Success',
        `Discount redeemed successfully!`,
        'success',
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              router.push({
                pathname: '/(student)/discount-claimed',
                params: {
                  vendorName: vendor.name,
                  vendorLogo: vendor.logo_url || '🏪',
                  vendorLocation: vendor.location,
                  discount: vendor.discount_text,
                  vendorId: vendor.id,
                },
              });
            },
            style: 'default',
          },
        ]
      );
    } catch (error) {
      console.error('QR scanning error:', error);
      showAlert('Error', 'Something went wrong', 'error');
      resetScanner();
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera permission required</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128'],
        }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X stroke="white" size={24} />
          </TouchableOpacity>

          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>

          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              {processing 
                ? 'Processing...' 
                : restrictToVendorId 
                  ? 'Point camera at this vendor\'s QR code'
                  : 'Point camera at vendor QR code'
              }
            </Text>
          </View>
        </View>
      </CameraView>

      {/* Custom Alert */}
      <CustomAlert
        visible={alertConfig.visible}
        type={alertConfig.type}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={() => setAlertConfig({ ...alertConfig, visible: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  closeButton: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    borderRadius: 24,
    zIndex: 10,
  },
  scanArea: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    width: '70%',
    aspectRatio: 1,
  },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#c084fc', borderWidth: 4 },
  topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 8 },
  topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 8 },
  bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 8 },
  bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 8 },
  instructions: { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  instructionText: { 
    color: 'white', 
    fontSize: 16, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    borderRadius: 24,
    textAlign: 'center',
  },
  text: { color: 'white', fontSize: 16, textAlign: 'center', marginTop: 100, marginHorizontal: 24 },
  button: { backgroundColor: '#c084fc', marginHorizontal: 24, marginTop: 24, padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#1e1b4b', fontSize: 16, fontWeight: '600' },
});