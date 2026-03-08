import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageGalleryProps {
  images: string[];
  altPrefix?: string;
  /** Layout: 'grid' | 'separate' - separate mostra cada imagem em seu próprio card */
  layout?: 'grid' | 'separate';
  className?: string;
}

export function ImageGallery({ images, altPrefix = 'Foto', layout = 'separate', className }: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const openLightbox = useCallback((index: number) => setLightboxIndex(index), []);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : i === 0 ? images.length - 1 : i - 1));
  }, [images.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : i === images.length - 1 ? 0 : i + 1));
  }, [images.length]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightboxIndex, closeLightbox, goPrev, goNext]);

  if (!images?.length) return null;

  return (
    <>
      <div className={cn('space-y-3', className)}>
        <h4 className="text-sm font-medium text-white">Imagens ({images.length})</h4>
        {layout === 'separate' ? (
          <div className="flex flex-col gap-3">
            {images.map((src, index) => (
              <button
                key={index}
                type="button"
                onClick={() => openLightbox(index)}
                className="relative flex w-full h-48 sm:h-56 rounded-xl overflow-hidden bg-[#252525] border border-[#2a2a2a] hover:border-[#444] transition-all cursor-pointer group"
              >
                <img
                  src={src}
                  alt={`${altPrefix} ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4 z-10">
                  <span className="text-white text-xs font-medium px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full shadow-lg border border-white/10">
                    Ampliar foto
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {images.map((src, index) => (
              <button
                key={index}
                type="button"
                onClick={() => openLightbox(index)}
                className="relative aspect-square rounded-xl overflow-hidden bg-[#252525] border border-[#2a2a2a] hover:border-[#444] transition-all cursor-pointer group"
              >
                <img
                  src={src}
                  alt={`${altPrefix} ${index + 1}`}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
                aria-label="Anterior"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white z-10"
                aria-label="Próxima"
              >
                <ChevronRight size={32} />
              </button>
            </>
          )}

          <div
            className="max-w-[95vw] max-h-[95vh] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIndex]}
              alt={`${altPrefix} ${lightboxIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {lightboxIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
