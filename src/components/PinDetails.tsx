import React, { useState } from 'react';
import { X, Copy, Clock, AlertCircle, CheckCircle, Wrench, ThumbsUp, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { Pin } from '@/types';
import PinHistory from './PinHistory';

// Componente personalizado para o ícone de sirene
const SirenIcon = ({ size = 16, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 18v-6a5 5 0 1 1 10 0v6"/>
    <path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/>
    <path d="M21 12h1"/>
    <path d="M18.5 4.5 18 5"/>
    <path d="M2 12h1"/>
    <path d="M12 2v1"/>
    <path d="m4.929 4.929.707.707"/>
    <path d="M12 12v6"/>
  </svg>
);

interface PinDetailsProps {
  pin: Pin;
  onClose: () => void;
  onVote: (pinId: string) => void;
}

const PinDetails = ({ pin, onClose, onVote }: PinDetailsProps) => {
  // Usar estado local para mostrar feedback imediato
  const [hasVoted, setHasVoted] = useState(pin.userVoted || false);
  const [voteCount, setVoteCount] = useState(pin.votes || 0);
  
  const isCrime = pin.type === 'crime';
  const [showHistory, setShowHistory] = useState(false);
  
  if (!pin) return null;
  
  // Função para lidar com o voto
  const handleVote = () => {
    if (hasVoted) return; // Evitar múltiplos votos
    
    setHasVoted(true);
    setVoteCount(prev => prev + 1);
    onVote(pin.id);
  };

  // Função para copiar localização
  const copyLocationLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url)
      .then(() => {
        alert('Link copiado para a área de transferência!');
      })
      .catch(err => {
        console.error('Erro ao copiar link:', err);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-auto backdrop-blur-sm">
      <div className={cn(
        "relative w-[90%] max-w-[450px] max-h-[80vh] overflow-y-auto rounded-xl bg-[#121212] shadow-2xl border transition-all duration-300 animate-fadeIn",
        isCrime ? "border-[#f43f5e]" : "border-[#2a2a2a]"
      )}>
        <div className={cn(
          "sticky top-0 z-10 flex justify-between items-center p-4 border-b",
          isCrime 
            ? "border-[#f43f5e]/30 bg-[#1a1a1a]" 
            : "border-[#2a2a2a] bg-[#1a1a1a]"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center h-8 w-8 rounded-full",
              isCrime ? "bg-[#1a1a1a] border-[#f43f5e] border-2 text-[#f43f5e]" : getPinColorClass(pin.type)
            )}>
              {isCrime ? (
                <SirenIcon size={16} className="text-[#f43f5e]" />
              ) : (
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: getPinIconSvg(pin.type) 
                  }} 
                  className="scale-75"
                />
              )}
            </div>
            <h3 className="text-lg font-medium text-white">
              {getPinTypeLabel(pin.type)}
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-[#2a2a2a]/80 flex items-center justify-center text-white/70 hover:bg-[#3a3a3a] hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4">
          {/* ... (conteúdo existente) ... */}
          
          {/* Seção de votação */}
          <div className="my-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <h4 className="text-sm font-medium text-white mb-3">Confirmação do Problema</h4>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <span className="text-sm text-gray-300">
                  <span className="font-medium text-white">{voteCount}</span> pessoas confirmaram este problema
                </span>
              </div>
              <button 
                onClick={handleVote}
                disabled={hasVoted}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                  hasVoted 
                    ? "bg-green-500/20 text-green-400 cursor-default" 
                    : "bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]"
                )}
              >
                <ThumbsUp size={14} />
                <span>{hasVoted ? "Confirmado" : "Confirmar"}</span>
              </button>
            </div>
            {hasVoted && (
              <p className="mt-2 text-xs text-green-400">
                Obrigado por confirmar este problema. Isso ajuda a priorizar soluções.
              </p>
            )}
          </div>
          
          {/* ... (resto do conteúdo existente) ... */}
        </div>
      </div>
    </div>
  );
};

export default PinDetails; 