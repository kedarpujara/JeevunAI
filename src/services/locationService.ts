import * as Location from 'expo-location';

import { LocationData } from '@/types/journal';

export default LocationData;

export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.log('Location permission denied');
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const reverseGeocode = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    const address = reverseGeocode[0];
    
    return {
      coordinates: {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      },
      address: {
        formattedAddress: address ? 
          `${address.street ? address.street + ', ' : ''}${address.city ? address.city + ', ' : ''}${address.region ? address.region + ', ' : ''}${address.country || ''}`.replace(/,\s*$/, '') 
          : 'Unknown location',
        street: address?.street,
        city: address?.city,
        region: address?.region,
        country: address?.country,
        postalCode: address?.postalCode,
      },
      place: undefined, // Could add Google Places lookup later
      accuracy: location.coords.accuracy || undefined,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Location error:', error);
    return null;
  }
}

/**
 * Format location for display
 */
export function formatLocationName(fullLocationData: LocationData): string {
  let locationData = fullLocationData.locationData;
  if (!locationData) return '';

  let address = locationData.address;
  if (!address) return '';
  if (address.city && address.country) {
    return `${address.city}, ${address.country}`;
  }
  if (address.city) return address.city;


  if (locationData.place?.name) return locationData.place?.name;
  return 'Location tagged';
}