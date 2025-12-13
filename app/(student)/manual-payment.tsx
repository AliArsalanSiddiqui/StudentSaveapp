// app/(student)/manual-payment.tsx - FIXED BUCKET ERROR
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Copy, Check, Upload, CreditCard, AlertCircle } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import CustomAlert, { useCustomAlert } from '@/components/CustomAlert';
import * as FileSystem from 'expo-file-system';

export default function ManualPaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  const { alertConfig, showAlert, Alert: CustomAlertComponent } = useCustomAlert();

  const planId = params.planId as string;
  const amount = parseInt(params.amount as string);
  const planName = params.planName as string;
  const months = parseInt(params.months as string);

  const [selectedMethod, setSelectedMethod] = useState<'jazzcash' | 'easypaisa' | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Account details from environment variables
  const JAZZCASH_ACCOUNT = process.env.EXPO_PUBLIC_JAZZCASH_MANUAL_ACCOUNT || '03001234567';
  const JAZZCASH_NAME = process.env.EXPO_PUBLIC_JAZZCASH_ACCOUNT_NAME || 'StudentSave';
  const EASYPAISA_ACCOUNT = process.env.EXPO_PUBLIC_EASYPAISA_MANUAL_ACCOUNT || '03001234567';
  const EASYPAISA_NAME = process.env.EXPO_PUBLIC_EASYPAISA_ACCOUNT_NAME || 'StudentSave';

  const copyToClipboard = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showAlert({
          type: 'error',
          title: 'Permission Required',
          message: 'Please grant photo library access to upload payment proof',
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setScreenshot(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image picker error:', error);
      showAlert({
        type: 'error',
        title: 'Error',
        message: 'Failed to open image picker: ' + error.message,
      });
    }
  };

  const uploadScreenshot = async (): Promise<string | null> => {
  if (!screenshot || !user?.id) return null;

  const fileExt = screenshot.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${user.id}/${Date.now()}.${fileExt}`;

  // 1️⃣ Create signed upload URL
  const { data, error } = await supabase.storage
    .from('payment-proofs')
    .createSignedUploadUrl(fileName);

  if (error || !data) {
    console.error('Signed URL error:', error);
    throw error;
  }

  // 2️⃣ Upload file directly (NO blobs)
  const uploadResult = await FileSystem.uploadAsync(
    data.signedUrl,
    screenshot,
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

  // 3️⃣ Get public URL
  const { data: publicData } = supabase.storage
    .from('payment-proofs')
    .getPublicUrl(fileName);

  return publicData.publicUrl;
};


  const handleSubmit = async () => {
    // Validation
    if (!selectedMethod) {
      showAlert({
        type: 'warning',
        title: 'Select Payment Method',
        message: 'Please select JazzCash or EasyPaisa',
      });
      return;
    }

    if (!screenshot) {
      showAlert({
        type: 'warning',
        title: 'Upload Screenshot',
        message: 'Please upload payment proof screenshot',
      });
      return;
    }

    setUploading(true);

    try {
      // FIX 4: Store submission first WITHOUT screenshot URL
      // This way even if upload fails, we have the submission record
      const tempSubmission = {
        user_id: user?.id,
        plan_id: planId,
        amount: amount,
        payment_method: selectedMethod,
        screenshot_url: 'pending', // Temporary placeholder
        status: 'pending',
        user_email: user?.email,
        user_name: user?.name,
        plan_name: planName,
        plan_duration_months: months,
      };

      // Create initial submission
      const { data: submissionData, error: submissionError } = await supabase
        .from('manual_payment_submissions')
        .insert(tempSubmission)
        .select()
        .single();

      if (submissionError) {
        console.error('Database insert error:', submissionError);
        throw submissionError;
      }

      console.log('Submission created:', submissionData.id);

      // FIX 5: Now try to upload screenshot
      let screenshotUrl = 'pending';
      let uploadFailed = false;
      let uploadErrorType = '';
      
      try {
        const uploadedUrl = await uploadScreenshot();
        if (uploadedUrl) {
          screenshotUrl = uploadedUrl;
        }
      } catch (uploadError: any) {
        console.error('Screenshot upload failed:', uploadError);
        uploadFailed = true;
        
        // Parse error type for better user message
        if (uploadError.message?.includes('NETWORK_ERROR')) {
          uploadErrorType = 'network';
          screenshotUrl = `upload_failed:network_error`;
        } else if (uploadError.message?.includes('BUCKET_ERROR')) {
          uploadErrorType = 'bucket';
          screenshotUrl = `upload_failed:bucket_error`;
        } else if (uploadError.message?.includes('PERMISSION_ERROR')) {
          uploadErrorType = 'permission';
          screenshotUrl = `upload_failed:permission_error`;
        } else if (uploadError.message?.includes('CORS_ERROR')) {
          uploadErrorType = 'cors';
          screenshotUrl = `upload_failed:cors_error`;
        } else {
          uploadErrorType = 'unknown';
          screenshotUrl = `upload_failed:${uploadError.message}`;
        }
      }

      // Update submission with screenshot URL (or error message)
      const { error: updateError } = await supabase
        .from('manual_payment_submissions')
        .update({ screenshot_url: screenshotUrl })
        .eq('id', submissionData.id);

      if (updateError) {
        console.error('Failed to update screenshot URL:', updateError);
      }

      console.log('Submission process completed');

      // Show success message with context about upload
      let alertTitle = 'Submitted Successfully! ✅';
      let alertMessage = 'Your payment is under review. You will be notified once approved (usually within 24 hours).';
      
      if (uploadFailed) {
        alertTitle = 'Submission Recorded ⚠️';
        
        if (uploadErrorType === 'network') {
          alertMessage = 'Your payment submission was recorded, but the screenshot could not be uploaded due to network issues.\n\n' +
                        'Please save your submission ID: ' + submissionData.id.slice(0, 8) + '\n\n' +
                        'Contact support with this ID to complete your submission, or try again when you have better internet connection.';
        } else if (uploadErrorType === 'bucket' || uploadErrorType === 'permission') {
          alertMessage = 'Your payment submission was recorded, but storage permissions are not configured correctly.\n\n' +
                        'Your submission ID: ' + submissionData.id.slice(0, 8) + '\n\n' +
                        'Please contact support immediately with this ID. The technical team needs to fix storage access.';
        } else if (uploadErrorType === 'cors') {
          alertMessage = 'Your payment submission was recorded, but there is a technical issue with file uploads.\n\n' +
                        'Your submission ID: ' + submissionData.id.slice(0, 8) + '\n\n' +
                        'Please contact support immediately with this ID. The issue is on our end and will be resolved.';
        } else {
          alertMessage = 'Your payment submission was recorded, but the screenshot upload encountered an error.\n\n' +
                        'Submission ID: ' + submissionData.id.slice(0, 8) + '\n\n' +
                        'Please contact support with this ID to complete your submission.';
        }
      }

      showAlert({
        type: uploadFailed ? 'warning' : 'success',
        title: alertTitle,
        message: alertMessage,
        buttons: [
          {
            text: 'OK',
            onPress: () => router.replace('/(student)/subscription'),
            style: 'default',
          },
        ],
      });
      
    } catch (error: any) {
      console.error('Submission error:', error);
      
      let errorMessage = 'Failed to submit payment proof';
      
      if (error.message?.includes('BUCKET_NOT_FOUND')) {
        errorMessage = 'Storage system is not properly configured. Please contact support immediately.';
      } else if (error.message?.includes('bucket')) {
        errorMessage = 'File storage error. Please try again or contact support.';
      } else if (error.message?.includes('table')) {
        errorMessage = 'Database not configured. Please contact support.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showAlert({
        type: 'error',
        title: 'Submission Failed',
        message: errorMessage,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <CustomAlertComponent />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manual Payment</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plan Info */}
        <View style={styles.planCard}>
          <Text style={styles.planName}>{planName} Plan</Text>
          <Text style={styles.planAmount}>₨{amount}</Text>
          <Text style={styles.planDuration}>Valid for {months} month(s)</Text>
        </View>

        {/* Payment Method Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Select Payment Method</Text>
          
          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'jazzcash' && styles.methodCardActive,
            ]}
            onPress={() => setSelectedMethod('jazzcash')}
          >
            <View style={styles.methodHeader}>
              <CreditCard color={selectedMethod === 'jazzcash' ? '#c084fc' : 'white'} size={24} />
              <Text style={styles.methodName}>JazzCash</Text>
              {selectedMethod === 'jazzcash' && <Check color="#22c55e" size={24} />}
            </View>
            {selectedMethod === 'jazzcash' && (
              <View style={styles.methodDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Title:</Text>
                  <Text style={styles.detailValue}>{JAZZCASH_NAME}</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(JAZZCASH_NAME, 'JazzCash Name')}>
                    {copiedField === 'JazzCash Name' ? (
                      <Check color="#22c55e" size={20} />
                    ) : (
                      <Copy color="#c084fc" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number:</Text>
                  <Text style={styles.detailValue}>{JAZZCASH_ACCOUNT}</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(JAZZCASH_ACCOUNT, 'JazzCash Account')}>
                    {copiedField === 'JazzCash Account' ? (
                      <Check color="#22c55e" size={20} />
                    ) : (
                      <Copy color="#c084fc" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.methodCard,
              selectedMethod === 'easypaisa' && styles.methodCardActive,
            ]}
            onPress={() => setSelectedMethod('easypaisa')}
          >
            <View style={styles.methodHeader}>
              <CreditCard color={selectedMethod === 'easypaisa' ? '#c084fc' : 'white'} size={24} />
              <Text style={styles.methodName}>EasyPaisa</Text>
              {selectedMethod === 'easypaisa' && <Check color="#22c55e" size={24} />}
            </View>
            {selectedMethod === 'easypaisa' && (
              <View style={styles.methodDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Title:</Text>
                  <Text style={styles.detailValue}>{EASYPAISA_NAME}</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(EASYPAISA_NAME, 'EasyPaisa Name')}>
                    {copiedField === 'EasyPaisa Name' ? (
                      <Check color="#22c55e" size={20} />
                    ) : (
                      <Copy color="#c084fc" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Account Number:</Text>
                  <Text style={styles.detailValue}>{EASYPAISA_ACCOUNT}</Text>
                  <TouchableOpacity onPress={() => copyToClipboard(EASYPAISA_ACCOUNT, 'EasyPaisa Account')}>
                    {copiedField === 'EasyPaisa Account' ? (
                      <Check color="#22c55e" size={20} />
                    ) : (
                      <Copy color="#c084fc" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Payment Instructions</Text>
          <Text style={styles.instructionItem}>1. Transfer ₨{amount} to the account above</Text>
          <Text style={styles.instructionItem}>2. Take a clear screenshot of the transaction</Text>
          <Text style={styles.instructionItem}>3. Upload the screenshot below</Text>
          <Text style={styles.instructionItem}>4. Submit for admin approval</Text>
        </View>

        {/* Screenshot Upload */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Upload Payment Proof</Text>
          
          {screenshot ? (
            <View style={styles.screenshotContainer}>
              <Image 
                source={{ uri: screenshot }} 
                style={styles.screenshotImage}
                resizeMode="contain"
              />
              <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
                <Text style={styles.changeButtonText}>Change Screenshot</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Upload color="#c084fc" size={40} />
              <Text style={styles.uploadButtonText}>Tap to Upload Screenshot</Text>
              <Text style={styles.uploadButtonSubtext}>JPG, PNG supported</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Warning Box */}
        <View style={styles.warningCard}>
          <AlertCircle color="#f59e0b" size={20} />
          <Text style={styles.warningText}>
            Make sure your screenshot clearly shows: transaction amount, date/time, and receiver's name
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (uploading || !selectedMethod || !screenshot) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading || !selectedMethod || !screenshot}
        >
          {uploading ? (
            <ActivityIndicator color="#1e1b4b" />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Approval</Text>
          )}
        </TouchableOpacity>
        
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            💡 Your subscription will be activated after admin verification (usually within 24 hours)
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 48, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  content: { flex: 1 },
  planCard: { margin: 16, padding: 20, borderRadius: 16, backgroundColor: 'rgba(192, 132, 252, 0.2)', borderWidth: 2, borderColor: '#c084fc', alignItems: 'center' },
  planName: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  planAmount: { color: '#c084fc', fontSize: 36, fontWeight: 'bold', marginBottom: 4 },
  planDuration: { color: '#c084fc', fontSize: 14 },
  section: { marginHorizontal: 16, marginBottom: 24 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '600', marginBottom: 12 },
  methodCard: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
  methodCardActive: { borderColor: '#c084fc', borderWidth: 2, backgroundColor: 'rgba(192, 132, 252, 0.1)' },
  methodHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  methodName: { color: 'white', fontSize: 18, fontWeight: '600', flex: 1 },
  methodDetails: { marginTop: 16, gap: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  detailLabel: { color: '#c084fc', fontSize: 14, width: 120 },
  detailValue: { color: 'white', fontSize: 14, flex: 1 },
  instructionsCard: { marginHorizontal: 16, marginBottom: 24, backgroundColor: 'rgba(192, 132, 252, 0.1)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(192, 132, 252, 0.3)' },
  instructionsTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  instructionItem: { color: '#c084fc', fontSize: 14, marginBottom: 8, lineHeight: 20 },
  uploadButton: { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 2, borderColor: '#c084fc', borderStyle: 'dashed', borderRadius: 12, padding: 40, alignItems: 'center' },
  uploadButtonText: { color: 'white', fontSize: 16, fontWeight: '600', marginTop: 12 },
  uploadButtonSubtext: { color: '#c084fc', fontSize: 12, marginTop: 4 },
  screenshotContainer: { alignItems: 'center', width: '100%' },
  screenshotImage: { 
    width: '100%', 
    height: 400, 
    borderRadius: 12, 
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  changeButton: { backgroundColor: 'rgba(192, 132, 252, 0.2)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#c084fc' },
  changeButtonText: { color: '#c084fc', fontSize: 14, fontWeight: '600' },
  warningCard: { marginHorizontal: 16, marginBottom: 24, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  warningText: { color: '#f59e0b', fontSize: 13, lineHeight: 20, flex: 1 },
  submitButton: { marginHorizontal: 16, backgroundColor: '#c084fc', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginBottom: 16, minHeight: 52, justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: '#1e1b4b', fontSize: 18, fontWeight: 'bold' },
  noteCard: { marginHorizontal: 16, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
  noteText: { color: '#3b82f6', fontSize: 12, textAlign: 'center', lineHeight: 18 },
});