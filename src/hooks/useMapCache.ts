import { useState, useEffect } from 'react';

interface MapState {
  lastCenter: [number, number];
  lastZoom: number;
  timestamp: number;
}

const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

export function useMapCache() {
  const [cachedState, setCachedState] = useState<MapState | null>(null);

  // Carregar o estado do cache ao inicializar
  useEffect(() => {
    loadFromCache();
  }, []);

  function loadFromCache(): MapState | null {
    try {
      const storedData = localStorage.getItem('mapState');
      if (!storedData) return null;

      const parsedData: MapState = JSON.parse(storedData);
      
      // Verificar se o cache expirou
      if (Date.now() - parsedData.timestamp > CACHE_EXPIRY_TIME) {
        localStorage.removeItem('mapState');
        return null;
      }

      setCachedState(parsedData);
      return parsedData;
    } catch (error) {
      console.error('Erro ao carregar estado do mapa do cache:', error);
      return null;
    }
  }

  function saveToCache(center: [number, number], zoom: number): void {
    try {
      const mapState: MapState = {
        lastCenter: center,
        lastZoom: zoom,
        timestamp: Date.now()
      };
      
      localStorage.setItem('mapState', JSON.stringify(mapState));
      setCachedState(mapState);
    } catch (error) {
      console.error('Erro ao salvar estado do mapa no cache:', error);
    }
  }

  function clearCache(): void {
    try {
      localStorage.removeItem('mapState');
      setCachedState(null);
    } catch (error) {
      console.error('Erro ao limpar cache do mapa:', error);
    }
  }

  return {
    cachedState,
    saveToCache,
    loadFromCache,
    clearCache
  };
}

export default useMapCache; 