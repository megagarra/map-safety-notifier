
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Map from '@/components/Map';
import { Button } from '@/components/ui/button';
import { useSecurityData } from '@/hooks/useSecurityData';
import { Shield, LogOut, Bell, User, History, MapPin, AlertTriangle } from 'lucide-react';
import ServiceRequestForm from '@/components/ServiceRequestForm';
import ServiceHistoryList from '@/components/ServiceHistoryList';
import SecurityProfileCard from '@/components/SecurityProfileCard';
import { useToast } from '@/components/ui/use-toast';
import { ServiceRequest, Pin } from '@/types';
import ServiceDetailCard from '@/components/ServiceDetailCard';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    currentUser, 
    services, 
    requestService, 
    acceptService, 
    startService, 
    completeService,
    loading 
  } = useSecurityData();
  
  const [center, setCenter] = useState<[number, number]>([-23.5489, -46.6388]);
  const [zoom, setZoom] = useState<number>(14);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceRequest | null>(null);
  
  // Convert services to pins for map display
  const servicePins: Pin[] = services.map(service => ({
    id: service.id,
    type: service.securityId ? 'security' : 'client',
    location: service.location,
    description: service.description,
    images: [],
    reportedAt: service.requestedAt,
    status: service.status === 'completed' ? 'resolved' : 
            service.status === 'in_progress' ? 'in_progress' : 
            service.status === 'accepted' ? 'acknowledged' : 'reported',
    history: [],
    votes: 0
  }));
  
  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate('/login');
    }
  }, [currentUser, loading, navigate]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <div className="text-white text-center">
          <Shield className="h-12 w-12 text-green-400 mx-auto animate-pulse" />
          <h2 className="mt-4 text-xl">Carregando...</h2>
        </div>
      </div>
    );
  }
  
  if (!currentUser) {
    return null; // Will redirect in the useEffect
  }
  
  const handleMapClick = (lat: number, lng: number) => {
    if (currentUser.role === 'client') {
      setSelectedLocation({ lat, lng });
      setShowRequestForm(true);
    }
  };
  
  const handleLogout = () => {
    navigate('/login');
  };
  
  const handleRequestService = async (data: Partial<ServiceRequest>) => {
    try {
      setIsLoading(true);
      requestService(data);
      setShowRequestForm(false);
      setSelectedLocation(null);
      
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação foi enviada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar sua solicitação",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const activeService = services.find(service => 
    (service.status === 'in_progress' || service.status === 'accepted') && 
    (
      (currentUser.role === 'client' && service.clientId === currentUser.id) || 
      (currentUser.role === 'security' && service.securityId === currentUser.id)
    )
  );
  
  const pendingServices = services.filter(service => 
    service.status === 'requested' && 
    (
      (currentUser.role === 'security') || 
      (currentUser.role === 'client' && service.clientId === currentUser.id)
    )
  );
  
  const userHistory = services.filter(service => 
    (service.status === 'completed') && 
    (
      (currentUser.role === 'client' && service.clientId === currentUser.id) || 
      (currentUser.role === 'security' && service.securityId === currentUser.id)
    )
  );
  
  return (
    <div className="min-h-screen bg-[#121212] flex flex-col">
      {/* Top navbar */}
      <header className="bg-[#1a1a1a] border-b border-[#333] p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-400" />
            <h1 className="text-xl font-bold text-white">
              <span className="text-green-400">Secure</span>Me
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-white">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <User size={16} />
              </div>
              <span className="text-white text-sm hidden md:inline-block">
                {currentUser.name}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-[#333] text-gray-300"
            >
              <LogOut size={16} className="mr-2" />
              <span className="hidden md:inline-block">Sair</span>
            </Button>
          </div>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 border-r border-[#333] bg-[#1a1a1a] p-4 hidden md:block">
          <div className="space-y-2">
            <div className="text-sm text-gray-400 uppercase font-semibold mb-3">Menu</div>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-white"
              onClick={() => {
                setShowRequestForm(false);
                setShowHistory(false);
              }}
            >
              <MapPin className="mr-2 h-4 w-4" />
              Mapa
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-white"
              onClick={() => {
                setShowHistory(true);
                setShowRequestForm(false);
              }}
            >
              <History className="mr-2 h-4 w-4" />
              Histórico
            </Button>
            
            {currentUser.role === 'client' && (
              <Button
                variant="ghost"
                className="w-full justify-start text-white"
                onClick={() => {
                  setShowRequestForm(true);
                  setShowHistory(false);
                }}
              >
                <Shield className="mr-2 h-4 w-4" />
                Solicitar Segurança
              </Button>
            )}
            
            <Button
              variant="ghost"
              className="w-full justify-start text-white"
              onClick={() => {
                toast({
                  title: "Alerta de Emergência",
                  description: "Alerta enviado para as autoridades e contatos de emergência",
                  variant: "destructive"
                });
              }}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Emergência
            </Button>
          </div>
          
          {/* User info */}
          <div className="mt-8 p-4 bg-[#232323] rounded-lg border border-[#333]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                <User size={20} />
              </div>
              <div>
                <div className="text-white font-medium">{currentUser.name}</div>
                <div className="text-gray-400 text-sm">{currentUser.role === 'client' ? 'Cliente' : 'Segurança'}</div>
              </div>
            </div>
            {currentUser.role === 'security' && currentUser.rating && (
              <div className="text-sm text-yellow-400 flex items-center">
                ★ {currentUser.rating.toFixed(1)} (avaliação)
              </div>
            )}
          </div>
          
          {/* Active request info if any */}
          {activeService && (
            <div className="mt-4 p-4 bg-green-900/20 rounded-lg border border-green-900/30">
              <div className="text-green-400 font-medium mb-2">Serviço Ativo</div>
              <div className="text-white text-sm mb-1">
                {currentUser.role === 'client' 
                  ? `Segurança: ${activeService.securityName || 'Aguardando'}`
                  : `Cliente: ${activeService.clientName}`
                }
              </div>
              <div className="text-gray-400 text-xs mb-2">
                {activeService.description.substring(0, 50)}...
              </div>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs"
                onClick={() => setSelectedService(activeService)}
              >
                Ver detalhes
              </Button>
            </div>
          )}
        </aside>
        
        {/* Main content */}
        <main className="flex-1 relative">
          <Map
            pins={servicePins}
            onPinClick={() => {}}
            onMapClick={handleMapClick}
            onMapMove={(newCenter, newZoom) => {
              setCenter(newCenter);
              setZoom(newZoom);
            }}
            selectedPinTypes={['security', 'client']}
            selectedPin={null}
            center={center}
            zoom={zoom}
            onVote={() => {}}
            showSecurityPanel={true}
            securityMode={currentUser.role === 'security'}
          />
          
          {/* Service detail overlay */}
          {selectedService && (
            <div className="absolute top-4 right-4 z-50 w-96">
              <ServiceDetailCard
                service={selectedService}
                currentUser={currentUser}
                onAccept={() => {
                  if (currentUser.role === 'security') {
                    acceptService(selectedService.id, currentUser.id);
                  }
                  setSelectedService(null);
                }}
                onStart={() => {
                  startService(selectedService.id);
                  setSelectedService(null);
                }}
                onComplete={(rating, feedback) => {
                  completeService(selectedService.id, rating, feedback);
                  setSelectedService(null);
                }}
                onClose={() => setSelectedService(null)}
              />
            </div>
          )}
          
          {/* Form/History panel */}
          {(showRequestForm || showHistory) && (
            <div className="absolute top-4 right-4 z-50 w-96 max-h-[calc(100vh-120px)] overflow-y-auto">
              {showRequestForm && (
                <ServiceRequestForm
                  onSubmit={handleRequestService}
                  location={selectedLocation || { lat: center[0], lng: center[1] }}
                  onCancel={() => {
                    setShowRequestForm(false);
                    setSelectedLocation(null);
                  }}
                  isLoading={isLoading}
                />
              )}
              
              {showHistory && (
                <ServiceHistoryList
                  services={userHistory}
                  currentUser={currentUser}
                  onViewDetails={setSelectedService}
                  onClose={() => setShowHistory(false)}
                />
              )}
            </div>
          )}
          
          {/* Pending requests list (for security) */}
          {currentUser.role === 'security' && pendingServices.length > 0 && (
            <div className="absolute bottom-24 left-4 z-50 w-80">
              <div className="bg-[#1a1a1a] rounded-lg border border-[#333] p-4">
                <h3 className="text-white font-medium mb-3">Solicitações Pendentes ({pendingServices.length})</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {pendingServices.map(service => (
                    <div 
                      key={service.id} 
                      className="bg-[#232323] p-3 rounded-md border border-[#333] cursor-pointer hover:border-green-500/50"
                      onClick={() => setSelectedService(service)}
                    >
                      <div className="text-white text-sm font-medium">{service.clientName}</div>
                      <div className="text-gray-400 text-xs">{service.description.substring(0, 40)}...</div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-gray-400 text-xs">
                          {new Date(service.requestedAt).toLocaleTimeString()}
                        </span>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            acceptService(service.id, currentUser.id);
                          }}
                        >
                          Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile bottom navigation */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#333] p-2 flex justify-around">
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center h-16 text-xs"
              onClick={() => {
                setShowRequestForm(false);
                setShowHistory(false);
              }}
            >
              <MapPin className="h-5 w-5 mb-1" />
              Mapa
            </Button>
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center h-16 text-xs"
              onClick={() => {
                setShowHistory(true);
                setShowRequestForm(false);
              }}
            >
              <History className="h-5 w-5 mb-1" />
              Histórico
            </Button>
            {currentUser.role === 'client' && (
              <Button
                variant="ghost"
                className="flex flex-col items-center justify-center h-16 text-xs"
                onClick={() => {
                  setShowRequestForm(true);
                  setShowHistory(false);
                }}
              >
                <Shield className="h-5 w-5 mb-1" />
                Solicitar
              </Button>
            )}
            <Button
              variant="ghost"
              className="flex flex-col items-center justify-center h-16 text-xs text-red-400"
              onClick={() => {
                toast({
                  title: "Alerta de Emergência",
                  description: "Alerta enviado para as autoridades",
                  variant: "destructive"
                });
              }}
            >
              <AlertTriangle className="h-5 w-5 mb-1" />
              Emergência
            </Button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
