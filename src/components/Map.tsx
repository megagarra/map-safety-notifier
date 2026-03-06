import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Pin, PinType } from '@/types';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Clock,
  X,
  ThumbsUp,
  Users,
  Navigation,
  MapPin,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

declare module 'leaflet' {
  interface Map {
    isUserInteraction?: React.MutableRefObject<boolean>;
  }
}

interface MapComponentProps {
  pins: Pin[];
  onPinClick: (pin: Pin | null) => void;
  onMapClick: (lat: number, lng: number) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  selectedPinTypes: PinType[] | null;
  selectedPin: Pin | null;
  center: [number, number];
  zoom: number;
  onVote: (pinId: string) => void;
}

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [-23.45, -46.82],
  [-23.18, -46.48],
];
const MAP_CENTER: [number, number] = [-23.3343, -46.6953];
const MAP_MIN_ZOOM = 12;
const MAP_MAX_ZOOM = 19;

// --- Pin config by type ---

const PIN_CONFIG: Record<string, { label: string; color: string; border: string; bg: string; pulse: string; icon: string }> = {
  infraestrutura: {
    label: 'Infraestrutura',
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/20',
    pulse: 'rgba(249,115,22,0.4)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/><path d="M10 14 2.3 6.3"/><path d="m14 6 7.7 7.7"/><path d="m8 6 8 8"/></svg>`,
  },
  crime: {
    label: 'Crime',
    color: 'text-red-400',
    border: 'border-red-500/40',
    bg: 'bg-red-500/20',
    pulse: 'rgba(239,68,68,0.4)',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m14.5 9.5-5 5"/><path d="m9.5 9.5 5 5"/></svg>`,
  },
};

const DEFAULT_PIN_CONFIG = PIN_CONFIG.infraestrutura;

function getPinConfig(type: string) {
  return PIN_CONFIG[type] || DEFAULT_PIN_CONFIG;
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    reported: 'Reportado',
    acknowledged: 'Reconhecido',
    in_progress: 'Em andamento',
    resolved: 'Resolvido',
  };
  return map[status] || 'Desconhecido';
}

function getStatusClass(status: string) {
  const map: Record<string, string> = {
    reported: 'bg-red-500/20 text-red-400',
    acknowledged: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    resolved: 'bg-green-500/20 text-green-400',
  };
  return map[status] || 'bg-gray-500/20 text-gray-400';
}

// --- Map sub-components ---

function MapEvents({ onMapClick, onMapMove }: { onMapClick: (lat: number, lng: number) => void; onMapMove?: (center: [number, number], zoom: number) => void }) {
  const map = useMap();
  const isUserInteraction = useRef(true);

  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
    moveend: () => {
      if (isUserInteraction.current && onMapMove) {
        const c = map.getCenter();
        onMapMove([c.lat, c.lng], map.getZoom());
      }
      isUserInteraction.current = true;
    },
    zoomend: () => {
      if (isUserInteraction.current && onMapMove) {
        const c = map.getCenter();
        onMapMove([c.lat, c.lng], map.getZoom());
      }
      isUserInteraction.current = true;
    },
  });

  useEffect(() => { map.isUserInteraction = isUserInteraction; }, [map]);
  return null;
}

function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      setTimeout(() => {
        map.invalidateSize(true);
        map.setView(center, zoom, { animate: false });
      }, 500);
      return;
    }
    const cur = map.getCenter();
    if (Math.abs(cur.lat - center[0]) > 0.0001 || Math.abs(cur.lng - center[1]) > 0.0001 || map.getZoom() !== zoom) {
      if (map.isUserInteraction) map.isUserInteraction.current = false;
      map.setView(center, zoom, { animate: false });
    }
  }, [center, zoom, map]);

  return null;
}

// --- Pin marker rendering ---

function createPinHTML(pin: Pin, currentZoom: number) {
  const cfg = getPinConfig(pin.type);
  const hasHighVotes = (pin.votes || 0) > 5;

  const minZ = 12, maxZ = 18;
  const ratio = Math.min(1, Math.max(0, (currentZoom - minZ) / (maxZ - minZ)));
  const size = Math.round((hasHighVotes ? 34 : 30) * (0.6 + 0.4 * ratio));

  return {
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
        <div style="width:100%;height:100%;border-radius:50%;background:#1a1a1a;border:2px solid;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);"
             class="${cfg.border} ${cfg.color}">
          ${cfg.icon}
        </div>
        ${(pin.votes && pin.votes > 0) ? `<div style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1.5px solid #1a1a1a;" class="${cfg.bg} ${cfg.color}">${pin.votes}</div>` : ''}
      </div>`,
    size,
  };
}

function PinMarkers({ pins, onPinClick }: { pins: Pin[]; onPinClick: (pin: Pin) => void }) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());

  useEffect(() => {
    const handler = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  return (
    <>
      {pins.map((pin) => {
        const { html, size } = createPinHTML(pin, currentZoom);
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
        return (
          <Marker
            key={pin.id}
            position={[pin.location.lat, pin.location.lng]}
            icon={icon}
            eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onPinClick(pin); } }}
          />
        );
      })}
    </>
  );
}

// --- Reverse geocoding ---

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=pt-BR`,
      { headers: { 'User-Agent': 'MapSafetyNotifier/1.0' } },
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

// --- Pin details modal ---

function PinDetailsModal({ pin, onClose, onVote, isMobile }: { pin: Pin; onClose: () => void; onVote: (id: string) => void; isMobile: boolean }) {
  const cfg = getPinConfig(pin.type);
  const [address, setAddress] = useState<string | null>(pin.address || null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);

  useEffect(() => {
    if (pin.address) {
      setAddress(pin.address);
      return;
    }
    setIsLoadingAddress(true);
    reverseGeocode(pin.location.lat, pin.location.lng).then((result) => {
      setAddress(result);
      setIsLoadingAddress(false);
    });
  }, [pin.id, pin.address, pin.location.lat, pin.location.lng]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className={cn("relative w-[92%] max-w-[420px] max-h-[85vh] overflow-y-auto rounded-2xl bg-[#121212] shadow-2xl border border-[#2a2a2a] animate-fadeIn", isMobile && "max-w-full mx-3")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-[#2a2a2a] bg-[#1a1a1a] rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-full flex items-center justify-center border-2", cfg.border, cfg.color)} style={{ background: '#1a1a1a' }}
              dangerouslySetInnerHTML={{ __html: cfg.icon }}
            />
            <div>
              <h3 className="text-base font-semibold text-white">{cfg.label}</h3>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", getStatusClass(pin.status))}>{getStatusLabel(pin.status)}</span>
            </div>
          </div>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3a3a3a] transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Address */}
          <div className="flex items-start gap-2 text-sm">
            <MapPin size={16} className="text-gray-500 mt-0.5 shrink-0" />
            {isLoadingAddress ? (
              <span className="text-gray-500 flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Buscando endereço...</span>
            ) : address ? (
              <span className="text-gray-300">{address}</span>
            ) : (
              <span className="text-gray-500">{pin.location.lat.toFixed(6)}, {pin.location.lng.toFixed(6)}</span>
            )}
          </div>

          {/* Description */}
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <p className="text-sm text-gray-200 leading-relaxed">{pin.description}</p>
          </div>

          {/* Timing */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {pin.reportedAt ? formatDistanceToNow(new Date(pin.reportedAt), { addSuffix: true, locale: ptBR }) : 'Data desconhecida'}
            </span>
            {pin.persistenceDays !== undefined && pin.persistenceDays > 0 && (
              <span className="flex items-center gap-1">
                <AlertTriangle size={13} />
                {pin.status === 'resolved' ? `Resolvido em ${pin.persistenceDays}d` : `Há ${pin.persistenceDays} dias`}
              </span>
            )}
          </div>

          {/* Images */}
          {pin.images && pin.images.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {pin.images.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden bg-[#252525]">
                  <img src={img} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Voting */}
          <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={15} className="text-gray-500" />
                <span className="text-sm text-gray-300"><span className="font-semibold text-white">{pin.votes || 0}</span> confirmaram</span>
              </div>
              <button
                onClick={() => onVote(pin.id)}
                disabled={pin.userVoted}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  pin.userVoted ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white hover:bg-white/20"
                )}
              >
                <ThumbsUp size={14} />
                {pin.userVoted ? 'Confirmado' : 'Confirmar'}
              </button>
            </div>
          </div>

          {/* Coordinates */}
          <div className="text-xs text-gray-500 text-center">
            {pin.location.lat.toFixed(6)}, {pin.location.lng.toFixed(6)}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Map component ---

const MapComponent = ({ pins, onPinClick, onMapClick, onMapMove, selectedPinTypes, selectedPin, center, zoom, onVote }: MapComponentProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const filteredPins = useMemo(() => {
    if (!selectedPinTypes?.length) return pins;
    return pins.filter((p) => selectedPinTypes.includes(p.type));
  }, [pins, selectedPinTypes]);

  const effectiveCenter = center || MAP_CENTER;
  const effectiveZoom = zoom || 13;

  useEffect(() => {
    if (mapLoaded && mapInstance) {
      setTimeout(() => { mapInstance.invalidateSize(true); }, 500);
    }
  }, [mapLoaded, mapInstance]);

  useEffect(() => {
    if (!mapInstance) return;
    const handler = () => setTimeout(() => mapInstance.invalidateSize(true), 250);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [mapInstance]);

  const handleMapClick = (lat: number, lng: number) => {
    if (selectedPin) {
      onPinClick(null);
    } else {
      onMapClick(lat, lng);
    }
  };

  return (
    <div className="h-full w-full relative overflow-hidden map-wrapper">
      {!mapLoaded && <div className="map-loading-placeholder absolute inset-0 bg-[#121212] z-[5]" />}

      <MapContainer
        center={effectiveCenter}
        zoom={effectiveZoom}
        minZoom={MAP_MIN_ZOOM}
        maxZoom={MAP_MAX_ZOOM}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ width: '100%', height: '100%' }}
        zoomControl={false}
        attributionControl={false}
        ref={mapRef}
        className="map-container"
        whenReady={(evt) => {
          setMapLoaded(true);
          setMapInstance(evt.target);
          evt.target.invalidateSize(true);
          evt.target.setView(effectiveCenter, effectiveZoom, { animate: false });
          setTimeout(() => {
            document.querySelector('.map-loading-placeholder')?.remove();
            setTimeout(() => evt.target.invalidateSize(true), 300);
          }, 400);
        }}
      >
        <TileLayer url={TILE_URL} maxZoom={19} maxNativeZoom={18} updateWhenIdle detectRetina className="custom-tile-layer" />
        <MapEvents onMapClick={handleMapClick} onMapMove={onMapMove} />
        <PinMarkers pins={filteredPins} onPinClick={onPinClick} />
        <MapCenterUpdater center={effectiveCenter} zoom={effectiveZoom} />
        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Pin details */}
      {selectedPin && (
        <PinDetailsModal pin={selectedPin} onClose={() => onPinClick(null)} onVote={onVote} isMobile={isMobile} />
      )}

      {/* Location button */}
      <div className="absolute bottom-28 right-3 z-[400]">
        <button
          onClick={() => {
            if (!("geolocation" in navigator)) return;
            navigator.geolocation.getCurrentPosition(
              (pos) => mapInstance?.flyTo([pos.coords.latitude, pos.coords.longitude], 16, { duration: 1.5 }),
              () => {},
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
          }}
          className="w-10 h-10 rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg"
          title="Minha localização"
        >
          <Navigation size={18} />
        </button>
      </div>
    </div>
  );
};

export default MapComponent;
