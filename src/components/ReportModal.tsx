import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PinType, CreatePinInput } from '@/types';
import { uploadImage } from '@/controllers/pins';
import { resolveImageUrl } from '@/lib/media';
import { ApiError } from '@/lib/errors';
import {
  Image as ImageIcon,
  Camera,
  X,
  MapPin,
  Loader2,
  Construction,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { reverseGeocode } from '@/lib/geocode';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreatePinInput) => Promise<boolean>;
  location: { lat: number; lng: number } | null;
}

const MAX_DESC = 2000;
const MAX_PHOTOS = 6;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DRAFT_KEY = 'map-safety:report-draft';

type Draft = { type: PinType; description: string; images: string[] };

function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
    if (d && typeof d.description === 'string') return d;
  } catch { /* ignore */ }
  return null;
}

/** Downscale big phone photos before upload (faster on mobile data, avoids the 10 MB limit). */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, 1920 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

const TYPE_OPTIONS: { value: PinType; label: string; desc: string; icon: React.ReactNode; activeClass: string }[] = [
  { value: 'infraestrutura', label: 'Infraestrutura', desc: 'Buraco, iluminação, calçada…', icon: <Construction size={20} />, activeClass: 'border-orange-500 bg-orange-500/15' },
  { value: 'crime', label: 'Crime', desc: 'Assalto, furto, violência…', icon: <AlertTriangle size={20} />, activeClass: 'border-red-500 bg-red-500/15' },
];

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, onSubmit, location }) => {
  const [type, setType] = useState<PinType>(() => loadDraft()?.type ?? 'infraestrutura');
  const [description, setDescription] = useState(() => loadDraft()?.description ?? '');
  const [images, setImages] = useState<string[]>(() => loadDraft()?.images ?? []);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const submittingRef = useRef(false);
  const hasDraft = description.trim().length > 0 || images.length > 0;

  // Keep the draft on the device: closing by accident (backdrop/back button) never loses it.
  useEffect(() => {
    try {
      if (hasDraft) localStorage.setItem(DRAFT_KEY, JSON.stringify({ type, description, images }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch { /* ignore */ }
  }, [type, description, images, hasDraft]);

  useEffect(() => {
    if (!location) { setAddress(null); return; }
    let cancelled = false;
    setIsLoadingAddress(true);
    reverseGeocode(location.lat, location.lng).then((result) => {
      if (cancelled) return;
      setAddress(result);
      setIsLoadingAddress(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só lat/lng importam
  }, [location?.lat, location?.lng]);

  const resetForm = () => {
    setType('infraestrutura');
    setDescription('');
    setImages([]);
    setPreviewImg(null);
    setValidationError(null);
  };

  const handleClose = () => {
    setValidationError(null);
    onClose();
  };

  const handleDiscard = () => {
    if (hasDraft && !window.confirm('Descartar este relato? O texto e as fotos serão apagados.')) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!location) {
      setValidationError('É necessário definir uma localização. Toque no mapa para marcar o local.');
      return;
    }
    if (!description.trim()) {
      setValidationError('Descreva o que aconteceu.');
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setValidationError(null);

    const data: CreatePinInput = {
      type,
      location,
      description: description.trim(),
      images,
      ...(address && { address }),
    };

    try {
      const ok = await onSubmit(data);
      if (ok) {
        resetForm();
        onClose();
      } else setValidationError('Não foi possível enviar. Seu texto foi mantido — tente novamente.');
    } catch {
      setValidationError('Ocorreu um erro ao enviar. Seu texto foi mantido — tente novamente.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const room = MAX_PHOTOS - images.length - uploadingCount;
    const list = Array.from(files).slice(0, Math.max(0, room));
    e.target.value = '';
    if (files.length > list.length) setValidationError(`Máximo de ${MAX_PHOTOS} fotos por relato.`);
    if (!list.length) return;
    setUploadingCount((n) => n + list.length);
    await Promise.all(
      list.map(async (original) => {
        try {
          if (!original.type.startsWith('image/')) throw new Error('Arquivo não é uma imagem.');
          const file = await shrinkImage(original);
          if (file.size > MAX_UPLOAD_BYTES) throw new Error('Foto muito grande (máx. 10 MB).');
          const url = await uploadImage(file);
          setImages((prev) => [...prev, url]);
        } catch (err) {
          const message = err instanceof ApiError || err instanceof Error ? err.message : 'Erro ao enviar foto. Tente novamente.';
          setValidationError(message);
        } finally {
          setUploadingCount((n) => n - 1);
        }
      }),
    );
  };

  const canAddPhoto = images.length + uploadingCount < MAX_PHOTOS;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          'p-0 gap-0 overflow-hidden border-0 bg-[#121212] shadow-2xl flex flex-col',
          // Mobile: bottom sheet that fits above the keyboard
          'max-sm:top-auto max-sm:bottom-0 max-sm:translate-y-0 max-sm:w-full max-sm:max-w-full max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[92dvh]',
          'sm:max-w-[480px] sm:w-full sm:rounded-2xl sm:max-h-[85vh]',
        )}
      >
        <DialogHeader className="p-4 sm:p-5 pb-3 border-b border-[#2a2a2a] bg-[#1a1a1a] text-left shrink-0">
          <DialogTitle className="text-lg font-semibold text-white">Reportar problema</DialogTitle>
          <DialogDescription className="text-gray-400 text-sm">
            {!location ? (
              <span className="text-yellow-400">Toque no mapa para definir uma localização.</span>
            ) : isLoadingAddress ? (
              <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Buscando endereço...</span>
            ) : address ? (
              <span className="flex items-center gap-1.5"><MapPin size={13} className="shrink-0" /> {address}</span>
            ) : (
              <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-5 flex-1 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {validationError && (
            <div role="alert" className="bg-red-900/30 border border-red-700/60 p-3 rounded-lg text-red-300 text-sm">{validationError}</div>
          )}

          {/* Type selector */}
          <div className="space-y-2">
            <Label id="type-label" className="text-sm font-medium text-white">Tipo de problema</Label>
            <div role="radiogroup" aria-labelledby="type-label" className="grid grid-cols-2 gap-3">
              {TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={type === opt.value}
                  onClick={() => setType(opt.value)}
                  className={cn(
                    'flex items-center gap-3 p-3 min-h-16 rounded-xl border-2 transition-all text-left',
                    type === opt.value ? opt.activeClass : 'border-[#2a2a2a] bg-[#1e1e1e] hover:border-[#444]',
                  )}
                >
                  <span className={cn(type === opt.value ? 'text-white' : 'text-gray-400')}>{opt.icon}</span>
                  <span>
                    <span className={cn('text-sm font-semibold block', type === opt.value ? 'text-white' : 'text-gray-300')}>{opt.label}</span>
                    <span className="text-xs text-gray-400">{opt.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="description" className="text-sm font-medium text-white">O que aconteceu?</Label>
              <span className={cn('text-xs', description.length > MAX_DESC - 100 ? 'text-yellow-400' : 'text-gray-500')}>
                {description.length}/{MAX_DESC}
              </span>
            </div>
            <Textarea
              id="description"
              required
              maxLength={MAX_DESC}
              placeholder="Ex.: Poste apagado na esquina há 3 dias, rua muito escura à noite."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[110px] resize-none bg-[#1e1e1e] border-[#2a2a2a] focus:border-white focus:ring-0 text-white placeholder:text-gray-500 rounded-xl text-[16px] sm:text-sm"
            />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white">
              Fotos <span className="text-gray-500 font-normal">(opcional{images.length > 0 ? ` · ${images.length}/${MAX_PHOTOS}` : ''})</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {images.map((img, i) => (
                <div key={img} className="relative aspect-square">
                  <button
                    type="button"
                    onClick={() => setPreviewImg(img)}
                    className="w-full h-full rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#252525]"
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    <img src={resolveImageUrl(img)} alt={`Foto ${i + 1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((u) => u !== img))}
                    className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-black/80 border border-white/20 text-white flex items-center justify-center"
                    aria-label={`Remover foto ${i + 1}`}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              {Array.from({ length: uploadingCount }).map((_, i) => (
                <div key={`uploading-${i}`} className="aspect-square flex items-center justify-center rounded-xl border border-[#2a2a2a] bg-[#1e1e1e] text-gray-400">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              ))}
            </div>
            {canAddPhoto && (
              <div className="grid grid-cols-2 gap-2">
                <label className="h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#3a3a3a] bg-[#1e1e1e] text-sm text-gray-300 cursor-pointer hover:bg-[#252525] focus-within:ring-2 focus-within:ring-white/40">
                  <Camera size={18} /> Tirar foto
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={handleImageUpload} />
                </label>
                <label className="h-12 flex items-center justify-center gap-2 rounded-xl border border-dashed border-[#3a3a3a] bg-[#1e1e1e] text-sm text-gray-300 cursor-pointer hover:bg-[#252525] focus-within:ring-2 focus-within:ring-white/40">
                  <ImageIcon size={18} /> Galeria
                  <input type="file" accept="image/*" multiple className="sr-only" onChange={handleImageUpload} />
                </label>
              </div>
            )}
          </div>

          <p className="flex gap-2 text-xs text-gray-400 leading-relaxed">
            <Info size={14} className="shrink-0 mt-0.5" />
            O relato aparece no mapa na hora como "aguardando aprovação". Texto e fotos ficam visíveis para todos depois da revisão da moderação.
          </p>
        </div>

        <div className="p-3 sm:p-4 border-t border-[#2a2a2a] bg-[#1a1a1a] grid grid-cols-[auto_1fr] gap-2 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            onClick={handleDiscard}
            className="h-12 border-[#2a2a2a] bg-[#252525] text-white hover:bg-[#333]"
          >
            {hasDraft ? 'Descartar' : 'Cancelar'}
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || uploadingCount > 0 || !description.trim() || !location}
            className="h-12 bg-red-600 text-white hover:bg-red-500 font-semibold disabled:bg-[#333] disabled:text-gray-400"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : uploadingCount > 0 ? 'Enviando fotos…' : 'Enviar relato'}
          </Button>
        </div>

        {previewImg && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 p-4" onClick={() => setPreviewImg(null)}>
            <button
              type="button"
              onClick={() => setPreviewImg(null)}
              className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              aria-label="Fechar"
            >
              <X size={24} />
            </button>
            <img src={resolveImageUrl(previewImg)} alt="Foto ampliada" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ReportModal;
