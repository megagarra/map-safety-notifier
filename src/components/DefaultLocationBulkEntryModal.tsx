import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Pin, BulkDefaultLocationEntryItem } from '@/types';
import * as CrimeTypesController from '@/controllers/crimeTypes';
import { getEntryLabel } from '@/lib/entryLabels';
import { ApiError } from '@/lib/errors';
import { Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';

interface BulkRow {
  crimeTypeId: string;
  quantity: number;
}

interface DefaultLocationBulkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: Pin[];
  initialMarkerId?: string | null;
  onReplace: (markerId: string, entries: BulkDefaultLocationEntryItem[]) => Promise<void>;
}

function createEmptyRow(): BulkRow {
  return { crimeTypeId: '', quantity: 1 };
}

export function DefaultLocationBulkEntryModal({
  isOpen,
  onClose,
  markers,
  initialMarkerId,
  onReplace,
}: DefaultLocationBulkEntryModalProps) {
  const [markerId, setMarkerId] = useState('');
  const [rows, setRows] = useState<BulkRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const { data: crimeTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['crime-types'],
    queryFn: CrimeTypesController.fetchCrimeTypes,
    enabled: isOpen,
    staleTime: 300_000,
  });

  useEffect(() => {
    if (!isOpen) return;
    const preferred = initialMarkerId && markers.some((m) => m.id === initialMarkerId)
      ? initialMarkerId
      : markers[0]?.id ?? '';
    setMarkerId(preferred);
    setRows([{ crimeTypeId: crimeTypes[0]?.id ?? '', quantity: 1 }]);
    setError(null);
    setConfirmReplace(false);
  }, [isOpen, initialMarkerId, markers, crimeTypes]);

  const entries = useMemo((): BulkDefaultLocationEntryItem[] => {
    return rows
      .filter((r) => r.crimeTypeId && r.quantity >= 1)
      .map((r) => ({
        type: 'crime' as const,
        crimeTypeId: r.crimeTypeId,
        quantity: r.quantity,
      }));
  }, [rows]);

  const previewTotal = entries.reduce((sum, e) => sum + e.quantity, 0);

  const getLabel = (crimeTypeId: string) =>
    crimeTypes.find((t) => t.id === crimeTypeId)?.label ?? crimeTypeId;

  const handleSubmit = async () => {
    if (!markerId) {
      setError('Selecione o bairro.');
      return;
    }
    if (entries.length === 0) {
      setError('Adicione ao menos um tipo com quantidade.');
      return;
    }
    if (!confirmReplace) {
      setConfirmReplace(true);
      setError(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onReplace(markerId, entries);
      onClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível substituir as estatísticas.';
      setError(message);
      setConfirmReplace(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-[#121212] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Substituir estatísticas do bairro</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            PUT substitui todas as linhas existentes. Lista vazia limpa o bairro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-gray-300">Bairro</Label>
            <select
              value={markerId}
              onChange={(e) => { setMarkerId(e.target.value); setConfirmReplace(false); }}
              disabled={markers.length === 0}
              className="w-full h-9 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 text-sm"
            >
              {markers.map((marker) => (
                <option key={marker.id} value={marker.id}>
                  {marker.neighborhood ?? marker.description}
                </option>
              ))}
            </select>
          </div>

          {loadingTypes ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-gray-400" />
            </div>
          ) : crimeTypes.length === 0 ? (
            <p className="text-xs text-yellow-400">Catálogo de tipos indisponível (GET /api/crime-types).</p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_72px_32px] gap-2 text-[10px] uppercase tracking-wide text-gray-500 px-1">
                <span>Tipo de crime</span>
                <span>Qtd</span>
                <span />
              </div>
              {rows.map((row, index) => (
                <div key={index} className="grid grid-cols-[1fr_72px_32px] gap-2 items-center">
                  <select
                    value={row.crimeTypeId}
                    onChange={(e) => {
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, crimeTypeId: e.target.value } : r)));
                      setConfirmReplace(false);
                    }}
                    className="h-8 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white px-2 text-xs"
                  >
                    <option value="">Selecione...</option>
                    {crimeTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => {
                      setRows((prev) => prev.map((r, i) => (i === index ? { ...r, quantity: Math.max(1, parseInt(e.target.value, 10) || 1) } : r)));
                      setConfirmReplace(false);
                    }}
                    className="h-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                    disabled={rows.length === 1}
                    className="h-8 flex items-center justify-center text-gray-500 hover:text-red-400 disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRows((prev) => [...prev, { crimeTypeId: crimeTypes[0]?.id ?? '', quantity: 1 }])}
                className="w-full h-8 text-xs border-[#2a2a2a] text-gray-300"
              >
                <Plus size={14} className="mr-1" /> Adicionar linha
              </Button>
            </div>
          )}

          {entries.length > 0 && (
            <div className="rounded-lg border border-[#2a2a2a] p-3 space-y-1">
              <p className="text-xs text-gray-400">Prévia · total {previewTotal}</p>
              {entries.map((e, i) => (
                <p key={i} className="text-xs text-gray-300 truncate">
                  {getLabel(e.crimeTypeId!)} — {e.quantity}
                </p>
              ))}
            </div>
          )}

          {confirmReplace && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>Isso apaga todas as linhas atuais deste bairro e grava apenas as acima. Confirme novamente para enviar.</span>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-[#2a2a2a] text-white">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || markers.length === 0 || crimeTypes.length === 0}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : confirmReplace ? `Substituir (${previewTotal})` : 'Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
