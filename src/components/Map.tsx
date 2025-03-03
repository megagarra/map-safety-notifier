
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Pin, PinType } from '@/types';
import { AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MapProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  onMapClick: (lat: number, lng: number) => void;
  selectedPinTypes: PinType[] | null;
  apiKey: string;
}

const Map: React.FC<MapProps> = ({ 
  pins, 
  onPinClick, 
  onMapClick, 
  selectedPinTypes,
  apiKey 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<{[key: string]: mapboxgl.Marker}>({});
  const { toast } = useToast();
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;
    
    if (!apiKey) {
      toast({
        title: "Chave da API do Mapbox não fornecida",
        description: "Por favor, forneça uma chave de API válida para visualizar o mapa",
        variant: "destructive"
      });
      return;
    }

    try {
      mapboxgl.accessToken = apiKey;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-46.6388, -23.5489], // São Paulo
        zoom: 12,
        pitch: 0,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Add geolocate control
      const geolocateControl = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true
      });
      
      map.current.addControl(geolocateControl, 'top-right');

      // Handle map click for new pin
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });

      map.current.on('load', () => {
        setMapLoaded(true);
      });
    } catch (error) {
      console.error("Erro ao inicializar o mapa:", error);
      toast({
        title: "Erro ao carregar o mapa",
        description: "Houve um problema ao inicializar o mapa",
        variant: "destructive"
      });
    }

    return () => {
      Object.values(markersRef.current).forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [apiKey, onMapClick, toast]);

  // Add or update pins
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Filter pins if needed
    const filteredPins = selectedPinTypes?.length 
      ? pins.filter(pin => selectedPinTypes.includes(pin.type))
      : pins;

    // Add new markers
    filteredPins.forEach(pin => {
      const el = document.createElement('div');
      el.className = 'pin-marker';
      
      // Style based on pin type
      const iconColor = getPinColor(pin.type);
      
      // Create pin elements based on type
      el.innerHTML = `
        <div class="relative group">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse">
            ${getPinSvgPath(pin.type)}
          </svg>
          <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            ${getPinTypeLabel(pin.type)}
          </div>
        </div>
      `;
      
      el.style.cursor = 'pointer';
      
      // Animation on hover
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
      });
      
      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
      });

      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'bottom'
      })
        .setLngLat([pin.location.lng, pin.location.lat])
        .addTo(map.current!);
        
      // Add click event to marker
      el.addEventListener('click', () => {
        marker.getElement().classList.add('animate-bounce');
        setTimeout(() => {
          marker.getElement().classList.remove('animate-bounce');
        }, 1000);
        onPinClick(pin);
      });
      
      markersRef.current[pin.id] = marker;
    });
  }, [pins, mapLoaded, onPinClick, selectedPinTypes]);

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden shadow-lg">
      <div ref={mapContainer} className="absolute inset-0 map-container" />
      {!apiKey && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <div className="glass-panel p-6 max-w-md">
            <h3 className="text-xl font-semibold mb-2">API do Mapbox necessária</h3>
            <p className="mb-4">Para visualizar o mapa, é necessário fornecer uma chave de API do Mapbox.</p>
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

const getPinSvgPath = (type: PinType): string => {
  switch (type) {
    case 'flood': 
      return '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#3b82f6" />';
    case 'pothole': 
      return '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#f59e0b" />';
    case 'passable': 
      return '<circle cx="12" cy="12" r="10" fill="#10b981" fill-opacity="0.2"></circle><path d="M9 12l2 2 4-4" stroke="#10b981" stroke-width="2"></path>';
    case 'robbery': 
      return '<circle cx="12" cy="12" r="10" fill="#ef4444" fill-opacity="0.2"></circle><path d="M12 8v4M12 16h.01" stroke="#ef4444" stroke-width="2"></path>';
    default: 
      return '<path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />';
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
