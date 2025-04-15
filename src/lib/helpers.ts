import { Pin, PinType } from '@/types';

// Função para obter a localização atual do usuário
export const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          resolve(getCurrentLocation());
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      console.error("Geolocalização não suportada");
      // Coordenadas padrão para São Paulo como fallback
      resolve({ lat: -23.5505, lng: -46.6333 });
    }
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