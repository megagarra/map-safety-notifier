
import React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { PinType } from '@/types';
import { cn } from '@/lib/utils';

interface HeatmapControlProps {
  showHeatmap: boolean;
  onToggleHeatmap: () => void;
  intensity: number;
  onIntensityChange: (value: number) => void;
  activeType: PinType | 'all';
  onTypeChange: (type: PinType | 'all') => void;
}

const HeatmapControl: React.FC<HeatmapControlProps> = ({
  showHeatmap,
  onToggleHeatmap,
  intensity,
  onIntensityChange,
  activeType,
  onTypeChange
}) => {
  return (
    <div className="bg-[#121212] border-[#2a2a2a] border rounded-lg p-4 shadow-lg w-64">
      <div className="flex items-center justify-between mb-3">
        <Label htmlFor="heatmap-toggle" className="text-white text-sm font-medium">
          Mapa de Calor
        </Label>
        <Switch 
          id="heatmap-toggle" 
          checked={showHeatmap} 
          onCheckedChange={onToggleHeatmap} 
        />
      </div>
      
      {showHeatmap && (
        <>
          <div className="space-y-2 mb-3">
            <Label className="text-white text-xs">Intensidade</Label>
            <Slider
              value={[intensity]}
              min={0.1}
              max={1}
              step={0.1}
              onValueChange={(values) => onIntensityChange(values[0])}
            />
            <div className="text-right text-xs text-gray-400">
              {Math.round(intensity * 100)}%
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-white text-xs">Tipo de Ocorrência</Label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => onTypeChange('all')}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  activeType === 'all' 
                    ? "bg-white text-black" 
                    : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                )}
              >
                Todos
              </button>
              <button 
                onClick={() => onTypeChange('flood')}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  activeType === 'flood' 
                    ? "bg-flood text-white" 
                    : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                )}
              >
                Alagamento
              </button>
              <button 
                onClick={() => onTypeChange('pothole')}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  activeType === 'pothole' 
                    ? "bg-pothole text-white" 
                    : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                )}
              >
                Buracos
              </button>
              <button 
                onClick={() => onTypeChange('passable')}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  activeType === 'passable' 
                    ? "bg-passable text-white" 
                    : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                )}
              >
                Passável
              </button>
              <button 
                onClick={() => onTypeChange('robbery')}
                className={cn(
                  "text-xs px-2 py-1 rounded-md transition-colors",
                  activeType === 'robbery' 
                    ? "bg-robbery text-white" 
                    : "bg-[#2a2a2a] text-white hover:bg-[#333333]"
                )}
              >
                Assalto
              </button>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-[#2a2a2a]">
            <div className="text-xs text-gray-400">
              <p className="mb-1">Legenda:</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-flood"></span>
                <span>Alta concentração</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-pothole"></span>
                <span>Média concentração</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-passable"></span>
                <span>Baixa concentração</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HeatmapControl;
