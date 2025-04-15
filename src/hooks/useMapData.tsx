
import { useState, useEffect } from 'react';
import { Pin, CreatePinInput, PinType, PinStatus } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

// This is a mock implementation. In a real application, this would connect to a backend
export function useMapData() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Mock data load
  useEffect(() => {
    const mockPins: Pin[] = [
      {
        id: uuidv4(),
        type: 'flood',
        location: { lat: -23.5489, lng: -46.6388 }, // São Paulo
        description: 'Rua completamente alagada após chuva forte',
        images: ['/placeholder.svg'],
        reportedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        history: [],
        status: 'reported'
      },
      {
        id: uuidv4(),
        type: 'pothole',
        location: { lat: -23.5589, lng: -46.6488 }, // São Paulo
        description: 'Buraco enorme na pista, cuidado ao passar',
        images: ['/placeholder.svg'],
        reportedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        history: [],
        status: 'reported'
      },
      {
        id: uuidv4(),
        type: 'robbery',
        location: { lat: -23.5389, lng: -46.6288 }, // São Paulo
        description: 'Assalto a mão armada nesta esquina ontem à noite',
        images: ['/placeholder.svg'],
        reportedAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
        history: [],
        status: 'reported'
      },
      {
        id: uuidv4(),
        type: 'passable',
        location: { lat: -23.5489, lng: -46.6288 }, // São Paulo
        description: 'Rua liberada após obras, tráfego fluindo normalmente',
        images: ['/placeholder.svg'],
        reportedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        history: [],
        status: 'reported'
      }
    ];

    setTimeout(() => {
      setPins(mockPins);
      setLoading(false);
    }, 1000);
  }, []);

  const addPin = (pin: CreatePinInput) => {
    try {
      const newPin: Pin = {
        id: uuidv4(),
        ...pin,
        reportedAt: new Date().toISOString(),
        history: [],
        status: 'reported'
      };
      
      setPins((prev) => [newPin, ...prev]);
      
      toast({
        title: "Localização reportada",
        description: "Obrigado por contribuir com a comunidade!",
      });
      
      return newPin;
    } catch (err) {
      setError('Erro ao adicionar localização');
      toast({
        title: "Erro",
        description: "Não foi possível adicionar sua localização",
        variant: "destructive"
      });
      throw err;
    }
  };

  const filterPins = (types: PinType[] | null) => {
    if (!types || types.length === 0) {
      return pins;
    }
    return pins.filter(pin => types.includes(pin.type));
  };

  return {
    pins,
    loading,
    error,
    addPin,
    filterPins
  };
}
