import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NavBarProps {
  onNewReport: () => void;
  pins?: any[];
  onPinClick?: (pin: any) => void;
}

const NavBar: React.FC<NavBarProps> = ({ onNewReport, pins = [], onPinClick = () => {} }) => {
  return (
    <aside className="fixed top-0 left-0 bottom-0 w-72 z-40 bg-[#121212] border-r border-[#2a2a2a] flex flex-col overflow-hidden shadow-xl">
      {/* Header with back button and site name */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <Button variant="ghost" size="icon" className="rounded-full w-8 h-8 hover:bg-[#333333]">
          <ArrowLeft size={18} />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 21C9.82437 21 7.94351 19.3951 5.27939 16.1853C3.5732 14.0885 2.72011 13.0401 2.3442 11.7508C2 10.5614 2 9.56939 2 7.58535V7.2C2 5.27477 2 4.31215 2.43597 3.54306C2.81947 2.87152 3.39158 2.33294 4.0797 1.96910C4.85869 1.55556 5.87556 1.55556 7.90931 1.55556H16.0907C18.1244 1.55556 19.1413 1.55556 19.9203 1.96910C20.6084 2.33294 21.1805 2.87152 21.564 3.54306C22 4.31215 22 5.27477 22 7.2V7.58535C22 9.56939 22 10.5614 21.6558 11.7508C21.2799 13.0401 20.4268 14.0885 18.7206 16.1853C16.0565 19.3951 14.1756 21 12 21Z" stroke="white" strokeWidth="2"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-white">Franco da Rocha</span>
        </div>
      </div>
      
      {/* Search box */}
      <div className="p-4 bg-[#1a1a1a]">
        <div className="relative">
          <input 
            className="w-full bg-[#252525] border-none rounded-full py-2 px-4 pl-9 text-sm text-white placeholder-gray-400"
            placeholder="Search..."
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
        </div>
      </div>
      
      {/* Filter options */}
      <div className="px-4 py-2 border-b border-[#2a2a2a] bg-[#1a1a1a]">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-400">Show me:</span>
          <div className="text-xs text-gray-400">Sort by:</div>
        </div>
        
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" className="h-7 rounded-full text-xs px-3 flex items-center gap-1.5 bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6V12L16 14M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Open Now
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Button>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 rounded-full text-xs px-3 flex items-center gap-1.5 bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]">
              Nearest
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Button>
            
            <Button variant="outline" size="sm" className="h-7 w-7 rounded-full p-0 flex items-center justify-center bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 7H21M3 12H21M3 17H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </Button>
          </div>
        </div>
      </div>
      
      {/* Lista de pins como se fossem lojas */}
      <div className="flex-1 overflow-auto bg-[#121212]">
        {pins && pins.length > 0 ? (
          pins.map((pin) => (
            <div 
              key={pin.id}
              className="flex items-center px-4 py-3 border-b border-[#2a2a2a] cursor-pointer hover:bg-[#1e1e1e] transition-colors"
              onClick={() => onPinClick(pin)}
            >
              <div className="brand-circle mr-3 bg-white flex items-center justify-center w-10 h-10 rounded-full">
                {getPinIcon(pin.type)}
              </div>
              <div className="flex-1">
                <div className="font-medium text-sm text-white">{getPinTypeLabel(pin.type)}</div>
                <div className="flex items-center text-xs text-gray-400 mt-0.5">
                  <span className="mr-1">{(Math.random() * 5.0).toFixed(1)} km</span>
                  <span>•</span>
                  <span className="ml-1">Reportado recentemente</span>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button className="p-1 rounded-full hover:bg-[#333333]">
                  <Info size={16} className="text-gray-400" />
                </button>
                <button className="p-1 rounded-full hover:bg-[#333333]">
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-400 text-sm">
            Nenhum local encontrado
          </div>
        )}
      </div>
    </aside>
  );
};

// Funções auxiliares
const getPinIcon = (type) => {
  switch (type) {
    case 'flood':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C9.82437 21 7.94351 19.3951 5.27939 16.1853C3.5732 14.0885 2.72011 13.0401 2.3442 11.7508C2 10.5614 2 9.56939 2 7.58535V7.2C2 5.27477 2 4.31215 2.43597 3.54306C2.81947 2.87152 3.39158 2.33294 4.0797 1.96910C4.85869 1.55556 5.87556 1.55556 7.90931 1.55556H16.0907C18.1244 1.55556 19.1413 1.55556 19.9203 1.96910C20.6084 2.33294 21.1805 2.87152 21.564 3.54306C22 4.31215 22 5.27477 22 7.2V7.58535C22 9.56939 22 10.5614 21.6558 11.7508C21.2799 13.0401 20.4268 14.0885 18.7206 16.1853C16.0565 19.3951 14.1756 21 12 21V22Z" fill="#45a0f8"/>
        </svg>
      );
    case 'pothole':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#f59e0b"/>
          <path d="M5 5L19 19" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'passable':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#10b981"/>
          <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'robbery':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#ef4444"/>
          <path d="M12 8V12M12 16H12.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    default:
      return null;
  }
};

const getPinTypeLabel = (type) => {
  switch (type) {
    case 'flood': return 'Alagamento';
    case 'pothole': return 'Buracos';
    case 'passable': return 'Passável';
    case 'robbery': return 'Assalto';
    default: return type;
  }
};

export default NavBar;
