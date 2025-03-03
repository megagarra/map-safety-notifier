
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
    <div className="flex flex-wrap items-center gap-2 p-3 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-border animate-fadeIn">
      <Button
        variant={isSelected('flood') ? "default" : "outline"}
        size="sm"
        className={cn(
          "transition-all duration-300 gap-2",
          isSelected('flood') ? "bg-flood text-white hover:bg-flood/90" : "hover:border-flood/50"
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
          "transition-all duration-300 gap-2",
          isSelected('pothole') ? "bg-pothole text-white hover:bg-pothole/90" : "hover:border-pothole/50"
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
          "transition-all duration-300 gap-2",
          isSelected('passable') ? "bg-passable text-white hover:bg-passable/90" : "hover:border-passable/50"
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
