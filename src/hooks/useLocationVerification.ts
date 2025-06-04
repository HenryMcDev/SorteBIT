
import { useState, useEffect } from 'react';

interface LocationState {
  isLoading: boolean;
  isWithinRange: boolean | null;
  error: string | null;
  hasPermission: boolean | null;
}

const SCHOOL_COORDINATES = {
  latitude: -19.741150,
  longitude: -47.931570
};

const ALLOWED_RADIUS_METERS = 300;

// Função para calcular a distância entre duas coordenadas usando a fórmula de Haversine
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371000; // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export const useLocationVerification = () => {
  const [locationState, setLocationState] = useState<LocationState>({
    isLoading: true,
    isWithinRange: null,
    error: null,
    hasPermission: null
  });

  useEffect(() => {
    const checkLocation = async () => {
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

      try {
        // Solicitar permissão de localização
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutos
            }
          );
        });

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

        setLocationState({
          isLoading: false,
          isWithinRange: distance <= ALLOWED_RADIUS_METERS,
          error: null,
          hasPermission: true
        });

      } catch (error) {
        console.error('Erro ao obter localização:', error);
        let errorMessage = 'Erro ao verificar localização.';
        
        if (error instanceof GeolocationPositionError) {
          switch (error.code) {
            case GeolocationPositionError.PERMISSION_DENIED:
              errorMessage = 'Permissão de localização negada. É necessário permitir o acesso à localização para participar.';
              break;
            case GeolocationPositionError.POSITION_UNAVAILABLE:
              errorMessage = 'Localização não disponível. Verifique se o GPS está ativado.';
              break;
            case GeolocationPositionError.TIMEOUT:
              errorMessage = 'Tempo limite para obter localização. Tente novamente.';
              break;
          }
        }

        setLocationState({
          isLoading: false,
          isWithinRange: false,
          error: errorMessage,
          hasPermission: false
        });
      }
    };

    checkLocation();
  }, []);

  const retryLocation = () => {
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
