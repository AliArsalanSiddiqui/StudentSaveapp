// components/QRScanner.tsx - FIXED SUBSCRIPTION CHECK
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
  restrictToVendorId?: string;
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
      setProcessing(false);
    }, 2000);
  };

  // FIXED: More robust subscription check
  const checkActiveSubscription = async (): Promise<boolean> => {
    if (!user?.id) {
      console.log('❌ No user ID found');
      return false;
    }

    try {
      const now = new Date().toISOString();
      
      // Query with explicit conditions
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .gte('end_date', now)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Subscription query error:', error);
        return false;
      }

      // Debug log
      console.log('🔍 Subscription check:', {
        userId: user.id,
        foundCount: subscriptions?.length || 0,
        subscriptions: subscriptions?.map(s => ({
          id: s.id.substring(0, 8),
          active: s.active,
          endDate: s.end_date,
          isExpired: new Date(s.end_date) <= new Date()
        }))
      });

      // Check if we have any valid subscription
      const hasValidSubscription = subscriptions && subscriptions.length > 0 && 
        subscriptions.some(sub => 
          sub.active === true && 
          new Date(sub.end_date) > new Date()
        );

      if (hasValidSubscription) {
        console.log('✅ Valid subscription found');
        return true;
      } else {
        console.log('❌ No valid subscription found');
        return false;
      }
    } catch (error) {
      console.error('❌ Subscription check error:', error);
      return false;
    }
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanned || processing) return;

    setScanned(true);
    setProcessing(true);

    console.log('📷 QR Code scanned:', data);

    try {
      // Step 1: Verify QR code belongs to a vendor
      const { data: vendor, error: vendorError } = await supabase
        .from('vendors')
        .select('*')
        .eq('qr_code', data)
        .eq('active', true)
        .single();

      if (vendorError || !vendor) {
        console.log('❌ Invalid QR code or inactive vendor');
        showAlert('Invalid QR Code', 'This QR code does not belong to any active vendor', 'error');
        resetScanner();
        return;
      }

      console.log('✅ Valid vendor found:', vendor.name);

      // Step 2: Check if scanning is restricted to a specific vendor
      if (restrictToVendorId && vendor.id !== restrictToVendorId) {
        console.log('❌ Wrong vendor - expected:', restrictToVendorId, 'got:', vendor.id);
        showAlert(
          'Wrong Vendor QR Code',
          'This QR code does not belong to this vendor. Please scan the correct vendor\'s QR code.',
          'warning'
        );
        resetScanner();
        return;
      }

      // Step 3: Check if user has active subscription (FIXED)
      const hasSubscription = await checkActiveSubscription();
      
      if (!hasSubscription) {
        console.log('❌ No active subscription');
        showAlert(
          'No Active Subscription',
          'Please subscribe to redeem discounts',
          'warning',
          [
            {
              text: 'View Plans',
              onPress: () => {
                onClose();
                router.push('/(student)/subscription');
              },
              style: 'default',
            },
            {
              text: 'Cancel',
              onPress: () => {
                setAlertConfig({ ...alertConfig, visible: false });
                resetScanner();
              },
              style: 'cancel',
            },
          ]
        );
        return;
      }

      console.log('✅ Active subscription verified');

      // Step 4: Check if already redeemed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingTransaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('vendor_id', vendor.id)
        .gte('redeemed_at', today.toISOString())
        .maybeSingle();

      if (existingTransaction) {
        console.log('⚠️ Already redeemed today');
        showAlert(
          'Already Redeemed',
          'You have already redeemed this discount today. Come back tomorrow!',
          'warning'
        );
        resetScanner();
        return;
      }

      console.log('✅ No duplicate redemption');

      // Step 5: Create transaction
      const { data: newTransaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user?.id,
          vendor_id: vendor.id,
          discount_applied: vendor.discount_text,
          amount_saved: 0,
        })
        .select()
        .single();

      if (transactionError) {
        console.error('❌ Transaction creation error:', transactionError);
        showAlert('Error', 'Failed to process transaction. Please try again.', 'error');
        resetScanner();
        return;
      }

      console.log('✅ Transaction created:', newTransaction.id);

      // Step 6: Success - navigate to discount claimed screen
      showAlert(
        'Success! 🎉',
        `${vendor.discount_text} discount redeemed at ${vendor.name}!`,
        'success',
        [
          {
            text: 'View Details',
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
                  transactionId: newTransaction.id,
                  transactionTime: newTransaction.redeemed_at,
                },
              });
            },
            style: 'default',
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ QR scanning error:', error);
      showAlert(
        'Error',
        error.message || 'Something went wrong. Please try again.',
        'error'
      );
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