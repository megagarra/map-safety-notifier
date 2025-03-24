import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Map from '@/components/Map';
import NavBar from '@/components/NavBar';
import ReportModal from '@/components/ReportModal';
import { Pin, PinType } from '@/types';
import { generatePins, getCurrentLocation } from '@/lib/helpers';
import { toast } from '@/components/ui/use-toast';

// Componente usando abordagem de classe para evitar problemas com hooks
class HomePage extends React.Component {
  constructor(props) {
    super(props);
    
    // Definir estado inicial
    this.state = {
      pins: [],
      selectedPin: null,
      selectedPinTypes: null,
      center: null, // Iniciar sem coordenadas fixas
      zoom: 12,
      reportModalOpen: false,
      newPinLocation: null,
      isLoadingUserLocation: true // Começar com carregamento ativado
    };
    
    // Bind de métodos
    this.handlePinClick = this.handlePinClick.bind(this);
    this.handleMapClick = this.handleMapClick.bind(this);
    this.handleMapMove = this.handleMapMove.bind(this);
    this.openReportModal = this.openReportModal.bind(this);
    this.closeReportModal = this.closeReportModal.bind(this);
    this.handleReportSubmit = this.handleReportSubmit.bind(this);
    this.handleVote = this.handleVote.bind(this);
    this.getUserLocation = this.getUserLocation.bind(this);
    
    // Referências para navegação
    this.navigate = props.navigate;
    this.location = props.location;
  }
  
  // Método para obter localização do usuário
  getUserLocation() {
    this.setState({ isLoadingUserLocation: true });
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.setState({ 
            center: [latitude, longitude],
            isLoadingUserLocation: false 
          });
          
          // Atualizar URL com as novas coordenadas
          this.updateUrlWithCoordinates(latitude, longitude, this.state.zoom);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          this.setState({ 
            isLoadingUserLocation: false,
            // Usar coordenadas de fallback em caso de erro
            center: [-23.5505, -46.6333] // São Paulo como fallback
          });
          toast({
            title: "Localização indisponível",
            description: "Não foi possível obter sua localização atual.",
            variant: "destructive"
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      this.setState({ 
        isLoadingUserLocation: false,
        center: [-23.5505, -46.6333] // São Paulo como fallback
      });
      toast({
        title: "Localização indisponível",
        description: "Seu navegador não suporta geolocalização.",
        variant: "destructive"
      });
    }
  }
  
  // Lifecycle methods
  componentDidMount() {
    // Carregar pins iniciais
    try {
      const initialPins = generatePins(15);
      this.setState({ pins: initialPins });
    } catch (error) {
      console.error("Error loading pins:", error);
      this.setState({ pins: [] });
    }
    
    // Verificar URL para coordenadas
    const urlParams = new URLSearchParams(this.location.search);
    const lat = parseFloat(urlParams.get('lat') || '');
    const lng = parseFloat(urlParams.get('lng') || '');
    const z = parseInt(urlParams.get('z') || '');
    
    if (!isNaN(lat) && !isNaN(lng)) {
      this.setState({ center: [lat, lng] });
      if (!isNaN(z)) {
        this.setState({ zoom: z });
      }
      // Se encontrou coordenadas na URL, não precisa carregar localização
      this.setState({ isLoadingUserLocation: false });
    } else {
      // Se não houver coordenadas na URL, tentar obter localização do usuário
      this.getUserLocation();
    }
  }
  
  // Handlers
  handlePinClick(pin) {
    this.setState({ selectedPin: pin });
    if (pin) {
      this.updateUrlWithCoordinates(pin.location.lat, pin.location.lng);
    }
  }
  
  handleMapClick(lat, lng) {
    this.setState({ newPinLocation: { lat, lng } });
    this.setState({ reportModalOpen: true });
    this.updateUrlWithCoordinates(lat, lng);
  }
  
  handleMapMove(newCenter, newZoom) {
    this.updateUrlWithCoordinates(newCenter[0], newCenter[1], newZoom);
  }
  
  updateUrlWithCoordinates(lat, lng, z) {
    const { center, zoom } = this.state;
    const currentZ = z || zoom;
    
    // Evitar atualizações desnecessárias
    if (center && 
        Math.abs(center[0] - lat) < 0.0001 && 
        Math.abs(center[1] - lng) < 0.0001 && 
        currentZ === zoom) {
      return;
    }
    
    // Atualizar estado
    this.setState({ 
      center: [lat, lng],
      zoom: currentZ
    });
    
    // Debounce para URL
    if (this.urlUpdateTimeout) {
      clearTimeout(this.urlUpdateTimeout);
    }
    
    this.urlUpdateTimeout = setTimeout(() => {
      this.navigate(`/?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&z=${currentZ}`, { replace: true });
      this.urlUpdateTimeout = null;
    }, 500);
  }
  
  openReportModal() {
    this.setState({ reportModalOpen: true });
  }
  
  closeReportModal() {
    this.setState({ 
      reportModalOpen: false,
      newPinLocation: null
    });
  }
  
  handleReportSubmit(data) {
    const newPin = {
      id: `pin-${Date.now()}`,
      type: data.type,
      location: data.location,
      description: data.description,
      images: data.images,
      reportedAt: new Date().toISOString(),
      address: 'Franco da Rocha',
      status: 'reported',
      votes: 0,
      userVoted: false,
      history: [
        {
          status: 'reported',
          date: new Date().toISOString(),
          description: 'Problema reportado por usuário'
        }
      ],
      persistenceDays: 0
    };
    
    this.setState(prevState => ({
      pins: [...prevState.pins, newPin]
    }));
    
    toast({
      title: "Relatório enviado",
      description: "Seu relatório foi enviado com sucesso.",
      variant: "success"
    });
  }
  
  // Método para lidar com votos
  handleVote(pinId) {
    // Atualizar estado local
    this.setState(prevState => {
      const updatedPins = prevState.pins.map(pin => {
        if (pin.id === pinId) {
          // Se o usuário já votou, não permitir voto duplo
          if (pin.userVoted) return pin;
          
          // Atualizar o pin com o voto
          return {
            ...pin,
            votes: (pin.votes || 0) + 1,
            userVoted: true
          };
        }
        return pin;
      });
      
      // Também atualizar o pin selecionado se estiver aberto
      let updatedSelectedPin = prevState.selectedPin;
      if (updatedSelectedPin && updatedSelectedPin.id === pinId) {
        updatedSelectedPin = {
          ...updatedSelectedPin,
          votes: (updatedSelectedPin.votes || 0) + 1,
          userVoted: true
        };
      }
      
      return { 
        pins: updatedPins,
        selectedPin: updatedSelectedPin
      };
    });
    
    // Mostrar feedback ao usuário
    toast({
      title: "Voto registrado",
      description: "Obrigado por confirmar este problema.",
      variant: "success"
    });
  }
  
  render() {
    const { 
      pins, 
      selectedPin, 
      selectedPinTypes, 
      center, 
      zoom, 
      reportModalOpen, 
      newPinLocation,
      isLoadingUserLocation
    } = this.state;
    
    // Mostrar carregando enquanto obtém a localização
    if (isLoadingUserLocation || !center) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-[#121212] fixed inset-0">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-300/30 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Obtendo sua localização...</p>
            <p className="text-gray-400 text-sm mt-2">Permita o acesso à localização quando solicitado</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex h-screen w-full overflow-hidden fixed inset-0">
        <NavBar 
          onNewReport={this.openReportModal} 
          pins={pins}
          onPinClick={this.handlePinClick}
        />
        
        <div className="flex-1 relative h-full">
          <Map
            pins={pins}
            onPinClick={this.handlePinClick}
            onMapClick={this.handleMapClick}
            onMapMove={this.handleMapMove}
            selectedPinTypes={selectedPinTypes}
            selectedPin={selectedPin}
            center={center}
            zoom={zoom}
            onVote={this.handleVote}
          />
        </div>
        
        {reportModalOpen && (
          <ReportModal
            isOpen={reportModalOpen}
            onClose={this.closeReportModal}
            onSubmit={this.handleReportSubmit}
            location={newPinLocation}
          />
        )}
      </div>
    );
  }
}

// Wrapper para fornecer hooks ao componente de classe
function HomePageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return <HomePage navigate={navigate} location={location} />;
}

export default HomePageWrapper;
