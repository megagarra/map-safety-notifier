import React from 'react';
import { Pin, PinType } from '@/types';
import { DropletIcon, CircleOff, CheckCircle, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface PinListProps {
  pins: Pin[];
  selectedPin: Pin | null;
  onPinClick: (pin: Pin) => void;
}

const PinList: React.FC<PinListProps> = ({ pins, selectedPin, onPinClick }) => {
  if (pins.length === 0) {
    return (
      <div className="text-center p-6 text-muted-foreground">
        <p>Nenhum registro encontrado</p>
      </div>
    );
  }

  const sortedPins = [...pins].sort((a, b) => {
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });

  return (
    <div className="p-4 space-y-3">
      {sortedPins.map((pin) => (
        <div 
          key={pin.id} 
          className={cn(
            "bg-secondary border border-border rounded-lg p-3 cursor-pointer transition-all duration-300",
            selectedPin?.id === pin.id ? "ring-2 ring-primary" : "hover:bg-accent/50"
          )}
          onClick={() => onPinClick(pin)}
        >
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getPinColorClass(pin.type))}>
              {getPinIcon(pin.type)}
            </div>
            
            <div className="flex-1">
              <div className="font-medium">{getPinTypeLabel(pin.type)}</div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formatDistanceToNow(new Date(pin.reportedAt), { addSuffix: true, locale: ptBR })}</span>
                <span>•</span>
                <span className="truncate max-w-[120px]">
                  {pin.address || `${pin.location.lat.toFixed(4)}, ${pin.location.lng.toFixed(4)}`}
                </span>
              </div>
            </div>
            
            <div className="score-badge">
              {getScoreFromType(pin.type)}
            </div>
          </div>
          
          <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
            {pin.description}
          </div>
          
          {pin.images.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {pin.images.slice(0, 3).map((img, index) => (
                <div key={index} className="aspect-square rounded-md overflow-hidden bg-accent">
                  <img 
                    src={img} 
                    alt={`Imagem ${index + 1}`} 
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const getPinIcon = (type: PinType) => {
  switch (type) {
    case 'flood': 
      return <DropletIcon size={16} className="text-flood" />;
    case 'pothole': 
      return <CircleOff size={16} className="text-pothole" />;
    case 'passable': 
      return <CheckCircle size={16} className="text-passable" />;
    case 'robbery': 
      return <AlertCircle size={16} className="text-robbery" />;
    default: 
      return null;
  }
};

const getPinBackgroundClass = (type: PinType): string => {
  switch (type) {
    case 'flood': return 'bg-flood/5 border-b border-flood/20';
    case 'pothole': return 'bg-pothole/5 border-b border-pothole/20';
    case 'passable': return 'bg-passable/5 border-b border-passable/20';
    case 'robbery': return 'bg-robbery/5 border-b border-robbery/20';
    default: return '';
  }
};

const getPinTypeLabel = (type: PinType): string => {
  switch (type) {
    case 'flood': return 'Alagamento';
    case 'pothole': return 'Buraco';
    case 'passable': return 'Passável';
    case 'robbery': return 'Assalto';
    default: return type;
  }
};

const getScoreFromType = (type: PinType): string => {
  switch (type) {
    case 'flood': return '100';
    case 'pothole': return '85';
    case 'passable': return '95';
    case 'robbery': return '90';
    default: return '80';
  }
};

const getPinColorClass = (type: PinType): string => {
  switch (type) {
    case 'flood': return 'bg-flood';
    case 'pothole': return 'bg-pothole';
    case 'passable': return 'bg-passable';
    case 'robbery': return 'bg-robbery';
    default: return 'bg-gray-500';
  }
};

export default PinList;
