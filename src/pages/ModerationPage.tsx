import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import * as PinsController from '@/controllers/pins';
import { Pin } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { getPinConfig } from '@/lib/pinConfig';
import { hasValidPinLocation } from '@/lib/pins';
import { ArrowLeft, Check, Loader2, X, MapPin, Construction, AlertTriangle, Map as MapIcon, RotateCcw, RefreshCw } from 'lucide-react';
import { resolveImageUrl } from '@/lib/media';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ModerationTab = 'pending' | 'rejected';

function getTypeIcon(type: string) {
  return type === 'crime' ? <AlertTriangle size={14} className="text-red-400" /> : <Construction size={14} className="text-orange-400" />;
}

function PinModerationCard({
  pin,
  badge,
  badgeClass,
  isActing,
  onApprove,
  onReject,
  showRejectionReason,
  onPreview,
}: {
  pin: Pin;
  badge: string;
  badgeClass: string;
  isActing: boolean;
  onApprove: () => void;
  onReject?: () => void;
  showRejectionReason?: boolean;
  onPreview: (url: string) => void;
}) {
  const cfg = getPinConfig(pin.type);
  return (
    <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {getTypeIcon(pin.type)}
          <span className={cn('text-sm font-medium', cfg.color)}>
            {cfg.label}{pin.crimeTypeLabel ? ` · ${pin.crimeTypeLabel.replace(/\s*\(Art\.[^)]*\)/, '')}` : ''}
          </span>
          <span className={cn('text-xs px-2 py-0.5 rounded-full', badgeClass)}>{badge}</span>
        </div>
        <span className="text-xs text-gray-500 shrink-0">
          {format(new Date(pin.reportedAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
        </span>
      </div>
      <p className="text-sm text-gray-200">{pin.description}</p>
      {showRejectionReason && pin.rejectionReason && (
        <p className="text-xs text-red-400 border-t border-[#2a2a2a] pt-2">Motivo: {pin.rejectionReason}</p>
      )}
      {pin.address && (
        <p className="text-xs text-gray-400 flex items-center gap-1">
          <MapPin size={12} /> {pin.address}
        </p>
      )}
      {pin.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {pin.images.map((img, i) => (
            <button key={img} type="button" onClick={() => onPreview(img)} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-[#2a2a2a]" aria-label={`Ver foto ${i + 1}`}>
              <img src={resolveImageUrl(img)} alt="" loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {hasValidPinLocation(pin) && (
        <Link
          to={`/?pin=${pin.id}&lat=${pin.location.lat.toFixed(5)}&lng=${pin.location.lng.toFixed(5)}&z=17`}
          className="h-11 w-full rounded-lg border border-[#2a2a2a] bg-[#121212] text-sm text-gray-200 flex items-center justify-center gap-2 hover:bg-[#222]"
        >
          <MapIcon size={15} /> Ver no mapa
          <span className="text-xs text-gray-500">{pin.location.lat.toFixed(4)}, {pin.location.lng.toFixed(4)}</span>
        </Link>
      )}
      <div className="flex gap-2 pt-1">
        <Button onClick={onApprove} disabled={isActing} className="h-11 flex-1 bg-green-600 hover:bg-green-700">
          {isActing ? <Loader2 size={16} className="animate-spin" /> : onReject ? <><Check size={16} className="mr-1" /> Aprovar</> : <><RotateCcw size={16} className="mr-1" /> Restaurar e aprovar</>}
        </Button>
        {onReject && (
          <Button
            variant="outline"
            onClick={onReject}
            disabled={isActing}
            className="h-11 flex-1 border-red-500/30 bg-transparent text-red-400 hover:bg-red-500/10"
          >
            <X size={14} className="mr-1" /> Rejeitar
          </Button>
        )}
      </div>
    </div>
  );
}

export function ModerationPage() {
  const { isModerator, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<ModerationTab>('pending');
  const [rejectPin, setRejectPin] = useState<Pin | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const { data: pending = [], isLoading: loadingPending, isError: errorPending, refetch: refetchPending } = useQuery({
    queryKey: ['moderation', 'pending'],
    queryFn: PinsController.fetchPendingModeration,
    enabled: isModerator,
    refetchInterval: 30_000,
  });

  const { data: rejected = [], isLoading: loadingRejected, isError: errorRejected, refetch: refetchRejected } = useQuery({
    queryKey: ['moderation', 'rejected'],
    queryFn: PinsController.fetchRejectedModeration,
    enabled: isModerator,
    refetchInterval: 60_000,
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#121212] flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  if (!isModerator) {
    return <Navigate to="/login" replace />;
  }

  const list = tab === 'pending' ? pending : rejected;
  const isLoading = tab === 'pending' ? loadingPending : loadingRejected;
  const isError = tab === 'pending' ? errorPending : errorRejected;

  // Optimistic: remove the card right away; put it back if the request fails.
  const removeFromLists = (id: string) => {
    const snapshot = {
      pending: queryClient.getQueryData<Pin[]>(['moderation', 'pending']),
      rejected: queryClient.getQueryData<Pin[]>(['moderation', 'rejected']),
    };
    queryClient.setQueryData<Pin[]>(['moderation', 'pending'], (l) => l?.filter((p) => p.id !== id));
    queryClient.setQueryData<Pin[]>(['moderation', 'rejected'], (l) => l?.filter((p) => p.id !== id));
    return () => {
      queryClient.setQueryData(['moderation', 'pending'], snapshot.pending);
      queryClient.setQueryData(['moderation', 'rejected'], snapshot.rejected);
    };
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['pins'] });
    queryClient.invalidateQueries({ queryKey: ['moderation'] });
    queryClient.invalidateQueries({ queryKey: ['pin-stats'] });
  };

  const handleApprove = async (pin: Pin) => {
    setActionId(pin.id);
    const rollback = removeFromLists(pin.id);
    try {
      await PinsController.approvePin(pin.id);
      toast({ title: 'Ocorrência aprovada', description: 'Publicada no mapa.' });
      invalidateAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast({ title: 'Já revisada', description: 'Outro moderador já tratou esta ocorrência.' });
        invalidateAll();
        return;
      }
      rollback();
      const message = err instanceof ApiError ? err.message : 'Erro ao aprovar.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectPin || !rejectReason.trim()) return;
    setActionId(rejectPin.id);
    const rollback = removeFromLists(rejectPin.id);
    try {
      await PinsController.rejectPin(rejectPin.id, { reason: rejectReason.trim() });
      toast({ title: 'Ocorrência rejeitada' });
      setRejectPin(null);
      setRejectReason('');
      invalidateAll();
    } catch (err) {
      rollback();
      const message = err instanceof ApiError ? err.message : 'Erro ao rejeitar.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#121212] text-white">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="w-11 h-11 -ml-2 rounded-full flex items-center justify-center text-gray-300 hover:bg-white/5"
            aria-label="Voltar"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Moderação</h1>
            <p className="text-sm text-gray-400">
              {pending.length} pendente(s) · {rejected.length} rejeitada(s)
            </p>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('pending')}
            className={cn(
              'flex-1 h-11 text-sm rounded-lg border transition-colors',
              tab === 'pending' ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' : 'border-[#2a2a2a] text-gray-400',
            )}
          >
            Pendentes ({pending.length})
          </button>
          <button
            onClick={() => setTab('rejected')}
            className={cn(
              'flex-1 h-11 text-sm rounded-lg border transition-colors',
              tab === 'rejected' ? 'border-red-500/50 bg-red-500/10 text-red-300' : 'border-[#2a2a2a] text-gray-400',
            )}
          >
            Rejeitados ({rejected.length})
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={28} />
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-6 text-center space-y-3">
            <p className="text-sm text-red-300">Não foi possível carregar a fila.</p>
            <Button onClick={() => (tab === 'pending' ? refetchPending() : refetchRejected())} variant="outline" className="h-11 border-[#2a2a2a] bg-transparent text-white">
              <RefreshCw size={15} className="mr-2" /> Tentar de novo
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center text-gray-400">
            {tab === 'pending' ? 'Nenhuma ocorrência aguardando revisão.' : 'Nenhuma ocorrência rejeitada.'}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((pin) => (
              <PinModerationCard
                key={pin.id}
                pin={pin}
                badge={tab === 'pending' ? 'Pendente' : 'Rejeitado'}
                badgeClass={tab === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}
                isActing={actionId === pin.id}
                onApprove={() => handleApprove(pin)}
                onReject={tab === 'pending' ? () => { setRejectPin(pin); setRejectReason(''); } : undefined}
                showRejectionReason={tab === 'rejected'}
                onPreview={setPreview}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!rejectPin} onOpenChange={(open) => !open && setRejectPin(null)}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Rejeitar ocorrência</DialogTitle>
            <DialogDescription className="text-gray-400">Informe o motivo da rejeição.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <div className="flex flex-wrap gap-2">
              {['Informação insuficiente', 'Duplicada', 'Fora da área atendida', 'Conteúdo impróprio', 'Não é um problema público'].map((r) => (
                <button key={r} type="button" onClick={() => setRejectReason(r)} className={cn('h-9 px-3 rounded-full border text-xs', rejectReason === r ? 'border-red-500 bg-red-500/20 text-white' : 'border-[#2a2a2a] text-gray-300')}>
                  {r}
                </button>
              ))}
            </div>
            <Label className="text-gray-300">Motivo (obrigatório)</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Descreva o motivo da rejeição..."
              maxLength={2000}
              className="min-h-[100px] bg-[#121212] border-[#2a2a2a] text-white text-[16px] sm:text-sm"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectPin(null)} className="border-[#2a2a2a] text-white">
              Cancelar
            </Button>
            <Button onClick={handleReject} disabled={!rejectReason.trim() || !!actionId} className="bg-red-600 hover:bg-red-700">
              {actionId === rejectPin?.id ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && (
        <div className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <button className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 text-white flex items-center justify-center" aria-label="Fechar">
            <X size={22} />
          </button>
          <img src={resolveImageUrl(preview)} alt="Foto da ocorrência" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
}

export default ModerationPage;
