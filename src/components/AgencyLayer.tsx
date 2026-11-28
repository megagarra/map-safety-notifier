import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { Circle, Marker, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BadgeCheck, Building2, Clock, Route, X } from 'lucide-react';
import { fetchCityScores } from '@/controllers/agencies';
import { AGENCY_KIND_LABELS } from '@/components/OfficialResponse';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { cn } from '@/lib/utils';
import type { CityScore, PinType, ReportCounts } from '@/types';

type Tone = 'green' | 'amber' | 'red' | 'slate';

/** Green resolves most, amber some, red few; slate when there is nothing to judge yet. */
function toneOf(c: ReportCounts): Tone {
  if (!c.total) return 'slate';
  const r = c.resolved / c.total;
  return r >= 0.6 ? 'green' : r >= 0.3 ? 'amber' : 'red';
}

const TONES: Record<Tone, { roof: string; left: string; right: string; ring: string }> = {
  green: { roof: '#86efac', left: '#15803d', right: '#22c55e', ring: '#22c55e' },
  amber: { roof: '#fde68a', left: '#b45309', right: '#f59e0b', ring: '#f59e0b' },
  red: { roof: '#fca5a5', left: '#b91c1c', right: '#ef4444', ring: '#ef4444' },
  slate: { roof: '#cbd5e1', left: '#475569', right: '#64748b', ring: '#94a3b8' },
};

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** City hall-style isometric building (pure SVG): two wings, columns, flag, colored by the city's score. */
function buildingSvg(c: CityScore) {
  const tone = toneOf(c.stats);
  const t = TONES[tone];
  const pct = c.stats.total ? `${Math.round(c.resolvedRate * 100)}%` : '—';
  const win = (x: number, y: number, k: number) => `<path d="M${x} ${y} l3.6 ${k} v4.6 l-3.6 ${-k} z" fill="#fff" fill-opacity=".6"/>`;
  return `
<div class="agency-building">
  <svg viewBox="0 0 64 70" width="64" height="70" aria-hidden="true">
    <ellipse cx="32" cy="63" rx="25" ry="5.5" fill="#000" fill-opacity=".35"/>
    <path d="M6 28 L32 42 L32 62 L6 48 Z" fill="${t.left}"/>
    <path d="M32 42 L58 28 L58 48 L32 62 Z" fill="${t.right}"/>
    <path d="M6 28 L32 14 L58 28 L32 42 Z" fill="${t.roof}" stroke="#fff" stroke-opacity=".55" stroke-width=".8"/>
    ${win(9, 34, 2)}${win(15, 37.2, 2)}${win(21, 40.4, 2)}${win(9, 42, 2)}${win(15, 45.2, 2)}${win(21, 48.4, 2)}
    ${win(36, 40.4, -2)}${win(42, 37.2, -2)}${win(48, 34, -2)}${win(36, 48.4, -2)}${win(42, 45.2, -2)}${win(48, 42, -2)}
    <path d="M22 24 L32 18.6 L42 24 L32 29.4 Z" fill="#fff" fill-opacity=".9"/>
    <path d="M24.5 24 L32 20 L39.5 24 L32 28 Z" fill="${t.left}"/>
    <line x1="32" y1="24" x2="32" y2="3" stroke="#e5e7eb" stroke-width="1.3"/>
    <path d="M32 3 L43 5.8 L32 8.6 Z" fill="#fff"/>
  </svg>
  <span class="agency-badge agency-badge-${tone}">${pct}</span>
  <span class="agency-kind">${escapeHtml(c.city)}</span>
</div>`;
}

export function useCityScores() {
  return useQuery({ queryKey: ['agencies'], queryFn: fetchCityScores, staleTime: 60_000, refetchInterval: 5 * 60_000 });
}

/** One building per city; the selected city shows its covered area. */
export function AgencyLayer({ selected, onSelect }: { selected: CityScore | null; onSelect: (c: CityScore) => void }) {
  const { data: cities = [] } = useCityScores();
  const icons = useMemo(
    () =>
      new Map(
        cities.map((c) => [
          c.city,
          L.divIcon({ className: 'agency-marker', html: buildingSvg(c), iconSize: [64, 70], iconAnchor: [32, 63] }),
        ]),
      ),
    [cities],
  );
  return (
    <>
      {selected && (
        <Circle
          center={[selected.lat, selected.lng]}
          radius={selected.radiusKm * 1000}
          interactive={false}
          pathOptions={{ color: '#34d399', weight: 1.5, dashArray: '6 6', fillColor: '#34d399', fillOpacity: 0.06 }}
        />
      )}
      {cities.map((c) => (
        <Marker
          key={c.city}
          position={[c.lat, c.lng]}
          icon={icons.get(c.city)!}
          zIndexOffset={500}
          title={`${c.city}: ${c.stats.resolved} de ${c.stats.total} ocorrências resolvidas`}
          eventHandlers={{ click: () => onSelect(c) }}
        />
      ))}
    </>
  );
}

/** Fits the map to a city's covered area. */
export function FitAgencyArea({ city, nonce }: { city: CityScore | null; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (!city || !nonce) return;
    map.flyToBounds(L.latLng(city.lat, city.lng).toBounds(city.radiusKm * 2000), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

function Ring({ value, tone }: { value: number; tone: Tone }) {
  const r = 34;
  const len = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 80 80" className="w-24 h-24 shrink-0" role="img" aria-label={`${Math.round(value * 100)}% resolvidas`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#2a2a2a" strokeWidth="9" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={TONES[tone].ring} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${len * value} ${len}`} transform="rotate(-90 40 40)" />
      <text x="40" y="44" textAnchor="middle" className="fill-white" fontSize="17" fontWeight="700">{Math.round(value * 100)}%</text>
    </svg>
  );
}

function Bar({ c }: { c: ReportCounts }) {
  const pct = (n: number) => (c.total ? `${(n / c.total) * 100}%` : '0%');
  return (
    <div className="h-2 rounded-full bg-[#2a2a2a] overflow-hidden flex" aria-hidden="true">
      <div className="bg-emerald-500" style={{ width: pct(c.resolved) }} />
      <div className="bg-amber-500" style={{ width: pct(c.inProgress) }} />
      <div className="bg-red-500" style={{ width: pct(c.unanswered) }} />
    </div>
  );
}

function hoursText(h: number) {
  if (h < 1) return 'menos de 1 h';
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} dias`;
}

const TYPE_LABEL: Record<PinType, string> = { infraestrutura: 'Infraestrutura', crime: 'Crime' };

/** City scoreboard: the whole city at a glance, then each agency. */
export function AgencyScoreSheet({ city, onClose, onShowArea }: { city: CityScore; onClose: () => void; onShowArea: () => void }) {
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);
  const s = city.stats;
  const tone = toneOf(s);
  const cells = [
    { n: s.total, label: 'ocorrências', cls: 'text-white' },
    { n: s.resolved, label: 'resolvidas', cls: 'text-emerald-300' },
    { n: s.inProgress, label: 'em andamento', cls: 'text-amber-300' },
    { n: s.unanswered, label: 'sem resposta', cls: 'text-red-300' },
  ];
  const hq = city.agencies.find((a) => a.kind === 'prefeitura') ?? city.agencies[0];
  // Portal: above the map's own stacking context and the page's bottom buttons.
  return createPortal(
    <div className="fixed inset-0 z-[1700] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Placar de ${city.city}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[92%] sm:max-w-[440px] max-h-[88dvh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl bg-[#121212] border border-[#2a2a2a] shadow-2xl p-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-fadeIn"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-1.5">
              <Building2 size={18} className="text-emerald-400 shrink-0" />
              <span className="truncate">{city.city}</span>
            </h2>
            <p className="text-xs text-gray-400">
              {city.agencies.length} {city.agencies.length === 1 ? 'órgão público' : 'órgãos públicos'} · área de até {city.radiusKm} km
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center text-gray-400 hover:text-white" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Ring value={s.total ? city.resolvedRate : 0} tone={tone} />
          <div className="text-sm text-gray-300 space-y-1">
            {s.total ? (
              <p><span className="text-white font-semibold">{s.resolved} de {s.total}</span> ocorrências da cidade foram resolvidas.</p>
            ) : (
              <p>Nenhuma ocorrência publicada na área ainda.</p>
            )}
            {city.last30.total > 0 && (
              <p className="text-xs text-gray-400">Últimos 30 dias: {city.last30.resolved} de {city.last30.total} resolvidas.</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {cells.map((c) => (
            <div key={c.label} className="rounded-lg bg-white/5 border border-white/10 p-2 text-center">
              <p className={cn('text-xl font-bold', c.cls)}>{c.n}</p>
              <p className="text-[11px] text-gray-400 leading-tight">{c.label}</p>
            </div>
          ))}
        </div>

        {Object.keys(city.byType).length > 0 && (
          <div className="space-y-2.5">
            {(Object.entries(city.byType) as [PinType, ReportCounts][]).map(([type, c]) => (
              <div key={type} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-300">{TYPE_LABEL[type] ?? type}</span>
                  <span className="text-gray-400">{c.resolved} de {c.total} resolvidas</span>
                </div>
                <Bar c={c} />
              </div>
            ))}
            <p className="flex gap-3 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />resolvida</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />em andamento</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />sem resposta</span>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase tracking-wide">Órgãos da cidade</p>
          {city.agencies.map((a) => (
            <div key={a.id} className="rounded-lg bg-white/5 border border-white/10 p-3">
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                <BadgeCheck size={15} className="text-emerald-400 shrink-0" />
                <span className="truncate">{a.organization}</span>
              </p>
              <p className="text-[11px] text-gray-500">
                {AGENCY_KIND_LABELS[a.kind] ?? 'Órgão'} · atende {a.answerTypes.map((t) => TYPE_LABEL[t].toLowerCase()).join(' e ')}
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-300">
                <span><span className="text-white font-semibold">{a.stats.answered}</span> respondidas</span>
                <span><span className="text-emerald-300 font-semibold">{a.stats.resolved}</span> resolvidas</span>
                {a.stats.medianResponseHours != null && (
                  <span className="flex items-center gap-1"><Clock size={11} className="text-gray-500" /> responde em ~{hoursText(a.stats.medianResponseHours)}</span>
                )}
              </div>
              {a.stats.lastAnswerAt && (
                <p className="text-[11px] text-gray-500 mt-0.5">Última resposta {formatDistanceToNow(new Date(a.stats.lastAnswerAt), { addSuffix: true, locale: ptBR })}</p>
              )}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onShowArea} className="h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
            Ver área no mapa
          </button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${city.lat},${city.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-2"
            title={hq?.address ?? undefined}
          >
            <Route size={15} /> Como chegar
          </a>
        </div>
        <p className="text-[11px] text-gray-500 text-center">
          Calculado automaticamente a partir dos relatos públicos aprovados na área. Os órgãos não editam estes números.
        </p>
      </div>
    </div>,
    document.body,
  );
}
