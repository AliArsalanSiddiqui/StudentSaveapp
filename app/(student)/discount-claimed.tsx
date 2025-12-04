import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CheckCircle, X, Store, Calendar } from 'lucide-react-native';
import { format } from 'date-fns';

export default function DiscountClaimedScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const vendorName = params.vendorName as string;
  const vendorLogo = params.vendorLogo as string;
  const vendorLocation = params.vendorLocation as string;
  const discount = params.discount as string;
  
  const currentDate = format(new Date(), 'MMM dd, yyyy');
  const currentTime = format(new Date(), 'h:mm a');
  const verificationCode = `VD-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

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
            <Text style={styles.detailValue}>{currentDate} at {currentTime}</Text>
          </View>
        </View>

        {/* Verification Code */}
        <View style={styles.verificationSection}>
          <Text style={styles.verificationLabel}>Verification Code</Text>
          <Text style={styles.verificationCode}>{verificationCode}</Text>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.instructionsCard}>
        <Text style={styles.instructionsTitle}>📋 Next Steps:</Text>
        <Text style={styles.instructionItem}>1. Show this screen to the vendor</Text>
        <Text style={styles.instructionItem}>2. Complete your purchase</Text>
        <Text style={styles.instructionItem}>3. Enjoy your discount!</Text>
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
    marginTop: 16,
    padding: 16,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  verificationLabel: {
    color: '#c084fc',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  verificationCode: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
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