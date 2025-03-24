<<<<<<< HEAD
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
      zoom: 14,
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
        <div className="h-screen w-full flex items-center justify-center bg-[#121212]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-300/30 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Obtendo sua localização...</p>
            <p className="text-gray-400 text-sm mt-2">Permita o acesso à localização quando solicitado</p>
          </div>
        </div>
      );
    }
    
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
            onVote={this.handleVote}
          />
=======

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, User, Star, Map, Clock, CheckCircle } from 'lucide-react';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#121212] text-white">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] to-[#121212] overflow-hidden">
        <div className="absolute inset-0 bg-[url('/images/security-bg.jpg')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#121212] to-transparent"></div>
        
        <div className="container mx-auto px-4 z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="text-green-400">Secure</span>Me
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-2xl mx-auto">
            Segurança pessoal sob demanda. Conectamos você a profissionais de segurança quando e onde precisar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              <Link to="/dashboard">Solicitar Segurança</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-green-500 text-green-400 hover:bg-green-500/10">
              <Link to="/login">Entrar</Link>
            </Button>
          </div>
>>>>>>> b845e8e5552fc46e0dc8dca0113c8bdda1a96b07
        </div>
      </section>

<<<<<<< HEAD
// Wrapper para fornecer hooks ao componente de classe
function HomePageWrapper() {
  const navigate = useNavigate();
  const location = useLocation();
  
  return <HomePage navigate={navigate} location={location} />;
}

export default HomePageWrapper; 
=======
      {/* How it Works */}
      <section className="py-16 bg-[#1a1a1a]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Como funciona</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#232323] p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Map className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Solicite</h3>
              <p className="text-gray-400">Escolha seu destino e horário. Solicite um segurança para acompanhá-lo.</p>
            </div>
            
            <div className="bg-[#232323] p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Shield className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Conecte-se</h3>
              <p className="text-gray-400">Profissionais verificados aceitam sua solicitação e vão até você.</p>
            </div>
            
            <div className="bg-[#232323] p-6 rounded-lg">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <CheckCircle className="text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Viaje seguro</h3>
              <p className="text-gray-400">Sinta-se seguro com acompanhamento profissional até seu destino.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-[#121212]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Recursos</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <Clock className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Atendimento 24/7</h3>
                <p className="text-gray-400">Solicite segurança a qualquer hora, dia ou noite. Estamos sempre disponíveis para você.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                <User className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Profissionais Verificados</h3>
                <p className="text-gray-400">Todos os profissionais passam por rigorosa verificação de antecedentes e treinamento.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
                <Map className="text-pink-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Rastreamento em Tempo Real</h3>
                <p className="text-gray-400">Compartilhe sua localização com familiares durante todo o percurso.</p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Star className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">Avaliações Transparentes</h3>
                <p className="text-gray-400">Veja avaliações e escolha o profissional mais bem avaliado da sua região.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-green-900/30 to-blue-900/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Pronto para se sentir mais seguro?</h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Crie sua conta e tenha acesso a segurança sob demanda em poucos cliques.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700 text-white">
              <Link to="/signup">Criar Conta</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-green-500 text-green-400 hover:bg-green-500/10">
              <Link to="/about">Saiba Mais</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-[#1a1a1a] border-t border-[#333]">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-2xl font-bold">
                <span className="text-green-400">Secure</span>Me
              </h2>
              <p className="text-gray-400">Segurança pessoal sob demanda</p>
            </div>
            
            <div className="flex gap-6">
              <Link to="/about" className="text-gray-400 hover:text-white">Sobre</Link>
              <Link to="/contact" className="text-gray-400 hover:text-white">Contato</Link>
              <Link to="/privacy" className="text-gray-400 hover:text-white">Privacidade</Link>
              <Link to="/terms" className="text-gray-400 hover:text-white">Termos</Link>
            </div>
          </div>
          
          <div className="mt-8 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} SecureMe. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
>>>>>>> b845e8e5552fc46e0dc8dca0113c8bdda1a96b07
