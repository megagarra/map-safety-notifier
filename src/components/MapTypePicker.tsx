import { Moon, Sun, Satellite, Map as MapIcon, MessageSquareWarning } from 'lucide-react';
import { setMapTheme, useMapTheme, osmNoteUrl, type MapTheme } from '@/lib/mapTheme';
import { cn } from '@/lib/utils';

const OPTIONS: { key: MapTheme; label: string; hint: string; Icon: typeof Sun }[] = [
  { key: 'light', label: 'Claro', hint: 'OpenStreetMap', Icon: Sun },
  { key: 'dark', label: 'Escuro', hint: 'OpenStreetMap', Icon: Moon },
  { key: 'satellite', label: 'Satélite', hint: 'Foto + nomes', Icon: Satellite },
  { key: 'esri', label: 'Ruas Esri', hint: 'Outra fonte', Icon: MapIcon },
];

export const MAP_THEME_LABELS: Record<MapTheme, string> = { light: 'Claro', dark: 'Escuro', satellite: 'Satélite', esri: 'Ruas Esri' };

/** 2x2 choice of map background + a way to report a wrong street at the current spot. */
export function MapTypePicker({ center, compact }: { center?: { lat: number; lng: number } | (() => { lat: number; lng: number } | null); compact?: boolean }) {
  const theme = useMapTheme();
  const where = () => (typeof center === 'function' ? center() : center) ?? null;
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label="Tipo de mapa">
        {OPTIONS.map(({ key, label, hint, Icon }) => (
          <button
            key={key}
            role="radio"
            aria-checked={theme === key}
            onClick={() => setMapTheme(key)}
            className={cn(
              'flex items-center gap-2 rounded-lg border px-2.5 text-left transition-colors',
              compact ? 'h-11' : 'h-12',
              theme === key ? 'border-sky-500 bg-sky-500/15 text-white' : 'border-white/10 bg-[#121212] text-gray-300 hover:bg-white/5',
            )}
          >
            <Icon size={16} className="shrink-0" />
            <span className="min-w-0">
              <span className="block text-sm leading-tight">{label}</span>
              <span className="block text-[10px] text-gray-500 leading-tight">{hint}</span>
            </span>
          </button>
        ))}
      </div>
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          const c = where();
          if (c) window.open(osmNoteUrl(c.lat, c.lng), '_blank', 'noopener,noreferrer');
        }}
        className="flex items-start gap-2 rounded-lg px-1 py-1.5 text-xs text-gray-400 hover:text-white"
      >
        <MessageSquareWarning size={14} className="shrink-0 mt-0.5" />
        <span>Rua errada ou faltando? <span className="text-sky-400 underline">Avise o OpenStreetMap</span> neste ponto: voluntários corrigem e o app atualiza sozinho.</span>
      </a>
    </div>
  );
}
