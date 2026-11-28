import { useMemo } from 'react';
import { X, List, WifiOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useSyncExternalStore } from 'react';
import type { Pin } from '@/types';
import { getPinConfig } from '@/lib/pinConfig';
import { isDefaultLocationPin, isPendingPin, hasValidPinLocation } from '@/lib/pins';
import { cn } from '@/lib/utils';

function distanceM(a: [number, number], b: [number, number]) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtDist(m: number) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`;
}

export function NearbyButton({ onClick, count }: { onClick: () => void; count: number }) {
  return (
    <button
      onClick={onClick}
      className="h-12 px-4 rounded-full bg-[#1a1a1a]/95 backdrop-blur border border-white/10 text-white text-sm font-medium shadow-xl flex items-center gap-2"
      aria-label="Lista de alertas próximos"
    >
      <List size={16} /> Lista
      {count > 0 && <span className="text-xs text-gray-400">{count}</span>}
    </button>
  );
}

export function NearbySheet({
  pins, origin, originIsUser, onSelect, onClose,
}: {
  pins: Pin[];
  origin: [number, number];
  originIsUser: boolean;
  onSelect: (pin: Pin) => void;
  onClose: () => void;
}) {
  const items = useMemo(
    () =>
      pins
        .filter((p) => hasValidPinLocation(p) && !isDefaultLocationPin(p))
        .map((p) => ({ pin: p, d: distanceM(origin, [p.location.lat, p.location.lng]) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 50),
    [pins, origin],
  );

  return (
    <div className="fixed inset-0 z-[1100] flex items-end md:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full md:max-w-md max-h-[75dvh] flex flex-col rounded-t-2xl md:rounded-2xl bg-[#161618] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Alertas próximos"
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-white/10">
          <div>
            <p className="text-white font-semibold">Alertas próximos</p>
            <p className="text-xs text-gray-400">
              {originIsUser ? 'Distância da sua localização' : 'Distância do centro do mapa'} · {items.length} na área
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 text-gray-300 flex items-center justify-center" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <ul className="overflow-y-auto overscroll-contain">
          {items.length === 0 && (
            <li className="px-4 py-8 text-center text-sm text-gray-400">Nenhum alerta nesta área. 🎉</li>
          )}
          {items.map(({ pin, d }) => {
            const cfg = getPinConfig(pin.type);
            const pending = isPendingPin(pin);
            return (
              <li key={pin.id}>
                <button
                  onClick={() => onSelect(pin)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 min-h-14 hover:bg-white/5 border-b border-white/5"
                >
                  <span
                    className={cn('w-9 h-9 rounded-full bg-[#1a1a1a] border-2 flex items-center justify-center shrink-0', cfg.color, pending ? 'border-dashed border-yellow-500' : cfg.border)}
                    dangerouslySetInnerHTML={{ __html: cfg.icon }}
                  />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{pin.crimeTypeLabel?.replace(/\s*\(Art\.[^)]*\)/, '') || cfg.label}</span>
                      {pending && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300">aguardando</span>}
                      {pin.status === 'resolved' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">resolvido</span>}
                    </span>
                    <span className="block text-xs text-gray-400 truncate">
                      {pin.address || pin.description || 'Sem endereço'}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-semibold text-white">{fmtDist(d)}</span>
                    <span className="block text-[11px] text-gray-500">
                      {formatDistanceToNow(new Date(pin.reportedAt), { locale: ptBR, addSuffix: false })}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// --- Online status ---

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
}

export function OfflineBanner() {
  return (
    <div className="absolute top-0 inset-x-0 z-[1500] flex justify-center pt-[max(0.5rem,env(safe-area-inset-top))] pointer-events-none">
      <div className="flex items-center gap-2 rounded-full bg-amber-500 text-[#1a1a1a] text-xs font-semibold px-3 py-1.5 shadow-lg">
        <WifiOff size={14} /> Sem conexão — mostrando dados salvos
      </div>
    </div>
  );
}
