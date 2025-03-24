import { Pin, PinType, PinStatus, PinHistoryEntry } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { subDays } from 'date-fns';

// Locais específicos em Franco da Rocha com coordenadas exatas
const specificLocations = [
  { name: 'Jardim Luciana', lat: -23.3204591, lng: -46.7693249},
  { name: 'Centro', lat: -23.3278622, lng: -46.7274257},
  { name: 'Parque Vitória', lat: -23.3257631, lng: -46.7018562},
  { name: 'Vila dos Comerciários', lat: -23.3051584, lng: -46.7201061 },
  { name: 'Jardim Progresso', lat: -23.7348546, lng: -46.6786048 },
  { name: 'Vila Bela', lat: -23.3103551, lng: -46.7239363 },
  { name: 'Parque Monte Verde', lat: -23.3101433, lng: -46.7111614 },
  { name: 'Jardim Cruzeiro', lat: -23.3258863, lng: -46.7331844 },
];

// Descrições específicas para problemas por local
const problemDescriptions = {
  'infraestrutura': {
    'Jardim Luciana': 'Buraco na via principal próximo ao supermercado. Requer atenção imediata.',
    'Centro': 'Falta de iluminação na praça central. Várias lâmpadas quebradas.',
    'Parque Vitória': 'Calçadas danificadas na avenida principal. Difícil passagem para pedestres.',
    'Vila dos Comerciários': 'Ponto de ônibus sem cobertura. Problema em dias de chuva.',
    'Jardim Progresso': 'Árvore caída bloqueando parcialmente a rua. Necessita remoção.',
    'Vila Bela': 'Vazamento de água na esquina da rua principal. Desperdício contínuo.',
    'Parque Monte Verde': 'Lixo acumulado próximo à praça. Atrai animais e insetos.',
    'Jardim Cruzeiro': 'Asfalto deteriorado em toda extensão da avenida. Dificulta tráfego.'
  },
  'crime': {
    'Jardim Luciana': 'Relatos de furtos no período noturno. Recomenda-se atenção ao transitar.',
    'Centro': 'Ocorrência de assaltos próximo à estação. Maior incidência após 20h.',
    'Parque Vitória': 'Denúncias de arrombamentos em residências. Busque reforçar segurança.',
    'Vila dos Comerciários': 'Relatos de roubos de celulares. Mantenha objetos escondidos.',
    'Jardim Progresso': 'Tentativas de furto a estabelecimentos comerciais. Polícia notificada.',
    'Vila Bela': 'Ocorrência de vandalismo em espaços públicos. Câmeras sendo instaladas.',
    'Parque Monte Verde': 'Relatos de furtos de veículos. Evite estacionar em áreas isoladas.',
    'Jardim Cruzeiro': 'Ocorrência de roubos a pedestres. Recomenda-se evitar caminhar sozinho.'
  }
};

// Função para obter a descrição específica do problema
const getDescription = (type: PinType, locationName: string): string => {
  return problemDescriptions[type][locationName];
};

// Datas fixas para os eventos em vez de aleatórias
const generateHistoryDates = (reportDate: Date): {reported: Date, acknowledged: Date, inProgress: Date, resolved: Date} => {
  const reported = new Date(reportDate);
  const acknowledged = new Date(reportDate);
  acknowledged.setDate(acknowledged.getDate() + 2); // Sempre 2 dias depois
  
  const inProgress = new Date(acknowledged);
  inProgress.setDate(inProgress.getDate() + 3); // Sempre 3 dias depois do reconhecimento
  
  const resolved = new Date(inProgress);
  resolved.setDate(resolved.getDate() + 5); // Sempre 5 dias depois do início do trabalho
  
  return {reported, acknowledged, inProgress, resolved};
};

// Função para gerar histórico de um pin com datas fixas
const generatePinHistory = (
  pinType: PinType, 
  createdAt: Date, 
  currentStatus: PinStatus
): { history: PinHistoryEntry[], persistenceDays: number } => {
  const history: PinHistoryEntry[] = [];
  const now = new Date();
  const historyDates = generateHistoryDates(createdAt);
  
  // Sempre adiciona entrada reportada
  history.push({
    status: 'reported',
    date: historyDates.reported.toISOString(),
    description: 'Problema reportado por usuário'
  });
  
  // Adiciona reconhecimento se o status atual for pelo menos 'acknowledged'
  if (['acknowledged', 'in_progress', 'resolved'].includes(currentStatus)) {
    history.push({
      status: 'acknowledged',
      date: historyDates.acknowledged.toISOString(),
      description: 'Problema reconhecido pela autoridade responsável'
    });
  }
  
  // Adiciona em andamento se o status atual for pelo menos 'in_progress'
  if (['in_progress', 'resolved'].includes(currentStatus)) {
    history.push({
      status: 'in_progress',
      date: historyDates.inProgress.toISOString(),
      description: 'Trabalho de resolução iniciado'
    });
  }
  
  // Adiciona resolvido se o status atual for 'resolved'
  if (currentStatus === 'resolved') {
    history.push({
      status: 'resolved',
      date: historyDates.resolved.toISOString(),
      description: 'Problema resolvido com sucesso'
    });
  }
  
  // Calcular dias de persistência
  const startDate = new Date(history[0].date);
  const endDate = currentStatus === 'resolved' 
    ? new Date(history[history.length - 1].date) 
    : new Date(); // Se não resolvido, conta até hoje
    
  const persistenceDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  return { history, persistenceDays };
};

// Status pré-definidos por localização
const locationStatus: Record<string, PinStatus> = {
  'Jardim Luciana': 'reported',
  'Centro': 'acknowledged',
  'Parque Vitória': 'in_progress',
  'Vila dos Comerciários': 'resolved',
  'Jardim Progresso': 'reported',
  'Vila Bela': 'acknowledged',
  'Parque Monte Verde': 'in_progress',
  'Jardim Cruzeiro': 'resolved'
};

// Função para gerar pins com localizações exatas
export const generatePins = (count: number = 15): Pin[] => {
  const pins: Pin[] = [];
  const now = new Date();
  const thirtyDaysAgo = subDays(now, 30);
  
  // Criar pins para infraestrutura
  specificLocations.forEach(location => {
    // Definir data de reporte fixa - distribui ao longo de 30 dias
    const reportedAt = new Date(thirtyDaysAgo);
    reportedAt.setDate(reportedAt.getDate() + specificLocations.indexOf(location) * 3); // Cada 3 dias
    
    // Definir status específico para o local
    const status = locationStatus[location.name];
    
    // Gerar histórico baseado em datas fixas
    const { history, persistenceDays } = generatePinHistory('infraestrutura', reportedAt, status);
    
    // Gerar votos aleatórios (0-10)
    const votes = Math.floor(Math.random() * 11);
    
    // Criar pin de infraestrutura
    pins.push({
      id: uuidv4(),
      type: 'infraestrutura',
      location: {
        lat: location.lat,
        lng: location.lng
      },
      address: `Rua Principal, ${100 + specificLocations.indexOf(location) * 10}, ${location.name}, Franco da Rocha - SP`,
      description: getDescription('infraestrutura', location.name),
      reportedAt: reportedAt.toISOString(),
      status: status,
      history: history,
      persistenceDays: persistenceDays,
      votes: votes,
      userVoted: false,
      images: [`/images/examples/infrastructure${(specificLocations.indexOf(location) % 3) + 1}.jpg`]
    });
    
    // Criar pin de crime para mesma área, com pequeno offset na localização
    if (pins.length < count) {
      const crimeReportedAt = new Date(reportedAt);
      crimeReportedAt.setDate(crimeReportedAt.getDate() + 1); // 1 dia depois do problema de infraestrutura
      
      const crimeStatus = status === 'resolved' ? 'acknowledged' : 
                        status === 'acknowledged' ? 'reported' : 
                        status === 'reported' ? 'in_progress' : 'resolved';
      
      const { history: crimeHistory, persistenceDays: crimePersistenceDays } = 
        generatePinHistory('crime', crimeReportedAt, crimeStatus);
      
      // Gerar votos aleatórios (0-15) para crimes - tendência a ter mais votos
      const crimeVotes = Math.floor(Math.random() * 16);
      
      pins.push({
        id: uuidv4(),
        type: 'crime',
        location: {
          lat: location.lat + 0.001, // Pequeno offset para não sobrepor
          lng: location.lng + 0.001
        },
        address: `Av. Secundária, ${200 + specificLocations.indexOf(location) * 10}, ${location.name}, Franco da Rocha - SP`,
        description: getDescription('crime', location.name),
        reportedAt: crimeReportedAt.toISOString(),
        status: crimeStatus,
        history: crimeHistory,
        persistenceDays: crimePersistenceDays,
        votes: crimeVotes,
        userVoted: false,
        images: [] // Sem imagens para crimes
      });
    }
  });
  
  // Retornar apenas o número solicitado de pins
  return pins.slice(0, count);
};

// As demais funções permanecem iguais, pois não envolvem aleatoriedade

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
// Remove this entire function
export const getHeatmapData = (pins: Pin[], pinType: PinType | 'all' = 'all'): [number, number, number][] => {
  const filteredPins = pinType === 'all' 
    ? pins 
    : pins.filter(pin => pin.type === pinType);
    
  return filteredPins.map(pin => {
    // Intensidade baseada no status (problemas não resolvidos têm maior intensidade)
    let intensity = 0.6; // padrão
    
    switch (pin.status) {
      case 'reported':
        intensity = 0.8;
        break;
      case 'in_progress':
        intensity = 0.5;
        break;
      case 'resolved':
        intensity = 0.3;
        break;
    }
    
    return [pin.location.lat, pin.location.lng, intensity];
  });
};

// New geolocation function
export const getCurrentLocation = (): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('User denied geolocation prompt'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('Location information is unavailable'));
            break;
          case error.TIMEOUT:
            reject(new Error('The request to get location timed out'));
            break;
          default:
            reject(new Error('An unknown error occurred'));
        }
      },
      options
    );
  });
};

export default {
  generatePins,
  groupPinsByType,
  groupPinsByStatus,
  calculatePersistenceStats,
  filterPinsByPersistence,
  getCurrentLocation, // Add to exports
  // Remove getHeatmapData if needed
};