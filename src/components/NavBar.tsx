import React from 'react';
import { ChevronDown, ArrowLeft, Clock, X, Info, Search, List } from 'lucide-react';
import { cn } from '../lib/utils';
import { PinType, Pin } from '../types';

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
  const [isOpen, setIsOpen] = React.useState(true);
  const [selectedTypes, setSelectedTypes] = React.useState<PinType[]>(['infraestrutura', 'crime']);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const togglePinType = (type: PinType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  return (
    <div className={cn(
      "fixed top-0 left-0 bottom-0 z-40 bg-[#121212] border-r border-[#2a2a2a] w-72 transition-all duration-300",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a]">
        <button 
          onClick={toggleSidebar}
          className="h-8 w-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-[#121212]"></div>
          </div>
          <h1 className="text-base font-medium text-white">Franco da Rocha</h1>
        </div>
      </div>
      
      {/* Campo de busca */}
      <div className="p-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search..." 
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
        </div>
      </div>
      
      {/* Filtros */}
      <div className="px-4 pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Show me:</span>
          <span className="text-sm text-gray-400">Sort by:</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <button className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md py-1 px-2 text-sm text-white">
            <Clock size={14} />
            <span>Open Now</span>
            <ChevronDown size={14} />
          </button>
          
          <div className="flex items-center">
            <button className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-md py-1 px-2 text-sm text-white">
              <span>Nearest</span>
              <ChevronDown size={14} />
            </button>
            <button className="ml-1 h-7 w-7 flex items-center justify-center bg-[#1a1a1a] border border-[#2a2a2a] rounded-md text-white">
              <List size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Lista de pins com scroll personalizado */}
      <div className="custom-scrollbar overflow-y-auto h-[calc(100%-160px)]">
        {pins.map((pin, index) => (
          <PinListItem 
            key={index}
            type={pin.type}
            distance="2.7"
            onClick={() => onPinClick(pin)}
          />
        ))}
        
        {/* Exemplos estáticos para corresponder à imagem */}
        {pins.length === 0 && (
          <>
            <PinListItem type="crime" distance="2.7" />
            <PinListItem type="infraestrutura" distance="2.7" />
            <PinListItem type="infraestrutura" distance="2.7" />
            <PinListItem type="infraestrutura" distance="2.7" />
            <PinListItem type="infraestrutura" distance="2.7" />
            <PinListItem type="infraestrutura" distance="2.7" />
            <PinListItem type="infraestrutura" distance="2.7" />
            <PinListItem type="infraestrutura" distance="2.7" />
          </>
        )}
      </div>
    </div>
  );
};

// Componente auxiliar para itens da lista com ícones melhorados
const PinListItem = ({ type, distance, onClick = () => {} }) => {
  // Determinar o estilo do ícone com base no tipo
  const iconBgStyle = type === 'infraestrutura' 
    ? "bg-black border-2 border-yellow-500/30" 
    : "bg-red-600 border-2 border-red-500";
  
  const iconColor = type === 'infraestrutura' 
    ? "text-yellow-400" 
    : "text-white";
  
  return (
    <div 
      className="flex items-center justify-between p-4 border-t border-[#2a2a2a] hover:bg-[#1a1a1a] cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iconBgStyle}`}>
          {type === 'infraestrutura' ? (
            <ConstructionIcon size={16} className={`${iconColor}`} />
          ) : (
            <SirenIcon size={16} className={`${iconColor}`} />
          )}
        </div>
        <div>
          <div className="text-white font-medium">{type}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">{distance} km</span>
            <span className="text-xs text-gray-500">•</span>
            <span className="text-sm text-gray-400">Reportado recentemente</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button className="h-6 w-6 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <Info size={14} />
        </button>
        <button className="h-6 w-6 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default NavBar;
