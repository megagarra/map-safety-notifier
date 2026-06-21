import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DefaultLocationEntry, PinType } from '@/types';
import * as PinsController from '@/controllers/pins';
import { getPinConfig } from '@/lib/pinConfig';
import { resolveImageUrl } from '@/lib/media';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { ApiError } from '@/lib/errors';
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultLocationEntriesPanelProps {
  markerId: string;
  isAdmin: boolean;
  onEntriesChanged?: () => void;
  onBulkRegister?: () => void;
}

export function DefaultLocationEntriesPanel({
  markerId,
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

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['default-location-entries', markerId],
    queryFn: () => PinsController.fetchDefaultLocationEntries(markerId),
    enabled: Boolean(markerId),
  });

  const entries = data?.items ?? [];
  const totalQuantity = data?.totalQuantity ?? entries.reduce((s, e) => s + (e.quantity ?? 1), 0);

  const sorted = [...entries].sort((a, b) => {
    const qtyDiff = (b.quantity ?? 1) - (a.quantity ?? 1);
    if (qtyDiff !== 0) return qtyDiff;
    return a.description.localeCompare(b.description, 'pt-BR');
  });

  const startEdit = (entry: DefaultLocationEntry) => {
    setEditingId(entry.id);
    setEditDesc(entry.description);
    setEditComment(entry.comment ?? '');
    setEditType(entry.type);
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
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium text-white">Ocorrências por tipo</h3>
          <p className="text-xs text-violet-300/80 mt-0.5">
            Total: <span className="font-semibold text-violet-200">{totalQuantity}</span>
            {entries.length > 0 && (
              <span className="text-gray-500"> · {entries.length} linha{entries.length === 1 ? '' : 's'}</span>
            )}
          </p>
        </div>
        {isAdmin && onBulkRegister && (
          <button
            onClick={onBulkRegister}
            className="text-[10px] text-violet-400 hover:text-violet-200 whitespace-nowrap"
          >
            + Lote
          </button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhuma ocorrência registrada.</p>
      ) : editingId ? (
        sorted.map((entry) => {
          if (entry.id !== editingId) return null;
          return (
            <div key={entry.id} className="p-3 rounded-lg bg-[#121212] border border-[#2a2a2a] space-y-2">
              <select
                value={editType}
                onChange={(e) => setEditType(e.target.value as PinType)}
                className="w-full h-8 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 text-xs"
              >
                <option value="crime">Crime</option>
                <option value="infraestrutura">Infraestrutura</option>
              </select>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="min-h-[60px] text-sm bg-[#1a1a1a] border-[#2a2a2a] text-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="number"
                  min={1}
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="h-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  placeholder="Quantidade"
                />
                <Input
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  placeholder="Detalhes extras"
                  className="h-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleSave(entry.id)} disabled={savingId === entry.id} className="flex-1 h-7 text-xs">
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
              {sorted.map((entry) => {
                const cfg = getPinConfig(entry.type);
                const qty = entry.quantity ?? 1;
                return (
                  <tr key={entry.id} className="border-b border-[#2a2a2a]/60 last:border-0 group">
                    <td className="py-2.5 px-3 align-top">
                      <span className={cn('text-[10px] font-medium uppercase tracking-wide', cfg.color)}>{cfg.label}</span>
                      <p className="text-sm text-gray-200 mt-0.5 leading-snug">{entry.description}</p>
                      {entry.comment && <p className="text-[10px] text-violet-300/70 mt-0.5">{entry.comment}</p>}
                      {entry.images.length > 0 && (
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {entry.images.map((img, i) => (
                            <img key={i} src={resolveImageUrl(img)} alt="" className="w-10 h-10 rounded object-cover border border-[#2a2a2a]" />
                          ))}
                        </div>
                      )}
                      {isAdmin && (
                        <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(entry)} className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1">
                            <Pencil size={10} /> Editar
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
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
            {entries.length > 1 && (
              <tfoot>
                <tr className="bg-[#1a1a1a] border-t border-[#2a2a2a]">
                  <td className="py-2 px-3 text-gray-400 font-medium">Total</td>
                  <td className="py-2 px-3 text-right text-white font-bold tabular-nums">{totalQuantity}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
