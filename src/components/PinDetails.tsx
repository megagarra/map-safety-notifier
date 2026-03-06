import React, { useState } from 'react';
import { X, Copy, Clock, AlertCircle, CheckCircle, Wrench, ThumbsUp, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Pin, PinType } from '@/types';
import PinHistory from './PinHistory';
import { ImageGallery } from './ImageGallery';

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

// Helper functions to fix type errors
const getPinColorClass = (type: PinType): string => {
  switch (type) {
    case 'flood': return 'bg-flood';
    case 'pothole': return 'bg-pothole';
    case 'passable': return 'bg-passable';
    case 'robbery': return 'bg-robbery';
    case 'infraestrutura': return 'bg-blue-500';
    case 'crime': return 'bg-red-500';
    case 'security': return 'bg-green-500';
    case 'client': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

const getPinIconSvg = (type: PinType): string => {
  // Simplified SVG for all types
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="8" rx="1"/>
    <path d="M17 14v7"/>
    <path d="M7 14v7"/>
    <path d="M17 3v3"/>
    <path d="M7 3v3"/>
    <path d="M10 14 2.3 6.3"/>
    <path d="m14 6 7.7 7.7"/>
    <path d="m8 6 8 8"/>
  </svg>`;
};

const getPinTypeLabel = (type: PinType): string => {
  switch (type) {
    case 'flood': return 'Alagamento';
    case 'pothole': return 'Buraco';
    case 'passable': return 'Passável';
    case 'robbery': return 'Assalto';
    case 'infraestrutura': return 'Problema de Infraestrutura';
    case 'crime': return 'Crime';
    case 'security': return 'Segurança';
    case 'client': return 'Cliente';
    default: return type;
  }
};

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
          {/* Description */}
          <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <h4 className="text-sm font-medium text-white mb-2">Descrição</h4>
            <p className="text-gray-300">{pin.description}</p>
          </div>

          {/* Location Info */}
          <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <h4 className="text-sm font-medium text-white mb-2">Localização</h4>
            <div className="flex flex-col gap-2">
              {pin.address && (
                <p className="text-gray-300">
                  <span className="font-medium text-white">Endereço:</span> {pin.address}
                </p>
              )}
              <p className="text-gray-300">
                <span className="font-medium text-white">Coordenadas:</span> {pin.location.lat.toFixed(6)}, {pin.location.lng.toFixed(6)}
              </p>
              <button 
                onClick={copyLocationLink}
                className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Copy size={14} />
                <span>Copiar link da localização</span>
              </button>
            </div>
          </div>

          {/* Status and Timing */}
          <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <h4 className="text-sm font-medium text-white mb-2">Status</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  pin.status === 'reported' && "bg-yellow-500/20 text-yellow-400",
                  pin.status === 'acknowledged' && "bg-blue-500/20 text-blue-400",
                  pin.status === 'in_progress' && "bg-purple-500/20 text-purple-400",
                  pin.status === 'resolved' && "bg-green-500/20 text-green-400"
                )}>
                  {pin.status === 'reported' && "Reportado"}
                  {pin.status === 'acknowledged' && "Reconhecido"}
                  {pin.status === 'in_progress' && "Em Progresso"}
                  {pin.status === 'resolved' && "Resolvido"}
                </div>
              </div>
              <p className="text-gray-300 flex items-center gap-2">
                <Clock size={14} />
                <span>Reportado em: {new Date(pin.reportedAt).toLocaleString('pt-BR')}</span>
              </p>
              {pin.persistenceDays && (
                <p className="text-gray-300">
                  <span className="font-medium text-white">Dias de persistência:</span> {pin.persistenceDays}
                </p>
              )}
            </div>
          </div>

          {/* Images */}
          {pin.images && pin.images.length > 0 && (
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <ImageGallery images={pin.images} altPrefix="Imagem do problema" layout="separate" />
            </div>
          )}

          {/* Voting Section */}
          <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
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

          {/* History */}
          <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full flex items-center justify-between text-sm font-medium text-white"
            >
              <span>Histórico de Atualizações</span>
              <div className={cn(
                "transform transition-transform",
                showHistory ? "rotate-180" : ""
              )}>
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path
                    d="M2 4L6 8L10 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </button>
            {showHistory && (
              <div className="mt-4">
                <PinHistory history={pin.history} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinDetails;
