import React, { useState } from 'react';
import { Pin } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, subDays, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PersistenceTimelineProps {
  pins: Pin[];
}

const PersistenceTimeline: React.FC<PersistenceTimelineProps> = ({ pins }) => {
  const [timeRange, setTimeRange] = useState<30 | 60 | 90>(30);
  
  // Filtrar pins com dados de histórico
  const pinsWithHistory = pins.filter(pin => pin.history && pin.history.length > 0);
  
  if (pinsWithHistory.length === 0) {
    return null;
  }
  
  // Determinar a data atual e a data mais antiga para a linha do tempo
  const today = new Date();
  const startDate = subDays(today, timeRange);
  
  // Criar um array de datas para o eixo X
  const dateRange: Date[] = [];
  for (let i = 0; i <= timeRange; i++) {
    dateRange.push(subDays(today, timeRange - i));
  }
  
  // Determinar os eventos importantes para cada pin
  const timelineEvents = pinsWithHistory.map(pin => {
    const events = pin.history
      .filter(entry => {
        const entryDate = new Date(entry.timestamp);
        return entryDate >= startDate && entryDate <= today;
      })
      .map(entry => ({
        date: new Date(entry.timestamp),
        status: entry.status,
        pin
      }));
    
    return {
      pin,
      events
    };
  }).filter(item => item.events.length > 0);
  
  // Agrupar eventos por data
  const eventsByDate = {};
  
  timelineEvents.forEach(timeline => {
    timeline.events.forEach(event => {
      const dateKey = format(event.date, 'yyyy-MM-dd');
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });
  });
  
  return (
    <Card className="bg-[#121212] border-[#2a2a2a] text-white w-[500px]">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Evolução Temporal dos Problemas
        </CardTitle>
        <div className="flex gap-1">
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-6 text-xs px-2", 
              timeRange === 30 
                ? "bg-white text-black hover:bg-white/90" 
                : "bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]"
            )}
            onClick={() => setTimeRange(30)}
          >
            30 dias
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-6 text-xs px-2", 
              timeRange === 60 
                ? "bg-white text-black hover:bg-white/90" 
                : "bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]"
            )}
            onClick={() => setTimeRange(60)}
          >
            60 dias
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className={cn(
              "h-6 text-xs px-2", 
              timeRange === 90 
                ? "bg-white text-black hover:bg-white/90" 
                : "bg-[#252525] border-[#3a3a3a] text-white hover:bg-[#333333]"
            )}
            onClick={() => setTimeRange(90)}
          >
            90 dias
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Eixo de tempo */}
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{format(startDate, "dd 'de' MMM", { locale: ptBR })}</span>
            <span>Hoje</span>
          </div>
          
          <div className="h-[1px] bg-[#2a2a2a] w-full mb-4"></div>
          
          {/* Problemas e sua evolução */}
          <div className="space-y-3 max-h-[350px] overflow-auto pr-2">
            {timelineEvents.map((timeline, idx) => (
              <div key={idx} className="relative">
                {/* Nome do problema */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-3 h-3 rounded-full", getPinColorClass(timeline.pin.type))}></div>
                  <span className="text-xs font-medium">
                    {getPinTypeLabel(timeline.pin.type)} - {timeline.pin.description.slice(0, 30)}...
                  </span>
                </div>
                
                {/* Linha do tempo */}
                <div className="h-6 bg-[#1a1a1a] rounded-full relative overflow-hidden">
                  {/* Marcadores de eventos */}
                  {timeline.events.map((event, eventIdx) => {
                    const daysPassed = differenceInDays(event.date, startDate);
                    const positionPercent = (daysPassed / timeRange) * 100;
                    
                    return (
                      <div 
                        key={eventIdx}
                        className={cn(
                          "absolute top-0 w-2 h-6 rounded-full",
                          getStatusColor(event.status)
                        )}
                        style={{ left: `${positionPercent}%` }}
                        title={`${getStatusLabel(event.status)} - ${format(event.date, "dd 'de' MMM", { locale: ptBR })}`}
                      />
                    );
                  })}
                  
                  {/* Linha de persistência */}
                  {timeline.events.length >= 2 && (
                    <div 
                      className={cn(
                        "absolute top-1/2 h-1 -translate-y-1/2",
                        timeline.pin.status === 'resolved' ? "bg-passable/40" : "bg-pothole/40"
                      )}
                      style={{ 
                        left: `${(differenceInDays(timeline.events[0].date, startDate) / timeRange) * 100}%`,
                        width: `${(differenceInDays(
                          timeline.events[timeline.events.length - 1].date, 
                          timeline.events[0].date
                        ) / timeRange) * 100}%`
                      }}
                    />
                  )}
                </div>
                
                {/* Status atual */}
                <div className="text-xs text-gray-400 mt-1 flex justify-between">
                  <span>{timeline.pin.persistenceDays} dias</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs",
                    getStatusTextColor(timeline.pin.status)
                  )}>
                    {getStatusLabel(timeline.pin.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          
          {/* Legenda */}
          <div className="border-t border-[#2a2a2a] pt-3 mt-3">
            <div className="text-xs text-gray-400 mb-2">Legenda:</div>
            <div className="grid grid-cols-4 gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-flood"></div>
                <span className="text-xs">Reportado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-pothole"></div>
                <span className="text-xs">Reconhecido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-passable"></div>
                <span className="text-xs">Em progresso</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white"></div>
                <span className="text-xs">Resolvido</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Funções auxiliares
const getPinColorClass = (type) => {
  switch (type) {
    case 'flood': return 'bg-flood';
    case 'pothole': return 'bg-pothole';
    case 'passable': return 'bg-passable';
    case 'robbery': return 'bg-robbery';
    default: return 'bg-gray-500';
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

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'reported':
      return 'bg-flood';
    case 'acknowledged':
      return 'bg-pothole';
    case 'in_progress':
      return 'bg-passable';
    case 'resolved':
      return 'bg-white';
    default:
      return 'bg-gray-500';
  }
};

const getStatusTextColor = (status: string): string => {
  switch (status) {
    case 'reported':
      return 'bg-flood/20 text-flood';
    case 'acknowledged':
      return 'bg-pothole/20 text-pothole';
    case 'in_progress':
      return 'bg-passable/20 text-passable';
    case 'resolved':
      return 'bg-passable/20 text-passable';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
};

const getStatusLabel = (status: string): string => {
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
      return status;
  }
};

export default PersistenceTimeline; 