import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Pin, PinType, PinStatus, UpdatePinInput, MapBounds } from '@/types';
import { MapContainer, TileLayer, Marker, CircleMarker, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
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
  Sun,
  Moon,
  Trash2,
  Save,
} from 'lucide-react';
import { ImageGallery } from './ImageGallery';
import PinHistory from './PinHistory';
import { DefaultLocationEntriesPanel } from './DefaultLocationEntriesPanel';
import { useAuth } from '@/hooks/useAuth';
import { isDefaultLocationPin, isPendingPin, getApprovalLabel, getApprovalClass } from '@/lib/pins';
import { getPinConfig } from '@/lib/pinConfig';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  onBoundsChange?: (bounds: MapBounds) => void;
  selectedPinTypes: PinType[] | null;
  selectedPin: Pin | null;
  center: [number, number];
  zoom: number;
  onVote: (pinId: string) => void;
  onUpdatePin?: (pinId: string, updates: UpdatePinInput) => Promise<void>;
  onDeletePin?: (pinId: string) => Promise<void>;
  mapMode?: 'normal' | 'place-default-marker' | 'move-pin';
  onRegisterDefaultEntry?: (markerId: string) => void;
  onBulkRegisterDefaultEntry?: (markerId: string) => void;
  onDeleteDefaultLocation?: (markerId: string) => Promise<void>;
  onEditDefaultMarker?: (pin: Pin) => void;
  onAdminMovePin?: (pinId: string, lat: number, lng: number) => Promise<void>;
  onStartMovePin?: (pinId: string) => void;
  movePinId?: string | null;
  onEntriesChanged?: () => void;
}

const TILE_URLS = {
  /** Claro: OpenStreetMap - boa visibilidade */
  light: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  /** Escuro: Dark Matter - tema escuro */
  dark: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
};
const MAP_THEME_KEY = 'map-safety-theme';

const MAP_BOUNDS: L.LatLngBoundsExpression = [
  [-23.45, -46.82],
  [-23.18, -46.48],
];
const MAP_CENTER: [number, number] = [-23.3343, -46.6953];
const MAP_MIN_ZOOM = 12;
const MAP_MAX_ZOOM = 19;

// --- Pin config imported from @/lib/pinConfig ---

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

function MapEvents({
  onMapClick,
  onMapMove,
  onBoundsChange,
}: {
  onMapClick: (lat: number, lng: number) => void;
  onMapMove?: (center: [number, number], zoom: number) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
}) {
  const map = useMap();
  const isUserInteraction = useRef(true);
  const boundsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emitBounds = () => {
    if (!onBoundsChange) return;
    const b = map.getBounds();
    onBoundsChange({
      lat_min: b.getSouth(),
      lat_max: b.getNorth(),
      lng_min: b.getWest(),
      lng_max: b.getEast(),
    });
  };

  useEffect(() => {
    emitBounds();
    return () => {
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
    };
  }, [map]);

  useMapEvents({
    click: (e) => onMapClick(e.latlng.lat, e.latlng.lng),
    moveend: () => {
      if (isUserInteraction.current && onMapMove) {
        const c = map.getCenter();
        onMapMove([c.lat, c.lng], map.getZoom());
      }
      isUserInteraction.current = true;
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(emitBounds, 400);
    },
    zoomend: () => {
      if (isUserInteraction.current && onMapMove) {
        const c = map.getCenter();
        onMapMove([c.lat, c.lng], map.getZoom());
      }
      isUserInteraction.current = true;
      if (boundsTimer.current) clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(emitBounds, 400);
    },
  });

  useEffect(() => { map.isUserInteraction = isUserInteraction; }, [map]);
  return null;
}

function MapCenterUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);

  useEffect(() => {
    if (prevCenter.current[0] === center[0] && prevCenter.current[1] === center[1] && prevZoom.current === zoom) return;
    prevCenter.current = center;
    prevZoom.current = zoom;
    if (map.isUserInteraction) map.isUserInteraction.current = false;
    map.setView(center, zoom, { animate: false });
  }, [center, zoom, map]);

  return null;
}

function MapInstanceSetter({ setMapInstance }: { setMapInstance: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    setMapInstance(map);
  }, [map, setMapInstance]);
  return null;
}

// --- Pin marker rendering ---

const DEFAULT_LOCATION_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#a78bfa"/></svg>`;

function createPinHTML(pin: Pin, currentZoom: number) {
  const isDefault = isDefaultLocationPin(pin);

  if (isDefault) {
    const minZ = 12, maxZ = 18;
    const ratio = Math.min(1, Math.max(0, (currentZoom - minZ) / (maxZ - minZ)));
    const size = Math.round(44 * (0.75 + 0.25 * ratio));
    const count = pin.entryCount ?? 0;
    const neighborhood = pin.neighborhood ?? '';
    const countBadge = count > 0
      ? `<div style="position:absolute;top:-10px;left:50%;transform:translateX(-50%);min-width:22px;height:22px;padding:0 5px;border-radius:11px;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;background:#7c3aed;color:#fff;border:2px solid #1a1a1a;box-shadow:0 2px 6px rgba(0,0,0,0.4);z-index:2;">${count}</div>`
      : '';
    const neighborhoodLabel = neighborhood
      ? `<div style="position:absolute;bottom:-16px;left:50%;transform:translateX(-50%);white-space:nowrap;font-size:10px;font-weight:600;color:#c4b5fd;background:rgba(26,26,26,0.92);padding:1px 6px;border-radius:4px;border:1px solid rgba(167,139,250,0.35);max-width:120px;overflow:hidden;text-overflow:ellipsis;">${neighborhood}</div>`
      : '';
    return {
      html: `
        <div class="default-location-marker" style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size + (neighborhood ? 26 : 10)}px;">
          ${countBadge}
          <div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(167,139,250,0.5);animation:defaultPinPulse 2s ease-out infinite;"></div>
          <div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg,#1a1a1a,#2d1f4e);border:3px solid #a78bfa;display:flex;align-items:center;justify-content:center;box-shadow:0 0 16px rgba(167,139,250,0.5);">
            ${DEFAULT_LOCATION_ICON}
          </div>
          ${neighborhoodLabel}
        </div>`,
      size: size + (neighborhood ? 26 : 10),
    };
  }

  const cfg = getPinConfig(pin.type);
  const isPending = isPendingPin(pin);
  const hasHighVotes = (pin.votes || 0) > 5;

  const minZ = 12, maxZ = 18;
  const ratio = Math.min(1, Math.max(0, (currentZoom - minZ) / (maxZ - minZ)));
  const size = Math.round((hasHighVotes ? 34 : 30) * (0.6 + 0.4 * ratio));

  return {
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;">
        <div style="width:100%;height:100%;border-radius:50%;background:#1a1a1a;border:2px ${isPending ? 'dashed' : 'solid'} ${isPending ? '#eab308' : ''};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);${isPending ? 'opacity:0.85;' : ''}"
             class="${isPending ? '' : cfg.border} ${cfg.color}">
          ${cfg.icon}
        </div>
        ${isPending ? `<div style="position:absolute;top:-6px;right:-6px;padding:1px 5px;border-radius:8px;font-size:9px;font-weight:700;background:#eab308;color:#1a1a1a;border:1.5px solid #1a1a1a;">!</div>` : ''}
        ${(!isPending && pin.votes && pin.votes > 0) ? `<div style="position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;border:1.5px solid #1a1a1a;" class="${cfg.bg} ${cfg.color}">${pin.votes}</div>` : ''}
      </div>`,
    size,
  };
}

const iconCache = new Map<string, L.DivIcon>();

function getOrCreateIcon(pin: Pin, currentZoom: number): L.DivIcon {
  const key = `${pin.kind ?? 'normal'}-${pin.approvalStatus ?? 'approved'}-${pin.type}-${pin.votes || 0}-${pin.entryCount ?? 0}-${pin.neighborhood ?? ''}-${Math.floor(currentZoom)}`;
  let icon = iconCache.get(key);
  if (!icon) {
    const { html, size } = createPinHTML(pin, currentZoom);
    icon = L.divIcon({ className: 'custom-div-icon', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    iconCache.set(key, icon);
  }
  return icon;
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
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.location.lat, pin.location.lng]}
          icon={getOrCreateIcon(pin, currentZoom)}
          zIndexOffset={isDefaultLocationPin(pin) ? 1000 : 0}
          eventHandlers={{ click: (e) => { e.originalEvent.stopPropagation(); onPinClick(pin); } }}
        />
      ))}
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

const STATUS_OPTIONS: { value: PinStatus; label: string }[] = [
  { value: 'reported', label: 'Reportado' },
  { value: 'acknowledged', label: 'Reconhecido' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'resolved', label: 'Resolvido' },
];

function PinDetailsModal({
  pin,
  onClose,
  onVote,
  onUpdatePin,
  onDeletePin,
  onRegisterDefaultEntry,
  onBulkRegisterDefaultEntry,
  onDeleteDefaultLocation,
  onEditDefaultMarker,
  onStartMovePin,
  onEntriesChanged,
  isMobile,
}: {
  pin: Pin;
  onClose: () => void;
  onVote: (id: string) => void;
  onUpdatePin?: (pinId: string, updates: UpdatePinInput) => Promise<void>;
  onDeletePin?: (pinId: string) => Promise<void>;
  onRegisterDefaultEntry?: (markerId: string) => void;
  onBulkRegisterDefaultEntry?: (markerId: string) => void;
  onDeleteDefaultLocation?: (markerId: string) => Promise<void>;
  onEditDefaultMarker?: (pin: Pin) => void;
  onStartMovePin?: (pinId: string) => void;
  onEntriesChanged?: () => void;
  isMobile: boolean;
}) {
  const { isModerator, isAdmin } = useAuth();
  const isDefault = isDefaultLocationPin(pin);
  const isPending = isPendingPin(pin);
  const cfg = getPinConfig(pin.type);
  const [address, setAddress] = useState<string | null>(pin.address || null);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [editStatus, setEditStatus] = useState<PinStatus>(pin.status);
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteMarkerDialog, setShowDeleteMarkerDialog] = useState(false);
  const [isDeletingMarker, setIsDeletingMarker] = useState(false);

  useEffect(() => {
    setEditStatus(pin.status);
    setComment('');
  }, [pin.id, pin.status]);

  useEffect(() => {
    if (isDefault || pin.address) {
      setAddress(pin.address || null);
      setIsLoadingAddress(false);
      return;
    }
    setIsLoadingAddress(true);
    reverseGeocode(pin.location.lat, pin.location.lng).then((result) => {
      setAddress(result);
      setIsLoadingAddress(false);
    });
  }, [pin.id, pin.address, pin.location.lat, pin.location.lng, isDefault]);

  const handleSave = async () => {
    if (!onUpdatePin) return;
    setIsSaving(true);
    try {
      const updates: UpdatePinInput = { status: editStatus };
      if (comment.trim()) updates.comment = comment.trim();
      await onUpdatePin(pin.id, updates);
      setComment('');
    } catch {
      /* toast handled in HomePage */
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeletePin) return;
    setIsDeleting(true);
    try {
      await onDeletePin(pin.id);
      setShowDeleteDialog(false);
    } catch {
      /* toast handled in HomePage */
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMarker = async () => {
    if (!onDeleteDefaultLocation) return;
    setIsDeletingMarker(true);
    try {
      await onDeleteDefaultLocation(pin.id);
      setShowDeleteMarkerDialog(false);
    } catch {
      /* toast in HomePage */
    } finally {
      setIsDeletingMarker(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className={cn("relative w-[95vw] sm:w-[92%] max-w-[420px] max-h-[85vh] overflow-y-auto custom-scrollbar rounded-2xl bg-[#121212] shadow-2xl border border-[#2a2a2a] animate-fadeIn", isMobile && "max-h-[80vh] mx-auto")}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 flex justify-between items-center p-4 border-b border-[#2a2a2a] bg-[#1a1a1a] rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2",
                  isDefault ? "border-violet-500/60 text-violet-400" : cn(cfg.border, cfg.color),
                )}
                style={{ background: isDefault ? '#2d1f4e' : '#1a1a1a' }}
                dangerouslySetInnerHTML={{ __html: isDefault ? DEFAULT_LOCATION_ICON : cfg.icon }}
              />
              <div>
                <h3 className="text-base font-semibold text-white">
                  {isDefault ? (pin.neighborhood ?? 'Marcador por bairro') : cfg.label}
                </h3>
                {!isDefault && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", getStatusClass(pin.status))}>{getStatusLabel(pin.status)}</span>
                    {isModerator && pin.approvalStatus && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full", getApprovalClass(pin.approvalStatus))}>
                        {getApprovalLabel(pin.approvalStatus)}
                      </span>
                    )}
                  </div>
                )}
                {isDefault && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                    {pin.entryCount ?? 0} ocorrência{(pin.entryCount ?? 0) === 1 ? '' : 's'}
                  </span>
                )}
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
              {pin.rejectionReason && isModerator && (
                <p className="text-xs text-red-400 mt-2 border-t border-[#2a2a2a] pt-2">
                  Motivo da rejeição: {pin.rejectionReason}
                </p>
              )}
            </div>

            {isPending && isModerator && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-300">
                Esta ocorrência aguarda aprovação e não é visível para visitantes.
              </div>
            )}

            {/* Timing — oculto para marcador padrão */}
            {!isDefault && (
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
            )}

            {/* Images — galeria compartilhada */}
            {pin.images && pin.images.length > 0 && (
              <div className="space-y-2">
                <ImageGallery images={pin.images} altPrefix={isDefault ? 'Registro' : 'Foto'} layout="separate" />
              </div>
            )}

            {/* Entries from API for default location */}
            {isDefault && (
              <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <DefaultLocationEntriesPanel
                  markerId={pin.id}
                  isAdmin={isAdmin}
                  onEntriesChanged={onEntriesChanged}
                  onBulkRegister={isAdmin && onBulkRegisterDefaultEntry ? () => onBulkRegisterDefaultEntry(pin.id) : undefined}
                />
              </div>
            )}

            {/* History for normal pins only */}
            {!isDefault && pin.history && pin.history.length > 0 && (
              <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
                <PinHistory history={pin.history} persistenceDays={pin.persistenceDays} />
              </div>
            )}

            {/* Admin: registrar ocorrência no marcador */}
            {isDefault && isAdmin && onRegisterDefaultEntry && (
              <Button
                onClick={() => onRegisterDefaultEntry(pin.id)}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                size="sm"
              >
                Registrar ocorrência sem endereço
              </Button>
            )}

            {isDefault && isAdmin && onEditDefaultMarker && (
              <Button
                variant="outline"
                onClick={() => onEditDefaultMarker(pin)}
                className="w-full border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
                size="sm"
              >
                Editar marcador
              </Button>
            )}

            {isDefault && isAdmin && onStartMovePin && (
              <Button
                variant="outline"
                onClick={() => { onStartMovePin(pin.id); onClose(); }}
                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                size="sm"
              >
                Mover marcador no mapa
              </Button>
            )}

            {/* Moderator controls */}
            {isModerator && onUpdatePin && (
              <div className="p-3 bg-[#1a1a1a] rounded-lg border border-blue-500/20 space-y-3">
                <h4 className="text-sm font-medium text-blue-400">Moderação</h4>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as PinStatus)}
                    className="w-full h-9 rounded-md bg-[#121212] border border-[#2a2a2a] text-white px-3 text-sm"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-400">Comentário (opcional)</label>
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Ex: Equipe verificou o local"
                    className="min-h-[72px] resize-none bg-[#121212] border-[#2a2a2a] text-white text-sm"
                    maxLength={2000}
                  />
                </div>
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin mr-2" /> : <Save size={14} className="mr-2" />}
                  Salvar alterações
                </Button>
              </div>
            )}

            {/* Voting — não disponível para marcador padrão ou pendentes */}
            {!isDefault && !isPending && (
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
            )}

            {/* Admin: mover pin no mapa */}
            {isAdmin && !isDefault && onStartMovePin && (
              <Button
                variant="outline"
                onClick={() => { onStartMovePin(pin.id); onClose(); }}
                className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                size="sm"
              >
                Mover pin no mapa
              </Button>
            )}

            {/* Admin delete pin */}
            {isAdmin && onDeletePin && !isDefault && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                size="sm"
              >
                <Trash2 size={14} className="mr-2" />
                Excluir pin
              </Button>
            )}

            {/* Admin: remover marcador padrão inteiro */}
            {isDefault && isAdmin && onDeleteDefaultLocation && (
              <Button
                variant="outline"
                onClick={() => setShowDeleteMarkerDialog(true)}
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                size="sm"
              >
                <Trash2 size={14} className="mr-2" />
                Remover marcador padrão
              </Button>
            )}

            {/* Coordinates */}
            <div className="text-xs text-gray-500 text-center">
              {pin.location.lat.toFixed(6)}, {pin.location.lng.toFixed(6)}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Excluir alerta?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Esta ação não pode ser desfeita. O pin será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="border-[#2a2a2a] text-white">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteMarkerDialog} onOpenChange={setShowDeleteMarkerDialog}>
        <DialogContent className="bg-[#1a1a1a] border-[#2a2a2a] text-white">
          <DialogHeader>
            <DialogTitle>Remover marcador de {pin.neighborhood ?? 'bairro'}?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Todas as entradas deste bairro serão removidas. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteMarkerDialog(false)} className="border-[#2a2a2a] text-white">
              Cancelar
            </Button>
            <Button onClick={handleDeleteMarker} disabled={isDeletingMarker} className="bg-red-600 hover:bg-red-700 text-white">
              {isDeletingMarker ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- User location blue dot ---

function UserLocationDot() {
  const [pos, setPos] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      ({ coords }) => setPos([coords.latitude, coords.longitude]),
      () => { },
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  if (!pos) return null;

  return (
    <>
      <CircleMarker center={pos} radius={12} pathOptions={{ color: 'transparent', fillColor: 'rgba(66,133,244,0.15)', fillOpacity: 1 }} />
      <CircleMarker center={pos} radius={5} pathOptions={{ color: '#fff', weight: 2, fillColor: '#4285F4', fillOpacity: 1 }} />
    </>
  );
}

// --- Main Map component ---

type MapTheme = 'light' | 'dark';

const THEME_ORDER: MapTheme[] = ['light', 'dark'];
const THEME_LABELS: Record<MapTheme, string> = {
  light: 'Claro',
  dark: 'Escuro',
};

const MapComponent = ({
  pins, onPinClick, onMapClick, onMapMove, onBoundsChange, selectedPinTypes, selectedPin, center, zoom,
  onVote, onUpdatePin, onDeletePin, mapMode, onRegisterDefaultEntry, onBulkRegisterDefaultEntry, onDeleteDefaultLocation, onEditDefaultMarker, onAdminMovePin, onStartMovePin, movePinId, onEntriesChanged,
}: MapComponentProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [mapTheme, setMapTheme] = useState<MapTheme>(() => {
    try {
      const saved = localStorage.getItem(MAP_THEME_KEY);
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });
  const mapRef = useRef(null);
  const tileUrl = TILE_URLS[mapTheme];

  const cycleMapTheme = () => {
    const idx = THEME_ORDER.indexOf(mapTheme);
    const next = THEME_ORDER[(idx + 1) % THEME_ORDER.length];
    setMapTheme(next);
    try {
      localStorage.setItem(MAP_THEME_KEY, next);
    } catch {
      /* ignore */
    }
  };

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
    if (!mapInstance) return;
    const handler = () => { mapInstance.invalidateSize(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [mapInstance]);

  const handleMapClick = (lat: number, lng: number) => {
    if (mapMode === 'move-pin' && movePinId && onAdminMovePin) {
      onAdminMovePin(movePinId, lat, lng);
      return;
    }
    if (selectedPin) {
      onPinClick(null);
    } else {
      onMapClick(lat, lng);
    }
  };

  return (
    <div className={cn("h-full w-full relative overflow-hidden map-wrapper", mapTheme === 'dark' && "map-theme-dark")}>
      {mapMode === 'place-default-marker' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 rounded-lg bg-violet-600/90 backdrop-blur text-white text-sm font-medium shadow-lg pointer-events-none">
          Clique no mapa para posicionar o marcador padrão
        </div>
      )}
      {mapMode === 'move-pin' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[500] px-4 py-2 rounded-lg bg-blue-600/90 backdrop-blur text-white text-sm font-medium shadow-lg pointer-events-none">
          Clique no mapa para mover o pin
        </div>
      )}
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
        preferCanvas
        zoomSnap={0.5}
        zoomDelta={1}
        wheelPxPerZoomLevel={80}
        inertia
        inertiaDeceleration={3000}
        inertiaMaxSpeed={1500}
        easeLinearity={0.25}
        zoomAnimation
        markerZoomAnimation
        fadeAnimation
        whenReady={() => {
          setMapLoaded(true);
          setTimeout(() => {
            document.querySelector('.map-loading-placeholder')?.remove();
          }, 300);
        }}
      >
        <MapInstanceSetter setMapInstance={setMapInstance} />
        <TileLayer
          url={tileUrl}
          maxZoom={19}
          maxNativeZoom={18}
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={6}
          className="custom-tile-layer"
        />
        <MapEvents onMapClick={handleMapClick} onMapMove={onMapMove} onBoundsChange={onBoundsChange} />
        <UserLocationDot />
        <PinMarkers pins={filteredPins} onPinClick={onPinClick} />
        <MapCenterUpdater center={effectiveCenter} zoom={effectiveZoom} />
        <ZoomControl position="bottomright" />
      </MapContainer>

      {/* Pin details */}
      {selectedPin && (
        <PinDetailsModal
          pin={selectedPin}
          onClose={() => onPinClick(null)}
          onVote={onVote}
          onUpdatePin={onUpdatePin}
          onDeletePin={onDeletePin}
          onRegisterDefaultEntry={onRegisterDefaultEntry}
          onBulkRegisterDefaultEntry={onBulkRegisterDefaultEntry}
          onDeleteDefaultLocation={onDeleteDefaultLocation}
          onEditDefaultMarker={onEditDefaultMarker}
          onStartMovePin={onStartMovePin}
          onEntriesChanged={onEntriesChanged}
          isMobile={isMobile}
        />
      )}

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
        <button
          onClick={cycleMapTheme}
          className="w-[44px] h-[44px] md:w-10 md:h-10 rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg"
          title={`Tema do mapa: ${THEME_LABELS[mapTheme]}. Clique para alternar.`}
        >
          {mapTheme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Location button — automatically adjusts for mobile and desktop zooms */}
      <div className="absolute bottom-[130px] md:bottom-[196px] right-[16px] md:right-[24px] z-[400]">
        <button
          onClick={() => {
            if (!("geolocation" in navigator) || !mapInstance) return;
            navigator.geolocation.getCurrentPosition(
              (pos) => mapInstance.flyTo([pos.coords.latitude, pos.coords.longitude], 19, { duration: 0.8 }),
              () => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => mapInstance.flyTo([pos.coords.latitude, pos.coords.longitude], 19, { duration: 0.8 }),
                  () => { },
                  { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                );
              },
              { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
            );
          }}
          className="w-[44px] h-[44px] md:w-10 md:h-10 rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg"
          title="Minha localização"
        >
          <Navigation size={18} />
        </button>
      </div>
    </div>
  );
};

export default MapComponent;
