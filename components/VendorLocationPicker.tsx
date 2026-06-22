// components/VendorLocationPicker.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform } from 'react-native';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import LocationSearchBar from './LocationSearchBar';
import { matchSupportedCity, NominatimResult } from '@/lib/nominatim';

interface VendorLocationPickerProps {
  initialLat?: number;
  initialLon?: number;
  initialName?: string;
  onConfirm: (lat: number, lon: number, city: string, displayName: string) => void;
  onCancel: () => void;
}

export default function VendorLocationPicker({
  initialLat,
  initialLon,
  initialName,
  onConfirm,
  onCancel,
}: VendorLocationPickerProps) {
  const [selectedLat, setSelectedLat] = useState<number | null>(initialLat || null);
  const [selectedLon, setSelectedLon] = useState<number | null>(initialLon || null);
  const [displayName, setDisplayName] = useState(initialName || '');
  const [city, setCity] = useState('Karachi');

  const handleLocationSelect = (lat: number, lon: number, name: string) => {
    setSelectedLat(lat);
    setSelectedLon(lon);
    setDisplayName(name);

    // Best-effort city extraction from the display name
    const matched = matchSupportedCity(name);
    if (matched) setCity(matched);
  };

  const handleMarkerDragEnd = (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLon(longitude);
  };

  const handleConfirm = () => {
    if (selectedLat == null || selectedLon == null) return;
    onConfirm(selectedLat, selectedLon, city, displayName);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onCancel}>
          <ChevronLeft color="white" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pin Your Location</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchSection}>
        <LocationSearchBar
          placeholder="Search business name or address..."
          onLocationSelect={handleLocationSelect}
          initialValue={displayName}
        />
      </View>

      {selectedLat != null && selectedLon != null ? (
        <>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              region={{
                latitude: selectedLat,
                longitude: selectedLon,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker
                coordinate={{ latitude: selectedLat, longitude: selectedLon }}
                draggable
                onDragEnd={handleMarkerDragEnd}
              />
            </MapView>
          </View>

          <View style={styles.addressBox}>
            <MapPin color="#c084fc" size={16} />
            <Text style={styles.addressText} numberOfLines={2}>
              {displayName || 'Drag the pin to adjust the exact location'}
            </Text>
          </View>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyState}>
          <MapPin color="#c084fc" size={48} />
          <Text style={styles.emptyStateText}>
            Search for your business name or address above to place a pin
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1b4b' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: '600' },
  searchSection: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, zIndex: 10 },
  mapContainer: { flex: 1, margin: 16, borderRadius: 16, overflow: 'hidden' },
  map: { width: '100%', height: '100%' },
  addressBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: 'rgba(192, 132, 252, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(192, 132, 252, 0.3)',
  },
  addressText: { color: '#c084fc', fontSize: 13, flex: 1, lineHeight: 18 },
  confirmButton: {
    backgroundColor: '#c084fc',
    marginHorizontal: 16,
    marginBottom: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: { color: '#1e1b4b', fontSize: 16, fontWeight: '700' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyStateText: { color: '#c084fc', textAlign: 'center', fontSize: 14, lineHeight: 20 },
});