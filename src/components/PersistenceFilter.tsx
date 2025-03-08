import React from 'react';
import { Pin, PinType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PersistenceFilterProps {
  pins: Pin[];
  onFilter: (filteredPins: Pin[]) => void;
}

const PersistenceFilter: React.FC<PersistenceFilterProps> = ({ pins, onFilter }) => {
  const [dayRange, setDayRange] = React.useState<[number, number]>([0, 60]);
  const [selectedStatus, setSelectedStatus] = React.useState<Record<string, boolean>>({
    reported: true,
    acknowledged: true,
    in_progress: true,
    resolved: false
  });
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');
  
  // Filtrar pins com base nos critérios
  const filterPins = () => {
    const filteredPins = pins.filter(pin => {
      // Verificar dias de persistência
      const days = pin.persistenceDays || 0;
      if (days < dayRange[0] || days > dayRange[1]) {
        return false;
      }
      
      // Verificar status
      if (pin.status && !selectedStatus[pin.status]) {
        return false;
      }
      
      return true;
    });
    
    // Ordenar pins
    const sortedPins = [...filteredPins].sort((a, b) => {
      const daysA = a.persistenceDays || 0;
      const daysB = b.persistenceDays || 0;
      
      return sortOrder === 'asc' ? daysA - daysB : daysB - daysA;
    });
    
    onFilter(sortedPins);
  };
  
  // Aplicar filtro quando os critérios mudarem
  React.useEffect(() => {
    filterPins();
  }, [dayRange, selectedStatus, sortOrder]);
  
  // Resetar filtros
  const resetFilters = () => {
    setDayRange([0, 60]);
    setSelectedStatus({
      reported: true,
      acknowledged: true,
      in_progress: true,
      resolved: false
    });
    setSortOrder('desc');
  };
  
  return (
    <Card className="bg-[#121212] border-[#2a2a2a] text-white w-64">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Filtrar por Persistência
          </CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-6 w-6 rounded-full hover:bg-[#252525]"
            onClick={resetFilters}
          >
            <RefreshCw size={14} className="text-gray-400" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Tempo de persistência</Label>
              <div className="text-xs text-gray-400">
                {dayRange[0]} - {dayRange[1]} dias
              </div>
            </div>
            <Slider
              value={dayRange}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => setDayRange(value as [number, number])}
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Status do problema</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="reported"
                  checked={selectedStatus.reported}
                  onCheckedChange={(checked) => 
                    setSelectedStatus({...selectedStatus, reported: !!checked})
                  }
                />
                <label
                  htmlFor="reported"
                  className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Reportado
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="acknowledged"
                  checked={selectedStatus.acknowledged}
                  onCheckedChange={(checked) => 
                    setSelectedStatus({...selectedStatus, acknowledged: !!checked})
                  }
                />
                <label
                  htmlFor="acknowledged"
                  className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Reconhecido
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="in_progress"
                  checked={selectedStatus.in_progress}
                  onCheckedChange={(checked) => 
                    setSelectedStatus({...selectedStatus, in_progress: !!checked})
                  }
                />
                <label
                  htmlFor="in_progress"
                  className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Em andamento
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="resolved"
                  checked={selectedStatus.resolved}
                  onCheckedChange={(checked) => 
                    setSelectedStatus({...selectedStatus, resolved: !!checked})
                  }
                />
                <label
                  htmlFor="resolved"
                  className="text-xs leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Resolvido
                </label>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs">Ordenação</Label>
            <div className="flex">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-1 text-xs rounded-r-none py-1 h-7",
                  sortOrder === 'desc' 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]"
                )}
                onClick={() => setSortOrder('desc')}
              >
                <ArrowDown size={12} />
                Mais recentes
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center gap-1 text-xs rounded-l-none py-1 h-7",
                  sortOrder === 'asc' 
                    ? "bg-white text-black hover:bg-white/90" 
                    : "bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]"
                )}
                onClick={() => setSortOrder('asc')}
              >
                <ArrowUp size={12} />
                Mais antigos
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersistenceFilter; 