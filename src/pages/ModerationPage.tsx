import { useEffect, useRef, useState } from 'react';
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
import { resolveImageUrl, thumbUrl, fallbackToFull } from '@/lib/media';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ModerationTab = 'pending' | 'rejected' | 'resolved';

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
  onRejectDuplicate,
  showRejectionReason,
  onPreview,
  selected,
  focused,
  onToggleSelect,
}: {
  pin: Pin;
  badge: string;
  badgeClass: string;
  isActing: boolean;
  onApprove: () => void;
  onReject?: () => void;
  onRejectDuplicate?: () => void;
  showRejectionReason?: boolean;
  onPreview: (url: string) => void;
  selected?: boolean;
  focused?: boolean;
  onToggleSelect?: () => void;
}) {
  const cfg = getPinConfig(pin.type);
  return (
    <div
      data-pin-card={pin.id}
      className={cn(
        'rounded-xl border bg-[#1a1a1a] p-4 space-y-3 scroll-mt-24',
        focused ? 'border-blue-500 ring-1 ring-blue-500/50' : selected ? 'border-blue-500/60' : 'border-[#2a2a2a]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {onToggleSelect && (
            <label className="w-11 h-11 -m-3 flex items-center justify-center cursor-pointer">
              <input type="checkbox" checked={!!selected} onChange={onToggleSelect} className="w-5 h-5 accent-blue-500" aria-label="Selecionar ocorrência" />
            </label>
          )}
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
      <AbuseSignals pin={pin} />
      {!!pin.possibleDuplicates?.length && onReject && (
        <div className="rounded-lg border border-orange-500/40 bg-orange-500/10 p-2.5 space-y-2">
          <p className="text-xs text-orange-200">
            Possível duplicado: {pin.possibleDuplicates.map((d) => `${d.distanceM} m (${d.approvalStatus === 'approved' ? 'publicado' : 'pendente'})`).join(' · ')}
          </p>
          <div className="flex gap-2">
            <Link
              to={`/?pin=${pin.possibleDuplicates[0].id}`}
              className="h-9 px-3 rounded-lg border border-white/15 text-xs text-gray-200 flex items-center"
            >
              Ver o outro
            </Link>
            <button
              type="button"
              onClick={() => onRejectDuplicate?.()}
              className="h-9 px-3 rounded-lg bg-orange-600/80 text-xs text-white"
            >
              Rejeitar como duplicado
            </button>
          </div>
        </div>
      )}
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
              <img src={thumbUrl(img)} onError={fallbackToFull(img)} alt="" loading="lazy" className="w-full h-full object-cover" />
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

function CitizenResolvedCard({
  pin, isActing, onDecide, onPreview,
}: { pin: Pin; isActing: boolean; onDecide: (resolve: boolean) => void; onPreview: (url: string) => void }) {
  const cfg = getPinConfig(pin.type);
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-[#1a1a1a] p-4 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {getTypeIcon(pin.type)}
        <span className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
          {pin.resolvedReports ?? 0} dizem resolvido · {pin.stillThereCount ?? 0} ainda está
        </span>
      </div>
      <p className="text-sm text-gray-200">{pin.description}</p>
      {pin.address && <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={12} /> {pin.address}</p>}
      {pin.images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {pin.images.map((img, i) => (
            <button key={img} type="button" onClick={() => onPreview(img)} className="shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-[#2a2a2a]" aria-label={`Ver foto ${i + 1}`}>
              <img src={thumbUrl(img)} onError={fallbackToFull(img)} alt="" loading="lazy" className="w-full h-full object-cover" />
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
        </Link>
      )}
      <div className="flex gap-2">
        <Button onClick={() => onDecide(true)} disabled={isActing} className="h-11 flex-1 bg-emerald-600 hover:bg-emerald-700">
          {isActing ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} className="mr-1" /> Marcar resolvido</>}
        </Button>
        <Button onClick={() => onDecide(false)} disabled={isActing} variant="outline" className="h-11 flex-1 border-[#2a2a2a] bg-transparent text-gray-200">
          Manter aberto
        </Button>
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
  const [blockReporter, setBlockReporter] = useState(false);
  const [rejectOthers, setRejectOthers] = useState(false);
  useEffect(() => { setBlockReporter(false); setRejectOthers(false); }, [rejectPin]);
  const [acting, setActing] = useState<Set<string>>(new Set());
  const startAct = (id: string) => setActing((s) => new Set(s).add(id));
  const endAct = (id: string) => setActing((s) => { const n = new Set(s); n.delete(id); return n; });
  const [preview, setPreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [focusIdx, setFocusIdx] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const pendingRef = useRef<Pin[]>([]);
  const focusIdxRef = useRef(0);
  const approveRef = useRef<(p: Pin) => void>(() => {});
  const bulkApproveRef = useRef<() => void>(() => {});
  const toggleSelect = (id: string) =>
    setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
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

  const { data: citizenResolved = [], isLoading: loadingResolved, isError: errorResolved, refetch: refetchResolved } = useQuery({
    queryKey: ['moderation', 'citizen-resolved'],
    queryFn: PinsController.fetchCitizenResolved,
    enabled: isModerator,
    refetchInterval: 120_000,
  });

  // Keyboard: J/K move, A approve, R reject, X select, Shift+A approve selected, ? help.
  useEffect(() => {
    if (tab !== 'pending') return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, [role="dialog"]') || e.ctrlKey || e.metaKey || e.altKey) return;
      const items = pendingRef.current;
      if (!items.length) return;
      const idx = Math.min(focusIdxRef.current, items.length - 1);
      const pin = items[idx];
      const k = e.key.toLowerCase();
      if (k === 'j' || k === 'arrowdown') { e.preventDefault(); setFocusIdx(Math.min(items.length - 1, idx + 1)); }
      else if (k === 'k' || k === 'arrowup') { e.preventDefault(); setFocusIdx(Math.max(0, idx - 1)); }
      else if (k === 'x') { e.preventDefault(); toggleSelect(pin.id); }
      else if (k === 'a' && e.shiftKey) { e.preventDefault(); bulkApproveRef.current(); }
      else if (k === 'a') { e.preventDefault(); approveRef.current(pin); }
      else if (k === 'r') { e.preventDefault(); setRejectPin(pin); setRejectReason(''); }
      else if (e.key === '?') { e.preventDefault(); setShowHelp((v) => !v); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [tab]);

  const focusedId = pending[Math.min(focusIdx, pending.length - 1)]?.id;
  useEffect(() => {
    if (tab !== 'pending' || !focusedId) return;
    document.querySelector(`[data-pin-card="${focusedId}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedId, tab]);

  // Drop selections that left the queue (approved elsewhere, refetch, single actions).
  useEffect(() => {
    setSelected((s) => {
      if (!s.size) return s;
      const ids = new Set(pending.map((p) => p.id));
      const next = new Set([...s].filter((id) => ids.has(id)));
      return next.size === s.size ? s : next;
    });
  }, [pending]);

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

  const list = tab === 'pending' ? pending : tab === 'rejected' ? rejected : citizenResolved;
  const isLoading = tab === 'pending' ? loadingPending : tab === 'rejected' ? loadingRejected : loadingResolved;
  const isError = tab === 'pending' ? errorPending : tab === 'rejected' ? errorRejected : errorResolved;
  pendingRef.current = pending;
  focusIdxRef.current = focusIdx;

  // Optimistic: remove the card right away; put it back if the request fails.
  const removeFromLists = (id: string) => {
    // Stop in-flight refetches from undoing the optimistic removal.
    queryClient.cancelQueries({ queryKey: ['moderation'] });
    const card = [
      ...(queryClient.getQueryData<Pin[]>(['moderation', 'pending']) ?? []),
      ...(queryClient.getQueryData<Pin[]>(['moderation', 'rejected']) ?? []),
    ].find((p) => p.id === id);
    queryClient.setQueryData<Pin[]>(['moderation', 'pending'], (l) => l?.filter((p) => p.id !== id));
    queryClient.setQueryData<Pin[]>(['moderation', 'rejected'], (l) => l?.filter((p) => p.id !== id));
    // Roll back only this card, then resync from the server.
    return () => {
      if (card) {
        const key = card.approvalStatus === 'rejected' ? 'rejected' : 'pending';
        queryClient.setQueryData<Pin[]>(['moderation', key], (l) => (l && !l.some((p) => p.id === id) ? [card, ...l] : l));
      }
      queryClient.invalidateQueries({ queryKey: ['moderation'] });
    };
  };


  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['pins'] });
    queryClient.invalidateQueries({ queryKey: ['moderation'] });
    queryClient.invalidateQueries({ queryKey: ['pin-stats'] });
  };

  const handleApprove = async (pin: Pin) => {
    startAct(pin.id);
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
      endAct(pin.id);
    }
  };

  const handleBulkApprove = async () => {
    const ids = pending.filter((p) => selected.has(p.id)).map((p) => p.id);
    if (!ids.length || bulkBusy) return;
    setBulkBusy(true);
    await queryClient.cancelQueries({ queryKey: ['moderation'] });
    queryClient.setQueryData<Pin[]>(['moderation', 'pending'], (l) => l?.filter((p) => !selected.has(p.id)));
    try {
      const r = await PinsController.bulkModerate(ids, 'approve');
      toast({ title: `${r.processed} aprovada(s)`, description: r.skipped ? `${r.skipped} já tinham sido revisadas.` : 'Publicadas no mapa.' });
      setSelected(new Set());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao aprovar em lote.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setBulkBusy(false);
      invalidateAll();
    }
  };
  approveRef.current = (p: Pin) => { if (!acting.has(p.id)) handleApprove(p); };
  bulkApproveRef.current = handleBulkApprove;

  const handleCitizenResolved = async (pin: Pin, resolve: boolean) => {
    startAct(pin.id);
    queryClient.setQueryData<Pin[]>(['moderation', 'citizen-resolved'], (l) => l?.filter((p) => p.id !== pin.id));
    try {
      if (resolve) {
        await PinsController.updatePin(pin.id, { status: 'resolved', comment: `Confirmado como resolvido (${pin.resolvedReports ?? 0} cidadãos indicaram)` });
      } else {
        await PinsController.resetResolvedFeedback(pin.id);
      }
      toast({ title: resolve ? 'Marcado como resolvido' : 'Mantido em aberto' });
      invalidateAll();
    } catch (err) {
      queryClient.invalidateQueries({ queryKey: ['moderation', 'citizen-resolved'] });
      const message = err instanceof ApiError ? err.message : 'Erro ao atualizar.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      endAct(pin.id);
    }
  };

  const handleReject = async () => {
    if (!rejectPin || !rejectReason.trim()) return;
    const rejectingId = rejectPin.id;
    startAct(rejectingId);
    const rollback = removeFromLists(rejectPin.id);
    try {
      await PinsController.rejectPin(rejectPin.id, { reason: rejectReason.trim(), blockReporter, blockDays: 7, rejectOthers });
      toast({
        title: 'Ocorrência rejeitada',
        description: [blockReporter && 'Autor bloqueado por 7 dias.', rejectOthers && 'Os outros relatos pendentes dele também foram rejeitados.'].filter(Boolean).join(' ') || undefined,
      });
      setRejectPin(null);
      setRejectReason('');
      invalidateAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast({ title: 'Já revisada', description: 'Outro moderador já tratou esta ocorrência.' });
        setRejectPin(null);
        invalidateAll();
        return;
      }
      rollback();
      const message = err instanceof ApiError ? err.message : 'Erro ao rejeitar.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      endAct(rejectingId);
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
          <button
            onClick={() => setTab('resolved')}
            className={cn(
              'flex-1 h-11 text-sm rounded-lg border transition-colors',
              tab === 'resolved' ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' : 'border-[#2a2a2a] text-gray-400',
            )}
          >
            Resolvidos? ({citizenResolved.length})
          </button>
        </div>

        {tab === 'pending' && pending.length > 0 && (
          <div className="flex items-center gap-2 mb-3 text-xs text-gray-400">
            <button
              onClick={() => setSelected(selected.size === pending.length ? new Set() : new Set(pending.map((p) => p.id)))}
              className="h-9 px-3 rounded-lg border border-[#2a2a2a] text-gray-200"
            >
              {selected.size === pending.length ? 'Limpar seleção' : 'Selecionar todas'}
            </button>
            <button onClick={() => setShowHelp((v) => !v)} className="hidden md:inline h-9 px-3 rounded-lg border border-[#2a2a2a] text-gray-300" aria-expanded={showHelp}>
              Atalhos (?)
            </button>
          </div>
        )}
        {showHelp && (
          <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-100 grid grid-cols-2 gap-1">
            <span><b>J / K</b> próxima / anterior</span><span><b>A</b> aprovar</span>
            <span><b>R</b> rejeitar</span><span><b>X</b> selecionar</span>
            <span><b>Shift + A</b> aprovar selecionadas</span><span><b>?</b> mostrar/ocultar</span>
          </div>
        )}
                {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={28} />
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-red-900/50 bg-red-900/10 p-6 text-center space-y-3">
            <p className="text-sm text-red-300">Não foi possível carregar a fila.</p>
            <Button onClick={() => (tab === 'pending' ? refetchPending() : tab === 'rejected' ? refetchRejected() : refetchResolved())} variant="outline" className="h-11 border-[#2a2a2a] bg-transparent text-white">
              <RefreshCw size={15} className="mr-2" /> Tentar de novo
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-[#2a2a2a] bg-[#1a1a1a] p-8 text-center text-gray-400">
            {tab === 'pending' ? 'Nenhuma ocorrência aguardando revisão.' : tab === 'rejected' ? 'Nenhuma ocorrência rejeitada.' : 'Nenhuma ocorrência indicada como resolvida pelos cidadãos.'}
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((pin) => tab === 'resolved' ? (
              <CitizenResolvedCard
                key={pin.id}
                pin={pin}
                isActing={acting.has(pin.id)}
                onPreview={setPreview}
                onDecide={(resolve) => handleCitizenResolved(pin, resolve)}
              />
            ) : (
              <PinModerationCard
                key={pin.id}
                pin={pin}
                badge={tab === 'pending' ? 'Pendente' : 'Rejeitado'}
                badgeClass={tab === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}
                isActing={acting.has(pin.id)}
                onApprove={() => handleApprove(pin)}
                onReject={tab === 'pending' ? () => { setRejectPin(pin); setRejectReason(''); } : undefined}
                onRejectDuplicate={() => { setRejectPin(pin); setRejectReason('Duplicada'); }}
                selected={tab === 'pending' && selected.has(pin.id)}
                focused={tab === 'pending' && pending[Math.min(focusIdx, pending.length - 1)]?.id === pin.id}
                onToggleSelect={tab === 'pending' ? () => toggleSelect(pin.id) : undefined}
                showRejectionReason={tab === 'rejected'}
                onPreview={setPreview}
              />
            ))}
          </div>
        )}
      </div>

      {tab === 'pending' && selected.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#161618]/95 backdrop-blur border-t border-white/10">
          <div className="max-w-2xl mx-auto flex gap-2">
            <Button variant="outline" onClick={() => setSelected(new Set())} className="h-11 border-[#2a2a2a] bg-transparent text-gray-200">
              Cancelar
            </Button>
            <Button onClick={handleBulkApprove} disabled={bulkBusy} className="h-11 flex-1 bg-green-600 hover:bg-green-700">
              {bulkBusy ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} className="mr-1" /> Aprovar {selected.size} selecionada{selected.size === 1 ? '' : 's'}</>}
            </Button>
          </div>
        </div>
      )}

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
            {rejectPin?.reporterStats && (
              <div className="space-y-2 pt-1">
                <label className="flex items-start gap-2 text-sm text-gray-200 cursor-pointer">
                  <input type="checkbox" checked={blockReporter} onChange={(e) => setBlockReporter(e.target.checked)} className="mt-1 accent-red-600 w-4 h-4" />
                  <span>Bloquear o autor por 7 dias<span className="block text-xs text-gray-500">Para spam, propaganda, conteúdo impróprio ou relatos falsos de propósito.</span></span>
                </label>
                {(rejectPin.reporterStats.pending ?? 0) > 1 && (
                  <label className="flex items-start gap-2 text-sm text-gray-200 cursor-pointer">
                    <input type="checkbox" checked={rejectOthers} onChange={(e) => setRejectOthers(e.target.checked)} className="mt-1 accent-red-600 w-4 h-4" />
                    <span>Rejeitar também os outros {(rejectPin.reporterStats.pending ?? 1) - 1} relatos pendentes deste autor</span>
                  </label>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRejectPin(null)} className="border-[#2a2a2a] text-white">
              Cancelar
            </Button>
            <Button onClick={handleReject} disabled={!rejectReason.trim() || (!!rejectPin && acting.has(rejectPin.id))} className="bg-red-600 hover:bg-red-700">
              {rejectPin && acting.has(rejectPin.id) ? <Loader2 size={14} className="animate-spin" /> : 'Confirmar rejeição'}
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

const FLAG_LABELS: Record<string, string> = {
  falso: 'falso', ofensivo: 'ofensivo', propaganda: 'propaganda', duplicado: 'repetido', outro: 'outro',
};

/** Signals that help spot spam and fake reports: public reports, the sender's history, automatic notes. */
function AbuseSignals({ pin }: { pin: Pin }) {
  const flags = pin.flags ? Object.entries(pin.flags).filter(([, n]) => n) : [];
  const st = pin.reporterStats;
  const sentMany = st && (st.pending ?? 0) + (st.approved ?? 0) + (st.rejected ?? 0) > 1;
  if (!flags.length && !sentMany && !st?.blocked && !pin.moderationHints?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 text-[11px]">
      {flags.length > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
          Denunciado: {flags.map(([k, n]) => `${n}× ${FLAG_LABELS[k] ?? k}`).join(', ')}
        </span>
      )}
      {st?.blocked ? (
        <span className="px-2 py-0.5 rounded-full bg-red-600/20 text-red-200 border border-red-500/40">Autor bloqueado</span>
      ) : null}
      {sentMany && (
        <span
          className={cn(
            'px-2 py-0.5 rounded-full border',
            (st!.rejected ?? 0) > (st!.approved ?? 0) ? 'bg-orange-500/15 text-orange-200 border-orange-500/30' : 'bg-white/5 text-gray-300 border-white/10',
          )}
          title="Relatos enviados da mesma conexão de internet"
        >
          Mesmo autor: {st!.pending ?? 0} pendentes · {st!.approved ?? 0} aprovados · {st!.rejected ?? 0} rejeitados
        </span>
      )}
      {pin.moderationHints?.map((h) => (
        <span key={h} className="px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-200 border border-yellow-500/30">{h}</span>
      ))}
    </div>
  );
}
