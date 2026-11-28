import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import type { Pin } from '@/types';
import { hasValidPinLocation, isDefaultLocationPin } from '@/lib/pins';

type HeatLatLng = [number, number, number];
type HeatLayerFactory = (points: HeatLatLng[], opts: Record<string, unknown>) => L.Layer;

/** Density layer: where reports concentrate. Weight grows with confirmations ("Eu também vi"). */
export default function HeatLayer({ pins }: { pins: Pin[] }) {
  const map = useMap();

  useEffect(() => {
    const points: HeatLatLng[] = pins
      .filter((p) => hasValidPinLocation(p) && !isDefaultLocationPin(p) && p.status !== 'resolved')
      .map((p) => [p.location.lat, p.location.lng, Math.min(1, 0.4 + (p.votes || 0) * 0.15)]);
    const heat = (L as unknown as { heatLayer: HeatLayerFactory }).heatLayer(points, {
      radius: 28,
      blur: 22,
      maxZoom: 17,
      minOpacity: 0.35,
      gradient: { 0.3: '#facc15', 0.6: '#f97316', 0.9: '#dc2626' },
    });
    heat.addTo(map);
    return () => { heat.remove(); };
  }, [map, pins]);

  return null;
}
