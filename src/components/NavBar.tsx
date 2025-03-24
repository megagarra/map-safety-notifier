import React, { useState, useEffect, useRef } from 'react';
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
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState(0);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Detectar tela móvel
  useEffect(() => {
    const checkIsMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      
      // Auto colapsar em telas pequenas quando fechado
      if (isMobileView && !mobileMenuOpen) {
        setIsCollapsed(true);
        setIsExpanded(false);
      }
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, [mobileMenuOpen]);

  // Implementação de deslizar para fechar no mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !mobileMenuOpen) return;
    
    const touchCurrentX = e.touches[0].clientX;
    const diff = touchStartX - touchCurrentX;
    
    // Se deslizou para a esquerda por pelo menos 50px
    if (diff > 50) {
      setMobileMenuOpen(false);
    }
  };

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
    if (isMobile) {
      setMobileMenuOpen(!mobileMenuOpen);
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  // Toggle para mostrar apenas ícones (desktop)
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    if (!isCollapsed) {
      setIsExpanded(false);
    }
  };

  // Toggle mobile menu com sidebar expandido
  const toggleMobileMenu = () => {
    if (!mobileMenuOpen) {
      // Quando abrimos o menu em dispositivos móveis, mostre a versão expandida
      setIsCollapsed(false);
      setIsExpanded(true);
    }
    setMobileMenuOpen(!mobileMenuOpen);
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
      {/* Overlay para telas móveis quando o menu está aberto */}
      {isMobile && mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    
      {/* Botão de menu móvel */}
      {isMobile && !mobileMenuOpen && (
        <button
          onClick={toggleMobileMenu}
          className="fixed top-4 right-4 z-[1000] bg-[#1a1a1a] p-2 rounded-full shadow-lg text-white hover:bg-[#2a2a2a]"
        >
          <Menu size={20} />
        </button>
      )}
    
      <div 
        ref={sidebarRef}
        className={cn(
          "h-full bg-[#121212] border-r border-[#222] transition-all duration-300 flex flex-col shadow-xl",
          isCollapsed ? "w-[72px]" : isExpanded ? "w-[320px]" : "w-[240px]",
          isMobile && "fixed top-0 bottom-0 z-50",
          isMobile && mobileMenuOpen && "w-[320px]",
          isMobile && !mobileMenuOpen && "transform -translate-x-full"
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Cabeçalho */}
        <div className="flex items-center p-3 border-b border-[#222]">
          <button onClick={toggleSidebar} className="p-1 rounded-full hover:bg-[#2a2a2a] text-gray-400 hover:text-white">
            {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
          </button>
          
          {isExpanded && (
            <>
              {activeTab === 'pins' && (
                <div className="flex items-center ml-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <MapPin size={14} className="text-white" />
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
            
            {/* Botão de colapso para desktop (oculto em mobile) */}
            {!isMobile && (
              <button 
                onClick={toggleSidebar}
                className="h-8 w-8 rounded-full bg-[#222] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#333] transition-colors ml-auto"
              >
                <PanelLeft size={14} className={isCollapsed ? "rotate-180" : ""} />
              </button>
            )}
            
            {/* Botão de fechar para mobile */}
            {isMobile && mobileMenuOpen && (
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="ml-auto h-10 w-10 rounded-full bg-[#333] flex items-center justify-center text-white"
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {/* Navegação - Mobile Tabs no topo */}
          {isMobile && isExpanded && (
            <div className="flex p-2 border-b border-[#222] justify-between">
              <NavButton 
                icon={<MapPin size={18} />} 
                label="Pins" 
                active={activeTab === 'pins'} 
                onClick={() => setActiveTab('pins')} 
                mobileTab={true}
              />
              <NavButton 
                icon={<BarChart3 size={18} />} 
                label="Estatísticas" 
                active={activeTab === 'stats'} 
                onClick={() => setActiveTab('stats')} 
                mobileTab={true}
              />
              <NavButton 
                icon={<Settings size={18} />} 
                label="Configurações" 
                active={activeTab === 'settings'} 
                onClick={() => setActiveTab('settings')} 
                mobileTab={true}
              />
            </div>
          )}
          
          {/* Navegação vertical - apenas quando colapsado */}
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
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-white p-1"
                  >
                    <X size={14} />
                  </button>
                )}
        </div>
      </div>
          )}
          
          {/* Navegação de abas - apenas quando expandido e não mobile */}
          {isExpanded && !isMobile && (
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
          
          {/* Conteúdo principal baseado na aba selecionada */}
          {activeTab === 'pins' && (
            <>
              {/* Filtros - apenas quando expandido */}
              {isExpanded && (
                <div className="p-3 border-b border-[#222]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-white">Filtros</div>
                    <button 
                      onClick={() => setFilterOpen(!filterOpen)}
                      className={cn(
                        "h-7 w-7 rounded flex items-center justify-center text-gray-400 hover:text-white transition-colors",
                        filterOpen && "bg-[#2a2a2a] text-white"
                      )}
                    >
                      <ChevronDown size={14} className={filterOpen ? "transform rotate-180" : ""} />
                    </button>
                  </div>
                  
                  {/* Filtros por tipo - sempre visível mesmo se a seção estiver fechada */}
                  <div className="flex flex-wrap gap-1">
                    <FilterButton 
                      icon={<ConstructionIcon size={12} />} 
                      label="Infraestrutura" 
                      active={selectedTypes.includes('infraestrutura')} 
                      onClick={() => togglePinType('infraestrutura')} 
                    />
                    <FilterButton 
                      icon={<SirenIcon size={12} />} 
                      label="Crime" 
                      active={selectedTypes.includes('crime')} 
                      onClick={() => togglePinType('crime')} 
                    />
                  </div>
                  
                  {/* Filtros adicionais - visíveis apenas quando expandidos */}
                  {filterOpen && (
                    <div className="mt-3 pt-3 border-t border-[#222] space-y-2">
                      <div className="flex flex-wrap gap-1">
                        <SortButton 
                          label="Recentes" 
                          active={sortBy === 'recent'} 
                          onClick={() => setSortBy('recent')} 
                        />
                        <SortButton 
                          label="Mais votados" 
                          active={sortBy === 'votes'} 
                          onClick={() => setSortBy('votes')} 
                        />
                        <SortButton 
                          label="Próximos" 
                          active={sortBy === 'distance'} 
                          onClick={() => setSortBy('distance')} 
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Botão de novo relatório */}
              <div className="p-3 border-b border-[#222]">
                <Button
                  onClick={() => {
                    onNewReport();
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={cn(
                    "bg-white hover:bg-white/90 text-black w-full",
                    isCollapsed ? "p-2 flex justify-center" : "flex items-center",
                    isMobile && "h-12 text-base"
                  )}
                >
                  <MapPin size={isCollapsed ? 18 : 16} className={isCollapsed ? "" : "mr-2"} />
                  {!isCollapsed && <span>Novo relatório</span>}
                </Button>
              </div>
              
              {/* Listagem de pins */}
              <div className="flex-1 overflow-hidden">
                {filteredPins.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
                    <MapPin size={24} className="text-gray-600 mb-2" />
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
                  <ScrollArea className="h-full custom-scrollbar">
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
                              onClick={() => {
                                onPinClick(pin);
                                // Fechar menu móvel após clicar
                                if (isMobile) setMobileMenuOpen(false);
                              }}
                              expanded={isExpanded}
                              isMobile={isMobile}
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
          
          {/* Rodapé com informações do usuário */}
          <div className={cn("p-3 border-t border-[#222] mt-auto", !isExpanded && isCollapsed && "flex justify-center")}>
            {isExpanded ? (
              <div className="flex items-center">
                <Avatar className="h-8 w-8 rounded-full">
                  <AvatarImage src="/avatar-placeholder.svg" alt="Usuário" />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">US</AvatarFallback>
                </Avatar>
                <div className="ml-2">
                  <div className="text-sm font-medium text-white">Usuário</div>
                  <div className="text-xs text-gray-400">Cidadão</div>
                </div>
              </div>
            ) : (
              <Avatar className="h-8 w-8 rounded-full">
                <AvatarImage src="/avatar-placeholder.svg" alt="Usuário" />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs">US</AvatarFallback>
              </Avatar>
            )}
          </div>
      </div>
    </>
  );
};

const NavButton = ({ icon, label, active, onClick, collapsed = false, mobileTab = false }) => {
  if (mobileTab) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex flex-col items-center p-2 rounded-lg transition-colors min-w-0 flex-1",
          active ? "bg-[#2a2a2a] text-white" : "text-gray-500 hover:text-white"
        )}
      >
        <div className="text-center">{icon}</div>
        <span className="text-xs mt-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
          {label}
        </span>
      </button>
    );
  }
  
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
          active ? "bg-[#2a2a2a] text-white" : "text-gray-500 hover:text-white hover:bg-[#1a1a1a]"
        )}
        title={label}
      >
        {icon}
      </button>
    );
  }
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center h-8 px-3 rounded-lg text-sm transition-colors flex-1",
        active ? 
          "bg-[#2a2a2a] text-white" : 
          "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
      )}
    >
      <span className="mr-2">{icon}</span>
      <span>{label}</span>
    </button>
  );
};

const FilterButton = ({ icon, label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center h-7 px-2 rounded-lg text-xs transition-colors",
        active ? 
          "bg-[#2a2a2a] text-white" : 
          "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]"
      )}
    >
      <span className="mr-1">{icon}</span>
      <span>{label}</span>
    </button>
  );
};

const SortButton = ({ label, active, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "h-7 px-2 rounded-lg text-xs transition-colors",
        active ? 
          "bg-[#2a2a2a] text-white" : 
          "bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222]"
      )}
    >
      {label}
    </button>
  );
};

const PinCard = ({ pin, onClick, expanded, isMobile = false }) => {
  const timeAgo = formatDistanceToNow(new Date(pin.reportedAt), {
    addSuffix: true,
    locale: ptBR,
  });
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#232323] transition-colors text-left flex items-start gap-3 border border-transparent hover:border-[#333]",
        isMobile && "p-3" // Mais espaço para toque em mobile
      )}
    >
      {/* Ícone do pin */}
      <div className={cn(
        "shrink-0 w-10 h-10 rounded-full flex items-center justify-center relative",
        pin.type === 'crime' ? "bg-[#1a1a1a] border-2 border-red-500/30" : "bg-[#1a1a1a] border-2 border-yellow-500/30",
        isMobile && "w-12 h-12" // Ícone maior em mobile para facilitar toque
      )}>
        {pin.type === 'crime' ? (
          <SirenIcon size={isMobile ? 18 : 16} className="text-red-400" />
        ) : (
          <ConstructionIcon size={isMobile ? 18 : 16} className="text-yellow-400" />
        )}
        
        {/* Badge para votos */}
        {(pin.votes && pin.votes > 0) && (
          <div className={cn(
            "absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-[9px] font-bold bg-yellow-400 text-black rounded-full",
            isMobile && "h-5 w-5 text-[10px]" // Badge maior em mobile
          )}>
            {pin.votes}
          </div>
        )}
      </div>
      
      {/* Informações do pin */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 mb-0.5">
          <div className={cn("text-sm font-medium text-white truncate", isMobile && "text-base")}>
            {pin.type === 'crime' ? 'Crime' : 'Infraestrutura'}
          </div>
          
          {/* Badge de status */}
          <div className={cn(
            "px-1.5 py-0.5 rounded-full text-[10px] uppercase font-medium leading-none",
            getPinStatusStyle(pin.status),
            isMobile && "text-[11px] px-2"
          )}>
            {getStatusLabel(pin.status)}
          </div>
        </div>
        
        <p className={cn("text-xs text-gray-300 line-clamp-2 mb-1", isMobile && "text-sm")}>{pin.description}</p>
        
        <div className={cn("flex items-center text-[10px] text-gray-500", isMobile && "text-xs")}>
          <Clock size={isMobile ? 12 : 10} className="mr-1" />
          <span>há {pin.persistenceDays || 0} dias</span>
          
          {pin.address && (
            <>
              <span className="mx-1">•</span>
              <span className="truncate">{pin.address}</span>
            </>
          )}
        </div>
      </div>
    </button>
  );
};

const getPinStatusStyle = (status: string) => {
  switch (status) {
    case 'reported':
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case 'acknowledged':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'in_progress':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    case 'resolved':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  }
};

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
      return 'Desconhecido';
  }
};

export default NavBar;
