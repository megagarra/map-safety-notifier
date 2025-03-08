import { Pin, PinType } from '@/types';

/**
 * Gera um array de pins aleatórios para testes
 * @param count Número de pins a serem gerados
 * @returns Array de pins
 */
export function generatePins(count: number = 10): Pin[] {
  const pins: Pin[] = [];
  const types: PinType[] = ['flood', 'pothole', 'passable', 'robbery'];
  
  // Coordenadas centrais de Franco da Rocha (corrigidas)
  const centerLat = -23.3268;
  const centerLng = -46.7263;
  
  // Ajustando a dispersão para ser proporcional ao tamanho da cidade
  const spread = 0.025; // Valor para manter os pins dentro da área urbana
  
  // Textos de exemplo para descrições
  const descriptions = [
    'Problema identificado nesta área. Recomendo evitar passar por aqui.',
    'Situação crítica, completamente bloqueado.',
    'Condição moderada, passagem com cautela.',
    'Área com problemas relatados recentemente.',
    'Reportado por diversos usuários, verificado.',
    'Obstrução parcial, mas ainda é possível passar.',
    'Problema persiste há vários dias.',
    'Situação temporária devido a obras.',
    'Autoridades já foram notificadas sobre o problema.',
    'Recomendo rota alternativa se possível.'
  ];
  
  // Localizações específicas de Franco da Rocha (corrigidas)
  const specificLocations = [
    { lat: -23.3219, lng: -46.7269, name: 'Centro' }, // Centro da cidade
    { lat: -23.3283, lng: -46.7231, name: 'Hospital Municipal' }, 
    { lat: -23.3157, lng: -46.7339, name: 'Parque Estadual do Juquery' },
    { lat: -23.3302, lng: -46.7254, name: 'Estação Ferroviária' }, 
    { lat: -23.3270, lng: -46.7259, name: 'Terminal Rodoviário' },
  ];
  
  for (let i = 0; i < count; i++) {
    // Usar locais específicos para os primeiros pins, depois aleatórios
    let lat, lng;
    
    if (i < specificLocations.length) {
      lat = specificLocations[i].lat;
      lng = specificLocations[i].lng;
    } else {
      // Coordenadas aleatórias próximas ao centro
      lat = centerLat + (Math.random() - 0.5) * spread;
      lng = centerLng + (Math.random() - 0.5) * spread;
    }
    
    // Data aleatória nos últimos 7 dias
    const daysAgo = Math.floor(Math.random() * 7);
    const hoursAgo = Math.floor(Math.random() * 24);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(date.getHours() - hoursAgo);
    
    // Tipo aleatório
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Descrição aleatória
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // Imagens de exemplo (vazias para simplificar)
    const hasImages = Math.random() > 0.7;
    const images = hasImages ? [
      'https://via.placeholder.com/300/888/fff?text=Imagem+1',
      'https://via.placeholder.com/300/888/fff?text=Imagem+2'
    ] : [];
    
    // Determinar o endereço para os locais específicos
    let address = '';
    if (i < specificLocations.length) {
      address = `Próximo a ${specificLocations[i].name}, Franco da Rocha`;
    } else {
      address = 'Franco da Rocha, SP';
    }
    
    pins.push({
      id: `pin-${i + 1}`,
      type,
      location: { lat, lng },
      description,
      images,
      reportedAt: date.toISOString(),
      address
    });
  }
  
  return pins;
} 