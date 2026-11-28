import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { Circle, Marker, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BadgeCheck, Clock, MapPin, Route, X } from 'lucide-react';
import { fetchAgencies } from '@/controllers/agencies';
import { AGENCY_KIND_LABELS } from '@/components/OfficialResponse';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { cn } from '@/lib/utils';
import type { Agency } from '@/types';

/** Green resolves most, amber some, red few; slate when there is nothing to judge yet. */
function scoreColors(a: Agency) {
  if (!a.stats.total) return { roof: '#94a3b8', left: '#475569', right: '#64748b', tone: 'slate' as const };
  const r = a.stats.resolvedRate;
  if (r >= 0.6) return { roof: '#86efac', left: '#15803d', right: '#22c55e', tone: 'green' as const };
  if (r >= 0.3) return { roof: '#fde68a', left: '#b45309', right: '#f59e0b', tone: 'amber' as const };
  return { roof: '#fca5a5', left: '#b91c1c', right: '#ef4444', tone: 'red' as const };
}

const KIND_SHORT: Record<string, string> = { prefeitura: 'PREF', guarda: 'GCM', policia: 'POL', outro: 'ÓRG' };

/** Small isometric building (pure SVG, no 3D library): roof + two lit walls + windows + flag. */
function buildingSvg(a: Agency) {
  const c = scoreColors(a);
  const pct = a.stats.total ? `${Math.round(a.stats.resolvedRate * 100)}%` : '—';
  const win = (x: number, y: number, skew: number) =>
    `<path d="M${x} ${y} l4 ${skew} v5 l-4 ${-skew} z" fill="#fff" fill-opacity=".55"/>`;
  return `
<div class="agency-building">
  <svg viewBox="0 0 56 64" width="56" height="64" aria-hidden="true">
    <ellipse cx="28" cy="57" rx="20" ry="5" fill="#000" fill-opacity=".35"/>
    <path d="M8 24 L28 35 L28 56 L8 45 Z" fill="${c.left}"/>
    <path d="M28 35 L48 24 L48 45 L28 56 Z" fill="${c.right}"/>
    <path d="M8 24 L28 13 L48 24 L28 35 Z" fill="${c.roof}" stroke="#fff" stroke-opacity=".5" stroke-width=".8"/>
    ${win(11, 30, 2.2)}${win(18, 34, 2.2)}${win(11, 39, 2.2)}${win(18, 43, 2.2)}
    ${win(33, 34.5, -2.2)}${win(40, 30.5, -2.2)}${win(33, 43.5, -2.2)}${win(40, 39.5, -2.2)}
    <path d="M29.5 49 h-3 v-6 l1.5 -.8 l1.5 .8 z" fill="#1f2937" fill-opacity=".7"/>
    <line x1="28" y1="24" x2="28" y2="4" stroke="#e5e7eb" stroke-width="1.2"/>
    <path d="M28 4 L38 6.5 L28 9 Z" fill="#fff"/>
  </svg>
  <span class="agency-badge agency-badge-${c.tone}">${pct}</span>
  <span class="agency-kind">${KIND_SHORT[a.kind] ?? 'ÓRG'}</span>
</div>`;
}

export function useAgencies() {
  return useQuery({ queryKey: ['agencies'], queryFn: fetchAgencies, staleTime: 60_000, refetchInterval: 5 * 60_000 });
}

/** Buildings on the map; the selected one shows its service area. */
export function AgencyLayer({ selected, onSelect }: { selected: Agency | null; onSelect: (a: Agency) => void }) {
  const { data: agencies = [] } = useAgencies();
  const icons = useMemo(
    () =>
      new Map(
        agencies.map((a) => [
          a.id,
          L.divIcon({ className: 'agency-marker', html: buildingSvg(a), iconSize: [56, 64], iconAnchor: [28, 57] }),
        ]),
      ),
    [agencies],
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
      {agencies.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lng]}
          icon={icons.get(a.id)!}
          zIndexOffset={500}
          title={`${a.organization}: ${a.stats.resolved} de ${a.stats.total} resolvidas`}
          eventHandlers={{ click: () => onSelect(a) }}
        />
      ))}
    </>
  );
}

/** Fits the map to an agency's service area. */
export function FitAgencyArea({ agency, nonce }: { agency: Agency | null; nonce: number }) {
  const map = useMap();
  useEffect(() => {
    if (!agency || !nonce) return;
    map.flyToBounds(L.latLng(agency.lat, agency.lng).toBounds(agency.radiusKm * 2000), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce]);
  return null;
}

function Ring({ value, tone }: { value: number; tone: string }) {
  const r = 34;
  const len = 2 * Math.PI * r;
  const color = { green: '#22c55e', amber: '#f59e0b', red: '#ef4444', slate: '#94a3b8' }[tone] ?? '#94a3b8';
  return (
    <svg viewBox="0 0 80 80" className="w-24 h-24 shrink-0" role="img" aria-label={`${Math.round(value * 100)}% resolvidas`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#2a2a2a" strokeWidth="9" />
      <circle
        cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${len * value} ${len}`} transform="rotate(-90 40 40)"
      />
      <text x="40" y="44" textAnchor="middle" className="fill-white" fontSize="17" fontWeight="700">
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

function hoursText(h: number) {
  if (h < 1) return 'menos de 1 hora';
  if (h < 48) return `${Math.round(h)} horas`;
  return `${Math.round(h / 24)} dias`;
}

/** Scoreboard sheet: how the agency is doing in its area, computed from published reports. */
export function AgencyScoreSheet({ agency, onClose, onShowArea }: { agency: Agency; onClose: () => void; onShowArea: () => void }) {
  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);
  const s = agency.stats;
  const tone = scoreColors(agency).tone;
  const kinds = agency.answerTypes.map((t) => (t === 'crime' ? 'crime' : 'infraestrutura')).join(' e ');
  const cells = [
    { n: s.total, label: 'na área', cls: 'text-white' },
    { n: s.resolved, label: 'resolvidas', cls: 'text-emerald-300' },
    { n: s.inProgress + s.acknowledged, label: 'em andamento', cls: 'text-amber-300' },
    { n: s.unanswered, label: 'sem resposta', cls: 'text-red-300' },
  ];
  // Portal: above the map's own stacking context and the page's bottom buttons.
  return createPortal(
    <div className="fixed inset-0 z-[1700] flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Placar de ${agency.organization}`}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:w-[92%] sm:max-w-[420px] max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl sm:rounded-2xl bg-[#121212] border border-[#2a2a2a] shadow-2xl p-4 space-y-4 pb-[calc(1rem+env(safe-area-inset-bottom))] animate-fadeIn"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-white flex items-center gap-1.5">
              <BadgeCheck size={18} className="text-emerald-400 shrink-0" />
              <span className="truncate">{agency.organization}</span>
            </h2>
            <p className="text-xs text-gray-400">
              {AGENCY_KIND_LABELS[agency.kind as keyof typeof AGENCY_KIND_LABELS] ?? 'Órgão público'} · atende {kinds} · raio de {agency.radiusKm} km
            </p>
            {agency.address && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><MapPin size={11} className="shrink-0" /> <span className="truncate">{agency.address}</span></p>}
          </div>
          <button onClick={onClose} className="w-10 h-10 -mr-2 -mt-1 flex items-center justify-center text-gray-400 hover:text-white" aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Ring value={s.total ? s.resolvedRate : 0} tone={tone} />
          <div className="text-sm text-gray-300 space-y-1">
            {s.total ? (
              <p><span className="text-white font-semibold">{s.resolved} de {s.total}</span> ocorrências da área foram resolvidas.</p>
            ) : (
              <p>Nenhuma ocorrência publicada na área ainda.</p>
            )}
            {s.last30Total > 0 && (
              <p className="text-xs text-gray-400">Últimos 30 dias: {s.last30Resolved} de {s.last30Total} resolvidas.</p>
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

        <div className="rounded-lg bg-white/5 border border-white/10 p-3 space-y-1.5 text-sm">
          <p className="text-gray-300">
            <span className="text-white font-semibold">{s.answeredByAgency}</span> respondidas por este órgão
            {s.answeredByAgency > 0 && <> ({s.resolvedByAgency} resolvidas)</>}
          </p>
          {s.medianResponseHours != null && (
            <p className="text-gray-300 flex items-center gap-1.5">
              <Clock size={14} className="text-gray-400" /> Tempo típico até responder: <span className="text-white">{hoursText(s.medianResponseHours)}</span>
            </p>
          )}
          {s.lastAnswerAt && (
            <p className="text-xs text-gray-400">Última resposta {formatDistanceToNow(new Date(s.lastAnswerAt), { addSuffix: true, locale: ptBR })}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onShowArea} className="h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium">
            Ver área no mapa
          </button>
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${agency.lat},${agency.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-2"
          >
            <Route size={15} /> Como chegar
          </a>
        </div>
        <p className="text-[11px] text-gray-500 text-center">
          Calculado automaticamente a partir dos relatos públicos aprovados na área. O órgão não edita estes números.
        </p>
      </div>
    </div>,
    document.body,
  );
}
