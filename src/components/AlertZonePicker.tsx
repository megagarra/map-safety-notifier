import { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadAlertZone, saveAlertZone, type AlertZone } from '@/hooks/useNotifications';

const RADII = [500, 1000, 3000];

/** "Receber alertas": whole city or only near a point (GPS or map center). */
export function AlertZonePicker({ gps, mapCenter }: { gps: [number, number] | null; mapCenter: [number, number] }) {
  const [zone, setZone] = useState<AlertZone>(loadAlertZone);
  const [busy, setBusy] = useState(false);

  const apply = async (next: AlertZone) => {
    setBusy(true);
    if (await saveAlertZone(next)) setZone(next);
    setBusy(false);
  };

  const origin = gps ?? mapCenter;
  return (
    <div className="px-3 py-2.5 border-t border-white/10 space-y-2">
      <p className="flex items-center gap-1.5 text-xs text-gray-300 font-medium">
        <Bell size={13} /> Receber alertas {busy && <Loader2 size={12} className="animate-spin" />}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => apply(null)}
          className={cn('h-8 px-2.5 rounded-full text-xs border', !zone ? 'bg-blue-600 border-transparent text-white' : 'border-white/15 text-gray-300')}
        >
          Toda a cidade
        </button>
        {RADII.map((r) => (
          <button
            key={r}
            type="button"
            disabled={busy}
            onClick={() => apply({ lat: origin[0], lng: origin[1], radiusM: r })}
            className={cn('h-8 px-2.5 rounded-full text-xs border', zone?.radiusM === r ? 'bg-blue-600 border-transparent text-white' : 'border-white/15 text-gray-300')}
          >
            {r >= 1000 ? `${r / 1000} km` : `${r} m`}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-500 leading-snug">
        {zone
          ? 'Só alertas perto do ponto salvo. Toque num raio de novo para atualizar o ponto.'
          : `Escolha um raio para receber só alertas perto ${gps ? 'de você' : 'do centro do mapa'}.`}
      </p>
    </div>
  );
}
