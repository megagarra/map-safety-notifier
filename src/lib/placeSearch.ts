/** Street / place / CEP search for the map (Photon + Nominatim fallback, ViaCEP for CEPs). */

export type Place = {
  id: string;
  /** Main line, e.g. "Rua Dona Irmgard Draeger, 120" */
  title: string;
  /** Second line, e.g. "Pouso Alegre — Franco da Rocha/SP" */
  subtitle: string;
  lat: number;
  lng: number;
  /** [south, west, north, east] outline, only for areas (bairro, cidade) */
  bounds?: [number, number, number, number];
  cep?: string;
  /** Outside the area the map covers (the map can't go there) */
  outside?: boolean;
};

/** Area the map covers (keep in sync with MAP_BOUNDS in Map.tsx). */
export const REGION = { south: -23.45, west: -46.82, north: -23.18, east: -46.48 };
export const inRegion = (lat: number, lng: number) =>
  lat >= REGION.south && lat <= REGION.north && lng >= REGION.west && lng <= REGION.east;

const UF: Record<string, string> = {
  Acre: 'AC', Alagoas: 'AL', Amapá: 'AP', Amazonas: 'AM', Bahia: 'BA', Ceará: 'CE', 'Distrito Federal': 'DF',
  'Espírito Santo': 'ES', Goiás: 'GO', Maranhão: 'MA', 'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG', Pará: 'PA', Paraíba: 'PB', Paraná: 'PR', Pernambuco: 'PE', Piauí: 'PI', 'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN', 'Rio Grande do Sul': 'RS', Rondônia: 'RO', Roraima: 'RR', 'Santa Catarina': 'SC',
  'São Paulo': 'SP', Sergipe: 'SE', Tocantins: 'TO',
};

const join = (parts: (string | undefined | null)[], sep: string) => parts.filter(Boolean).join(sep);
const cityUf = (city?: string, state?: string) => join([city, state ? UF[state] ?? state : undefined], '/');

/** "07850-000", "07850000" or "07850 000" -> "07850000"; anything else -> null. */
export function parseCep(q: string): string | null {
  const m = q.trim().match(/^(\d{5})[-.\s]?(\d{3})$/);
  return m ? m[1] + m[2] : null;
}

export const formatCep = (cep: string) => `${cep.slice(0, 5)}-${cep.slice(5)}`;

const AREA_TYPES = new Set(['district', 'locality', 'city', 'county', 'state']);

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_id?: number; osm_type?: string; name?: string; street?: string; housenumber?: string;
    district?: string; locality?: string; city?: string; county?: string; state?: string; countrycode?: string;
    postcode?: string; type?: string; extent?: [number, number, number, number];
  };
};

async function photon(q: string, near: { lat: number; lng: number } | null, signal: AbortSignal): Promise<Place[]> {
  const bias = near ? `&lat=${near.lat.toFixed(4)}&lon=${near.lng.toFixed(4)}&location_bias_scale=0.3` : '';
  // Brazil bounding box keeps results in the country without hiding other states.
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=10&bbox=${REGION.west},${REGION.south},${REGION.east},${REGION.north}${bias}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const data: { features: PhotonFeature[] } = await res.json();
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const f of data.features ?? []) {
    const p = f.properties;
    if (p.countrycode && p.countrycode !== 'BR') continue;
    const [lng, lat] = f.geometry.coordinates;
    const isAddress = !!p.housenumber;
    const title = isAddress ? join([p.street ?? p.name, p.housenumber], ', ') : p.name ?? p.street ?? '';
    if (!title) continue;
    const area = p.type === 'street' || isAddress ? p.district ?? p.locality : p.type === 'district' || p.type === 'locality' ? undefined : p.district;
    const subtitle = join([area, cityUf(p.city ?? p.county, p.state)], ' — ');
    const key = `${title}|${subtitle}`;
    if (seen.has(key)) continue; // OSM splits long streets in many pieces
    seen.add(key);
    const e = p.extent; // [west, north, east, south]
    out.push({
      id: `p${p.osm_type}${p.osm_id}`,
      title,
      subtitle,
      lat,
      lng,
      bounds: e && AREA_TYPES.has(p.type ?? '') ? [e[3], e[0], e[1], e[2]] : undefined,
      cep: p.postcode,
    });
    if (out.length >= 6) break;
  }
  return out;
}

type NominatimResult = {
  place_id: number; lat: string; lon: string; boundingbox?: string[]; name?: string; display_name: string; class?: string;
  address?: Record<string, string>;
};

function fromNominatim(r: NominatimResult): Place {
  const a = r.address ?? {};
  const road = a.road ?? a.pedestrian ?? r.name;
  const title = road ? join([road, a.house_number], ', ') : r.display_name.split(',')[0];
  const bb = r.boundingbox?.map(Number);
  return {
    id: `n${r.place_id}`,
    title,
    subtitle: join([a.suburb ?? a.neighbourhood ?? a.quarter, cityUf(a.city ?? a.town ?? a.village ?? a.municipality, a.state)], ' — '),
    lat: Number(r.lat),
    lng: Number(r.lon),
    bounds: (r.class === 'boundary' || r.class === 'place') && bb && bb.length === 4 && bb.every(Number.isFinite) ? [bb[0], bb[2], bb[1], bb[3]] : undefined,
    cep: a.postcode,
  };
}

async function nominatim(params: string, signal: AbortSignal): Promise<Place[]> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=br&accept-language=pt-BR&${params}`,
    { signal },
  );
  if (!res.ok) throw new Error(String(res.status));
  return ((await res.json()) as NominatimResult[]).map(fromNominatim);
}

/** Free-text search (street, bairro, place). Results near `near` come first. */
export async function searchPlaces(q: string, near: { lat: number; lng: number } | null, signal: AbortSignal): Promise<Place[]> {
  try {
    const r = await photon(q, near, signal);
    if (r.length) return r;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
  }
  const vb = `&viewbox=${REGION.west},${REGION.north},${REGION.east},${REGION.south}&bounded=1`;
  return (await nominatim(`q=${encodeURIComponent(q)}${vb}`, signal)).filter((p) => inRegion(p.lat, p.lng));
}

type ViaCep = { erro?: boolean | string; cep: string; logradouro: string; bairro: string; localidade: string; uf: string };

/** CEP -> street, bairro and city (ViaCEP, Correios data), then the street's position on the map. */
export async function searchCep(cep: string, signal: AbortSignal): Promise<Place | null> {
  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal });
  if (!res.ok) throw new Error(String(res.status));
  const v: ViaCep = await res.json();
  if (v.erro) return null;
  const city = `${v.localidade}, ${v.uf}`;
  const attempts = [
    v.logradouro && `street=${encodeURIComponent(v.logradouro)}&city=${encodeURIComponent(v.localidade)}&state=${encodeURIComponent(v.uf)}`,
    v.logradouro && `q=${encodeURIComponent(`${v.logradouro}, ${v.bairro}, ${city}`)}`,
    v.bairro && `q=${encodeURIComponent(`${v.bairro}, ${city}`)}`,
    `q=${encodeURIComponent(city)}`,
  ].filter(Boolean) as string[];
  for (const params of attempts) {
    const hits = await nominatim(params, signal).catch(() => [] as Place[]);
    const hit = hits.find((h) => inRegion(h.lat, h.lng)) ?? hits[0];
    if (hit) {
      // Prefer the official names from the CEP over the map's spelling.
      return {
        ...hit,
        id: `cep${cep}`,
        title: v.logradouro || v.bairro || v.localidade,
        subtitle: join([v.logradouro ? v.bairro : undefined, `${v.localidade}/${v.uf}`, `CEP ${formatCep(cep)}`], ' — '),
        cep: formatCep(cep),
        outside: !inRegion(hit.lat, hit.lng),
      };
    }
  }
  return null;
}

// --- recent searches (this device only) ---
const RECENT_KEY = 'map-safety:recent-places';

export function loadRecentPlaces(): Place[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(v) ? v.filter((p) => p && typeof p.lat === 'number' && typeof p.lng === 'number').slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function rememberPlace(p: Place) {
  try {
    const list = [p, ...loadRecentPlaces().filter((x) => x.id !== p.id && x.title !== p.title)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}

export function clearRecentPlaces() {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    /* ignore */
  }
}
