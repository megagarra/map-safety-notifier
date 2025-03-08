import React, { useState, useEffect, useRef } from 'react';
import { Pin, PinType } from '@/types';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PinHistory from '@/components/PinHistory';
import { Clock, X, Copy, AlertCircle, CheckCircle, Wrench, BarChart3, LineChart, AlertTriangle } from 'lucide-react';
import HeatmapControl from '@/components/HeatmapControl';
import PersistenceStats from '@/components/PersistenceStats';
import PersistenceTimeline from '@/components/PersistenceTimeline';
import PersistenceFilter from '@/components/PersistenceFilter';

// Fix for Leaflet marker icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// At the top of your file, add these type declarations
declare module 'leaflet' {
  interface IconDefault {
    _getIconUrl?: string;
  }
  
  interface Map {
    isUserInteraction?: React.MutableRefObject<boolean>;
  }
}

// Delete the default icon
delete (L.Icon.Default.prototype as L.IconDefault)._getIconUrl;

// Set up the default icon
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface MapProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  onMapClick: (lat: number, lng: number) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  selectedPinTypes: PinType[] | null;
  selectedPin: Pin | null;
  center: [number, number];
  zoom: number;
}

// Mapa com tema escuro similar à imagem
const customTileLayer = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Componente para detectar clicks no mapa
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Componente para criar um pin customizado
const CustomPin = ({ pin, onClick }) => {
  const isCrime = pin.type === 'crime';
  
  return (
    <div 
      className={`pin-container ${isCrime ? 'pin-pulse' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pin);
      }}
    >
      <div className={`custom-pin ${isCrime ? 'crime-pin' : 'infra-pin'}`}>
        <div 
          dangerouslySetInnerHTML={{ 
            __html: getPinIconSvg(pin.type) 
          }} 
        />
      </div>
      <div className="score-badge">
        {getScoreFromType(pin.type)}
      </div>
    </div>
  );
};

// Componente para detectar movimentos do mapa e atualizar a URL
const MapEvents = ({ onMapClick, onMapMove }) => {
  const map = useMap();
  const isUserInteraction = useRef(true);
  
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend: () => {
      // Somente atualizar se for uma interação do usuário
      if (isUserInteraction.current && onMapMove) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        onMapMove([center.lat, center.lng], zoom);
      }
      isUserInteraction.current = true; // Redefinir a flag
    },
    zoomend: () => {
      // Somente atualizar se for uma interação do usuário
      if (isUserInteraction.current && onMapMove) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        onMapMove([center.lat, center.lng], zoom);
      }
      isUserInteraction.current = true; // Redefinir a flag
    }
  });
  
  // Expor a flag para outros componentes
  useEffect(() => {
    map.isUserInteraction = isUserInteraction;
  }, [map]);
  
  return null;
};

// Componente para atualizar o centro do mapa quando as props mudam
const MapCenterUpdater = ({ center, zoom }) => {
  const map = useMap();
  const firstRender = useRef(true);
  
  useEffect(() => {
    // Ignorar a primeira renderização que sempre ocorre naturalmente
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    
    // Verificar se as coordenadas são realmente diferentes 
    // para evitar atualizações desnecessárias
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    if (Math.abs(currentCenter.lat - center[0]) > 0.0001 || 
        Math.abs(currentCenter.lng - center[1]) > 0.0001 || 
        currentZoom !== zoom) {
      
      // Marcar que esta é uma atualização programática, não uma interação do usuário
      if (map.isUserInteraction) {
        map.isUserInteraction.current = false;
      }
      
      // Atualizar a visualização sem animação para evitar eventos adicionais
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, map]);
  
  return null;
};

// Componente de detalhes do pin (igual ao cartão Adidas na imagem)
const PinDetails = ({ pin, onClose }) => {
  const [showHistory, setShowHistory] = useState(false);
  const isCrime = pin.type === 'crime';
  
  if (!pin) return null;
  
  // Função para copiar a URL atual para a área de transferência
  const copyLocationLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Link copiado para a área de transferência!');
      })
      .catch(err => {
        console.error('Erro ao copiar link:', err);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-auto backdrop-blur-sm">
      <div className={cn(
        "relative w-[90%] max-w-[450px] max-h-[80vh] overflow-y-auto rounded-xl bg-[#121212] shadow-2xl border transition-all duration-300 animate-fadeIn",
        isCrime ? "border-[#f43f5e]" : "border-[#2a2a2a]"
      )}>
        <div className={cn(
          "sticky top-0 z-10 flex justify-between items-center p-4 border-b",
          isCrime 
            ? "border-[#f43f5e]/30 bg-[#1a1a1a]" 
            : "border-[#2a2a2a] bg-[#1a1a1a]"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full",
              isCrime ? "bg-[#1a1a1a] border-[#f43f5e] border-2 text-[#f43f5e]" : getPinColorClass(pin.type)
            )}>
              {isCrime ? (
                <AlertCircle size={16} className="text-[#f43f5e]" />
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: getPinIconSvg(pin.type) 
                  }} 
                  className="scale-75"
                />
              )}
            </div>
            <h3 className="text-lg font-medium text-white">
              {getPinTypeLabel(pin.type)}
            </h3>
          </div>
          <button 
            onClick={() => onClose()}
            className="h-8 w-8 rounded-full bg-[#2a2a2a]/80 flex items-center justify-center text-white/70 hover:bg-[#3a3a3a] hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-400">Localização</div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#252525]"
                onClick={copyLocationLink}
              >
                <Copy size={12} className="mr-1" />
                Copiar link
              </Button>
            </div>
            <div className="text-sm text-white">
              {pin.address || `${convertToDMS(pin.location.lat, true)}, ${convertToDMS(pin.location.lng, false)}`}
            </div>
          </div>
          
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Descrição</div>
            <p className="text-sm text-white">{pin.description}</p>
          </div>
          
          {/* Status atual */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Status atual</div>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
              getStatusBgClass(pin.status)
            )}>
              {getStatusIcon(pin.status)}
              <span>{getStatusLabel(pin.status)}</span>
            </div>
            
            {/* Indicador de persistência */}
            {pin.persistenceDays !== undefined && (
              <div className="mt-2 text-xs text-gray-400">
                {pin.status === 'resolved' ? 
                  `Resolvido após ${pin.persistenceDays} dias` : 
                  `Persistindo há ${pin.persistenceDays} dias`}
              </div>
            )}
          </div>
          
          {/* Histórico expandido */}
          {showHistory && pin.history && (
            <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
              <PinHistory 
                history={pin.history} 
                persistenceDays={pin.persistenceDays}
              />
            </div>
          )}
          
          {/* Imagens */}
          {pin.images && pin.images.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-400 mb-2">Imagens</div>
              <div className="grid grid-cols-3 gap-2">
                {pin.images.map((img, index) => (
                  <div key={index} className="aspect-square rounded-md overflow-hidden bg-[#252525]">
                    <img src={img} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {isCrime && (
            <div className="mb-4 p-3 bg-[#1a1a1a] border border-[#f43f5e] rounded-lg text-white/90">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={16} className="text-[#f43f5e]" />
                <span className="font-medium">Área de risco</span>
              </div>
              <p className="text-sm text-gray-300">Este local possui registro de atividade criminosa. Recomendamos cautela ao transitar por esta área.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Adicione o componente ConstructionIcon
const ConstructionIcon = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="6" width="20" height="8" rx="1"/>
    <path d="M17 14v7"/>
    <path d="M7 14v7"/>
    <path d="M17 3v3"/>
    <path d="M7 3v3"/>
    <path d="M10 14 2.3 6.3"/>
    <path d="m14 6 7.7 7.7"/>
    <path d="m8 6 8 8"/>
  </svg>
);

const Map = ({ 
  pins, 
  onPinClick, 
  onMapClick, 
  onMapMove,
  selectedPinTypes, 
  selectedPin,
  center,
  zoom
}) => {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.6);
  const [activeHeatmapType, setActiveHeatmapType] = useState<PinType | 'all'>('all');
  const [showStats, setShowStats] = useState(false);
  const [showPersistenceStats, setShowPersistenceStats] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showPersistenceFilter, setShowPersistenceFilter] = useState(false);
  const [filteredPinsByPersistence, setFilteredPinsByPersistence] = useState<Pin[]>([]);
  const mapRef = useRef(null);
  
  // Filtra pins se necessário
  const filteredPins = selectedPinTypes?.length 
    ? pins.filter(pin => selectedPinTypes.includes(pin.type))
    : filteredPinsByPersistence.length && showPersistenceFilter
    ? filteredPinsByPersistence
    : pins;

  // Função para lidar com o filtro de persistência
  const handlePersistenceFilter = (filtered: Pin[]) => {
    setFilteredPinsByPersistence(filtered);
  };

  // Adicione este useEffect para centralizar no pin selecionado
  useEffect(() => {
    if (selectedPin && mapRef.current) {
      // Centraliza o mapa no pin quando selecionado
      mapRef.current.setView(
        [selectedPin.location.lat, selectedPin.location.lng],
        mapRef.current.getZoom(),
        { animate: true, duration: 0.5 }
      );
    }
  }, [selectedPin]);

  // Função explícita para lidar com o fechamento do modal
  const handleCloseDetails = () => {
    onPinClick(null);
  };
  
  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        ref={mapRef}
        className="h-full w-full bg-[#121212]"
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          attribution={attribution}
          url={customTileLayer}
        />
        
        <MapEvents onMapClick={onMapClick} onMapMove={onMapMove} />
        <MapCenterUpdater center={center} zoom={zoom} />
        
        {filteredPins.map(pin => (
          <Marker 
            key={pin.id}
            position={[pin.location.lat, pin.location.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div class="pin-container ${pin.type === 'crime' ? 'pin-pulse-red' : 'pin-pulse-blue'}">
                  <div class="custom-pin ${pin.type === 'infraestrutura' ? 'infra-pin' : 'crime-pin'}">
                    ${getPinIconSvg(pin.type)}
                  </div>
                  <div class="score-badge">${getScoreFromType(pin.type)}</div>
                </div>
              `,
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
            eventHandlers={{
              click: () => onPinClick(pin)
            }}
          />
        ))}
        
        <ZoomControl position="bottomright" />
        <AttributionControl position="bottomleft" />
      </MapContainer>
      
      {/* Renderize PinDetails fora do MapContainer, mas com pointer-events-auto */}
      {selectedPin && (
        <div className="absolute top-0 left-0 w-full h-0 z-50">
          <PinDetails 
            pin={selectedPin} 
            onClose={handleCloseDetails}
          />
        </div>
      )}
      
      {/* Heatmap Controls */}
      <div className="absolute top-4 right-4 z-[1000]">
        <HeatmapControl
          showHeatmap={showHeatmap}
          onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
          intensity={heatmapIntensity}
          onIntensityChange={setHeatmapIntensity}
          activeType={activeHeatmapType}
          onTypeChange={setActiveHeatmapType}
        />
      </div>
      
      {/* Persistence Filter */}
      {showPersistenceFilter && (
        <div className="absolute top-4 left-[calc(72px+1rem)] z-[1000]">
          <PersistenceFilter 
            pins={pins} 
            onFilter={handlePersistenceFilter} 
          />
        </div>
      )}
      
      {/* Stats Buttons */}
      <div className="absolute bottom-4 right-4 z-[1000] flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-[#121212]/90 backdrop-blur-sm border-[#2a2a2a] text-white hover:bg-[#1a1a1a] flex items-center gap-1.5"
          onClick={() => setShowStats(!showStats)}
        >
          <BarChart3 size={14} />
          {showStats ? 'Ocultar Estatísticas' : 'Mostrar Estatísticas'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="bg-[#121212]/90 backdrop-blur-sm border-[#2a2a2a] text-white hover:bg-[#1a1a1a] flex items-center gap-1.5"
          onClick={() => setShowTimeline(!showTimeline)}
        >
          <LineChart size={14} />
          {showTimeline ? 'Ocultar Timeline' : 'Mostrar Timeline'}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          className="bg-[#121212]/90 backdrop-blur-sm border-[#2a2a2a] text-white hover:bg-[#1a1a1a] flex items-center gap-1.5"
          onClick={() => setShowPersistenceFilter(!showPersistenceFilter)}
        >
          <Clock size={14} />
          {showPersistenceFilter ? 'Ocultar Filtro' : 'Filtrar por Tempo'}
        </Button>
      </div>
      
      {/* Stats Panel */}
      {showStats && (
        <div className="absolute bottom-16 right-4 z-[1000] w-96">
          <PersistenceStats pins={pins} />
        </div>
      )}
      
      {/* Timeline Panel */}
      {showTimeline && (
        <div className="absolute bottom-16 left-4 z-[1000]">
          <PersistenceTimeline pins={pins} />
        </div>
      )}
    </div>
  );
};

// Funções auxiliares
const getPinColorClass = (type) => {
  switch (type) {
    case 'infraestrutura':
      return 'bg-black text-yellow-400 border-2 border-yellow-500/30';
    case 'crime':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getPinIconSvg = (type) => {
  switch (type) {
    case 'infraestrutura':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>`;
    case 'crime':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1"/><path d="M18.5 4.5 18 5"/><path d="M2 12h1"/><path d="M12 2v1"/><path d="m4.929 4.929.707.707"/><path d="M12 12v6"/></svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>`;
  }
};

const getPinTypeLabel = (type) => {
  switch (type) {
    case 'infraestrutura':
      return 'Infraestrutura';
    case 'robbery':
      return 'Roubo';
    default:
      return 'Desconhecido';
  }
};

const getScoreFromType = (type) => {
  switch (type) {
    case 'infraestrutura':
      return 3;
    case 'robbery':
      return 5;
    default:
      return 1;
  }
};

// Função auxiliar para converter coordenadas decimais para formato DMS
const convertToDMS = (coordinate, isLatitude) => {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
  
  const direction = isLatitude 
    ? (coordinate >= 0 ? "N" : "S") 
    : (coordinate >= 0 ? "E" : "W");
  
  return `${degrees}°${minutes}'${seconds}"${direction}`;
};

// Funções auxiliares para status
const getStatusBgClass = (status: string): string => {
  switch (status) {
    case 'reported':
      return 'bg-flood/20 text-flood';
    case 'acknowledged':
      return 'bg-pothole/20 text-pothole';
    case 'in_progress':
      return 'bg-passable/20 text-passable';
    case 'resolved':
      return 'bg-passable/20 text-passable';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'reported':
      return <AlertCircle size={10} className="text-current" />;
    case 'acknowledged':
      return <Clock size={10} className="text-current" />;
    case 'in_progress':
      return <Wrench size={10} className="text-current" />;
    case 'resolved':
      return <CheckCircle size={10} className="text-current" />;
    default:
      return null;
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'reported':
      return 'Reportado';
    case 'acknowledged':
      return 'Reconhecido';
    case 'in_progress':
      return 'Em andamento';
    case 'resolved':
      return 'Resolvido';
    default:
      return status;
  }
};

export default Map;
