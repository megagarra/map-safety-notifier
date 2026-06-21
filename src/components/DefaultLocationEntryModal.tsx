import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Pin, PinType, DefaultLocationEntryInput } from '@/types';
import { uploadImage } from '@/controllers/pins';
import { resolveImageUrl } from '@/lib/media';
import { ApiError } from '@/lib/errors';
import { Construction, AlertTriangle, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultLocationEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  markers: Pin[];
  initialMarkerId?: string | null;
  onSubmit: (markerId: string, data: DefaultLocationEntryInput) => Promise<void>;
}

const TYPE_OPTIONS: { value: PinType; label: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'infraestrutura', label: 'Infraestrutura', icon: <Construction size={18} />, activeClass: 'border-orange-500 bg-orange-500/10' },
  { value: 'crime', label: 'Crime', icon: <AlertTriangle size={18} />, activeClass: 'border-red-500 bg-red-500/10' },
];

export function DefaultLocationEntryModal({
  isOpen,
  onClose,
  markers,
  initialMarkerId,
  onSubmit,
}: DefaultLocationEntryModalProps) {
  const [markerId, setMarkerId] = useState('');
  const [type, setType] = useState<PinType>('crime');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const preferred = initialMarkerId && markers.some((m) => m.id === initialMarkerId)
      ? initialMarkerId
      : markers[0]?.id ?? '';
    setMarkerId(preferred);
    setType('crime');
    setDescription('');
    setQuantity(1);
    setComment('');
    setImages([]);
    setError(null);
  }, [isOpen, initialMarkerId, markers]);

  const reset = () => {
    setType('crime');
    setDescription('');
    setQuantity(1);
    setComment('');
    setImages([]);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadImage(file);
        setImages((prev) => [...prev, url]);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Erro ao enviar imagem.';
        setError(message);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!markerId) {
      setError('Selecione o bairro.');
      return;
    }
    if (!description.trim()) {
      setError('Informe a descrição da ocorrência.');
      return;
    }
    if (quantity < 1) {
      setError('Quantidade mínima: 1.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(markerId, {
        type,
        description: description.trim(),
        quantity,
        ...(images.length > 0 && { images }),
        ...(comment.trim() && { comment: comment.trim() }),
      });
      handleClose();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível registrar a ocorrência.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] max-h-[90vh] overflow-y-auto bg-[#121212] border-[#2a2a2a] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Registrar sem endereço</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-gray-300">Bairro</Label>
            {markers.length === 0 ? (
              <p className="text-xs text-yellow-400">Nenhum marcador configurado. Crie um marcador por bairro primeiro.</p>
            ) : (
              <select
                value={markerId}
                onChange={(e) => setMarkerId(e.target.value)}
                className="w-full h-9 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] text-white px-3 text-sm"
              >
                {markers.map((marker) => (
                  <option key={marker.id} value={marker.id}>
                    {marker.neighborhood ?? marker.description}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Tipo</Label>
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
            <Label htmlFor="entry-desc" className="text-gray-300">Descrição</Label>
            <Textarea
              id="entry-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva a ocorrência..."
              className="min-h-[100px] bg-[#1a1a1a] border-[#2a2a2a] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-quantity" className="text-gray-300">Quantidade</Label>
            <Input
              id="entry-quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-comment" className="text-gray-300">Detalhes extras (opcional)</Label>
            <Input
              id="entry-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ex: Jan/2025"
              className="bg-[#1a1a1a] border-[#2a2a2a] text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-gray-300">Fotos {images.length > 0 && `(${images.length})`}</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#2a2a2a]">
                  <img src={resolveImageUrl(img)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 flex flex-col items-center justify-center rounded-lg border border-dashed border-[#2a2a2a] cursor-pointer hover:bg-[#1a1a1a]">
                <ImageIcon size={16} className="text-gray-500" />
                <span className="text-[10px] text-gray-500 mt-1">Foto</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} className="border-[#2a2a2a] text-white">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || markers.length === 0} className="bg-violet-600 hover:bg-violet-700">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
