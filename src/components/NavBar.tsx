import React, { useState, useEffect } from 'react';
import { Pin, PinType } from '@/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  X, 
  Search, 
  AlertCircle,
  Wrench,
  MapPin,
  Filter,
  BadgeAlert,
  Building2,
  Menu,
  Home,
  BarChart3,
  Settings,
  User,
  Shield,
  PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// Componente personalizado para o ícone de sirene
const SirenIcon = ({ size = 16, className = "" }) => (
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
    <path d="M7 18v-6a5 5 0 1 1 10 0v6"/>
    <path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/>
    <path d="M21 12h1"/>
    <path d="M18.5 4.5 18 5"/>
    <path d="M2 12h1"/>
    <path d="M12 2v1"/>
    <path d="m4.929 4.929.707.707"/>
    <path d="M12 12v6"/>
  </svg>
);

// Componente personalizado para o ícone de construção
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

interface NavBarProps {
  onNewReport: () => void;
  pins?: Pin[];
  onPinClick?: (pin: Pin) => void;
}

const NavBar: React.FC<NavBarProps> = ({ onNewReport, pins = [], onPinClick = () => {} }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<PinType[]>(['infraestrutura', 'crime']);
  const [activeTab, setActiveTab] = useState<'pins' | 'stats' | 'settings'>('pins');
  const [sortBy, setSortBy] = useState<'recent' | 'distance' | 'votes'>('recent');
  const [filterOpen, setFilterOpen] = useState(false);

  // Filtrar e ordenar pins
  const filteredPins = pins
    .filter(pin => selectedTypes.includes(pin.type))
    .filter(pin => 
      searchQuery ? 
        pin.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pin.address?.toLowerCase().includes(searchQuery.toLowerCase()) : 
        true
    )
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
      } else if (sortBy === 'votes') {
        return (b.votes || 0) - (a.votes || 0);
      } else {
        // Ordenar por distância (mockado)
        return 0;
      }
    });

  // Toggle para expandir/colapsar o sidebar
  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
  };

  // Toggle para mostrar apenas ícones
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setIsExpanded(false);
    }
  };

  // Toggle para filtrar por tipo
  const togglePinType = (type: PinType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  return (
    <>
      {/* Overlay para dispositivos móveis quando o sidebar está expandido */}
      {isExpanded && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-30"
          onClick={() => setIsExpanded(false)}
        />
      )}
    
      <div className={cn(
        "fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-16" : isExpanded ? "w-80" : "w-20"
      )}>
        {/* Sidebar principal */}
    <div className={cn(
          "h-full flex flex-col bg-[#0e0e0e] border-r border-[#222] shadow-xl",
          isCollapsed ? "w-16" : isExpanded ? "w-80" : "w-20"
    )}>
      {/* Cabeçalho */}
          <div className="flex items-center p-4 border-b border-[#222] bg-[#111] h-16">
            {!isCollapsed && (
              <>
        <button 
          onClick={toggleSidebar}
                  className="h-8 w-8 rounded-full bg-[#222] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#333] transition-colors"
        >
                  {isExpanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
                
                {isExpanded && (
                  <div className="flex items-center ml-3">
                    <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                      <MapPin size={14} className="text-white" />
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border border-[#111]"></div>
                    </div>
                    <div className="ml-2">
                      <h1 className="text-sm font-medium text-white">Franco da Rocha</h1>
                      <p className="text-xs text-gray-400">São Paulo, BR</p>
                    </div>
          </div>
                )}
              </>
            )}
            
            {isCollapsed && (
              <div className="flex items-center justify-center w-full">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                  <MapPin size={14} className="text-white" />
        </div>
      </div>
            )}
            
            {/* Botão de colapso para desktop */}
            <button 
              onClick={toggleCollapse}
              className="h-8 w-8 rounded-full bg-[#222] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#333] transition-colors ml-auto"
            >
              <PanelLeft size={14} className={isCollapsed ? "rotate-180" : ""} />
            </button>
          </div>
          
          {/* Navegação vertical */}
          {isCollapsed && (
            <div className="flex flex-col items-center py-4 gap-1 border-b border-[#222]">
              <NavButton 
                icon={<MapPin size={18} />} 
                label="Pins" 
                active={activeTab === 'pins'} 
                onClick={() => setActiveTab('pins')} 
                collapsed={true}
              />
              <NavButton 
                icon={<BarChart3 size={18} />} 
                label="Estatísticas" 
                active={activeTab === 'stats'} 
                onClick={() => setActiveTab('stats')} 
                collapsed={true}
              />
              <NavButton 
                icon={<Settings size={18} />} 
                label="Configurações" 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
                collapsed={true}
              />
            </div>
          )}
          
          {/* Campo de busca - apenas quando expandido */}
          {isExpanded && (
            <div className="px-4 py-3">
        <div className="relative">
          <input 
            type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar problemas..." 
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
        </div>
      </div>
          )}
          
          {/* Navegação de abas - apenas quando expandido */}
          {isExpanded && (
            <div className="flex px-4 py-2 border-b border-[#222]">
              <NavButton 
                icon={<MapPin size={16} />} 
                label="Pins" 
                active={activeTab === 'pins'} 
                onClick={() => setActiveTab('pins')} 
              />
              <NavButton 
                icon={<BarChart3 size={16} />} 
                label="Estatísticas" 
                active={activeTab === 'stats'} 
                onClick={() => setActiveTab('stats')} 
              />
              <NavButton 
                icon={<Settings size={16} />} 
                label="Configurações" 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
              />
                </div>
          )}
          
          {/* Conteúdo principal */}
          {activeTab === 'pins' && (
            <>
              {/* Filtros - somente quando expandido */}
              {isExpanded && (
                <div className="px-4 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <button 
                      onClick={() => setFilterOpen(!filterOpen)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                    >
                      <Filter size={12} />
                      <span>Filtrar</span>
                      <ChevronDown size={12} className={cn(
                        "transition-transform",
                        filterOpen ? "rotate-180" : ""
                      )} />
          </button>
          
                    <div className="flex items-center gap-2">
                      <SortButton 
                        label="Recentes"
                        active={sortBy === 'recent'}
                        onClick={() => setSortBy('recent')}
                      />
                      <SortButton 
                        label="Votos"
                        active={sortBy === 'votes'}
                        onClick={() => setSortBy('votes')}
                      />
              </div>
            </div>
      
                  {filterOpen && (
                    <div className="grid grid-cols-2 gap-2 mb-2 pt-2 border-t border-[#222]">
                      <FilterButton 
                        label="Infraestrutura"
                        icon={<ConstructionIcon size={14} className="text-yellow-400" />}
                        active={selectedTypes.includes('infraestrutura')}
                        onClick={() => togglePinType('infraestrutura')}
                      />
                      <FilterButton 
                        label="Crime"
                        icon={<SirenIcon size={14} className="text-red-400" />}
                        active={selectedTypes.includes('crime')}
                        onClick={() => togglePinType('crime')}
                      />
                    </div>
                  )}
                  
         
                </div>
              )}
              
              {/* Lista de pins */}
              <div className="flex-1 overflow-hidden">
                {!isCollapsed && filteredPins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <MapPin size={40} className="text-gray-600 mb-2" />
                    <p className="text-gray-400 text-sm">
                      {searchQuery ? 'Nenhum resultado encontrado' : 'Nenhum problema reportado'}
                    </p>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-blue-500 text-xs mt-2 hover:underline"
                      >
                        Limpar busca
                      </button>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="px-2 py-2">
                      {isCollapsed ? (
                        // Versão reduzida para sidebar colapsada
                        <div className="flex flex-col items-center gap-2">
                          {filteredPins.map(pin => (
                            <TooltipProvider key={pin.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => onPinClick(pin)}
                                    className={cn(
                                      "w-10 h-10 rounded-full flex items-center justify-center relative",
                                      pin.type === 'crime' ? "bg-[#1a1a1a] border-2 border-red-500/30" : "bg-[#1a1a1a] border-2 border-yellow-500/30",
                                      "hover:border-opacity-100 transition-all duration-200"
                                    )}
                                  >
                                    {pin.type === 'crime' ? (
                                      <SirenIcon size={16} className="text-red-400" />
                                    ) : (
                                      <ConstructionIcon size={16} className="text-yellow-400" />
                                    )}
                                    
                                    {/* Badge para votos */}
                                    {(pin.votes && pin.votes > 0) && (
                                      <div className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[9px] font-bold bg-yellow-400 text-black rounded-full">
                                        {pin.votes}
                                      </div>
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                  <p className="font-medium">{pin.type === 'crime' ? 'Crime' : 'Infraestrutura'}</p>
                                  <p className="text-xs text-gray-400">{pin.description?.substring(0, 30)}...</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                        </div>
                      ) : (
                        // Versão completa para sidebar expandido
                        <div className="space-y-1">
                          {filteredPins.map(pin => (
                            <PinCard 
                              key={pin.id} 
                              pin={pin} 
            onClick={() => onPinClick(pin)}
                              expanded={isExpanded}
          />
        ))}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
          </>
        )}
          
          {activeTab === 'stats' && isExpanded && (
            <div className="p-4 text-center flex-1 flex flex-col items-center justify-center">
              <BarChart3 size={48} className="text-gray-600 mb-3" />
              <h3 className="text-gray-300 text-sm font-medium">Estatísticas da Cidade</h3>
              <p className="text-gray-500 text-xs mt-1">Visualização de estatísticas em desenvolvimento</p>
            </div>
          )}
          
          {activeTab === 'settings' && isExpanded && (
            <div className="p-4 text-center flex-1 flex flex-col items-center justify-center">
              <Settings size={48} className="text-gray-600 mb-3" />
              <h3 className="text-gray-300 text-sm font-medium">Configurações</h3>
              <p className="text-gray-500 text-xs mt-1">Configurações em desenvolvimento</p>
            </div>
          )}
          
          {/* Footer com perfil de usuário */}
          {isExpanded && (
            <div className="p-4 border-t border-[#222] bg-[#111]">
              <div className="flex items-center">
                <Avatar className="h-8 w-8 border border-[#333]">
                  <AvatarImage src="https://github.com/shadcn.png" />
                  <AvatarFallback className="bg-blue-600 text-white text-xs">US</AvatarFallback>
                </Avatar>
                <div className="ml-2">
                  <div className="text-sm font-medium text-white">Usuário</div>
                  <div className="text-xs text-gray-400">Cidadão</div>
                </div>
                <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 text-gray-400 hover:text-white">
                  <Settings size={16} />
              </Button>
              </div>
            </div>
          )}
      </div>
    </div>
    </>
  );
};

// Componente auxiliar para botões de navegação
const NavButton = ({ icon, label, active, onClick, collapsed = false }) => {
  return collapsed ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-gray-500 hover:text-white hover:bg-white/5"
            )}
          >
            {icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 py-1.5 px-3 rounded-lg transition-colors flex-1",
        active
          ? "bg-white/10 text-white"
          : "text-gray-500 hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
};

// Componente auxiliar para botões de filtro
const FilterButton = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs transition-colors border",
        active
          ? "bg-white/10 text-white border-[#444]"
          : "text-gray-500 hover:text-white border-[#222] hover:border-[#333]"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

// Componente auxiliar para botões de ordenação
const SortButton = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-xs py-1 px-2 rounded transition-colors",
        active
          ? "bg-white/10 text-white"
          : "text-gray-500 hover:text-white"
      )}
    >
      {label}
    </button>
  );
};

// Componente para card de pin
const PinCard = ({ pin, onClick, expanded }) => {
  const isCrime = pin.type === 'crime';
  const timeSince = formatDistanceToNow(new Date(pin.reportedAt), { addSuffix: true, locale: ptBR });
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left bg-[#131313] rounded-lg p-3 transition-all",
        "hover:bg-[#1a1a1a] border border-transparent hover:border-[#333]",
        expanded ? "" : "flex items-center justify-center"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative",
          isCrime ? "bg-[#1a1a1a] border border-red-500/30" : "bg-[#1a1a1a] border border-yellow-500/30"
        )}>
          {isCrime ? (
            <SirenIcon size={18} className="text-red-400" />
          ) : (
            <ConstructionIcon size={18} className="text-yellow-400" />
          )}
          
          {/* Badge para votos */}
          {(pin.votes && pin.votes > 0) && (
            <div className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[9px] font-bold bg-yellow-400 text-black rounded-full">
              {pin.votes}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h3 className="text-sm font-medium text-white truncate">
              {isCrime ? 'Crime' : 'Infraestrutura'}
            </h3>
            <div className={cn(
              "text-[9px] px-1.5 rounded-full",
              getPinStatusStyle(pin.status || 'reported')
            )}>
              {getStatusLabel(pin.status || 'reported')}
            </div>
          </div>
          
          <p className="text-xs text-gray-400 line-clamp-2 mb-1">
            {pin.description || "Sem descrição disponível"}
          </p>
          
          <div className="flex items-center gap-1 text-[10px] text-gray-500">
            <Clock size={10} />
            <span>{timeSince}</span>
            <span className="mx-1">•</span>
            <span className="truncate">{pin.address || "Localização desconhecida"}</span>
          </div>
        </div>
      </div>
        </button>
  );
};

// Função auxiliar para obter o estilo do status
const getPinStatusStyle = (status: string) => {
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

// Função auxiliar para obter o texto do status
const getStatusLabel = (status: string) => {
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
      return status;
  }
};

export default NavBar;
