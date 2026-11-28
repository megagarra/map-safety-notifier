import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, X, Loader2, MapPin, History, MapPinPlus, Hash } from 'lucide-react';
import {
  clearRecentPlaces, loadRecentPlaces, parseCep, rememberPlace, searchCep, searchPlaces, type Place,
} from '@/lib/placeSearch';

const cache = new Map<string, Place[]>();

/** Street / bairro / CEP search. The chosen place gets a marker and a "Reportar aqui" shortcut. */
export default function MapSearch({ map, onReportAt }: { map: L.Map | null; onReportAt?: (lat: number, lng: number) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [recent, setRecent] = useState<Place[]>(() => loadRecentPlaces());
  const [picked, setPicked] = useState<Place | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const markerRef = useRef<L.Layer | null>(null);

  const cep = parseCep(q);
  const term = q.trim();
  const ready = cep ? true : term.length >= 3;

  useEffect(() => {
    const openSearch = () => setOpen(true);
    window.addEventListener('map-search-open', openSearch);
    return () => window.removeEventListener('map-search-open', openSearch);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Filter chips step aside while the list or the picked-place card is showing.
  useEffect(() => {
    document.documentElement.toggleAttribute('data-search-open', open || !!picked);
    return () => document.documentElement.removeAttribute('data-search-open');
  }, [open, picked]);

  useEffect(() => {
    if (!ready) {
      setResults([]);
      setError(false);
      return;
    }
    const center = map?.getCenter();
    const near = center ? { lat: center.lat, lng: center.lng } : null;
    // Cache per ~10 km area so "Rua das Flores" gives the nearby one after panning far.
    const key = cep ? `cep:${cep}` : `${term.toLowerCase()}@${near ? `${near.lat.toFixed(1)},${near.lng.toFixed(1)}` : ''}`;
    if (cache.has(key)) {
      setError(false);
      setResults(cache.get(key)!);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const data = cep
          ? await searchCep(cep, ctrl.signal).then((p) => (p ? [p] : []))
          : await searchPlaces(term, near, ctrl.signal);
        cache.set(key, data);
        setResults(data);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(true);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, cep ? 0 : 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, cep, ready]);

  const clearMarker = () => {
    markerRef.current?.remove();
    markerRef.current = null;
  };
  useEffect(() => clearMarker, []);

  const go = (p: Place) => {
    if (!map || p.outside) return;
    const b = p.bounds;
    // Areas (bairro, cidade) fit their outline; streets and addresses zoom close.
    if (b && Math.abs(b[2] - b[0]) > 0.004) {
      map.flyToBounds([[b[0], b[1]], [b[2], b[3]]], { maxZoom: 17, duration: 0.8 });
    } else {
      map.flyTo([p.lat, p.lng], 17, { duration: 0.8 });
    }
    clearMarker();
    markerRef.current = L.marker([p.lat, p.lng], {
      icon: L.divIcon({
        className: 'search-pin',
        // Teardrop pin (not a round dot, which means "you" on this map)
        html: '<svg viewBox="0 0 24 32" width="30" height="40"><path d="M12 0C5.4 0 0 5.2 0 11.7 0 20.5 12 32 12 32s12-11.5 12-20.3C24 5.2 18.6 0 12 0z" fill="#0ea5e9" stroke="#fff" stroke-width="2"/><circle cx="12" cy="11.5" r="4.2" fill="#fff"/></svg>',
        iconSize: [30, 40],
        iconAnchor: [15, 40],
      }),
      keyboard: false,
      interactive: false,
    }).addTo(map);
    rememberPlace(p);
    setRecent(loadRecentPlaces());
    setPicked(p);
    setOpen(false);
    setResults([]);
    setQ('');
  };

  const dismissPicked = () => {
    clearMarker();
    setPicked(null);
  };

  if (!open) {
    return (
      <div className="w-full md:w-auto flex flex-col gap-2 items-stretch md:items-end">
        <button
          onClick={() => setOpen(true)}
          className="w-full h-11 px-3 gap-2 justify-start md:w-10 md:h-10 md:px-0 md:justify-center rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg"
          title="Buscar rua, bairro ou CEP"
          aria-label="Buscar rua, bairro ou CEP"
        >
          <Search size={18} className="shrink-0" />
          <span className="md:hidden text-sm text-gray-400 truncate">Buscar rua, bairro ou CEP</span>
        </button>
        {picked && (
          <div className="w-full md:w-80 rounded-lg bg-[#1a1a1a]/95 backdrop-blur border border-white/10 shadow-xl p-2.5 flex items-start gap-2" role="status">
            <MapPin size={16} className="mt-0.5 shrink-0 text-sky-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">{picked.title}</p>
              {picked.subtitle && <p className="text-xs text-gray-400 truncate">{picked.subtitle}</p>}
              {onReportAt && (
                <button
                  onClick={() => { const p = picked; dismissPicked(); onReportAt(p.lat, p.lng); }}
                  className="mt-2 h-9 px-3 rounded-full bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <MapPinPlus size={14} /> Reportar aqui
                </button>
              )}
            </div>
            <button onClick={dismissPicked} className="w-9 h-9 -mr-1 -mt-1 flex items-center justify-center text-gray-400 hover:text-white" aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  }

  const showRecent = !term && recent.length > 0;

  return (
    <div className="relative md:absolute md:top-0 md:right-0 w-full md:w-[calc(100vw-2rem)] md:max-w-sm rounded-lg bg-[#1a1a1a]/95 backdrop-blur border border-white/10 shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-12 focus-within:ring-2 focus-within:ring-blue-500 rounded-lg">
        {cep ? <Hash size={16} className="text-sky-400 shrink-0" /> : <Search size={16} className="text-gray-400 shrink-0" />}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            const first = results.find((r) => !r.outside);
            if (e.key === 'Enter' && first) go(first);
          }}
          placeholder="Rua, bairro ou CEP"
          aria-label="Buscar rua, bairro ou CEP"
          enterKeyHint="search"
          autoComplete="off"
          className="flex-1 min-w-0 bg-transparent text-base md:text-sm text-white placeholder:text-gray-500 outline-none"
        />
        {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        <button onClick={() => setOpen(false)} className="w-11 h-11 -mr-2 flex items-center justify-center text-gray-400 hover:text-white" aria-label="Fechar busca">
          <X size={16} />
        </button>
      </div>
      {showRecent && (
        <ul className="border-t border-white/10 max-h-72 overflow-y-auto">
          <li className="flex items-center justify-between px-3 pt-2 pb-1">
            <span className="text-[11px] uppercase tracking-wide text-gray-500">Buscas recentes</span>
            <button onClick={() => { clearRecentPlaces(); setRecent([]); }} className="text-xs text-gray-400 hover:text-white min-h-8 px-1">
              Limpar
            </button>
          </li>
          {recent.map((r) => (
            <li key={r.id}>
              <ResultButton place={r} onClick={() => go(r)} icon={<History size={14} className="mt-0.5 shrink-0 text-gray-500" />} />
            </li>
          ))}
        </ul>
      )}
      {!term && !showRecent && (
        <p className="border-t border-white/10 px-3 py-3 text-xs text-gray-400">
          Digite o nome da rua (ex.: "Rua Dona Irmgard") ou um CEP com 8 números.
        </p>
      )}
      {term && (results.length > 0 || error || (ready && !loading)) && (
        <ul className="border-t border-white/10 max-h-72 overflow-y-auto">
          {error && <li className="px-3 py-3 text-sm text-red-300">Erro na busca. Verifique a conexão e tente de novo.</li>}
          {!error && results.length === 0 && !loading && (
            <li className="px-3 py-3 text-sm text-gray-400">
              {cep ? 'CEP não encontrado.' : 'Nenhum resultado na região. Tente só o nome da rua, sem número.'}
            </li>
          )}
          {results.map((r) => (
            <li key={r.id}>
              {r.outside ? (
                <div className="flex gap-2 px-3 py-2.5 text-sm text-gray-400">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-gray-600" />
                  <span className="min-w-0">
                    <span className="block text-gray-300 truncate">{r.title}</span>
                    <span className="block text-xs truncate">{r.subtitle}</span>
                    <span className="block text-xs text-amber-300 mt-0.5">Fora da área coberta pelo mapa.</span>
                  </span>
                </div>
              ) : (
                <ResultButton place={r} onClick={() => go(r)} icon={<MapPin size={14} className="mt-0.5 shrink-0 text-blue-400" />} />
              )}
            </li>
          ))}
        </ul>
      )}
      {term && !ready && (
        <p className="border-t border-white/10 px-3 py-2.5 text-xs text-gray-500">Continue digitando…</p>
      )}
    </div>
  );
}

function ResultButton({ place, onClick, icon }: { place: Place; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button onClick={onClick} className="w-full text-left flex gap-2 px-3 py-2.5 min-h-11 hover:bg-white/5">
      {icon}
      <span className="min-w-0">
        <span className="block text-sm text-gray-100 truncate">{place.title}</span>
        {place.subtitle && <span className="block text-xs text-gray-400 truncate">{place.subtitle}</span>}
      </span>
    </button>
  );
}
