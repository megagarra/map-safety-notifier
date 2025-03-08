import React, { useState, useEffect, useRef } from 'react';
import { Pin, PinType } from '@/types';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

// Fix for Leaflet marker icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// Delete the default icon
delete L.Icon.Default.prototype._getIconUrl;

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
  const iconColor = getPinColorClass(pin.type);
  const score = getScoreFromType(pin.type);
  
  const customIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="relative">
             <div class="score-badge absolute -top-7 left-1/2 transform -translate-x-1/2 z-10 bg-black/70">
               ${score}
             </div>
             <div class="pin-container ${iconColor}">
               ${getPinIconSvg(pin.type)}
             </div>
           </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -40]
  });

  return (
    <Marker 
      position={[pin.location.lat, pin.location.lng]} 
      icon={customIcon}
      eventHandlers={{
        click: () => onClick(pin)
      }}
    />
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
  if (!pin) return null;
  
  // Função para copiar a URL atual para a área de transferência
  const copyLocationLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => alert("Link copiado para a área de transferência!"))
      .catch(err => console.error('Erro ao copiar link: ', err));
  };
  
  // Converter coordenadas para formato DMS
  const latitudeDMS = convertToDMS(pin.location.lat, true);
  const longitudeDMS = convertToDMS(pin.location.lng, false);
  
  return (
    <div className="absolute z-20 top-1/4 right-8 map-detail-card w-64">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="brand-circle">
            {getPinIcon(pin.type)}
          </div>
          <div>
            <div className="font-medium">{getPinTypeLabel(pin.type)}</div>
            <div className="text-xs text-gray-400">
              Franco da Rocha • {latitudeDMS}, {longitudeDMS}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-3">
          <div className="score-badge">{getScoreFromType(pin.type)}</div>
          <Button variant="outline" size="sm" className="text-xs h-7 rounded-full px-3 bg-secondary border-border">
            Reportado hoje
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7 rounded-full px-3 bg-secondary border-border">
            Verificado
          </Button>
        </div>
        
        <h3 className="text-sm font-medium mb-2">
          {pin.description.length > 30 ? `${pin.description.substring(0, 30)}...` : pin.description}
        </h3>
        
        <p className="text-xs text-muted-foreground mb-3">
          {pin.description}
        </p>
        
        <div className="flex gap-2 mt-2">
          <Button variant="outline" className="flex-1 text-sm h-8 rounded-md bg-[#252525] border-[#2a2a2a] text-white hover:bg-[#333333]">
            Mais Detalhes
          </Button>
          <Button 
            variant="outline" 
            className="w-10 h-8 rounded-md bg-[#252525] border-[#2a2a2a] text-white hover:bg-[#333333]"
            onClick={copyLocationLink}
            title="Compartilhar localização"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 8L6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M21 12L3 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M18 16H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
};

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
  // Filtra pins se necessário
  const filteredPins = selectedPinTypes?.length 
    ? pins.filter(pin => selectedPinTypes.includes(pin.type))
    : pins;

  return (
    <div className="map-container">
      <MapContainer 
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100vh', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution={attribution}
          url={customTileLayer}
        />
        
        <MapEvents onMapClick={onMapClick} onMapMove={onMapMove} />
        <MapCenterUpdater center={center} zoom={zoom} />
        
        {filteredPins.map((pin) => (
          <CustomPin 
            key={pin.id} 
            pin={pin} 
            onClick={() => onPinClick(pin)}
          />
        ))}
      </MapContainer>
      
      {selectedPin && <PinDetails pin={selectedPin} onClose={() => onPinClick(null)} />}
    </div>
  );
};

// Funções auxiliares
const getPinColorClass = (type) => {
  switch (type) {
    case 'flood': return 'bg-flood';
    case 'pothole': return 'bg-pothole';
    case 'passable': return 'bg-passable';
    case 'robbery': return 'bg-robbery';
    default: return 'bg-gray-500';
  }
};

const getPinIconSvg = (type) => {
  switch (type) {
    case 'flood': 
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22a8 8 0 0 1-8-8c0-5 8-14 8-14s8 9 8 14a8 8 0 0 1-8 8z" fill="white"/></svg>';
    case 'pothole': 
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="white"/><path d="M5 5l14 14" stroke="#f59e0b" stroke-width="2"/></svg>';
    case 'passable': 
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="white"/><path d="M8 12l3 3 5-6" stroke="#10b981" stroke-width="2"/></svg>';
    case 'robbery': 
      return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="white"/><path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2"/></svg>';
    default: 
      return '';
  }
};

const getPinIcon = (type) => {
  switch (type) {
    case 'flood':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C9.82437 21 7.94351 19.3951 5.27939 16.1853C3.5732 14.0885 2.72011 13.0401 2.3442 11.7508C2 10.5614 2 9.56939 2 7.58535V7.2C2 5.27477 2 4.31215 2.43597 3.54306C2.81947 2.87152 3.39158 2.33294 4.0797 1.96910C4.85869 1.55556 5.87556 1.55556 7.90931 1.55556H16.0907C18.1244 1.55556 19.1413 1.55556 19.9203 1.96910C20.6084 2.33294 21.1805 2.87152 21.564 3.54306C22 4.31215 22 5.27477 22 7.2V7.58535C22 9.56939 22 10.5614 21.6558 11.7508C21.2799 13.0401 20.4268 14.0885 18.7206 16.1853C16.0565 19.3951 14.1756 21 12 21V22Z" fill="#45a0f8"/>
        </svg>
      );
    case 'pothole':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#f59e0b"/>
          <path d="M5 5L19 19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'passable':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#10b981"/>
          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'robbery':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#ef4444"/>
          <path d="M12 8V12M12 16H12.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    default:
      return null;
  }
};

const getPinTypeLabel = (type) => {
  switch (type) {
    case 'flood': return 'Alagamento';
    case 'pothole': return 'Buracos';
    case 'passable': return 'Passável';
    case 'robbery': return 'Assalto';
    default: return type;
  }
};

const getScoreFromType = (type) => {
  switch (type) {
    case 'flood': return '100';
    case 'pothole': return '85';
    case 'passable': return '95';
    case 'robbery': return '80';
    default: return '90';
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

export default Map;
