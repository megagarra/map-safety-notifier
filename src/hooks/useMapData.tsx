import { useState, useEffect } from 'react';
import { Pin, CreatePinInput, PinType, PinStatus } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import * as PinsController from '@/controllers/pins';

export function useMapData() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Carrega os pins do Supabase
  useEffect(() => {
    const loadPins = async () => {
      try {
        setLoading(true);
        const data = await PinsController.fetchPins(50);
        setPins(data);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao carregar pins:', err);
        setError('Erro ao carregar pins');
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do mapa",
          variant: "destructive"
        });
        setLoading(false);
      }
    };

    loadPins();
  }, [toast]);

  const addPin = async (pin: CreatePinInput) => {
    try {
      const newPin = await PinsController.createPin(pin);
      
      if (newPin) {
        setPins((prev) => [newPin, ...prev]);
        
        toast({
          title: "Localização reportada",
          description: "Obrigado por contribuir com a comunidade!",
        });
        
        return newPin;
      } else {
        throw new Error('Falha ao criar pin');
      }
    } catch (err) {
      console.error('Erro ao adicionar localização:', err);
      setError('Erro ao adicionar localização');
      toast({
        title: "Erro",
        description: "Não foi possível adicionar sua localização",
        variant: "destructive"
      });
      throw err;
    }
  };

  const voteOnPin = async (pinId: string) => {
    try {
      const updatedPin = await PinsController.voteOnPin(pinId);
      
      if (updatedPin) {
        setPins((prev) => 
          prev.map((pin) => pin.id === pinId ? updatedPin : pin)
        );
        
        toast({
          title: "Voto registrado",
          description: "Obrigado por confirmar este problema"
        });
        
        return updatedPin;
      } else {
        throw new Error('Falha ao registrar voto');
      }
    } catch (err) {
      console.error('Erro ao registrar voto:', err);
      toast({
        title: "Erro",
        description: "Não foi possível registrar seu voto",
        variant: "destructive"
      });
      throw err;
    }
  };

  const filterPins = (types: PinType[] | null) => {
    if (!types || types.length === 0) {
      return pins;
    }
    return pins.filter(pin => types.includes(pin.type as PinType));
  };

  return {
    pins,
    loading,
    error,
    addPin,
    filterPins,
    voteOnPin
  };
}
