import React, { useState, useEffect, useRef } from 'react';
import { Pin, PinType } from '@/types';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, ZoomControl, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PinHistory from '@/components/PinHistory';
import { 
  Clock, 
  X, 
  Copy, 
  AlertCircle, 
  CheckCircle, 
  Wrench, 
  BarChart3, 
  LineChart, 
  AlertTriangle, 
  ThumbsUp, 
  Users,
  Navigation,
  Shield,
  User,
  Settings
} from 'lucide-react';
import PersistenceStats from '@/components/PersistenceStats';
import PersistenceTimeline from '@/components/PersistenceTimeline';
import PersistenceFilter from '@/components/PersistenceFilter';

// Fix for Leaflet marker icons
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// At the top of your file, add these type declarations
declare module 'leaflet' {
  namespace Icon {
    interface Default {
      _getIconUrl?: string;
    }
  }
  
  interface Map {
    isUserInteraction?: React.MutableRefObject<boolean>;
  }
}

// Delete the default icon
delete L.Icon.Default.prototype._getIconUrl;

// Set up the default icon
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface MapProps {
  pins: Pin[];
  onPinClick: (pin: Pin) => void;
  onMapClick: (lat: number, lng: number) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  selectedPinTypes: PinType[] | null;
  selectedPin: Pin | null;
  center: [number, number];
  zoom: number;
  onVote: (pinId: string) => void;
  showSecurityPanel?: boolean;
  securityMode?: boolean;
}

// Mapa com tema escuro similar à imagem
const customTileLayer = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// Componente para detectar clicks no mapa
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Componente para criar um pin customizado
const CustomPin = ({ pin, onClick }) => {
  const isCrime = pin.type === 'crime';
  const hasHighVotes = pin.votes && pin.votes >= 5;
  
  return (
    <div 
      className={cn(
        "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all",
        isCrime ? "pin-pulse-red" : "pin-pulse-yellow",
        hasHighVotes ? "scale-110 z-20" : "z-10"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick(pin);
      }}
    >
      {/* Apenas o ícone do pin, sem badge de status */}
      <div className={cn(
        "rounded-full flex items-center justify-center shadow-lg",
        isCrime ? 
          "bg-[#1a1a1a] border-2 border-red-500/30 text-red-400" : 
          "bg-[#1a1a1a] border-2 border-yellow-500/30 text-yellow-400",
        hasHighVotes ? "w-10 h-10 border-[3px]" : "w-8 h-8"
      )}>
        <div 
          dangerouslySetInnerHTML={{ 
            __html: getPinIconSvg(pin.type) 
          }} 
          className="flex items-center justify-center w-full h-full"
        />
        
        {/* Badge para votos */}
        {(pin.votes && pin.votes > 0) && (
          <div className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[9px] font-bold bg-yellow-400 text-black rounded-full shadow-md border border-[#333]">
            {pin.votes}
          </div>
        )}
      </div>
    </div>
  );
};

// Componente para detectar movimentos do mapa e atualizar a URL
const MapEvents = ({ onMapClick, onMapMove }) => {
  const map = useMap();
  const isUserInteraction = useRef(true);
  
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
    moveend: () => {
      // Somente atualizar se for uma interação do usuário
      if (isUserInteraction.current && onMapMove) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        onMapMove([center.lat, center.lng], zoom);
      }
      isUserInteraction.current = true; // Redefinir a flag
    },
    zoomend: () => {
      // Somente atualizar se for uma interação do usuário
      if (isUserInteraction.current && onMapMove) {
        const center = map.getCenter();
        const zoom = map.getZoom();
        onMapMove([center.lat, center.lng], zoom);
      }
      isUserInteraction.current = true; // Redefinir a flag
    }
  });
  
  // Expor a flag para outros componentes
  useEffect(() => {
    map.isUserInteraction = isUserInteraction;
  }, [map]);
  
  return null;
};

// Componente para atualizar o centro do mapa quando as props mudam
const MapCenterUpdater = ({ center, zoom }) => {
  const map = useMap();
  const firstRender = useRef(true);
  
  useEffect(() => {
    // Ignorar a primeira renderização que sempre ocorre naturalmente
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    
    // Verificar se as coordenadas são realmente diferentes 
    // para evitar atualizações desnecessárias
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();
    
    if (Math.abs(currentCenter.lat - center[0]) > 0.0001 || 
        Math.abs(currentCenter.lng - center[1]) > 0.0001 || 
        currentZoom !== zoom) {
      
      // Marcar que esta é uma atualização programática, não uma interação do usuário
      if (map.isUserInteraction) {
        map.isUserInteraction.current = false;
      }
      
      // Atualizar a visualização sem animação para evitar eventos adicionais
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, map]);
  
  return null;
};

// Definição do tipo de comentário
interface PinComment {
  id: string;
  pinId: string;
  author: {
    name: string;
    type: 'citizen' | 'government' | 'city_hall';
    avatar?: string;
  };
  content: string;
  timestamp: string;
}

// Componente para Avatar do autor
const CommentAvatar = ({ author }) => {
  const getBgColor = () => {
    switch (author.type) {
      case 'government': 
        return 'bg-blue-600';
      case 'city_hall': 
        return 'bg-green-600';
      default: 
        return 'bg-gray-600';
    }
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getBgColor()}`}>
      {author.avatar ? (
        <img src={author.avatar} alt={author.name} className="w-full h-full rounded-full" />
      ) : (
        <span className="text-xs font-bold text-white">{getInitials(author.name)}</span>
      )}
    </div>
  );
};

// Componente para Badge de tipo de usuário
const UserTypeBadge = ({ type }) => {
  const getBadgeStyle = () => {
    switch (type) {
      case 'government':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'city_hall':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'government':
        return 'Governo';
      case 'city_hall':
        return 'Prefeitura';
      default:
        return 'Cidadão';
    }
  };

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${getBadgeStyle()}`}>
      {getLabel()}
    </span>
  );
};

// Componente para um único comentário
const CommentItem = ({ comment }) => {
  return (
    <div className="flex gap-3 py-3 border-b border-[#2a2a2a] last:border-0">
      <CommentAvatar author={comment.author} />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{comment.author.name}</span>
          <UserTypeBadge type={comment.author.type} />
          <span className="ml-auto text-xs text-gray-500">
            {formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true, locale: ptBR })}
          </span>
        </div>
        <p className="text-sm text-gray-300">{comment.content}</p>
      </div>
    </div>
  );
};

// Componente de detalhes do pin (igual ao cartão Adidas na imagem)
const PinDetails = ({ pin, onClose, onVote, userType }) => {
  const [showHistory, setShowHistory] = useState(false);
  const [showComments, setShowComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<PinComment[]>([
    {
      id: '1',
      pinId: pin.id,
      author: {
        name: 'João Silva',
        type: 'citizen',
      },
      content: 'Estou enfrentando este problema há semanas. Alguém da prefeitura poderia verificar?',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
    },
    {
      id: '2',
      pinId: pin.id,
      author: {
        name: 'Secretaria de Infraestrutura',
        type: 'city_hall',
      },
      content: 'Agradecemos o relato. Nossa equipe técnica foi enviada para avaliação do local.',
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 horas atrás
    },
    {
      id: '3',
      pinId: pin.id,
      author: {
        name: 'Departamento de Obras',
        type: 'government',
      },
      content: 'Registramos a ocorrência e incluímos na programação de reparos para a próxima semana.',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 horas atrás
    },
  ]);
  
  if (!pin) return null;
  
  // Função para enviar comentário (simulada)
  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    
    // Criar novo comentário
    const comment: PinComment = {
      id: `comment-${Date.now()}`,
      pinId: pin.id,
      author: {
        name: userType === 'citizen' ? 'Você' : 
              userType === 'government' ? 'Depto. de Governo' : 'Prefeitura Municipal',
        type: userType,
      },
      content: newComment.trim(),
      timestamp: new Date().toISOString(),
    };
    
    // Adicionar à lista
    setComments([...comments, comment]);
    setNewComment('');
  };

  // Função para copiar a URL atual para a área de transferência
  const copyLocationLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Link copiado para a área de transferência!');
      })
      .catch(err => {
        console.error('Erro ao copiar link:', err);
      });
  };

  // Função para lidar com o voto
  const handleVote = () => {
    if (pin.userVoted) return; // Evitar múltiplos votos
    
    onVote(pin.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-auto backdrop-blur-sm">
      <div className={cn(
        "relative w-[90%] max-w-[450px] max-h-[80vh] overflow-y-auto rounded-xl bg-[#121212] shadow-2xl border transition-all duration-300 animate-fadeIn",
        pin.type === 'crime' ? "border-[#f43f5e]" : "border-[#2a2a2a]"
      )}>
        <div className={cn(
          "sticky top-0 z-10 flex justify-between items-center p-4 border-b",
          pin.type === 'crime' ? "border-[#f43f5e]/30 bg-[#1a1a1a]" : "border-[#2a2a2a] bg-[#1a1a1a]"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full",
              pin.type === 'crime' ? "bg-[#1a1a1a] border-[#f43f5e] border-2 text-[#f43f5e]" : getPinColorClass(pin.type)
            )}>
              {pin.type === 'crime' ? (
                <AlertCircle size={16} className="text-[#f43f5e]" />
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: getPinIconSvg(pin.type) 
                  }} 
                  className="scale-75"
                />
              )}
            </div>
            <h3 className="text-lg font-medium text-white">
              {getPinTypeLabel(pin.type)}
            </h3>
          </div>
          <button 
            onClick={() => onClose()}
            className="h-8 w-8 rounded-full bg-[#2a2a2a]/80 flex items-center justify-center text-white/70 hover:bg-[#3a3a3a] hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-gray-400">Localização</div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 text-xs text-gray-400 hover:text-white hover:bg-[#252525]"
                onClick={copyLocationLink}
              >
                <Copy size={12} className="mr-1" />
                Copiar link
              </Button>
            </div>
            <div className="text-sm text-white">
              {pin.address || `${convertToDMS(pin.location.lat, true)}, ${convertToDMS(pin.location.lng, false)}`}
            </div>
          </div>
          
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Descrição</div>
            <p className="text-sm text-white">{pin.description}</p>
          </div>
          
          {/* Status atual */}
          <div className="mb-3">
            <div className="text-xs text-gray-400 mb-1">Status atual</div>
            <div className={cn(
              "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
              getStatusBgClass(pin.status)
            )}>
              {getStatusIcon(pin.status)}
              <span>{getStatusLabel(pin.status)}</span>
            </div>
            
            {/* Indicador de persistência */}
            {pin.persistenceDays !== undefined && (
              <div className="mt-2 text-xs text-gray-400">
                {pin.status === 'resolved' ? 
                  `Resolvido após ${pin.persistenceDays} dias` : 
                  `Persistindo há ${pin.persistenceDays} dias`}
              </div>
            )}
          </div>
          
          {/* Histórico expandido */}
          {showHistory && pin.history && (
            <div className="mt-4 pt-4 border-t border-[#2a2a2a]">
              <PinHistory 
                history={pin.history} 
                persistenceDays={pin.persistenceDays}
              />
            </div>
          )}
          
          {/* Imagens */}
          {pin.images && pin.images.length > 0 && (
            <div className="mt-4">
              <div className="text-xs text-gray-400 mb-2">Imagens</div>
              <div className="grid grid-cols-3 gap-2">
                {pin.images.map((img, index) => (
                  <div key={index} className="aspect-square rounded-md overflow-hidden bg-[#252525]">
                    <img src={img} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {pin.type === 'crime' && (
            <div className="mb-4 p-3 bg-[#1a1a1a] border border-[#f43f5e] rounded-lg text-white/90">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle size={16} className="text-[#f43f5e]" />
                <span className="font-medium">Área de risco</span>
              </div>
              <p className="text-sm text-gray-300">Este local possui registro de atividade criminosa. Recomendamos cautela ao transitar por esta área.</p>
            </div>
          )}
          
          {/* Seção de votação */}
          <div className="my-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <h4 className="text-sm font-medium text-white mb-3">Confirmação do Problema</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm text-gray-300">
                  <span className="font-medium text-white">{pin.votes || 0}</span> pessoas confirmaram este problema
                </span>
              </div>
              <button 
                onClick={handleVote}
                disabled={pin.userVoted}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  pin.userVoted 
                    ? "bg-green-500/20 text-green-400 cursor-default" 
                    : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
                )}
              >
                <ThumbsUp size={14} />
                <span>{pin.userVoted ? "Confirmado" : "Confirmar"}</span>
              </button>
            </div>
            {pin.userVoted && (
              <p className="mt-2 text-xs text-green-400">
                Obrigado por confirmar este problema. Isso ajuda a priorizar soluções.
              </p>
            )}
          </div>
          
          {/* Seção de comentários */}
          <div className="mt-6 pt-4 border-t border-[#2a2a2a]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white">Comentários ({comments.length})</h4>
              <button
                onClick={() => setShowComments(!showComments)}
                className="text-xs text-gray-400 hover:text-white"
              >
                {showComments ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
            
            {showComments && (
              <>
                <div className="mb-4 space-y-1">
                  {comments.map(comment => (
                    <CommentItem key={comment.id} comment={comment} />
                  ))}
                </div>
                
                {/* Formulário de novo comentário */}
                <div className="mt-4 pt-3 border-t border-[#2a2a2a]">
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-gray-400">Comentar como:</label>
                    <select
                      value={userType}
                      onChange={(e) => setUserType(e.target.value as any)}
                      className="text-xs bg-[#2a2a2a] text-white border-0 rounded-md px-2 py-1"
                    >
                      <option value="citizen">Cidadão</option>
                      <option value="government">Governo</option>
                      <option value="city_hall">Prefeitura</option>
                    </select>
                  </div>
                  
                  <div className="flex gap-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Escreva um comentário..."
                      className="flex-1 min-h-[60px] text-sm resize-none bg-[#1a1a1a] border border-[#2a2a2a] rounded-md p-2 text-white placeholder-gray-500 focus:outline-none focus:border-white"
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim()}
                      className="self-end h-9 px-3 bg-white text-black text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Adicione o componente ConstructionIcon
const ConstructionIcon = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="6" width="20" height="8" rx="1"/>
    <path d="M17 14v7"/>
    <path d="M7 14v7"/>
    <path d="M17 3v3"/>
    <path d="M7 3v3"/>
    <path d="M10 14 2.3 6.3"/>
    <path d="m14 6 7.7 7.7"/>
    <path d="m8 6 8 8"/>
  </svg>
);

// Componente para localização atual do usuário
const LocationButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const map = useMap();

  const handleLocateUser = () => {
    setIsLoading(true);
    
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          map.flyTo([latitude, longitude], 16, {
            duration: 1.5
          });
          setIsLoading(false);
        },
        (error) => {
          console.error("Erro ao obter localização: ", error);
          setIsLoading(false);
          // Feedback visual para o usuário
          alert("Não foi possível obter sua localização. Verifique se você permitiu o acesso à localização.");
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setIsLoading(false);
      alert("Geolocalização não é suportada neste navegador.");
    }
  };

  useEffect(() => {
    // Adicionar o botão de localização ao container de zoom existente
    const zoomControl = document.querySelector('.leaflet-control-zoom');
    if (zoomControl) {
      // Criar o elemento do botão
      const locationButton = document.createElement('a');
      locationButton.className = 'leaflet-control-location';
      locationButton.href = '#';
      locationButton.title = 'Usar minha localização atual';
      locationButton.innerHTML = `
        <span class="location-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
          </svg>
        </span>
      `;
      
      // Adicionar evento de clique
      locationButton.addEventListener('click', (e) => {
        e.preventDefault();
        handleLocateUser();
        
        // Adicionar classe de carregamento
        locationButton.classList.add('loading');
        
        // Remover a classe de carregamento após a conclusão
        setTimeout(() => {
          locationButton.classList.remove('loading');
        }, 3000);
      });
      
      // Inserir o botão antes do controle de zoom
      zoomControl.insertBefore(locationButton, zoomControl.firstChild);
    }
    
    // Limpeza quando o componente for desmontado
    return () => {
      const locationButton = document.querySelector('.leaflet-control-location');
      if (locationButton) {
        locationButton.remove();
      }
    };
  }, [map]);

  // Este componente não renderiza nada no DOM, pois manipula o DOM diretamente
  return null;
};

const Map = ({ 
  pins, 
  onPinClick, 
  onMapClick, 
  onMapMove,
  selectedPinTypes, 
  selectedPin,
  center,
  zoom,
  onVote
}) => {
  // Estados para heatmap e recursos visuais
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.6);
  const [activeHeatmapType, setActiveHeatmapType] = useState<PinType | 'all'>('all');
  const [showStats, setShowStats] = useState(false);
  const [showPersistenceStats, setShowPersistenceStats] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showPersistenceFilter, setShowPersistenceFilter] = useState(false);
  const [filteredPinsByPersistence, setFilteredPinsByPersistence] = useState<Pin[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const mapRef = useRef(null);
  const [userRoleSimulation, setUserRoleSimulation] = useState<'citizen' | 'government' | 'city_hall'>('citizen');
  
  // Detectar tela móvel
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);
  
  // Security panel states
  const [showSecurityPanel, setShowSecurityPanel] = useState(false);
  const [securityMode, setSecurityMode] = useState(false);
  
  // Filtra pins se necessário
  const filteredPins = selectedPinTypes?.length 
    ? pins.filter(pin => selectedPinTypes.includes(pin.type))
    : filteredPinsByPersistence.length && showPersistenceFilter
    ? filteredPinsByPersistence
    : pins;

  // Função para lidar com o filtro de persistência
  const handlePersistenceFilter = (filtered: Pin[]) => {
    setFilteredPinsByPersistence(filtered);
  };
  
  // Adicione este useEffect para centralizar no pin selecionado
  useEffect(() => {
    if (selectedPin && mapRef.current) {
      // Centraliza o mapa no pin quando selecionado
      mapRef.current.setView(
        [selectedPin.location.lat, selectedPin.location.lng],
        mapRef.current.getZoom(),
        { animate: true, duration: 0.5 }
      );
    }
  }, [selectedPin]);

  // Função explícita para lidar com o fechamento do modal
  const handleCloseDetails = () => {
    onPinClick(null);
  };
  
  // Coordenadas padrão se center for null
  const defaultCenter: [number, number] = [-23.5505, -46.6333]; // São Paulo como padrão
  const effectiveCenter = center || defaultCenter;
  
  return (
    <div className="h-full w-full relative rounded-lg overflow-hidden map-wrapper">
      {/* Adiciona uma div de carregamento que será mostrada antes do mapa ser completamente renderizado */}
      {isMobile && (
        <div className="map-loading-placeholder absolute inset-0 bg-[#121212] z-[5]"></div>
      )}
      
      <MapContainer
        center={effectiveCenter}
        zoom={zoom}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
        className="map-container"
        whenReady={() => {
          // Remove o placeholder quando o mapa estiver pronto
          const placeholder = document.querySelector('.map-loading-placeholder');
          if (placeholder) {
            placeholder.classList.add('opacity-0');
            setTimeout(() => {
              placeholder?.remove();
            }, 300);
          }
        }}
      >
        <TileLayer
          url={customTileLayer}
          attribution={attribution}
        />
        
        <MapEvents onMapClick={onMapClick} onMapMove={onMapMove} />
        <MapCenterUpdater center={effectiveCenter} zoom={zoom} />
        <ZoomControl position="bottomright" />
        <AttributionControl position="bottomleft" />
        
        {/* Botão de localização atual */}
        <LocationButton />
        
        {/* Pins filtrados */}
        {filteredPins.map(pin => (
          <Marker 
            key={pin.id}
            position={[pin.location.lat, pin.location.lng]}
            icon={L.divIcon({
              className: 'custom-div-icon',
              html: createPinHTML(pin),
              iconSize: [30, 30],
              iconAnchor: [15, 15]
            })}
            eventHandlers={{
              click: () => onPinClick(pin)
            }}
          />
        ))}
      </MapContainer>
      
      {/* Modal de detalhes do pin */}
      {selectedPin && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <PinDetails 
            pin={selectedPin} 
            onClose={handleCloseDetails} 
            onVote={onVote}
            userType="citizen"
          />
        </div>
      )}
      
      {/* Security Panel if enabled */}
      {showSecurityPanel && (
        <div className="absolute bottom-24 left-4 right-4 z-[1000] bg-[#121212]/90 backdrop-blur-sm border border-[#2a2a2a] rounded-lg p-4 flex flex-col gap-2">
          <h3 className="text-white font-medium flex items-center gap-2">
            <Shield size={18} className="text-green-400" />
            SecureMe - {securityMode ? 'Modo segurança' : 'Solicitar escolta'}
          </h3>
          {securityMode ? (
            <p className="text-sm text-gray-300">Você está no modo segurança. Esteja atento a solicitações próximas.</p>
          ) : (
            <p className="text-sm text-gray-300">Clique no mapa para selecionar o local para solicitar escolta.</p>
          )}
          <Button variant="outline" className="bg-green-600 hover:bg-green-700 text-white border-none w-full">
            {securityMode ? 'Ficar disponível' : 'Solicitar agora'}
          </Button>
        </div>
      )}
      
      {/* Heatmap Controls */}
      {/* Removed HeatmapControl component since it was removed from imports */}
      
      {/* Persistence Filter */}
      {showPersistenceFilter && (
        <div className="absolute top-4 left-[calc(72px+1rem)] z-[1000]">
          <PersistenceFilter 
            pins={pins} 
            onFilter={handlePersistenceFilter} 
          />
        </div>
      )}
      
      {/* Mobile: botão para mostrar/ocultar controles */}
      {isMobile && (
        <button
          onClick={() => setShowControls(!showControls)}
          className="absolute bottom-4 left-4 z-[1000] bg-[#121212]/90 backdrop-blur-sm border border-[#2a2a2a] p-2 rounded-full shadow-lg text-white"
        >
          <Settings size={20} className={showControls ? "rotate-45 transition-transform" : "transition-transform"} />
        </button>
      )}
    </div>
  );
};

// Funções auxiliares
const getPinColorClass = (type) => {
  switch (type) {
    case 'infraestrutura':
      return 'bg-black text-yellow-400 border-2 border-yellow-500/30';
    case 'crime':
      return 'bg-red-600 text-white';
    default:
      return 'bg-gray-500 text-white';
  }
};

const getPinIconSvg = (type) => {
  switch (type) {
    case 'infraestrutura':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="6" width="20" height="8" rx="1"/>
        <path d="M17 14v7"/>
        <path d="M7 14v7"/>
        <path d="M17 3v3"/>
        <path d="M7 3v3"/>
        <path d="M10 14 2.3 6.3"/>
        <path d="m14 6 7.7 7.7"/>
        <path d="m8 6 8 8"/>
      </svg>`;
    case 'crime':
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`;
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>`;
  }
};

const getPinTypeLabel = (type) => {
  switch (type) {
    case 'infraestrutura':
      return 'Problema de Infraestrutura';
    case 'crime':
      return 'Ocorrência de Crime';
    default:
      return 'Problema Reportado';
  }
};

// Função para obter a classe de fundo do status
const getStatusBgClass = (status) => {
  switch (status) {
    case 'reported':
      return 'bg-red-500/20 text-red-400';
    case 'acknowledged':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'in_progress':
      return 'bg-blue-500/20 text-blue-400';
    case 'resolved':
      return 'bg-green-500/20 text-green-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

// Função para obter o texto do status
const getStatusLabel = (status) => {
  switch (status) {
    case 'reported':
      return 'Reportado';
    case 'acknowledged':
      return 'Reconhecido';
    case 'in_progress':
      return 'Em andamento';
    case 'resolved':
      return 'Resolvido';
    default:
      return 'Desconhecido';
  }
};

// Função para obter o ícone do status
const getStatusIcon = (status) => {
  switch (status) {
    case 'reported':
      return <AlertCircle size={14} />;
    case 'acknowledged':
      return <CheckCircle size={14} />;
    case 'in_progress':
      return <Wrench size={14} />;
    case 'resolved':
      return <CheckCircle size={14} />;
    default:
      return <AlertCircle size={14} />;
  }
};

// Função para criar o HTML dos pins
const createPinHTML = (pin) => {
  const isCrime = pin.type === 'crime';
  const hasHighVotes = (pin.votes || 0) > 5;
  
  return `
    <div class="pin-wrapper-simple">
      <div class="pin-container ${isCrime ? 'pin-pulse-red' : 'pin-pulse-yellow'} ${hasHighVotes ? 'scale-110' : ''}">
        <div class="custom-pin ${isCrime ? 'crime-pin' : 'infra-pin'} rounded-full flex items-center justify-center shadow-lg ${hasHighVotes ? 'h-10 w-10' : 'h-8 w-8'}">
          ${getPinIconSvg(pin.type)}
          ${(pin.votes && pin.votes > 0) 
            ? `<div class="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[9px] font-bold bg-yellow-400 text-black rounded-full border border-gray-700">${pin.votes}</div>` 
            : ''}
        </div>
      </div>
    </div>
  `;
};

// Função para converter coordenadas decimais para graus, minutos e segundos
const convertToDMS = (coordinate, isLatitude) => {
  const absolute = Math.abs(coordinate);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);
  
  const direction = isLatitude
    ? coordinate >= 0 ? "N" : "S"
    : coordinate >= 0 ? "E" : "W";
    
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
};

export default Map;
