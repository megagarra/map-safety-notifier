import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Map from '@/components/Map';
import ReportModal from '@/components/ReportModal';
import { Pin, PinType } from '@/types';
import { getCurrentLocation } from '@/lib/helpers';
import { toast } from '@/components/ui/use-toast';
import * as PinsController from '@/controllers/pins';

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
      isLoadingUserLocation: true, // Começar com carregamento ativado
      isLoadingPins: true // Adicionar estado para carregamento de pins
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
            zoom: 16,
            isLoadingUserLocation: false 
          });
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          this.setState({ 
            isLoadingUserLocation: false,
            // Usar coordenadas de fallback em caso de erro
            center: [-23.3343, -46.6953] // Franco da Rocha como fallback
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
        center: [-23.3343, -46.6953] // Franco da Rocha como fallback
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
    this.loadPins();
    this.getUserLocation();
  }
  
  // Método para carregar pins
  async loadPins() {
    try {
      this.setState({ isLoadingPins: true });
      const pins = await PinsController.fetchPins(50); // Limitando a 50 pins
      this.setState({ pins, isLoadingPins: false });
    } catch (error) {
      console.error('Erro ao carregar pins:', error);
      toast({
        title: 'Erro ao carregar pins',
        description: 'Não foi possível carregar os dados do mapa',
        variant: 'destructive'
      });
      this.setState({ pins: [], isLoadingPins: false });
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
    // Se não temos uma localização definida, usar o centro atual do mapa
    if (!this.state.newPinLocation) {
      const { center } = this.state;
      if (center) {
        this.setState({ 
          newPinLocation: { lat: center[0], lng: center[1] },
          reportModalOpen: true 
        });
        return;
      }
    }
    
    // Se já temos uma localização ou não temos centro, apenas abrir o modal
    this.setState({ reportModalOpen: true });
  }
  
  closeReportModal() {
    this.setState({ 
      reportModalOpen: false,
      newPinLocation: null
    });
  }
  
  async handleReportSubmit(data) {
    try {
      const newPin = await PinsController.createPin({
        type: data.type,
        location: data.location,
        description: data.description,
        images: data.images
      });
      
      if (newPin) {
        // Adicionar o novo pin ao estado
        this.setState(prevState => ({
          pins: [...prevState.pins, newPin]
        }));
        
        toast({
          title: "Relatório enviado",
          description: "Seu relatório foi enviado com sucesso.",
          variant: "success"
        });
      } else {
        throw new Error('Falha ao criar pin');
      }
    } catch (error) {
      console.error('Erro ao enviar relatório:', error);
      toast({
        title: "Erro ao enviar relatório",
        description: "Não foi possível enviar seu relatório. Tente novamente.",
        variant: "destructive"
      });
    }
  }
  
  // Método para lidar com votos
  async handleVote(pinId) {
    try {
      const updatedPin = await PinsController.voteOnPin(pinId);
      
      if (updatedPin) {
        // Atualizar estado local
        this.setState(prevState => {
          const updatedPins = prevState.pins.map(pin => {
            if (pin.id === pinId) {
              return updatedPin;
            }
            return pin;
          });
          
          return { 
            pins: updatedPins,
            selectedPin: updatedPin.id === prevState.selectedPin?.id ? updatedPin : prevState.selectedPin
          };
        });
        
        // Mostrar feedback ao usuário
        toast({
          title: "Voto registrado",
          description: "Obrigado por confirmar este problema.",
          variant: "success"
        });
      }
    } catch (error) {
      console.error('Erro ao registrar voto:', error);
      toast({
        title: "Erro ao registrar voto",
        description: "Não foi possível registrar seu voto. Tente novamente.",
        variant: "destructive"
      });
    }
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
      isLoadingUserLocation,
      isLoadingPins
    } = this.state;
    
    // Mostrar carregando enquanto obtém a localização ou carrega os pins
    if (isLoadingUserLocation || !center || isLoadingPins) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-[#121212] fixed inset-0">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-300/30 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">
              {isLoadingPins ? "Carregando dados do mapa..." : "Obtendo sua localização..."}
            </p>
            <p className="text-gray-400 text-sm mt-2">
              {isLoadingUserLocation ? "Permita o acesso à localização quando solicitado" : "Aguarde um momento"}
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-screen w-full overflow-hidden fixed inset-0">
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
