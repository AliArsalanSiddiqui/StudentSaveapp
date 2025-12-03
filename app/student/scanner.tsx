import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { QrCode } from 'lucide-react-native';
import QRScanner from '../../components/QRScanner';
import { useRouter } from 'expo-router';

export default function ScannerScreen() {
  const [showScanner, setShowScanner] = useState(false);
  const router = useRouter();

  const handleScanSuccess = (vendorId: string) => {
    setShowScanner(false);
    router.push(`/(student)/vendors/${vendorId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <QrCode color="#c084fc" size={100} />
        </View>
        <Text style={styles.title}>Scan QR Code</Text>
        <Text style={styles.subtitle}>
          Point your camera at the vendor's QR code to redeem your discount
        </Text>

        <TouchableOpacity
          style={styles.scanButton}
          onPress={() => setShowScanner(true)}
        >
          <Text style={styles.scanButtonText}>Open Scanner</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showScanner} animationType="slide">
        <QRScanner
          onClose={() => setShowScanner(false)}
          onSuccess={handleScanSuccess}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1b4b',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 200,
    height: 200,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    color: '#c084fc',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  scanButton: {
    backgroundColor: '#c084fc',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 16,
  },
  scanButtonText: {
    color: '#1e1b4b',
    fontSize: 18,
    fontWeight: 'bold',
  },
});