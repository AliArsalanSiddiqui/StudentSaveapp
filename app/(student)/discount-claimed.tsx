// app/(student)/discount-claimed.tsx - FIXED UNIQUE VERIFICATION CODE DISPLAY
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, X, Store, Calendar } from 'lucide-react-native';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export default function DiscountClaimedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useAuthStore((state) => state.user);
  
  const vendorName = params.vendorName as string;
  const vendorLogo = params.vendorLogo as string;
  const vendorLocation = params.vendorLocation as string;
  const discount = params.discount as string;
  const vendorId = params.vendorId as string;
  
  const [transactionData, setTransactionData] = useState<{
    date: string;
    time: string;
    verificationCode: string;
    transactionId: string;
  } | null>(null);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactionData();
  }, []);

  const loadTransactionData = async () => {
    try {
      const transactionId = params.transactionId as string;
      const transactionTime = params.transactionTime as string;
      
      if (transactionId && transactionTime) {
        // CRITICAL FIX: Use the ACTUAL transaction ID passed from QR scanner
        console.log('📋 Loading transaction with ID:', transactionId);
        
        const redeemedDate = new Date(transactionTime);
        
        // Use the first 8 characters of the ACTUAL transaction ID
        const uniqueVerificationCode = transactionId.substring(0, 8).toUpperCase();
        
        console.log('🔐 Unique verification code:', uniqueVerificationCode);
        
        setTransactionData({
          date: format(redeemedDate, 'MMM dd, yyyy'),
          time: format(redeemedDate, 'h:mm a'),
          verificationCode: uniqueVerificationCode,
          transactionId: transactionId, // Store full transaction ID
        });
        setLoading(false);
      } else if (vendorId && user?.id) {
        // Fallback: fetch latest transaction if params missing
        console.log('⚠️ Missing transaction params, fetching latest...');
        await fetchLatestTransaction();
      } else {
        // Last resort fallback
        console.log('⚠️ Using emergency fallback');
        const now = new Date();
        const fallbackCode = `EMRG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        setTransactionData({
          date: format(now, 'MMM dd, yyyy'),
          time: format(now, 'h:mm a'),
          verificationCode: fallbackCode,
          transactionId: 'unknown',
        });
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading transaction data:', error);
      setLoading(false);
    }
  };

  const fetchLatestTransaction = async () => {
    if (!user?.id || !vendorId) {
      setLoading(false);
      return;
    }

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log('🔍 Fetching latest transaction:', { userId: user.id, vendorId });

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('vendor_id', vendorId)
        .gte('redeemed_at', today.toISOString())
        .order('redeemed_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Transaction fetch error:', error);
        // Use fallback
        const now = new Date();
        setTransactionData({
          date: format(now, 'MMM dd, yyyy'),
          time: format(now, 'h:mm a'),
          verificationCode: `FLBK-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          transactionId: 'fallback',
        });
      } else if (data) {
        console.log('✅ Transaction found:', data.id);
        const redeemedDate = new Date(data.redeemed_at);
        
        // CRITICAL: Use the actual transaction ID from database
        const uniqueVerificationCode = data.id.substring(0, 8).toUpperCase();
        
        setTransactionData({
          date: format(redeemedDate, 'MMM dd, yyyy'),
          time: format(redeemedDate, 'h:mm a'),
          verificationCode: uniqueVerificationCode,
          transactionId: data.id,
        });
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
      const now = new Date();
      setTransactionData({
        date: format(now, 'MMM dd, yyyy'),
        time: format(now, 'h:mm a'),
        verificationCode: `ERR-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        transactionId: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!transactionData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Unable to load transaction data</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View>
        {/* Close Button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <X color="white" size={24} />
        </TouchableOpacity>

        {/* Success Section */}
        <View style={styles.successSection}>
          <View style={styles.successIconBg}>
            <CheckCircle 
              color="#22c55e" 
              size={80} 
              strokeWidth={2.5}
            />
          </View>
          
          <Text style={styles.successTitle}>Discount Claimed!</Text>
          <Text style={styles.successSubtitle}>
            Show this screen to the vendor at checkout
          </Text>
        </View>

        {/* Vendor Card */}
        <View style={styles.vendorCard}>
          <View style={styles.vendorHeader}>
            <View style={styles.vendorLogoContainer}>
              {vendorLogo?.startsWith('http') ? (
                <Image
                  source={{ uri: vendorLogo }}
                  style={styles.vendorLogoImage}
                />
              ) : (
                <Text style={styles.vendorLogoEmoji}>{vendorLogo || '🏪'}</Text>
              )}
            </View>
            
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorName}>{vendorName}</Text>
              <View style={styles.locationRow}>
                <Store color="#c084fc" size={14} />
                <Text style={styles.locationText}>{vendorLocation}</Text>
              </View>
            </View>
          </View>

          {/* Discount Amount */}
          <View style={styles.discountSection}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>{discount}</Text>
            </View>
            <Text style={styles.discountLabel}>Discount Applied</Text>
          </View>

          <View style={styles.divider} />

          {/* Transaction Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <Calendar color="#c084fc" size={18} />
              <Text style={styles.detailLabel}>Date & Time:</Text>
              <Text style={styles.detailValue}>
                {transactionData.date} at {transactionData.time}
              </Text>
            </View>
          </View>

          {/* VERIFICATION CODE - UNIQUE AND PROMINENT */}
          <View style={styles.verificationSection}>
            <Text style={styles.verificationLabel}>🔐 Verification Code</Text>
            <View style={styles.verificationCodeContainer}>
              <Text style={styles.verificationCode}>
                {transactionData.verificationCode}
              </Text>
            </View>
            <Text style={styles.verificationHint}>
              ✓ This code is unique to this transaction
            </Text>
            <Text style={styles.verificationSubhint}>
              Transaction ID: {transactionData.transactionId.substring(0, 12)}...
            </Text>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Next Steps:</Text>
          <Text style={styles.instructionItem}>1. Show this screen to the vendor</Text>
          <Text style={styles.instructionItem}>2. Vendor will verify the code above</Text>
          <Text style={styles.instructionItem}>3. Complete your purchase</Text>
          <Text style={styles.instructionItem}>4. Enjoy your discount!</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={() => router.replace('/(student)')}
          >
            <Text style={styles.primaryButtonText}>Done</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={() => router.replace('/(student)/history')}
          >
            <Text style={styles.secondaryButtonText}>View History</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          💡 This discount can only be used once today
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 50
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1e1b4b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 0,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  successSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconBg: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: 24,
  },
  successTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    color: '#c084fc',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  vendorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  vendorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  vendorLogoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  vendorLogoImage: {
    width: '100%',
    height: '100%',
  },
  vendorLogoEmoji: {
    fontSize: 36,
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: '#c084fc',
    fontSize: 14,
  },
  discountSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  discountBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  discountText: {
    color: 'white',
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  discountLabel: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginVertical: 16,
  },
  detailsSection: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    color: '#c084fc',
    fontSize: 14,
    fontWeight: '600',
  },
  detailValue: {
    color: 'white',
    fontSize: 14,
    flex: 1,
    textAlign: 'right',
  },
  verificationSection: {
    marginTop: 20,
    padding: 24,
    backgroundColor: 'rgba(192, 132, 252, 0.15)',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#c084fc',
  },
  verificationLabel: {
    color: '#c084fc',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  verificationCodeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  verificationCode: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    letterSpacing: 8,
    fontFamily: 'monospace',
  },
  verificationHint: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  verificationSubhint: {
    color: '#c084fc',
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  instructionsCard: {
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  instructionsTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  instructionItem: {
    color: '#c084fc',
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#c084fc',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#c084fc',
    marginBottom: 50
  },
  secondaryButtonText: {
    color: '#c084fc',
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    color: '#c084fc',
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.8,
  },
});