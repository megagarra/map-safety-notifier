import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pin, PinType, BulkDefaultLocationEntryItem } from '@/types';
import { createEmptyBulkRow, parseBulkEntriesCsv } from '@/lib/bulkEntries';
import { getPinConfig } from '@/lib/pinConfig';
import { ApiError } from '@/lib/errors';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultLocationBulkEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: Pin[];
  initialMarkerId?: string | null;
  onSubmit: (markerId: string, entries: BulkDefaultLocationEntryItem[]) => Promise<void>;
}

type BulkTab = 'manual' | 'csv';

export function DefaultLocationBulkEntryModal({
  isOpen,
  onClose,
  markers,
  initialMarkerId,
  onSubmit,
}: DefaultLocationBulkEntryModalProps) {
  const [markerId, setMarkerId] = useState('');
  const [tab, setTab] = useState<BulkTab>('manual');
  const [rows, setRows] = useState<BulkDefaultLocationEntryItem[]>([createEmptyBulkRow()]);
  const [csvText, setCsvText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const preferred = initialMarkerId && markers.some((m) => m.id === initialMarkerId)
      ? initialMarkerId
      : markers[0]?.id ?? '';
    setMarkerId(preferred);
    setTab('manual');
    setRows([createEmptyBulkRow()]);
    setCsvText('');
    setError(null);
  }, [isOpen, initialMarkerId, markers]);

  const csvPreview = useMemo(() => parseBulkEntriesCsv(csvText), [csvText]);

  const manualEntries = useMemo(
    () => rows.filter((r) => r.description.trim() && r.quantity >= 1),
    [rows],
  );

  const previewEntries = tab === 'manual' ? manualEntries : csvPreview.entries;
  const previewTotal = previewEntries.reduce((sum, e) => sum + e.quantity, 0);

  const handleClose = () => onClose();

  const updateRow = (index: number, patch: Partial<BulkDefaultLocationEntryItem>) => {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleCsvFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    setTab('csv');
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!markerId) {
      setError('Selecione o bairro.');
      return;
    }

    let entries: BulkDefaultLocationEntryItem[] = [];
    if (tab === 'manual') {
      entries = manualEntries.map((r) => ({
        type: r.type,
        description: r.description.trim(),
        quantity: Math.max(1, r.quantity),
      }));
      if (entries.length === 0) {
        setError('Adicione ao menos uma linha com descrição e quantidade.');
        return;
      }
    } else {
      if (csvPreview.errors.length > 0) {
        setError(csvPreview.errors.slice(0, 3).join(' '));
        return;
      }
      if (csvPreview.entries.length === 0) {
        setError('Nenhuma linha válida no CSV.');
        return;
      }
      entries = csvPreview.entries;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(markerId, entries);
      handleClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível registrar as entradas.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[640px] max-h-[90vh] overflow-y-auto bg-[#121212] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Cadastro em lote</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-gray-300">Bairro</Label>
            <select
              value={markerId}
              onChange={(e) => setMarkerId(e.target.value)}
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

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab('manual')}
              className={cn(
                'flex-1 py-2 text-xs rounded-md border transition-colors',
                tab === 'manual' ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-[#2a2a2a] text-gray-400',
              )}
            >
              Linhas manuais
            </button>
            <button
              type="button"
              onClick={() => setTab('csv')}
              className={cn(
                'flex-1 py-2 text-xs rounded-md border transition-colors',
                tab === 'csv' ? 'border-violet-500 bg-violet-500/10 text-violet-300' : 'border-[#2a2a2a] text-gray-400',
              )}
            >
              Importar CSV
            </button>
          </div>

          {tab === 'manual' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-[80px_1fr_72px_32px] gap-2 text-[10px] uppercase tracking-wide text-gray-500 px-1">
                <span>Tipo</span>
                <span>Descrição</span>
                <span>Qtd</span>
                <span />
              </div>
              {rows.map((row, index) => (
                <div key={index} className="grid grid-cols-[80px_1fr_72px_32px] gap-2 items-center">
                  <select
                    value={row.type}
                    onChange={(e) => updateRow(index, { type: e.target.value as PinType })}
                    className="h-8 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white px-1 text-xs"
                  >
                    <option value="crime">Crime</option>
                    <option value="infraestrutura">Infra</option>
                  </select>
                  <Input
                    value={row.description}
                    onChange={(e) => updateRow(index, { description: e.target.value })}
                    placeholder="Ex: Furto (Art. 155)"
                    className="h-8 text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => updateRow(index, { quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
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
                onClick={() => setRows((prev) => [...prev, createEmptyBulkRow()])}
                className="w-full h-8 text-xs border-[#2a2a2a] text-gray-300"
              >
                <Plus size={14} className="mr-1" /> Adicionar linha
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs text-violet-300 cursor-pointer w-fit">
                <Upload size={14} />
                Selecionar arquivo CSV
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
              </label>
              <p className="text-[11px] text-gray-500">
                Formato: tipo, descrição, quantidade — separado por vírgula ou ponto-e-vírgula. Ex.: crime, Furto (Art. 155), 11
              </p>
              <Textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={'tipo,descrição,quantidade\ncrime,Lesão Corporal (Art. 129),17\ncrime,Furto (Art. 155),11'}
                className="min-h-[140px] font-mono text-xs bg-[#1a1a1a] border-[#2a2a2a] text-white"
              />
              {csvPreview.errors.length > 0 && (
                <div className="text-xs text-red-400 space-y-0.5">
                  {csvPreview.errors.slice(0, 5).map((msg) => <p key={msg}>{msg}</p>)}
                </div>
              )}
            </div>
          )}

          {previewEntries.length > 0 && (
            <div className="rounded-lg border border-[#2a2a2a] overflow-hidden">
              <div className="px-3 py-2 bg-[#1a1a1a] text-xs text-gray-400 border-b border-[#2a2a2a]">
                Prévia: {previewEntries.length} tipo{previewEntries.length === 1 ? '' : 's'} · total {previewTotal}
              </div>
              <div className="max-h-40 overflow-y-auto custom-scrollbar">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-[#2a2a2a]">
                      <th className="text-left py-2 px-3 font-medium">Tipo</th>
                      <th className="text-left py-2 px-3 font-medium">Descrição</th>
                      <th className="text-right py-2 px-3 font-medium w-16">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewEntries.map((entry, i) => {
                      const cfg = getPinConfig(entry.type);
                      return (
                        <tr key={i} className="border-b border-[#2a2a2a]/60 last:border-0">
                          <td className={cn('py-2 px-3', cfg.color)}>{cfg.label}</td>
                          <td className="py-2 px-3 text-gray-300">{entry.description}</td>
                          <td className="py-2 px-3 text-right text-white font-medium">{entry.quantity}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="border-[#2a2a2a] text-white">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || markers.length === 0}
            className="bg-violet-600 hover:bg-violet-700"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : `Registrar ${previewTotal > 0 ? previewTotal : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
