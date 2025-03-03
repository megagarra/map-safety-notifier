
import React, { useState } from 'react';
import { useMapData } from '@/hooks/useMapData';
import Map from '@/components/Map';
import NavBar from '@/components/NavBar';
import ReportModal from '@/components/ReportModal';
import PinList from '@/components/PinList';
import FilterBar from '@/components/FilterBar';
import { Pin, PinType, CreatePinInput } from '@/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const Index = () => {
  const { pins, loading, addPin, filterPins } = useMapData();
  const [mapboxApiKey, setMapboxApiKey] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [selectedPinTypes, setSelectedPinTypes] = useState<PinType[] | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Filtered pins based on selected types
  const filteredPins = selectedPinTypes ? filterPins(selectedPinTypes) : pins;
  
  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setReportModalOpen(true);
  };
  
  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin);
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
    if (!mapboxApiKey) {
      toast({
        title: "API do Mapbox necessária",
        description: "Por favor, forneça uma chave de API do Mapbox antes de reportar problemas",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedLocation) {
      toast({
        title: "Selecione uma localização",
        description: "Clique no mapa para selecionar onde o problema está localizado",
      });
      return;
    }
    
    setReportModalOpen(true);
  };

  const saveApiKey = () => {
    if (!apiKeyInput.trim()) {
      toast({
        title: "Chave de API inválida",
        description: "Por favor, forneça uma chave de API válida",
        variant: "destructive"
      });
      return;
    }
    
    setMapboxApiKey(apiKeyInput);
    toast({
      title: "Chave de API salva",
      description: "O mapa agora está disponível para uso",
    });
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <NavBar onNewReport={handleNewReport} />
      
      {/* API Key Input (temporary until properly set up) */}
      {!mapboxApiKey && (
        <div className="container mx-auto px-4 animate-fadeIn mt-20 mb-4">
          <div className="glass-panel p-6 max-w-md mx-auto">
            <h3 className="text-xl font-semibold mb-2">API do Mapbox necessária</h3>
            <p className="mb-4">Para usar este aplicativo, forneça sua chave de API pública do Mapbox:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Chave de API do Mapbox"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button onClick={saveApiKey}>Salvar</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Obtenha sua chave em <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
            </p>
          </div>
        </div>
      )}
      
      <main className="flex-1 container mx-auto p-4 pt-20">
        <div className="flex flex-col h-[calc(100vh-8rem)] md:flex-row gap-4">
          {/* Sidebar toggle button (mobile only) */}
          {isMobile && (
            <Button 
              variant="outline" 
              size="icon" 
              className="fixed bottom-4 right-4 z-30 rounded-full shadow-lg md:hidden"
              onClick={toggleSidebar}
            >
              {sidebarOpen ? <ArrowRight /> : <ArrowLeft />}
            </Button>
          )}
          
          {/* Map section */}
          <div className="flex-1 relative">
            <div className="absolute top-4 left-0 right-0 z-10 px-4">
              <FilterBar
                selectedTypes={selectedPinTypes}
                onTypeSelect={setSelectedPinTypes}
              />
            </div>
            
            <div className="h-full rounded-lg overflow-hidden">
              {loading ? (
                <div className="h-full flex items-center justify-center bg-muted/20 rounded-lg">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">Carregando mapa...</p>
                  </div>
                </div>
              ) : (
                <Map 
                  pins={filteredPins} 
                  onPinClick={handlePinClick} 
                  onMapClick={handleMapClick}
                  selectedPinTypes={selectedPinTypes}
                  apiKey={mapboxApiKey}
                />
              )}
            </div>
          </div>
          
          {/* Sidebar */}
          <div 
            className={cn(
              "w-full md:w-80 lg:w-96 bg-card rounded-lg border overflow-hidden shadow-sm transition-all duration-300 ease-in-out",
              isMobile && !sidebarOpen ? "h-0 opacity-0" : "h-full opacity-100",
              isMobile && sidebarOpen ? "fixed inset-x-4 bottom-16 top-24 z-20" : ""
            )}
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Problemas Reportados</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredPins.length} registro{filteredPins.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex-1 overflow-hidden">
                <PinList 
                  pins={filteredPins} 
                  selectedPin={selectedPin}
                  onPinClick={handlePinClick}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Report modal */}
      <ReportModal 
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSubmit={handleReportSubmit}
        location={selectedLocation}
      />
    </div>
  );
};

export default Index;
