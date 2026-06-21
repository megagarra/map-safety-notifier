import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Pin, PinType, CreateDefaultLocationInput, UpdateDefaultLocationInput } from '@/types';
import { Construction, AlertTriangle, Loader2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultLocationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lng: number } | null;
  marker?: Pin | null;
  onCreate: (data: CreateDefaultLocationInput) => Promise<void>;
  onUpdate?: (id: string, data: UpdateDefaultLocationInput) => Promise<void>;
}

const TYPE_OPTIONS: { value: PinType; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'infraestrutura', label: 'Infraestrutura', icon: <Construction size={18} />, activeClass: 'border-orange-500 bg-orange-500/10' },
  { value: 'crime', label: 'Crime', icon: <AlertTriangle size={18} />, activeClass: 'border-red-500 bg-red-500/10' },
];

export function DefaultLocationSetupModal({
  isOpen,
  onClose,
  location,
  marker,
  onCreate,
  onUpdate,
}: DefaultLocationSetupModalProps) {
  const isEdit = Boolean(marker);
  const [neighborhood, setNeighborhood] = useState('');
  const [type, setType] = useState<PinType>('crime');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNeighborhood(marker?.neighborhood ?? '');
    setType(marker?.type ?? 'crime');
    setDescription(marker?.description ?? '');
    setAddress(marker?.address ?? '');
    setError(null);
  }, [isOpen, marker]);

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!neighborhood.trim()) {
      setError('Informe o nome do bairro.');
      return;
    }
    if (!description.trim()) {
      setError('Informe a descrição do marcador.');
      return;
    }
    if (!isEdit && !location) {
      setError('Selecione um ponto no mapa.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (isEdit && marker && onUpdate) {
        await onUpdate(marker.id, {
          neighborhood: neighborhood.trim(),
          type,
          description: description.trim(),
          ...(address.trim() ? { address: address.trim() } : { address: null }),
        });
      } else if (location) {
        await onCreate({
          neighborhood: neighborhood.trim(),
          type,
          location,
          description: description.trim(),
          ...(address.trim() && { address: address.trim() }),
        });
      }
      handleClose();
    } catch {
      setError(isEdit ? 'Não foi possível atualizar o marcador.' : 'Não foi possível criar o marcador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] bg-[#121212] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEdit ? 'Editar marcador por bairro' : 'Novo marcador por bairro'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!isEdit && location && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin size={14} className="text-violet-400" />
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="dl-neighborhood" className="text-gray-300">Bairro</Label>
            <Input
              id="dl-neighborhood"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="Ex: Centro"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Tipo principal</Label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'flex items-center gap-2 p-3 rounded-lg border text-sm transition-colors',
                    type === opt.value ? opt.activeClass : 'border-[#2a2a2a] bg-[#1a1a1a] text-gray-400',
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dl-desc" className="text-gray-300">Descrição do marcador</Label>
            <Textarea
              id="dl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Ocorrências sem endereço — Centro"
              className="min-h-[80px] bg-[#1a1a1a] border-[#2a2a2a] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dl-addr" className="text-gray-300">Endereço / referência (opcional)</Label>
            <Input
              id="dl-addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Praça central"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="border-[#2a2a2a] text-white">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || (!isEdit && !location)} className="bg-violet-600 hover:bg-violet-700">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : isEdit ? 'Salvar alterações' : 'Criar marcador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
