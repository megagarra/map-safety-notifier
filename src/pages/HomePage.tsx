import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Map from '@/components/Map';
import NavBar from '@/components/NavBar';
import ReportModal from '@/components/ReportModal';
import { Pin, PinType } from '@/types';
import { generatePins } from '@/lib/helpers';
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
      center: [-23.3268, -46.7263],
      zoom: 14,
      reportModalOpen: false,
      newPinLocation: null
    };
    
    // Bind de métodos
    this.handlePinClick = this.handlePinClick.bind(this);
    this.handleMapClick = this.handleMapClick.bind(this);
    this.handleMapMove = this.handleMapMove.bind(this);
    this.openReportModal = this.openReportModal.bind(this);
    this.closeReportModal = this.closeReportModal.bind(this);
    this.handleReportSubmit = this.handleReportSubmit.bind(this);
    this.handleVote = this.handleVote.bind(this);
    
    // Referências para navegação
    this.navigate = props.navigate;
    this.location = props.location;
  }
  
  // Lifecycle methods
  componentDidMount() {
    // Carregar pins iniciais
    try {
      const initialPins = generatePins(8);
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
    if (Math.abs(center[0] - lat) < 0.0001 && 
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
      address: 'Franco da Rocha'
    };
    
    this.setState(prevState => ({
      pins: [...prevState.pins, newPin]
    }));
    
    this.toast({
      title: "Relatório enviado",
      description: "Seu relatório foi enviado com sucesso.",
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
    
    // Aqui você poderia implementar a persistência do voto em um backend
    // Por exemplo, chamando uma API:
    // this.saveVoteToServer(pinId);
  }
  
  // Método para salvar o voto no servidor (implementação simulada)
  saveVoteToServer(pinId) {
    // Exemplo de chamada de API (simulada)
    console.log(`Salvando voto para o pin ${pinId} no servidor...`);
    // fetch('/api/pins/vote', {
    //   method: 'POST',
    //   body: JSON.stringify({ pinId }),
    //   headers: { 'Content-Type': 'application/json' }
    // });
  }
  
  render() {
    const { 
      pins, 
      selectedPin, 
      selectedPinTypes, 
      center, 
      zoom, 
      reportModalOpen, 
      newPinLocation 
    } = this.state;
    
    return (
      <div className="flex h-screen w-full overflow-hidden">
        <NavBar 
          onNewReport={this.openReportModal} 
          pins={pins}
          onPinClick={this.handlePinClick}
        />
        
        <div className="flex-1 relative">
          <Map
            pins={pins}
            onPinClick={this.handlePinClick}
            onMapClick={this.handleMapClick}
            onMapMove={this.handleMapMove}
            selectedPinTypes={selectedPinTypes}
            selectedPin={selectedPin}
            center={center}
            zoom={zoom}
            onVote={this.handleVote} // Passar a função de votação para o Map
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
export default function HomePageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return <HomePage navigate={navigate} location={location} />;
} 