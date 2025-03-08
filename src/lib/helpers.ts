import { Pin, PinType, PinStatus, PinHistoryEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { subDays, addDays } from 'date-fns';

// Locais específicos em Franco da Rocha
const specificLocations = [
  { name: 'Jardim Luciana', lat: -23.3284, lng: -46.5378 },
  { name: 'Centro', lat: -23.3228, lng: -46.5400 },
  { name: 'Parque Vitória', lat: -23.3180, lng: -46.5310 },
  { name: 'Vila dos Comerciários', lat: -23.3305, lng: -46.5422 },
  { name: 'Jardim Progresso', lat: -23.3336, lng: -46.5351 },
  { name: 'Vila Bela', lat: -23.3266, lng: -46.5301 },
  { name: 'Parque Monte Verde', lat: -23.3347, lng: -46.5477 },
  { name: 'Jardim Cruzeiro', lat: -23.3195, lng: -46.5450 },
];

// Descrições genéricas para problemas
const descriptions = [
  'Problema relatado na área. Requer atenção imediata.',
  'Ocorrência de Problema na área. Cuidado ao transitar.',
  'Problema identificado nesta via. Evite passar pela área.',
  'Problema detectado recentemente na área. Tenha cuidado.',
  'Área com Problema. Busque rotas alternativas.',
  'Cuidado ao passar pela área. Problema reportado por múltiplos usuários.',
  'Problema confirmado na área. Autoridades notificadas.',
  'Situação de Problema na área. Recomenda-se evitar o local.',
];

// Função para gerar uma descrição aleatória
const getRandomDescription = (type: PinType): string => {
  const description = descriptions[Math.floor(Math.random() * descriptions.length)];
  const location = specificLocations[Math.floor(Math.random() * specificLocations.length)];
  
  const typeLabel = type === 'infraestrutura' ? 'Problema de infraestrutura' : 'Ocorrência de crime';
  
  return description
    .replace('Problema', typeLabel)
    .replace('área', location.name);
};

// Função para gerar uma data aleatória dentro de um intervalo
const getRandomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Função para gerar histórico aleatório de um pin
const generatePinHistory = (
  pinType: PinType, 
  createdAt: Date, 
  currentStatus: PinStatus
): { history: PinHistoryEntry[], persistenceDays: number } => {
  const history: PinHistoryEntry[] = [];
  let currentDate = new Date(createdAt);
  const now = new Date();
  
  // Primeira entrada: reportado
  history.push({
    status: 'reported',
    date: currentDate.toISOString(),
    description: 'Problema reportado por usuário'
  });
  
  // Possivelmente adiciona reconhecimento (70% de chance)
  if (Math.random() < 0.7) {
    currentDate = new Date(currentDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000); // 0-2 dias depois
    if (currentDate <= now) {
      history.push({
        status: 'acknowledged',
        date: currentDate.toISOString(),
        description: 'Problema reconhecido pela autoridade responsável'
      });
      
      // Possivelmente adiciona em andamento (60% de chance)
      if (Math.random() < 0.6) {
        currentDate = new Date(currentDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000); // 0-3 dias depois
        if (currentDate <= now) {
          history.push({
            status: 'in_progress',
            date: currentDate.toISOString(),
            description: 'Trabalho de resolução iniciado'
          });
          
          // Possivelmente adiciona resolução (50% de chance)
          if (Math.random() < 0.5) {
            currentDate = new Date(currentDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000); // 0-5 dias depois
            if (currentDate <= now) {
              history.push({
                status: 'resolved',
                date: currentDate.toISOString(),
                description: 'Problema resolvido com sucesso'
              });
            }
          }
        }
      }
    }
  }
  
  // Calcular dias de persistência
  const lastEntry = history[history.length - 1];
  const startDate = new Date(history[0].date);
  const endDate = currentStatus === 'resolved' 
    ? new Date(lastEntry.date) 
    : new Date(); // Se não resolvido, conta até hoje
    
  const persistenceDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return { history, persistenceDays };
};

// Função para gerar pins aleatórios em volta de um local central
export const generatePins = (
  count: number = 20, 
  center: [number, number] = [-23.3228, -46.54], 
  radius: number = 0.03
): Pin[] => {
  const pins: Pin[] = [];
  const pinTypes: PinType[] = ['infraestrutura', 'crime'];
  const statusOptions: PinStatus[] = ['reported', 'acknowledged', 'in_progress', 'resolved'];
  
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  
  for (let i = 0; i < count; i++) {
    // Gerar coordenadas aleatórias dentro do raio
    const randomAngle = Math.random() * Math.PI * 2;
    const randomRadius = Math.random() * radius;
    const offsetLat = randomRadius * Math.cos(randomAngle);
    const offsetLng = randomRadius * Math.sin(randomAngle);
    
    // Escolher um tipo aleatório
    const type = pinTypes[Math.floor(Math.random() * pinTypes.length)];
    
    // Gerar data aleatória nos últimos 30 dias
    const reportedAt = getRandomDate(thirtyDaysAgo, now).toISOString();
    
    // Determinar status atual
    const currentStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
    
    // Gerar histórico e dias de persistência
    const { history, persistenceDays } = generatePinHistory(type, new Date(reportedAt), currentStatus);
    
    // Determinar local específico mais próximo
    let nearestLocation = specificLocations[0];
    let minDistance = Number.MAX_VALUE;
    
    specificLocations.forEach(location => {
      const distance = Math.sqrt(
        Math.pow(location.lat - (center[0] + offsetLat), 2) + 
        Math.pow(location.lng - (center[1] + offsetLng), 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestLocation = location;
      }
    });
    
    // Criar pin
    pins.push({
      id: uuidv4(),
      type,
      location: {
        lat: center[0] + offsetLat,
        lng: center[1] + offsetLng
      },
      address: `Rua Exemplo, ${Math.floor(Math.random() * 1000)}, ${nearestLocation.name}, Franco da Rocha - SP`,
      description: getRandomDescription(type),
      reportedAt,
      status: currentStatus,
      history,
      persistenceDays,
      images: type === 'infraestrutura' 
        ? [
            `/images/examples/infrastructure${Math.floor(Math.random() * 3) + 1}.jpg`,
          ] 
        : []
    });
  }
  
  return pins;
};

// Função para agrupar pins por tipo
export const groupPinsByType = (pins: Pin[]): Record<PinType, Pin[]> => {
  const result: Record<PinType, Pin[]> = {
    infraestrutura: [],
    crime: []
  };
  
  pins.forEach(pin => {
    result[pin.type].push(pin);
  });
  
  return result;
};

// Função para agrupar pins por status
export const groupPinsByStatus = (pins: Pin[]): Record<PinStatus, Pin[]> => {
  const result: Record<PinStatus, Pin[]> = {
    reported: [],
    acknowledged: [],
    in_progress: [],
    resolved: []
  };
  
  pins.forEach(pin => {
    result[pin.status].push(pin);
  });
  
  return result;
};

// Função para calcular estatísticas de persistência
export const calculatePersistenceStats = (pins: Pin[]) => {
  // Filtrar pins não resolvidos
  const unresolvedPins = pins.filter(pin => pin.status !== 'resolved');
  
  // Calcular média de dias
  const totalDays = unresolvedPins.reduce((sum, pin) => sum + (pin.persistenceDays || 0), 0);
  const averageDays = unresolvedPins.length > 0 
    ? Math.round(totalDays / unresolvedPins.length) 
    : 0;
    
  // Obter o pin com maior persistência
  const maxPersistencePin = unresolvedPins.reduce(
    (max, pin) => (!max || (pin.persistenceDays || 0) > (max.persistenceDays || 0)) ? pin : max, 
    null as Pin | null
  );
  
  // Agrupar por faixas de tempo
  const ranges = {
    lessThan7Days: 0,
    between7And14Days: 0,
    between14And30Days: 0,
    moreThan30Days: 0
  };
  
  unresolvedPins.forEach(pin => {
    const days = pin.persistenceDays || 0;
    if (days < 7) ranges.lessThan7Days++;
    else if (days < 14) ranges.between7And14Days++;
    else if (days < 30) ranges.between14And30Days++;
    else ranges.moreThan30Days++;
  });
  
  return {
    averageDays,
    maxPersistencePin,
    totalUnresolved: unresolvedPins.length,
    ranges
  };
};

// Função para filtrar pins por dias de persistência
export const filterPinsByPersistence = (pins: Pin[], minDays: number, maxDays: number): Pin[] => {
  return pins.filter(pin => {
    const days = pin.persistenceDays || 0;
    return days >= minDays && (maxDays === -1 || days <= maxDays);
  });
};

// Função para obter dados de mapa de calor a partir dos pins
export const getHeatmapData = (pins: Pin[], pinType: PinType | 'all' = 'all'): [number, number, number][] => {
  const filteredPins = pinType === 'all' 
    ? pins 
    : pins.filter(pin => pin.type === pinType);
    
  return filteredPins.map(pin => {
    // Intensidade baseada no status (problemas não resolvidos têm maior intensidade)
    let intensity = 0.6; // padrão
    
    switch (pin.status) {
      case 'reported':
        intensity = 1.0;
        break;
      case 'acknowledged':
        intensity = 0.8;
        break;
      case 'in_progress':
        intensity = 0.6;
        break;
      case 'resolved':
        intensity = 0.3;
        break;
    }
    
    // Aumentar intensidade baseada nos dias de persistência
    if (pin.persistenceDays && pin.status !== 'resolved') {
      if (pin.persistenceDays > 30) intensity *= 1.5;
      else if (pin.persistenceDays > 14) intensity *= 1.3;
      else if (pin.persistenceDays > 7) intensity *= 1.1;
    }
    
    return [pin.location.lat, pin.location.lng, intensity];
  });
};

export default {
  generatePins,
  groupPinsByType,
  groupPinsByStatus,
  calculatePersistenceStats,
  filterPinsByPersistence,
  getHeatmapData
}; 