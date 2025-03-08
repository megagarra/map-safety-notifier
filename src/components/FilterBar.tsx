import React from 'react';
import { PinType } from '@/types';
import { Button } from '@/components/ui/button';
import { AlertCircle, BarChart3, CircleOff } from 'lucide-react';
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
    return selectedTypes?.includes(type) ?? false;
  };
  
  const clearFilters = () => {
    onTypeSelect(null);
  };
  
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 w-[95%] max-w-4xl">
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white/70 backdrop-blur-md rounded-xl shadow-lg border border-border/40 transition-all duration-300 hover:bg-white/80 animate-fadeIn">
        <Button
          variant={isSelected('infraestrutura') ? "default" : "outline"}
          size="sm"
          className={cn(
            "transition-all duration-300 gap-2 rounded-lg font-medium shadow-sm",
            isSelected('infraestrutura') 
              ? "bg-gradient-to-r from-blue-500 to-blue-400 text-white hover:opacity-90 shadow-blue-500/20" 
              : "hover:border-blue-500/50 hover:text-blue-500"
          )}
          onClick={() => toggleType('infraestrutura')}
        >
          <BarChart3 size={16} />
          <span className="hidden sm:inline">Infraestrutura</span>
        </Button>
        
        <Button
          variant={isSelected('crime') ? "default" : "outline"}
          size="sm"
          className={cn(
            "transition-all duration-300 gap-2 rounded-lg font-medium shadow-sm",
            isSelected('crime') 
              ? "bg-gradient-to-r from-red-500 to-red-400 text-white hover:opacity-90 shadow-red-500/20" 
              : "hover:border-red-500/50 hover:text-red-500"
          )}
          onClick={() => toggleType('crime')}
        >
          <AlertCircle size={16} />
          <span className="hidden sm:inline">Crime</span>
        </Button>
        
        <div className="ml-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-gray-800 hover:bg-gray-100/50"
            onClick={clearFilters}
          >
            Limpar filtros
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;
