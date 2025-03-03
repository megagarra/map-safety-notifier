
import React, { useState } from 'react';
import { Pin, PinType } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, MapPin } from 'lucide-react';

interface MapProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  onMapClick: (lat: number, lng: number) => void;
  selectedPinTypes: PinType[] | null;
  apiKey?: string; // Mantemos este prop para compatibilidade, mas não usaremos
}

const Map: React.FC<MapProps> = ({ 
  pins, 
  onPinClick, 
  onMapClick, 
  selectedPinTypes
}) => {
  const { toast } = useToast();
  const [selectedMarker, setSelectedMarker] = useState<Pin | null>(null);

  // Filtra pins se necessário
  const filteredPins = selectedPinTypes?.length 
    ? pins.filter(pin => selectedPinTypes.includes(pin.type))
    : pins;

  // Função para converter lat/lng para posição no mapa
  const getPositionFromLatLng = (lat: number, lng: number) => {
    // Normaliza lat/lng para uma posição relativa no mapa
    // Estamos considerando o centro de São Paulo como referência
    const centerLat = -23.5489;
    const centerLng = -46.6388;
    
    // Calcula a posição relativa (distância do centro)
    // Multiplicando por 3000 para aumentar o efeito de distanciamento
    const x = (lng - centerLng) * 3000;  
    const y = (lat - centerLat) * -3000; // Invertido porque o CSS cresce para baixo
    
    return { x, y };
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Converte a posição do clique para lat/lng
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 0.01;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -0.01;
    
    // Converte para lat/lng (simulado)
    const lat = -23.5489 + y;
    const lng = -46.6388 + x;
    
    onMapClick(lat, lng);
  };

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
      {/* Mapa simulado */}
      <div 
        className="w-full h-full bg-slate-200 relative cursor-pointer"
        onClick={handleMapClick}
        style={{ minHeight: '400px' }}
      >
        {/* Grade para simular um mapa */}
        <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
          {Array.from({ length: 100 }).map((_, i) => (
            <div key={i} className="border border-slate-300"></div>
          ))}
        </div>
        
        {/* Adiciona mais elementos visuais ao mapa simulado */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Estradas principais simuladas */}
          <div className="absolute left-1/4 top-0 bottom-0 w-1 bg-slate-400"></div>
          <div className="absolute right-1/4 top-0 bottom-0 w-1 bg-slate-400"></div>
          <div className="absolute top-1/4 left-0 right-0 h-1 bg-slate-400"></div>
          <div className="absolute bottom-1/4 left-0 right-0 h-1 bg-slate-400"></div>
          
          {/* Áreas verdes simuladas */}
          <div className="absolute top-1/8 left-1/8 w-1/6 h-1/6 rounded-full bg-green-200/60"></div>
          <div className="absolute bottom-1/6 right-1/5 w-1/4 h-1/5 rounded-lg bg-green-200/60"></div>
        </div>
        
        {/* Centro do mapa (São Paulo) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-blue-500 rounded-full"></div>

        {/* Texto de instrução */}
        <div className="absolute top-4 left-0 right-0 text-center">
          <div className="bg-white/90 mx-auto inline-block px-3 py-2 rounded-lg shadow-lg text-sm font-medium">
            Clique para adicionar um problema
          </div>
        </div>
        
        {/* Renderiza os pins */}
        {filteredPins.map((pin) => {
          const { x, y } = getPositionFromLatLng(pin.location.lat, pin.location.lng);
          return (
            <div
              key={pin.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{ 
                left: `calc(50% + ${x}px)`, 
                top: `calc(50% + ${y}px)` 
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedMarker(pin);
                onPinClick(pin);
              }}
            >
              <div className={`p-1 rounded-full transition-transform hover:scale-110 shadow-lg ${getPinColorClass(pin.type)}`}>
                <MapPin className="w-6 h-6 text-white" />
              </div>
              
              {/* Tooltip para mostrar informações do pin */}
              {selectedMarker?.id === pin.id && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white p-3 rounded shadow-lg z-20 min-w-40 max-w-52">
                  <div className="font-semibold mb-1">{getPinTypeLabel(pin.type)}</div>
                  <p className="text-sm">{pin.description}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Funções auxiliares
const getPinColorClass = (type: PinType): string => {
  switch (type) {
    case 'flood': return 'bg-blue-500';
    case 'pothole': return 'bg-amber-500';
    case 'passable': return 'bg-emerald-500';
    case 'robbery': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getPinTypeLabel = (type: PinType): string => {
  switch (type) {
    case 'flood': return 'Alagamento';
    case 'pothole': return 'Buraco';
    case 'passable': return 'Passável';
    case 'robbery': return 'Assalto';
    default: return type;
  }
};

export default Map;
