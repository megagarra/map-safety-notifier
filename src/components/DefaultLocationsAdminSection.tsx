import { Pin } from '@/types';
import { Loader2, MapPin, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefaultLocationsAdminSectionProps {
  markers: Pin[];
  isLoading?: boolean;
  onFocus: (pin: Pin) => void;
  onEdit: (pin: Pin) => void;
  onDelete: (pin: Pin) => void;
  onCreateNew: () => void;
}

export function DefaultLocationsAdminSection({
  markers,
  isLoading,
  onFocus,
  onEdit,
  onDelete,
  onCreateNew,
}: DefaultLocationsAdminSectionProps) {
  return (
    <div className="border-t border-white/10">
      <div className="px-3 py-2 flex items-center justify-between">
        <span className="text-xs font-medium text-violet-300">Marcadores por bairro</span>
        <button
          onClick={onCreateNew}
          className="text-[10px] text-violet-400 hover:text-violet-200"
        >
          + Novo
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-3">
          <Loader2 size={14} className="animate-spin text-gray-400" />
        </div>
      ) : markers.length === 0 ? (
        <p className="px-3 pb-2 text-[11px] text-gray-500">Nenhum bairro configurado.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto custom-scrollbar">
          {markers.map((marker) => (
            <div
              key={marker.id}
              className="flex items-center gap-1 px-2 py-1.5 hover:bg-white/5 group"
            >
              <button
                onClick={() => onFocus(marker)}
                className="flex-1 flex items-center gap-2 text-left min-w-0"
              >
                <MapPin size={12} className="text-violet-400 shrink-0" />
                <span className="text-xs text-gray-300 truncate">{marker.neighborhood ?? marker.description}</span>
                {(marker.entryCount ?? 0) > 0 && (
                  <span className="text-[10px] text-violet-400 shrink-0">{marker.entryCount}</span>
                )}
              </button>
              <button
                onClick={() => onEdit(marker)}
                className="p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                title="Editar"
              >
                <Pencil size={11} />
              </button>
              <button
                onClick={() => onDelete(marker)}
                className={cn('p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity')}
                title="Excluir"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
