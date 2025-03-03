
import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Pin, PinType } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { AlertCircle, CheckCircle, MapPin } from 'lucide-react';

interface MapProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  onMapClick: (lat: number, lng: number) => void;
  selectedPinTypes: PinType[] | null;
  apiKey: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: -23.5489,
  lng: -46.6388, // São Paulo
};

const Map: React.FC<MapProps> = ({ 
  pins, 
  onPinClick, 
  onMapClick, 
  selectedPinTypes,
  apiKey 
}) => {
  const { toast } = useToast();
  const [selectedMarker, setSelectedMarker] = useState<Pin | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      onMapClick(e.latLng.lat(), e.latLng.lng());
    }
  };

  if (loadError) {
    toast({
      title: "Erro ao carregar o mapa",
      description: "Houve um problema ao inicializar o mapa do Google",
      variant: "destructive"
    });
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center p-4">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-lg font-medium">Erro ao carregar o mapa</p>
          <p className="text-sm text-muted-foreground">Verifique sua chave de API do Google Maps</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/20 rounded-lg">
        <div className="text-center p-4">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-lg font-medium">Carregando mapa...</p>
        </div>
      </div>
    );
  }

  // Filter pins if needed
  const filteredPins = selectedPinTypes?.length 
    ? pins.filter(pin => selectedPinTypes.includes(pin.type))
    : pins;

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          fullscreenControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        }}
      >
        {filteredPins.map((pin) => (
          <Marker
            key={pin.id}
            position={{ lat: pin.location.lat, lng: pin.location.lng }}
            onClick={() => {
              setSelectedMarker(pin);
              onPinClick(pin);
            }}
            icon={{
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(getPinSvg(pin.type))}`,
              scaledSize: new google.maps.Size(32, 32),
            }}
            animation={google.maps.Animation.DROP}
          />
        ))}

        {selectedMarker && (
          <InfoWindow
            position={{ lat: selectedMarker.location.lat, lng: selectedMarker.location.lng }}
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 max-w-xs">
              <div className="font-semibold mb-1">{getPinTypeLabel(selectedMarker.type)}</div>
              <p className="text-sm">{selectedMarker.description}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {!apiKey && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="glass-panel p-6 max-w-md">
            <h3 className="text-xl font-semibold mb-2">API do Google Maps necessária</h3>
            <p className="mb-4">Para visualizar o mapa, é necessário fornecer uma chave de API do Google Maps.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper functions
const getPinColor = (type: PinType): string => {
  switch (type) {
    case 'flood': return '#3b82f6'; // blue
    case 'pothole': return '#f59e0b'; // amber
    case 'passable': return '#10b981'; // emerald
    case 'robbery': return '#ef4444'; // red
    default: return '#000000';
  }
};

const getPinSvg = (type: PinType): string => {
  const color = getPinColor(type);
  let svgContent;
  
  switch (type) {
    case 'flood':
      svgContent = `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" />`;
      break;
    case 'pothole':
      svgContent = `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="${color}" />`;
      break;
    case 'passable':
      svgContent = `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2"></circle><path d="M9 12l2 2 4-4" stroke="${color}" stroke-width="2"></path>`;
      break;
    case 'robbery':
      svgContent = `<circle cx="12" cy="12" r="10" fill="${color}" fill-opacity="0.2"></circle><path d="M12 8v4M12 16h.01" stroke="${color}" stroke-width="2"></path>`;
      break;
    default:
      svgContent = `<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />`;
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svgContent}</svg>`;
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
