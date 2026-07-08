import { useState, useEffect, useRef } from 'react';

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
const ALLOWED_RADIUS_METERS = 700;

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

  const watchIdRef = useRef<number | null>(null);
  const isCheckingIpRef = useRef<boolean>(false);

  // Função assíncrona de contingência por IP público
  const validateIpAddress = async () => {
    if (isCheckingIpRef.current) return;
    isCheckingIpRef.current = true;

    // Interromper a busca do GPS imediatamente
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/api/validate-ip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Sucesso na validação de IP: force o progresso para 100% e defina isWithinRange como true
        setLocationState(prev => ({
          ...prev,
          locationProgress: 100,
          isWithinRange: true,
          isLoading: false,
          error: null
        }));
      } else {
        // Erro na validação de IP: exiba a mensagem pedindo para conectar ao Wi-Fi oficial
        setLocationState(prev => ({
          ...prev,
          isLoading: false,
          isWithinRange: false,
          error: 'Por favor, conecte-se à rede Wi-Fi oficial dos Laboratórios da BIT para liberar sua participação.'
        }));
      }
    } catch (err) {
      console.error('Erro de rede ao validar IP:', err);
      setLocationState(prev => ({
        ...prev,
        isLoading: false,
        isWithinRange: false,
        error: 'Por favor, conecte-se à rede Wi-Fi oficial dos Laboratórios da BIT para liberar sua participação.'
      }));
    }
  };

  // Temporizador de 60 segundos rodando de forma fluida
  useEffect(() => {
    if (skipVerification || !locationState.isLoading) return;

    const interval = setInterval(() => {
      setLocationState(prev => {
        if (!prev.isLoading || prev.locationProgress >= 100) {
          clearInterval(interval);
          return prev;
        }
        // Incrementa progresso de forma fluida em direção a 100% (capping at 99%)
        const nextProgress = Math.min(prev.locationProgress + 1.25, 99);
        return {
          ...prev,
          locationProgress: Number(nextProgress.toFixed(1))
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [locationState.isLoading, skipVerification]);

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

    const checkLocation = () => {
      // Verificar se a geolocalização é suportada
      if (!navigator.geolocation) {
        console.log("Geolocalização não suportada. Acionando contingência de IP imediatamente...");
        validateIpAddress();
        return;
      }

      setLocationState(prev => ({ ...prev, isLoading: true, locationProgress: 25 }));

      let badAccuracyCount = 0;
      let errorCount = 0;

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLon = position.coords.longitude;
          const accuracy = position.coords.accuracy; // Precisão em metros

          console.log(`Coordenada recebida com precisão de: ${accuracy} metros`);

          const distance = calculateDistance(
            userLat,
            userLon,
            SCHOOL_COORDINATES.latitude,
            SCHOOL_COORDINATES.longitude
          );

          // Se a precisão for muito ruim (maior que 500m) e o aluno deu longe, ignora a leitura e continua procurando
          if (accuracy > 500 && distance > ALLOWED_RADIUS_METERS) {
            console.log("Sinal de baixa precisão detectado. Aguardando calibração...");
            badAccuracyCount += 1;
            
            if (badAccuracyCount >= 6) {
              console.log("Limite de tentativas de calibração sem precisão esgotado. Acionando contingência de IP...");
              if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
              validateIpAddress();
            } else {
              setLocationState(prev => ({
                ...prev,
                locationProgress: prev.locationProgress < 75 ? Math.min(prev.locationProgress + 10, 75) : 75
              }));
            }
            return;
          }

          if (distance <= ALLOWED_RADIUS_METERS) {
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
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
            // Se a leitura for calibrada e está longe, rejeita na verificação GPS
            if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
            setLocationState({
              isLoading: false,
              isWithinRange: false,
              error: 'Você não está no local permitido (Escola BIT).',
              hasPermission: true,
              locationProgress: 0,
              showContingency: false,
              latitude: userLat,
              longitude: userLon,
              distance: distance
            });
          }
        },
        (error) => {
          console.error(`Erro ao obter localização:`, error);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
          console.log("Falha de GPS. Acionando contingência de IP imediatamente...");
          validateIpAddress();
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    };

    // Tenta precisão alta imediatamente
    checkLocation();

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [skipVerification]);

  // Efeito para monitorar o progresso da localização e acionar contingência por IP se atingir 60%
  useEffect(() => {
    if (skipVerification) return;

    if (locationState.locationProgress >= 60 && !locationState.isWithinRange) {
      validateIpAddress();
    }
  }, [locationState.locationProgress, locationState.isWithinRange, skipVerification]);

  const retryLocation = () => {
    if (skipVerification) return;

    // Reseta flags e limpa o erro visual
    isCheckingIpRef.current = false;
    setLocationState(prev => ({
      ...prev,
      isLoading: true,
      locationProgress: 10,
      error: null,
      isWithinRange: null
    }));

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
