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
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import * as PinsController from '@/controllers/pins';

// Variável para armazenar o timeout fora do componente
let urlUpdateTimeout: number | undefined;

const Index = () => {
  const [center, setCenter] = useState<[number, number]>([-23.5505, -46.6333]); // São Paulo como padrão
  const [zoom, setZoom] = useState(13);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinTypes, setSelectedPinTypes] = useState<PinType[] | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const isMobile = useIsMobile();
  const [isNavOpen, setIsNavOpen] = useState(!isMobile);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { pins, loading, addPin } = useMapData();

  // Function to open the sidebar on mobile
  const openNav = () => {
    setIsNavOpen(true);
  };

  // Function to close the sidebar on mobile
  const closeNav = () => {
    setIsNavOpen(false);
  };

  // Open report modal
  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
  };

  // Close report modal
  const handleCloseReportModal = () => {
    setIsReportModalOpen(false);
    setNewPinLocation(null);
  };

  // When a pin is clicked on the map
  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin);
  };

  // When user clicks on map to add a new report
  const handleMapClick = (lat: number, lng: number) => {
    setNewPinLocation({ lat, lng });
    setIsReportModalOpen(true);
  };

  // Handle form submission for new report
  const handleReportSubmit = async (data: CreatePinInput) => {
    try {
      await addPin(data);
      setIsReportModalOpen(false);
      setNewPinLocation(null);
    } catch (error) {
      console.error('Error submitting report:', error);
    }
  };
  
  // Handle voting on pins
  const handleVote = (pinId: string) => {
    // In a real app, this would call an API
    console.log(`Vote submitted for pin ${pinId}`);
    toast({
      title: "Voto registrado",
      description: "Obrigado por confirmar este problema"
    });
  };

  useEffect(() => {
    // Carregar tipos de pins disponíveis
    const fetchPinTypes = async () => {
      try {
        const allPins = await PinsController.fetchPins(100);
        // Extrair tipos únicos dos pins
        const uniqueTypes = Array.from(new Set(allPins.map(pin => pin.type))) as PinType[];
        setSelectedPinTypes(uniqueTypes.length > 0 ? uniqueTypes : null);
      } catch (error) {
        console.error('Erro ao carregar tipos de pins:', error);
      }
    };
    
    fetchPinTypes();
  }, []);

  useEffect(() => {
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
        onNewReport={handleOpenReportModal} 
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
          onVote={handleVote}
        />
      </div>
      
      {isReportModalOpen && (
        <ReportModal
          isOpen={isReportModalOpen}
          onClose={handleCloseReportModal}
          onSubmit={handleReportSubmit}
          location={newPinLocation}
        />
      )}
    </div>
  );
};

export default Index;
