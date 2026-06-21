import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DefaultLocationEntry, Pin, PinType } from '@/types';
import * as PinsController from '@/controllers/pins';
import { getEntryLabel } from '@/lib/entryLabels';
import { resolveImageUrl } from '@/lib/media';
import { DefaultLocationEntryChart } from '@/components/DefaultLocationEntryChart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Pencil, Trash2, X, Check, CalendarDays } from 'lucide-react';

interface DefaultLocationEntriesPanelProps {
  markerId: string;
  marker?: Pin;
  isAdmin: boolean;
  onEntriesChanged?: () => void;
  onBulkRegister?: () => void;
}

export function DefaultLocationEntriesPanel({
  markerId,
  marker,
  isAdmin,
  onEntriesChanged,
  onBulkRegister,
}: DefaultLocationEntriesPanelProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editType, setEditType] = useState<PinType>('crime');
  const [editQuantity, setEditQuantity] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: markerDetail } = useQuery({
    queryKey: ['default-location', markerId],
    queryFn: () => PinsController.fetchDefaultLocationById(markerId),
    enabled: Boolean(markerId),
    staleTime: 60_000,
  });

  const header = markerDetail ?? marker;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['default-location-entries', markerId],
    queryFn: () => PinsController.fetchDefaultLocationEntries(markerId),
    enabled: Boolean(markerId),
  });

  const entries = data?.items ?? [];
  const totalQuantity = data?.totalQuantity ?? header?.entryCount ?? entries.reduce((s, e) => s + (e.quantity ?? 1), 0);

  const sorted = [...entries].sort((a, b) => b.quantity - a.quantity);

  const startEdit = (entry: DefaultLocationEntry) => {
    if (!entry.id) return;
    setEditingId(entry.id);
    setEditDesc(entry.description ?? getEntryLabel(entry));
    setEditComment(entry.comment ?? '');
    setEditType(entry.type ?? 'crime');
    setEditQuantity(entry.quantity ?? 1);
  };

  const handleSave = async (entryId: string) => {
    if (editQuantity < 1) {
      toast({ title: 'Quantidade inválida', description: 'Informe no mínimo 1.', variant: 'destructive' });
      return;
    }
    setSavingId(entryId);
    try {
      await PinsController.updateDefaultLocationEntry(markerId, entryId, {
        type: editType,
        description: editDesc.trim(),
        quantity: editQuantity,
        ...(editComment.trim() && { comment: editComment.trim() }),
      });
      toast({ title: 'Entrada atualizada' });
      setEditingId(null);
      refetch();
      onEntriesChanged?.();
      queryClient.invalidateQueries({ queryKey: ['pins'] });
      queryClient.invalidateQueries({ queryKey: ['default-locations'] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao salvar.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (entryId: string) => {
    setDeletingId(entryId);
    try {
      await PinsController.deleteDefaultLocationEntry(markerId, entryId);
      toast({ title: 'Entrada removida' });
      refetch();
      onEntriesChanged?.();
      queryClient.invalidateQueries({ queryKey: ['pins'] });
      queryClient.invalidateQueries({ queryKey: ['default-locations'] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Erro ao remover.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 size={20} className="animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {(header?.periodLabel || header?.asOfDate) && (
        <div className="p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20 space-y-1">
          {header.periodLabel && (
            <p className="text-xs text-violet-200 font-medium">{header.periodLabel}</p>
          )}
          {header.asOfDate && (
            <p className="text-[11px] text-gray-400 flex items-center gap-1">
              <CalendarDays size={11} />
              Referência: {format(new Date(header.asOfDate), 'dd/MM/yyyy', { locale: ptBR })}
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-white">Estatísticas por tipo</h3>
          <p className="text-xs text-violet-300/80 mt-0.5">
            Total: <span className="font-semibold text-violet-200">{totalQuantity}</span>
            {entries.length > 0 && (
              <span className="text-gray-500"> · {entries.length} tipo{entries.length === 1 ? '' : 's'}</span>
            )}
          </p>
        </div>
        {isAdmin && onBulkRegister && (
          <button onClick={onBulkRegister} className="text-[10px] text-violet-400 hover:text-violet-200 whitespace-nowrap">
            Substituir lote
          </button>
        )}
      </div>

      {sorted.length > 0 && (
        <DefaultLocationEntryChart entries={sorted} totalQuantity={totalQuantity} />
      )}

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhuma estatística registrada.</p>
      ) : editingId ? (
        sorted.map((entry) => {
          if (entry.id !== editingId) return null;
          return (
            <div key={entry.id} className="p-3 rounded-lg bg-[#121212] border border-[#2a2a2a] space-y-2">
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="min-h-[60px] text-sm bg-[#1a1a1a] border-[#2a2a2a] text-white"
              />
              <Input
                type="number"
                min={1}
                value={editQuantity}
                onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="h-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave(entry.id!)} disabled={savingId === entry.id} className="flex-1 h-7 text-xs">
                  {savingId === entry.id ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} className="mr-1" /> Salvar</>}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 text-xs border-[#2a2a2a] text-white">
                  <X size={12} />
                </Button>
              </div>
            </div>
          );
        })
      ) : (
        <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#1a1a1a] text-gray-500 border-b border-[#2a2a2a]">
                <th className="text-left py-2 px-3 font-medium">Tipo</th>
                <th className="text-right py-2 px-3 font-medium w-16">Qtd</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry, index) => {
                const qty = entry.quantity ?? 1;
                const images = entry.images ?? [];
                return (
                  <tr key={entry.id ?? `entry-${index}`} className="border-b border-[#2a2a2a]/60 last:border-0 group">
                    <td className="py-2.5 px-3 align-top">
                      <p className="text-sm text-gray-200 leading-snug">{getEntryLabel(entry)}</p>
                      {entry.comment && <p className="text-[10px] text-violet-300/70 mt-0.5">{entry.comment}</p>}
                      {images.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {images.map((img, i) => (
                            <img key={i} src={resolveImageUrl(img)} alt="" className="w-10 h-10 rounded object-cover border border-[#2a2a2a]" />
                          ))}
                        </div>
                      )}
                      {isAdmin && entry.id && (
                        <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(entry)} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1">
                            <Pencil size={10} /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id!)}
                            disabled={deletingId === entry.id}
                            className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1"
                          >
                            {deletingId === entry.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                            Remover
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right align-top">
                      <span className="inline-flex min-w-[28px] justify-center px-1.5 py-0.5 rounded-md bg-violet-500/15 text-violet-200 font-semibold tabular-nums">
                        {qty}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
