import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { HelpCircle, X, Hand, Download, Flame, Clock, Users, FilterX } from 'lucide-react';
import * as CrimeTypesController from '@/controllers/crimeTypes';
import { cn } from '@/lib/utils';
import type { PinType } from '@/types';

export type MapFilters = {
  types: PinType[];
  hideResolved: boolean;
  onlyPending: boolean;
  heat?: boolean;
  archived?: boolean;
  /** Only reports from the last 24 hours */
  recent?: boolean;
  /** Only reports neighbours confirmed ("Eu também vi" / still there) */
  confirmed?: boolean;
  /** Only these crime types (empty = all) */
  crimeTypeIds?: string[];
};

/** Number of active filters (heat is a view mode, archived a staff view: not counted). */
export function countActiveFilters(f: MapFilters): number {
  return f.types.length + (f.hideResolved ? 1 : 0) + (f.onlyPending ? 1 : 0) + (f.recent ? 1 : 0) + (f.confirmed ? 1 : 0) + (f.crimeTypeIds?.length ? 1 : 0);
}

export const NO_FILTERS: MapFilters = { types: [], hideResolved: false, onlyPending: false };

const FILTER_KEY = 'map-safety:filters';
const HINT_KEY = 'map-safety:hint-seen';

export function loadFilters(): MapFilters {
  try {
    const f = JSON.parse(localStorage.getItem(FILTER_KEY) || 'null');
    if (f && Array.isArray(f.types)) {
      return {
        types: f.types,
        hideResolved: !!f.hideResolved,
        onlyPending: !!f.onlyPending,
        heat: !!f.heat,
        recent: !!f.recent,
        confirmed: !!f.confirmed,
        crimeTypeIds: Array.isArray(f.crimeTypeIds) ? f.crimeTypeIds.filter((x: unknown) => typeof x === 'string') : [],
      };
    }
  } catch { /* ignore */ }
  return { types: [], hideResolved: false, onlyPending: false };
}

export function saveFilters(f: MapFilters) {
  try { localStorage.setItem(FILTER_KEY, JSON.stringify(f)); } catch { /* ignore */ }
}

function Chip({ active, onClick, children, tone }: { active: boolean; onClick: () => void; children: React.ReactNode; tone: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 h-10 px-3 rounded-full text-xs font-medium border shadow-lg backdrop-blur transition-colors flex items-center gap-1.5',
        active ? `${tone} text-white border-transparent` : 'bg-[#1a1a1a]/90 text-gray-300 border-white/10',
      )}
    >
      {children}
    </button>
  );
}

export function FilterChips({ value, onChange, staff }: { value: MapFilters; onChange: (f: MapFilters) => void; staff?: boolean }) {
  const toggleType = (t: PinType) =>
    onChange({ ...value, types: value.types.includes(t) ? value.types.filter((x) => x !== t) : [...value.types, t] });
  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 pr-6 [mask-image:linear-gradient(to_right,black_85%,transparent)]">
      {countActiveFilters(value) > 0 && (
        <button
          onClick={() => onChange({ ...NO_FILTERS, heat: value.heat, archived: value.archived })}
          className="sticky left-0 z-10 shrink-0 h-10 px-3 rounded-full text-xs font-semibold border border-white/20 bg-white text-[#1a1a1a] shadow-lg flex items-center gap-1.5"
          aria-label={`Limpar ${countActiveFilters(value)} filtro(s)`}
        >
          <FilterX size={13} /> Limpar ({countActiveFilters(value)})
        </button>
      )}
      <Chip active={!!value.heat} onClick={() => onChange({ ...value, heat: !value.heat })} tone="bg-gradient-to-r from-yellow-600 to-red-600">
        <Flame size={13} /> Calor
      </Chip>
      <Chip active={value.types.includes('crime')} onClick={() => toggleType('crime')} tone="bg-red-600">
        <span className="w-2 h-2 rounded-full bg-red-400" /> Crime
      </Chip>
      <Chip active={value.types.includes('infraestrutura')} onClick={() => toggleType('infraestrutura')} tone="bg-orange-600">
        <span className="w-2 h-2 rounded-full bg-orange-400" /> Infraestrutura
      </Chip>
      <Chip active={!!value.recent} onClick={() => onChange({ ...value, recent: !value.recent })} tone="bg-blue-600">
        <Clock size={13} /> Últimas 24h
      </Chip>
      <Chip active={!!value.confirmed} onClick={() => onChange({ ...value, confirmed: !value.confirmed })} tone="bg-violet-600">
        <Users size={13} /> Confirmados
      </Chip>
      <Chip active={value.onlyPending} onClick={() => onChange({ ...value, onlyPending: !value.onlyPending })} tone="bg-yellow-600">
        Aguardando
      </Chip>
      <Chip active={value.hideResolved} onClick={() => onChange({ ...value, hideResolved: !value.hideResolved })} tone="bg-emerald-700">
        Ocultar resolvidos
      </Chip>
      {staff && (
        <Chip active={!!value.archived} onClick={() => onChange({ ...value, archived: !value.archived })} tone="bg-slate-600">
          Arquivados
        </Chip>
      )}
    </div>
  );
}

/** Pick crime types to show (side menu / desktop panel). */
export function CrimeTypeFilter({ value, onChange }: { value: MapFilters; onChange: (f: MapFilters) => void }) {
  const { data: crimeTypes = [] } = useQuery({
    queryKey: ['crime-types'],
    queryFn: CrimeTypesController.fetchCrimeTypes,
    staleTime: 60 * 60 * 1000,
  });
  if (!crimeTypes.length) return null;
  const selected = value.crimeTypeIds ?? [];
  const toggle = (id: string) =>
    onChange({ ...value, crimeTypeIds: selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id] });
  return (
    <div className="rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 px-3 py-2.5 shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">Tipo de crime</p>
        {selected.length > 0 && (
          <button onClick={() => onChange({ ...value, crimeTypeIds: [] })} className="text-xs text-blue-400 hover:text-blue-300 min-h-8 px-1">
            Limpar
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {crimeTypes.map((t) => {
          const on = selected.includes(t.id);
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              aria-pressed={on}
              className={cn(
                'h-9 md:h-7 px-2.5 rounded-full text-xs border transition-colors',
                on ? 'bg-red-600 text-white border-transparent' : 'bg-[#121212] text-gray-300 border-white/10 hover:bg-white/5',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Shown when filters hide every report: explains why and clears them in one tap. */
export function NoResultsHint({ onClear }: { onClear: () => void }) {
  return (
    <div className="absolute top-[calc(8rem+env(safe-area-inset-top))] md:top-20 left-1/2 -translate-x-1/2 z-[395] w-max max-w-[calc(100vw-2rem)] flex items-center gap-2 rounded-full bg-[#1a1a1a]/95 border border-white/15 shadow-xl pl-4 pr-1.5 py-1.5 text-sm text-gray-200">
      Nenhuma ocorrência com esses filtros
      <button onClick={onClear} className="flex items-center gap-1 h-9 px-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold">
        <FilterX size={14} /> Limpar
      </button>
    </div>
  );
}

const LEGEND = [
  { dot: 'border-2 border-red-500 bg-[#1a1a1a]', label: 'Crime' },
  { dot: 'border-2 border-orange-500 bg-[#1a1a1a]', label: 'Infraestrutura' },
  { dot: 'border-2 border-dashed border-yellow-500 bg-[#1a1a1a]', label: 'Aguardando aprovação' },
  { dot: 'border-[3px] border-violet-400 bg-[#2d1f4e]', label: 'Estatísticas do bairro' },
  { dot: 'bg-red-500 border-2 border-white/80', label: 'Grupo de alertas (toque para ampliar)' },
  { dot: 'bg-blue-500 border-2 border-white', label: 'Você' },
];

export function LegendList() {
  return (
    <div className="space-y-2">
      {LEGEND.map((l) => (
        <div key={l.label} className="flex items-center gap-2 text-sm text-gray-200">
          <span className={cn('w-4 h-4 rounded-full shrink-0', l.dot)} />
          {l.label}
        </div>
      ))}
    </div>
  );
}

export function LegendButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-[44px] h-[44px] md:w-10 md:h-10 rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#2a2a2a] shadow-lg"
        title="Legenda"
        aria-label="Legenda do mapa"
        aria-expanded={open}
      >
        {open ? <X size={18} /> : <HelpCircle size={18} />}
      </button>
      {open && (
        <div className="absolute right-full mr-2 top-0 w-60 rounded-lg bg-[#1a1a1a] border border-white/15 shadow-2xl p-3 space-y-2">
          <p className="text-xs font-semibold text-white">Legenda</p>
          {LEGEND.map((l) => (
            <div key={l.label} className="flex items-center gap-2 text-xs text-gray-200">
              <span className={cn('w-4 h-4 rounded-full shrink-0', l.dot)} />
              {l.label}
            </div>
          ))}
          <p className="text-[11px] text-gray-400 pt-1 border-t border-white/10">
            Toque no mapa para reportar um problema naquele ponto.
          </p>
        </div>
      )}
    </div>
  );
}

export function useFirstVisitHint() {
  const [show, setShow] = useState(() => {
    try { return !localStorage.getItem(HINT_KEY); } catch { return false; }
  });
  const dismiss = () => {
    setShow(false);
    try { localStorage.setItem(HINT_KEY, '1'); } catch { /* ignore */ }
  };
  return { show, dismiss };
}

export function FirstVisitHint({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="absolute bottom-[calc(11.5rem+env(safe-area-inset-bottom))] left-4 right-[4.5rem] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 z-[450] rounded-xl bg-[#1f1f23] border border-white/15 shadow-2xl p-4 flex gap-3">
      <Hand size={22} className="text-blue-400 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Viu algum problema?</p>
        <p className="text-xs text-gray-300 mt-1">
          Toque no mapa no local exato, ou use <b>Reportar aqui</b> para usar sua localização. Pins amarelos já estão aguardando aprovação.
        </p>
      </div>
      <button onClick={onDismiss} className="w-11 h-11 -m-2 flex items-center justify-center text-gray-400 hover:text-white self-start" aria-label="Fechar dica">
        <X size={16} />
      </button>
    </div>
  );
}

// --- "Instalar app" (PWA) ---

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((l) => l());
  });
}

const VISITS_KEY = 'map-safety:visits';
let visitCount: number | null = null;
/** Counts one visit per page load (not per HomePage mount). */
function countVisitOnce(): number {
  if (visitCount !== null) return visitCount;
  try {
    visitCount = Number(localStorage.getItem(VISITS_KEY) || '0') + 1;
    localStorage.setItem(VISITS_KEY, String(visitCount));
  } catch { visitCount = 1; }
  return visitCount;
}
const INSTALL_DISMISSED_KEY = 'map-safety:install-dismissed';

export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(() => !!deferredPrompt);
  const [visits] = useState(countVisitOnce);
  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(INSTALL_DISMISSED_KEY); } catch { return false; }
  });
  useEffect(() => {
    const l = () => setCanInstall(!!deferredPrompt);
    installListeners.add(l);
    return () => { installListeners.delete(l); };
  }, []);
  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    deferredPrompt = null;
    setCanInstall(false);
  };
  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(INSTALL_DISMISSED_KEY, '1'); } catch { /* ignore */ }
  };
  return { canInstall, install, dismiss, showBanner: canInstall && !dismissed && visits >= 2 };
}

export function InstallBanner({ onInstall, onDismiss }: { onInstall: () => void; onDismiss: () => void }) {
  return (
    <div className="absolute bottom-[calc(11.5rem+env(safe-area-inset-bottom))] left-4 right-[4.5rem] md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-96 z-[450] rounded-xl bg-[#1f1f23] border border-white/15 shadow-2xl p-3 flex items-center gap-3">
      <Download size={20} className="text-blue-400 shrink-0" />
      <p className="flex-1 text-xs text-gray-200">Instale o app para abrir mais rápido e receber alertas.</p>
      <button onClick={onInstall} className="h-9 px-3 rounded-lg bg-blue-600 text-white text-xs font-semibold">Instalar</button>
      <button onClick={onDismiss} className="w-11 h-11 -mr-2 flex items-center justify-center text-gray-400" aria-label="Agora não"><X size={16} /></button>
    </div>
  );
}
