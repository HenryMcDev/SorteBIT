
import { useState, useEffect } from 'react';

interface LocationState {
  isLoading: boolean;
  isWithinRange: boolean | null;
  error: string | null;
  hasPermission: boolean | null;
}

const SCHOOL_COORDINATES = {
  latitude: -19.59876692284,
  longitude: -46.93668532359792
};
const ALLOWED_RADIUS_METERS = 200;

// Função para calcular a distância entre duas coordenadas usando a fórmula de Haversine
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useLocationVerification = (skipVerification: boolean = false) => {
  const [locationState, setLocationState] = useState<LocationState>({
    isLoading: !skipVerification,
    isWithinRange: skipVerification ? true : null,
    error: null,
    hasPermission: skipVerification ? true : null
  });

  useEffect(() => {
    // Se deve pular a verificação, definir como permitido
    if (skipVerification) {
      setLocationState({
        isLoading: false,
        isWithinRange: true,
        error: null,
        hasPermission: true
      });
      return;
    }

    let watchId: number;

    const checkLocation = () => {
      // Verificar se a geolocalização é suportada
      if (!navigator.geolocation) {
        setLocationState({
          isLoading: false,
          isWithinRange: false,
          error: 'Geolocalização não é suportada neste dispositivo.',
          hasPermission: false
        });
        return;
      }

      const geoErrorMessage = 'A validação falhou por falta de precisão geográfica. Sugerimos que você se aproxime de janelas ou áreas abertas da escola para facilitar a leitura do sinal.';

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;

          // Calcular distância
          const distance = calculateDistance(
            userLat,
            userLon,
            SCHOOL_COORDINATES.latitude,
            SCHOOL_COORDINATES.longitude
          );

          console.log(`Distância da escola: ${distance.toFixed(2)} metros`);

          if (distance <= ALLOWED_RADIUS_METERS) {
            navigator.geolocation.clearWatch(watchId);
            setLocationState({
              isLoading: false,
              isWithinRange: true,
              error: null,
              hasPermission: true
            });
          } else {
            setLocationState({
              isLoading: false,
              isWithinRange: false,
              error: geoErrorMessage,
              hasPermission: true
            });
          }
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
          let errorMessage = geoErrorMessage;

          if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
            errorMessage = 'Permissão de localização negada. É necessário permitir o acesso à localização para participar.';
            setLocationState({
              isLoading: false,
              isWithinRange: false,
              error: errorMessage,
              hasPermission: false
            });
            navigator.geolocation.clearWatch(watchId);
          } else {
            setLocationState({
              isLoading: false,
              isWithinRange: false,
              error: errorMessage,
              hasPermission: true
            });
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        }
      );
    };

    checkLocation();

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [skipVerification]);

  const retryLocation = () => {
    if (skipVerification) return;

    setLocationState(prev => ({ ...prev, isLoading: true }));
    // Re-executar a verificação
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  return {
    ...locationState,
    retryLocation
  };
};
