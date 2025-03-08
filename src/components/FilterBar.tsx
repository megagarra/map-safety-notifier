import React from 'react';
import { PinType } from '@/types';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, DropletIcon, CircleOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  selectedTypes: PinType[] | null;
  onTypeSelect: (types: PinType[] | null) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ selectedTypes, onTypeSelect }) => {
  const toggleType = (type: PinType) => {
    if (!selectedTypes) {
      onTypeSelect([type]);
      return;
    }
    
    if (selectedTypes.includes(type)) {
      const newTypes = selectedTypes.filter(t => t !== type);
      onTypeSelect(newTypes.length ? newTypes : null);
    } else {
      onTypeSelect([...selectedTypes, type]);
    }
  };
  
  const isSelected = (type: PinType) => {
    return selectedTypes?.includes(type) || false;
  };
  
  const clearFilters = () => {
    onTypeSelect(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-border/40 transition-all duration-300 hover:bg-white/80 animate-fadeIn">
      <Button
        variant={isSelected('flood') ? "default" : "outline"}
        size="sm"
        className={cn(
          "transition-all duration-300 gap-2 rounded-lg font-medium shadow-sm",
          isSelected('flood') 
            ? "bg-gradient-to-r from-flood to-flood/90 text-white hover:opacity-90 shadow-flood/20" 
            : "hover:border-flood/50 hover:text-flood"
        )}
        onClick={() => toggleType('flood')}
      >
        <DropletIcon size={16} />
        <span className="hidden sm:inline">Alagamento</span>
      </Button>
      
      <Button
        variant={isSelected('pothole') ? "default" : "outline"}
        size="sm"
        className={cn(
          "transition-all duration-300 gap-2 rounded-lg font-medium shadow-sm",
          isSelected('pothole') 
            ? "bg-gradient-to-r from-pothole to-pothole/90 text-white hover:opacity-90 shadow-pothole/20" 
            : "hover:border-pothole/50 hover:text-pothole"
        )}
        onClick={() => toggleType('pothole')}
      >
        <CircleOff size={16} />
        <span className="hidden sm:inline">Buracos</span>
      </Button>
      
      <Button
        variant={isSelected('passable') ? "default" : "outline"}
        size="sm"
        className={cn(
          "transition-all duration-300 gap-2 rounded-lg font-medium shadow-sm",
          isSelected('passable') 
            ? "bg-gradient-to-r from-passable to-passable/90 text-white hover:opacity-90 shadow-passable/20" 
            : "hover:border-passable/50 hover:text-passable"
        )}
        onClick={() => toggleType('passable')}
      >
        <CheckCircle size={16} />
        <span className="hidden sm:inline">Passável</span>
      </Button>
      
      <Button
        variant={isSelected('robbery') ? "default" : "outline"}
        size="sm"
        className={cn(
          "transition-all duration-300 gap-2",
          isSelected('robbery') ? "bg-robbery text-white hover:bg-robbery/90" : "hover:border-robbery/50"
        )}
        onClick={() => toggleType('robbery')}
      >
        <AlertCircle size={16} />
        <span className="hidden sm:inline">Assalto</span>
      </Button>
      
      {selectedTypes && selectedTypes.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="ml-auto"
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
};

export default FilterBar;
