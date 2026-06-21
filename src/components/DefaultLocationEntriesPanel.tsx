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
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultLocationEntriesPanelProps {
  markerId: string;
  isAdmin: boolean;
  onEntriesChanged?: () => void;
}

export function DefaultLocationEntriesPanel({ markerId, isAdmin, onEntriesChanged }: DefaultLocationEntriesPanelProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editType, setEditType] = useState<PinType>('crime');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: entries = [], isLoading, refetch } = useQuery({
    queryKey: ['default-location-entries', markerId],
    queryFn: () => PinsController.fetchDefaultLocationEntries(markerId),
    enabled: Boolean(markerId),
  });

  const sorted = [...entries].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const startEdit = (entry: DefaultLocationEntry) => {
    setEditingId(entry.id);
    setEditDesc(entry.description);
    setEditComment(entry.comment ?? '');
    setEditType(entry.type);
  };

  const handleSave = async (entryId: string) => {
    setSavingId(entryId);
    try {
      await PinsController.updateDefaultLocationEntry(markerId, entryId, {
        type: editType,
        description: editDesc.trim(),
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
      <h3 className="text-sm font-medium text-white">
        Ocorrências sem endereço ({entries.length})
      </h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-gray-500">Nenhuma ocorrência registrada.</p>
      ) : (
        sorted.map((entry) => {
          const cfg = getPinConfig(entry.type);
          const isEditing = editingId === entry.id;
          return (
            <div key={entry.id} className="p-3 rounded-lg bg-[#121212] border border-[#2a2a2a] space-y-2">
              {isEditing ? (
                <>
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
                  <Input
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    placeholder="Detalhes extras"
                    className="h-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSave(entry.id)} disabled={savingId === entry.id} className="flex-1 h-7 text-xs">
                      {savingId === entry.id ? <Loader2 size={12} className="animate-spin" /> : <><Check size={12} className="mr-1" /> Salvar</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="h-7 text-xs border-[#2a2a2a] text-white">
                      <X size={12} />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn('text-xs font-medium', cfg.color)}>{cfg.label}</span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-200">{entry.description}</p>
                  {entry.comment && <p className="text-xs text-violet-300/80">{entry.comment}</p>}
                  {entry.images.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {entry.images.map((img, i) => (
                        <img key={i} src={resolveImageUrl(img)} alt="" className="w-12 h-12 rounded object-cover border border-[#2a2a2a]" />
                      ))}
                    </div>
                  )}
                  {isAdmin && (
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => startEdit(entry)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                        <Pencil size={11} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        {deletingId === entry.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                        Remover
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
