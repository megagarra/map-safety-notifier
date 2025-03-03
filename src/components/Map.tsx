
import React, { useState, useEffect, useRef } from 'react';
import { Pin, PinType } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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
  selectedPinTypes: PinType[] | null;
  apiKey?: string; // Mantemos este prop para compatibilidade, mas não usaremos
}

// Component para detectar clicks no mapa
const MapClickHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  const map = useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component para criar um pin customizado
const CustomPin = ({ pin, onClick }: { pin: Pin; onClick: () => void }) => {
  const iconColor = getPinColorClass(pin.type);
  
  const customIcon = L.divIcon({
    className: 'custom-pin',
    html: `<div class="pin-container ${iconColor}" style="position: relative;">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
               <circle cx="12" cy="10" r="3"></circle>
             </svg>
           </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  });

  return (
    <Marker 
      position={[pin.location.lat, pin.location.lng]} 
      icon={customIcon}
      eventHandlers={{
        click: onClick
      }}
    >
      <Popup>
        <div className="font-semibold mb-1">{getPinTypeLabel(pin.type)}</div>
        <p className="text-sm">{pin.description}</p>
      </Popup>
    </Marker>
  );
};

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

  // Centro do mapa em São Paulo
  const center: [number, number] = [-23.5489, -46.6388];
  
  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg" style={{ minHeight: '400px' }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', minHeight: '400px' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapClickHandler onMapClick={onMapClick} />
        
        {filteredPins.map((pin) => (
          <CustomPin 
            key={pin.id} 
            pin={pin} 
            onClick={() => {
              setSelectedMarker(pin);
              onPinClick(pin);
            }}
          />
        ))}
      </MapContainer>
      
      {/* Texto de instrução */}
      <div className="absolute top-4 left-0 right-0 text-center z-10 pointer-events-none">
        <div className="bg-white/90 mx-auto inline-block px-3 py-2 rounded-lg shadow-lg text-sm font-medium">
          Clique para adicionar um problema
        </div>
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
