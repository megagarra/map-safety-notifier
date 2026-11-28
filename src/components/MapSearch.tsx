import { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';
import { Search, X, Loader2, MapPin } from 'lucide-react';

type Result = { place_id: number; display_name: string; lat: string; lon: string; boundingbox?: string[] };

const cache = new Map<string, Result[]>();

/** Address/place search (Nominatim, Brazil only, debounced and cached). */
export default function MapSearch({ map }: { map: L.Map | null }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setResults([]);
      setError(false);
      return;
    }
    const key = term.toLowerCase();
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
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=br&viewbox=-46.82,-23.18,-46.48,-23.45&bounded=1&accept-language=pt-BR&q=${encodeURIComponent(term)}`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(String(res.status));
        const data: Result[] = await res.json();
        cache.set(key, data);
        setResults(data);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setError(true);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const go = (r: Result) => {
    if (!map) return;
    const bb = r.boundingbox?.map(Number);
    if (bb && bb.length === 4 && bb.every(Number.isFinite)) {
      map.flyToBounds([[bb[0], bb[2]], [bb[1], bb[3]]], { maxZoom: 17, duration: 0.8 });
    } else {
      map.flyTo([Number(r.lat), Number(r.lon)], 16, { duration: 0.8 });
    }
    setOpen(false);
    setResults([]);
    setQ('');
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-[44px] h-[44px] md:w-10 md:h-10 rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg"
        title="Buscar endereço"
        aria-label="Buscar endereço"
      >
        <Search size={18} />
      </button>
    );
  }

  return (
    <div className="absolute top-0 right-0 w-[calc(100vw-2rem)] max-w-sm rounded-lg bg-[#1a1a1a]/95 backdrop-blur border border-white/10 shadow-xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 h-11">
        <Search size={16} className="text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && results[0]) go(results[0]);
          }}
          placeholder="Buscar rua ou bairro"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
        {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white" aria-label="Fechar busca">
          <X size={16} />
        </button>
      </div>
      {(results.length > 0 || error || (q.trim().length >= 3 && !loading)) && (
        <ul className="border-t border-white/10 max-h-72 overflow-y-auto">
          {error && <li className="px-3 py-3 text-sm text-red-300">Erro na busca. Tente novamente.</li>}
          {!error && results.length === 0 && !loading && (
            <li className="px-3 py-3 text-sm text-gray-400">Nenhum resultado</li>
          )}
          {results.map((r) => (
            <li key={r.place_id}>
              <button
                onClick={() => go(r)}
                className="w-full text-left flex gap-2 px-3 py-2.5 min-h-11 text-sm text-gray-200 hover:bg-white/5"
              >
                <MapPin size={14} className="mt-0.5 shrink-0 text-blue-400" />
                <span className="line-clamp-2">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
