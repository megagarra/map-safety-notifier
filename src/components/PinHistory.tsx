
import React from 'react';
import { PinHistoryEntry } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, Clock, AlertCircle, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PinHistoryProps {
  history: PinHistoryEntry[];
  persistenceDays?: number;
}

const PinHistory: React.FC<PinHistoryProps> = ({ history, persistenceDays }) => {
  // Ordenar histórico do mais antigo para o mais recente
  const sortedHistory = [...history].sort((a, b) => 
    new Date(a.timestamp || a.date || '').getTime() - 
    new Date(b.timestamp || b.date || '').getTime()
  );
  
  // Verificar se o problema está resolvido
  const isResolved = sortedHistory.some(entry => entry.status === 'resolved');
  
  return (
    <div className="space-y-4">
      {/* Cabeçalho com informações de persistência */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Histórico do Problema</h3>
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400">
            {persistenceDays !== undefined ? (
              isResolved ? 
                `Resolvido após ${persistenceDays} dias` : 
                `Persistindo há ${persistenceDays} dias`
            ) : 'Tempo indeterminado'}
          </span>
        </div>
      </div>
      
      {/* Linha do tempo */}
      <div className="relative pl-6 border-l border-[#2a2a2a]">
        {sortedHistory.map((entry, index) => (
          <div key={index} className="mb-4 last:mb-0">
            {/* Indicador de status */}
            <div className={cn(
              "absolute left-[-8px] w-4 h-4 rounded-full flex items-center justify-center",
              getStatusColor(entry.status)
            )}>
              {getStatusIcon(entry.status)}
            </div>
            
            {/* Conteúdo */}
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  {getStatusLabel(entry.status)}
                </span>
                <span className="text-xs text-gray-400">
                  {format(new Date(entry.timestamp || entry.date || ''), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </span>
              </div>
              {(entry.comment || entry.description) && (
                <p className="text-xs text-gray-400 mt-1">{entry.comment || entry.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Indicador de persistência */}
      {!isResolved && persistenceDays !== undefined && (
        <div className={cn(
          "text-xs p-2 rounded-md",
          persistenceDays > 30 ? "bg-robbery/20 text-robbery" :
          persistenceDays > 14 ? "bg-pothole/20 text-pothole" :
          "bg-flood/20 text-flood"
        )}>
          {persistenceDays > 30 ? 
            "Este problema persiste há mais de um mês sem resolução." :
            persistenceDays > 14 ?
            "Este problema persiste há mais de duas semanas." :
            "Este problema foi reportado recentemente."}
        </div>
      )}
    </div>
  );
};

// Funções auxiliares
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'reported':
      return 'bg-flood';
    case 'acknowledged':
      return 'bg-pothole';
    case 'in_progress':
      return 'bg-passable';
    case 'resolved':
      return 'bg-passable';
    default:
      return 'bg-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'reported':
      return <AlertCircle size={10} className="text-white" />;
    case 'acknowledged':
      return <Clock size={10} className="text-white" />;
    case 'in_progress':
      return <Wrench size={10} className="text-white" />;
    case 'resolved':
      return <CheckCircle size={10} className="text-white" />;
    default:
      return null;
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

export default PinHistory;
