// components/VendorMapPreview.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import { MapPin, Navigation } from 'lucide-react-native';

interface VendorMapPreviewProps {
  latitude?: number;
  longitude?: number;
  vendorName: string;
  location: string;
}

export default function VendorMapPreview({
  latitude,
  longitude,
  vendorName,
  location,
}: VendorMapPreviewProps) {
  if (!latitude || !longitude) {
    return (
      <View style={styles.placeholderCard}>
        <MapPin color="#c084fc" size={32} />
        <Text style={styles.placeholderText}>Location not set by vendor </Text>
      </View>
    );
  }

  const handleGetDirections = async () => {
    const label = encodeURIComponent(vendorName);
    let url = '';

    if (Platform.OS === 'ios') {
      url = `maps://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`;
    } else if (Platform.OS === 'android') {
      url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
    } else {
      url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    }

    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        await Linking.openURL(fallback);
      }
    } catch (error) {
      console.error('Error opening maps:', error);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          scrollEnabled={false}
          zoomEnabled={false}
          pitchEnabled={false}
          rotateEnabled={false}
        >
          <Marker coordinate={{ latitude, longitude }}>
            <Callout>
              <Text style={{ fontWeight: '600' }}>{vendorName}</Text>
            </Callout>
          </Marker>
        </MapView>
      </View>

      <TouchableOpacity style={styles.directionsButton} onPress={handleGetDirections}>
        <Navigation color="#1e1b4b" size={18} />
        <Text style={styles.directionsButtonText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: '100%' },
  placeholderCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  placeholderText: { color: '#c084fc', fontSize: 14 },
  mapWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: { width: '100%', height: '100%' },
  directionsButton: {
    flexDirection: 'row',
    backgroundColor: '#c084fc',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  directionsButtonText: { color: '#1e1b4b', fontSize: 15, fontWeight: '700' },
});