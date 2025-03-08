import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMapData } from '@/hooks/useMapData';
import Map from '@/components/Map';
import NavBar from '@/components/NavBar';
import ReportModal from '@/components/ReportModal';
import { Pin, PinType, CreatePinInput } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { generatePins } from '@/lib/helpers';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Variável para armazenar o timeout fora do componente
let urlUpdateTimeout: number | undefined;

const Index = () => {
  const { pins, loading, addPin, filterPins } = useMapData();
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinTypes, setSelectedPinTypes] = useState<PinType[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [center, setCenter] = useState<[number, number]>([-23.3268, -46.7263]);
  const [zoom, setZoom] = useState<number>(14);

  const filteredPins = selectedPinTypes ? filterPins(selectedPinTypes) : pins;
  
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setReportModalOpen(true);
    updateUrlWithCoordinates(lat, lng);
  };
  
  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin === selectedPin ? null : pin);
    if (pin) {
      updateUrlWithCoordinates(pin.location.lat, pin.location.lng);
    }
  };
  
  const handleReportSubmit = (data: CreatePinInput) => {
    try {
      const newPin = addPin(data);
      setSelectedPin(newPin);
    } catch (error) {
      console.error('Error adding pin:', error);
    }
  };

  const handleNewReport = () => {    
    if (!selectedLocation) {
      toast({
        title: "Selecione uma localização",
        description: "Clique no mapa para selecionar onde o problema está localizado",
      });
      return;
    }
    
    setReportModalOpen(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    setSelectedPinTypes(generatePins(20).map(pin => pin.type));
  }, []);

  useEffect(() => {
    // Carregar pins
    const initialPins = generatePins(8);
    setPins(initialPins);
    
    // Verificar URL para coordenadas
    const urlParams = new URLSearchParams(location.search);
    const lat = parseFloat(urlParams.get('lat') || '');
    const lng = parseFloat(urlParams.get('lng') || '');
    const z = parseInt(urlParams.get('z') || '');
    
    if (!isNaN(lat) && !isNaN(lng)) {
      setCenter([lat, lng]);
      if (!isNaN(z)) {
        setZoom(z);
      }
    }
  }, [location.search]);

  const updateUrlWithCoordinates = (lat: number, lng: number, z?: number) => {
    const currentZ = z || zoom;
    
    // Evitar atualizações desnecessárias
    if (Math.abs(center[0] - lat) < 0.0001 && 
        Math.abs(center[1] - lng) < 0.0001 && 
        currentZ === zoom) {
      return;
    }
    
    // Atualizar estados
    setCenter([lat, lng]);
    if (currentZ !== zoom) {
      setZoom(currentZ);
    }
    
    // Debounce para URL
    if (urlUpdateTimeout) {
      clearTimeout(urlUpdateTimeout);
    }
    
    urlUpdateTimeout = window.setTimeout(() => {
      navigate(`/?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&z=${currentZ}`, { replace: true });
      urlUpdateTimeout = undefined;
    }, 500);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <NavBar 
        onNewReport={handleNewReport} 
        pins={pins}
        onPinClick={handlePinClick}
      />
      
      <div className="flex-1 relative">
        <Map
          pins={pins}
          onPinClick={handlePinClick}
          onMapClick={handleMapClick}
          onMapMove={(newCenter, newZoom) => {
            setCenter(newCenter);
            setZoom(newZoom);
            updateUrlWithCoordinates(newCenter[0], newCenter[1], newZoom);
          }}
          selectedPinTypes={selectedPinTypes}
          selectedPin={selectedPin}
          center={center}
          zoom={zoom}
        />
      </div>
      
      {reportModalOpen && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => {
            setReportModalOpen(false);
            setSelectedLocation(null);
          }}
          onSubmit={handleReportSubmit}
          location={selectedLocation}
        />
      )}
    </div>
  );
};

export default Index;
