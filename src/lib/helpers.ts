import { Pin, PinType } from '@/types';

// Função para obter a localização atual do usuário
const FALLBACK_LOCATION = { lat: -23.3343, lng: -46.6953 };

export const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(FALLBACK_LOCATION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        resolve(FALLBACK_LOCATION);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 },
    );
  });
};

// Função para obter dados para um mapa de calor baseado nos pins
export const getHeatmapData = (pins: Pin[], pinType: PinType | 'all' = 'all'): [number, number, number][] => {
  let filteredPins = pins;

  // Filtrar por tipo se não for 'all'
  if (pinType !== 'all') {
    filteredPins = pins.filter(pin => pin.type === pinType);
  }

  // Converter em formato para heatmap
  // formato: [lat, lng, intensidade]
  return filteredPins.map(pin => {
    // A intensidade é baseada no número de votos
    // Pins com mais votos são mais intensos (vermelho)
    const intensity = pin.votes ? Math.min(1, pin.votes / 10) : 0.3;

    return [
      pin.location.lat,
      pin.location.lng,
      intensity
    ];
  });
};

// Conversão de coordenadas para formato DMS (graus, minutos, segundos)
export const convertToDMS = (coordinate: number, isLatitude: boolean): string => {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  const direction = isLatitude
    ? (coordinate >= 0 ? "N" : "S")
    : (coordinate >= 0 ? "E" : "W");

  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
};

export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Calcula a distância entre dois pontos em quilômetros usando a fórmula de Haversine
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Raio da Terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};