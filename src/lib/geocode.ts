const cache = new Map<string, Promise<string | null>>();

async function fetchAddress(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt-BR`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address;
    if (!addr) return data.display_name || null;

    const parts: string[] = [];
    if (addr.road) parts.push(addr.road);
    if (addr.house_number && parts.length) parts[0] = `${parts[0]}, ${addr.house_number}`;
    if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
    if (addr.city || addr.town || addr.village) parts.push(addr.city || addr.town || addr.village);

    return parts.length > 0 ? parts.join(' — ') : data.display_name || null;
  } catch {
    return null;
  }
}

/** Reverse geocode (Nominatim), cached by ~10 m grid; concurrent calls share one request. */
export function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  let p = cache.get(key);
  if (!p) {
    p = fetchAddress(lat, lng).then((r) => {
      if (r === null) cache.delete(key); // retry failures later
      return r;
    });
    cache.set(key, p);
  }
  return p;
}
