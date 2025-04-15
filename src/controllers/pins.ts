import { supabase } from '@/integrations/supabase/client';
import { Pin, PinType, PinStatus, CreatePinInput } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Buscar todos os pins do Supabase
export const fetchPins = async (limit: number = 50): Promise<Pin[]> => {
  try {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Erro ao buscar pins:', error);
      return [];
    }

    return data as Pin[];
  } catch (error) {
    console.error('Erro ao buscar pins:', error);
    return [];
  }
};

// Buscar um pin específico por ID
export const fetchPinById = async (id: string): Promise<Pin | null> => {
  try {
    const { data, error } = await supabase
      .from('pins')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar pin:', error);
      return null;
    }

    return data as Pin;
  } catch (error) {
    console.error('Erro ao buscar pin:', error);
    return null;
  }
};

// Criar um novo pin
export const createPin = async (pin: CreatePinInput): Promise<Pin | null> => {
  try {
    // Criar o modelo de pin completo para enviar ao Supabase
    const newPin = {
      id: uuidv4(),
      ...pin,
      reportedAt: new Date().toISOString(),
      status: 'reported',
      votes: 0,
      uservoted: false,
      history: [
        {
          status: 'reported',
          timestamp: new Date().toISOString(),
          description: 'Problema reportado por usuário'
        }
      ],
      persistencedays: 0
    };

    const { data, error } = await supabase
      .from('pins')
      .insert(newPin)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar pin:', error);
      return null;
    }

    return data as Pin;
  } catch (error) {
    console.error('Erro ao criar pin:', error);
    return null;
  }
};

// Atualizar um pin existente
export const updatePin = async (id: string, updates: Partial<Pin>): Promise<Pin | null> => {
  try {
    const { data, error } = await supabase
      .from('pins')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar pin:', error);
      return null;
    }

    return data as Pin;
  } catch (error) {
    console.error('Erro ao atualizar pin:', error);
    return null;
  }
};

// Registrar um voto em um pin
export const voteOnPin = async (pinId: string): Promise<Pin | null> => {
  try {
    // Primeiro, busca o pin atual para obter a contagem de votos
    const { data: pin, error: fetchError } = await supabase
      .from('pins')
      .select('*')
      .eq('id', pinId)
      .single();

    if (fetchError || !pin) {
      console.error('Erro ao buscar pin para voto:', fetchError);
      return null;
    }

    // Incrementa o contador de votos
    const newVotes = (pin.votes || 0) + 1;

    // Atualiza o pin com o novo contador
    const { data, error } = await supabase
      .from('pins')
      .update({ votes: newVotes, uservoted: true })
      .eq('id', pinId)
      .select()
      .single();

    if (error) {
      console.error('Erro ao registrar voto:', error);
      return null;
    }

    // Cria um registro de voto na tabela de votos
    await supabase
      .from('votes')
      .insert({
        pinid: pinId,
        createdat: new Date().toISOString()
      });

    return data as Pin;
  } catch (error) {
    console.error('Erro ao registrar voto:', error);
    return null;
  }
};

// Filtrar pins por tipo
export const filterPinsByType = (pins: Pin[], types: PinType[] | null): Pin[] => {
  if (!types || types.length === 0) {
    return pins;
  }
  return pins.filter(pin => types.includes(pin.type as PinType));
};

// Agrupar pins por tipo
export const groupPinsByType = (pins: Pin[]): Record<PinType, Pin[]> => {
  const result = {} as Record<PinType, Pin[]>;
  
  pins.forEach(pin => {
    const pinType = pin.type as PinType;
    if (!result[pinType]) {
      result[pinType] = [];
    }
    result[pinType].push(pin);
  });
  
  return result;
};

// Agrupar pins por status
export const groupPinsByStatus = (pins: Pin[]): Record<PinStatus, Pin[]> => {
  const result = {} as Record<PinStatus, Pin[]>;
  
  const allStatuses: PinStatus[] = ['reported', 'acknowledged', 'in_progress', 'resolved'];
  allStatuses.forEach(status => {
    result[status] = [];
  });
  
  pins.forEach(pin => {
    const pinStatus = pin.status as PinStatus;
    if (pinStatus && result[pinStatus]) {
      result[pinStatus].push(pin);
    }
  });
  
  return result;
};

// Calcular estatísticas de persistência
export const calculatePersistenceStats = (pins: Pin[]) => {
  // Filtrar pins não resolvidos
  const unresolvedPins = pins.filter(pin => pin.status !== 'resolved');
  
  // Calcular média de dias
  const totalDays = unresolvedPins.reduce((sum, pin) => sum + (pin.persistencedays || 0), 0);
  const averageDays = unresolvedPins.length > 0 
    ? Math.round(totalDays / unresolvedPins.length) 
    : 0;
    
  // Obter o pin com maior persistência
  const maxPersistencePin = unresolvedPins.reduce(
    (max, pin) => (pin.persistencedays || 0) > (max?.persistencedays || 0) ? pin : max,
    null as Pin | null
  );
  
  // Distribuição por faixas de tempo
  const dayRanges = [
    { label: '0-7 dias', count: 0 },
    { label: '8-14 dias', count: 0 },
    { label: '15-30 dias', count: 0 },
    { label: '30+ dias', count: 0 }
  ];
  
  unresolvedPins.forEach(pin => {
    const days = pin.persistencedays || 0;
    if (days <= 7) dayRanges[0].count++;
    else if (days <= 14) dayRanges[1].count++;
    else if (days <= 30) dayRanges[2].count++;
    else dayRanges[3].count++;
  });
  
  return {
    averageDays,
    maxPersistencePin,
    totalUnresolved: unresolvedPins.length,
    dayRanges
  };
};

// Filtrar pins por tempo de persistência
export const filterPinsByPersistence = (pins: Pin[], minDays: number, maxDays: number): Pin[] => {
  return pins.filter(pin => {
    const days = pin.persistencedays || 0;
    return days >= minDays && (maxDays === 0 || days <= maxDays);
  });
}; 