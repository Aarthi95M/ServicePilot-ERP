// lib/hooks/useLocation.ts
// Wrapper around expo-location.
// Requests foreground permission once, then captures current position.

import { useState, useCallback } from 'react';
import * as Location from 'expo-location';

interface GpsCoords {
  latitude:  number;
  longitude: number;
  accuracy:  number | null;
}

interface UseLocationReturn {
  getLocation:    () => Promise<GpsCoords | null>;
  isLocating:     boolean;
  permissionError: string | null;
}

export function useLocation(): UseLocationReturn {
  const [isLocating,      setIsLocating]      = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const getLocation = useCallback(async (): Promise<GpsCoords | null> => {
    setIsLocating(true);
    setPermissionError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionError('Location permission denied. Please enable it in device Settings.');
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      return {
        latitude:  loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy:  loc.coords.accuracy,
      };
    } catch (err) {
      setPermissionError('Could not get location. Make sure GPS is enabled.');
      return null;
    } finally {
      setIsLocating(false);
    }
  }, []);

  return { getLocation, isLocating, permissionError };
}
