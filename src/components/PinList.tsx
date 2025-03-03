
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
      <div className="text-center p-6">
        <p className="text-muted-foreground">Nenhum registro encontrado</p>
      </div>
    );
  }

  const sortedPins = [...pins].sort((a, b) => {
    return new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime();
  });

  return (
    <ScrollArea className="h-full pr-4">
      <div className="space-y-3 animate-fadeIn pb-4">
        {sortedPins.map((pin) => (
          <Card 
            key={pin.id} 
            className={cn(
              "overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer group",
              selectedPin?.id === pin.id ? "ring-2 ring-primary ring-offset-2" : ""
            )}
            onClick={() => onPinClick(pin)}
          >
            <CardHeader className={cn(
              "p-3 pb-0",
              getPinBackgroundClass(pin.type)
            )}>
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  {getPinIcon(pin.type)}
                  <CardTitle className="text-sm font-medium">{getPinTypeLabel(pin.type)}</CardTitle>
                </div>
                <div className="flex items-center text-xs text-muted-foreground gap-1">
                  <Clock size={12} />
                  <span>{formatDistanceToNow(new Date(pin.reportedAt), { addSuffix: true, locale: ptBR })}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-sm line-clamp-2">{pin.description}</p>
            </CardContent>
            {pin.images.length > 0 && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-3 gap-1">
                  {pin.images.slice(0, 3).map((img, index) => (
                    <div key={index} className="aspect-square rounded overflow-hidden">
                      <img 
                        src={img} 
                        alt={`Imagem ${index + 1}`} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            <CardFooter className="p-3 pt-0 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {pin.address || `${pin.location.lat.toFixed(4)}, ${pin.location.lng.toFixed(4)}`}
              </span>
              <Button size="sm" variant="ghost" className="p-0 h-auto opacity-0 group-hover:opacity-100 transition-opacity">
                <ExternalLink size={14} />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ScrollArea>
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

export default PinList;
