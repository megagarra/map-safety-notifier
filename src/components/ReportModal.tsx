import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PinType, CreatePinInput } from '@/types';
import { uploadImage } from '@/controllers/pins';
import {
  Image as ImageIcon,
  X,
  MapPin,
  Loader2,
  Construction,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt-BR`,
      { headers: { 'User-Agent': 'MapSafetyNotifier/1.0' } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    if (!addr) return data.display_name || null;

    const parts: string[] = [];
    if (addr.road) parts.push(addr.road);
    if (addr.house_number && parts.length) parts[0] = `${parts[0]}, ${addr.house_number}`;
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);

    return parts.length > 0 ? parts.join(' — ') : data.display_name || null;
  } catch {
    return null;
  }
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePinInput) => void;
  location: { lat: number; lng: number } | null;
}

const TYPE_OPTIONS: { value: PinType; label: string; desc: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'infraestrutura', label: 'Infraestrutura', desc: 'Problemas de estrutura urbana', icon: <Construction size={18} />, activeClass: 'border-orange-500 bg-orange-500/10' },
  { value: 'crime', label: 'Crime', desc: 'Ocorrências de segurança', icon: <AlertTriangle size={18} />, activeClass: 'border-red-500 bg-red-500/10' },
];

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit, location }) => {
  const [type, setType] = useState<PinType>('infraestrutura');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  useEffect(() => {
    if (!location) { setAddress(null); return; }
    setIsLoadingAddress(true);
    reverseGeocode(location.lat, location.lng).then((result) => {
      setAddress(result);
      setIsLoadingAddress(false);
    });
  }, [location?.lat, location?.lng]);

  const handleClose = () => {
    setType('infraestrutura');
    setDescription('');
    setImages([]);
    setPreviewImg(null);
    setAddress(null);
    setValidationError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!location) {
      setValidationError('É necessário definir uma localização. Clique no mapa para marcar o local.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Por favor, adicione uma descrição do problema.');
      return;
    }
    setIsSubmitting(true);
    setValidationError(null);

    const data: CreatePinInput = {
      type,
      location,
      description,
      images,
      ...(address && { address }),
    };

    try {
      onSubmit(data);
      handleClose();
    } catch {
      setValidationError('Ocorreu um erro ao enviar o relatório. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      try {
        const url = await uploadImage(file);
        setImages((prev) => [...prev, url]);
      } catch {
        setValidationError('Erro ao enviar imagem. Tente novamente.');
      }
    }
    e.target.value = '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="w-[95vw] sm:max-w-[480px] sm:w-full p-0 overflow-hidden rounded-2xl border-0 bg-[#121212] shadow-2xl">
        <DialogHeader className="p-4 sm:p-5 pb-3 sm:pb-4 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <DialogTitle className="text-lg font-semibold text-white">Reportar Problema</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            {!location ? (
              <span className="text-yellow-400">Clique no mapa para definir uma localização.</span>
            ) : isLoadingAddress ? (
              <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Buscando endereço...</span>
            ) : address ? (
              <span className="flex items-center gap-1.5"><MapPin size={13} /> {address}</span>
            ) : (
              <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 max-h-[70vh] sm:max-h-[60vh] overflow-y-auto custom-scrollbar">
          {validationError && (
            <div className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg text-red-400 text-sm">{validationError}</div>
          )}

          {/* Type selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">Tipo de problema</Label>
            <div className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                    type === opt.value ? opt.activeClass : 'border-[#2a2a2a] bg-[#1e1e1e] hover:border-[#444]',
                  )}
                >
                  <span className={cn('transition-colors', type === opt.value ? 'text-white' : 'text-gray-400')}>{opt.icon}</span>
                  <div>
                    <span className={cn('text-sm font-medium block', type === opt.value ? 'text-white' : 'text-gray-400')}>{opt.label}</span>
                    <span className="text-[11px] text-gray-500">{opt.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-white">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o problema ou situação..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px] resize-none bg-[#1e1e1e] border-[#2a2a2a] focus:border-white focus:ring-0 text-white placeholder-gray-500 rounded-xl text-[16px] sm:text-sm"
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">Fotos {images.length > 0 && `(${images.length})`}</Label>
            <div className="flex flex-col gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative flex gap-2 items-start">
                  <button
                    type="button"
                    onClick={() => setPreviewImg(img)}
                    className="flex-1 min-w-0 relative h-28 sm:h-32 rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#252525] hover:border-[#444] transition-colors cursor-pointer group"
                  >
                    <img
                      src={img}
                      alt={`Foto ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </button>
                  <button
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="shrink-0 p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/40 text-red-400 transition-colors"
                    title="Remover"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center h-24 sm:h-28 rounded-xl border border-[#2a2a2a] border-dashed cursor-pointer hover:bg-[#252525] bg-[#1e1e1e] transition-colors group">
                <div className="flex flex-col items-center text-gray-500 group-hover:text-gray-400 transition-colors">
                  <ImageIcon size={20} className="mb-2" />
                  <span className="text-xs font-medium">Adicionar foto</span>
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            {previewImg && (
              <div
                className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 p-4"
                onClick={() => setPreviewImg(null)}
              >
                <button
                  onClick={() => setPreviewImg(null)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                  aria-label="Fechar"
                >
                  <X size={24} />
                </button>
                <img
                  src={previewImg}
                  alt="Preview"
                  className="max-w-full max-h-[90vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-5 pt-3 border-t border-[#2a2a2a] flex justify-end gap-2 bg-[#1a1a1a]">
          <Button variant="outline" onClick={handleClose} className="border-[#2a2a2a] bg-[#252525] text-white hover:bg-[#333]">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !description || !location}
            className="bg-white text-black hover:bg-white/90 font-medium"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
