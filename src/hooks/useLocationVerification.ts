
import { useState, useEffect } from 'react';

interface LocationState {
  isLoading: boolean;
  isWithinRange: boolean | null;
  error: string | null;
  hasPermission: boolean | null;
  locationProgress: number;
  showContingency: boolean;
  latitude: number | null;
  longitude: number | null;
  distance: number | null;
}

const SCHOOL_COORDINATES = {
  latitude: -19.59876692284,
  longitude: -46.93668532359792
};
const ALLOWED_RADIUS_METERS = 1000;

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
    hasPermission: skipVerification ? true : null,
    locationProgress: skipVerification ? 100 : 0,
    showContingency: false,
    latitude: null,
    longitude: null,
    distance: null
  });

  useEffect(() => {
    // Se deve pular a verificação, definir como permitido
    if (skipVerification) {
      setLocationState({
        isLoading: false,
        isWithinRange: true,
        error: null,
        hasPermission: true,
        locationProgress: 100,
        showContingency: false,
        latitude: null,
        longitude: null,
        distance: null
      });
      return;
    }

    let watchId: number | null = null;
    let fallbackTimeout: NodeJS.Timeout;
    let contingencyTimeout: NodeJS.Timeout;

    const checkLocation = (highAccuracy: boolean) => {
      // Verificar se a geolocalização é suportada
      if (!navigator.geolocation) {
        setLocationState({
          isLoading: false,
          isWithinRange: false,
          error: 'Geolocalização não é suportada neste dispositivo.',
          hasPermission: false,
          locationProgress: 0,
          showContingency: true,
          latitude: null,
          longitude: null,
          distance: null
        });
        return;
      }

      setLocationState(prev => ({ ...prev, isLoading: true, locationProgress: highAccuracy ? 25 : 60 }));

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

          console.log(`Distância da escola (${highAccuracy ? 'Alta' : 'Baixa'} Precisão): ${distance.toFixed(2)} metros`);

          if (distance <= ALLOWED_RADIUS_METERS) {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            clearTimeout(fallbackTimeout);
            clearTimeout(contingencyTimeout);
            setLocationState({
              isLoading: false,
              isWithinRange: true,
              error: null,
              hasPermission: true,
              locationProgress: 100,
              showContingency: false,
              latitude: userLat,
              longitude: userLon,
              distance: distance
            });
          } else {
            // Mantém carregando e atualiza progresso visual simulando busca
            setLocationState(prev => ({
              ...prev,
              isLoading: true,
              isWithinRange: false,
              error: null,
              hasPermission: true,
              locationProgress: prev.locationProgress < 85 ? prev.locationProgress + (highAccuracy ? 5 : 10) : 85,
              latitude: userLat,
              longitude: userLon,
              distance: distance
            }));
          }
        },
        (error) => {
          console.error(`Erro ao obter localização (${highAccuracy ? 'Alta' : 'Baixa'} Precisão):`, error);

          if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
            setLocationState({
              isLoading: false,
              isWithinRange: false,
              error: 'Permissão de localização negada.',
              hasPermission: false,
              locationProgress: 0,
              showContingency: true,
              latitude: null,
              longitude: null,
              distance: null
            });
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
            clearTimeout(fallbackTimeout);
            clearTimeout(contingencyTimeout);
          } else {
            // Continua monitorando com watchPosition apesar de pequenos erros de rede ou timeout
            setLocationState(prev => ({
              ...prev,
              locationProgress: prev.locationProgress < 60 ? prev.locationProgress + 10 : prev.locationProgress
            }));
          }
        },
        {
          enableHighAccuracy: highAccuracy,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // 1º Nível: Tenta precisão alta imediatamente
    checkLocation(true);

    // 2º Nível: Se em 5 segundos não validar com alta precisão, força baixa precisão por celular/wifi
    fallbackTimeout = setTimeout(() => {
      setLocationState(prev => {
        if (!prev.isWithinRange) {
          if (watchId !== null) navigator.geolocation.clearWatch(watchId);
          console.log('Iniciando fallback para baixa precisão de localização...');
          checkLocation(false);
        }
        return prev;
      });
    }, 5000);

    // Contingência: Após ciclo completo (15s), se não achar libera o QR Code
    contingencyTimeout = setTimeout(() => {
      setLocationState(prev => {
        if (!prev.isWithinRange) {
          console.log('Tempo de localização esgotado. Liberando contingência.');
          return { ...prev, showContingency: true, isLoading: false };
        }
        return prev;
      });
    }, 15000);

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      clearTimeout(fallbackTimeout);
      clearTimeout(contingencyTimeout);
    };
  }, [skipVerification]);

  const retryLocation = () => {
    if (skipVerification) return;

    setLocationState(prev => ({ ...prev, isLoading: true, locationProgress: 10 }));
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
