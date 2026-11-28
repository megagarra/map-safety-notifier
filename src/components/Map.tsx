import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Pin, PinType, PinStatus, UpdatePinInput, MapBounds } from '@/types';
import { MapContainer, TileLayer, Marker, CircleMarker, Circle, useMapEvents, useMap, ZoomControl } from 'react-leaflet';
import { useGeolocation, retryGeolocation, getGeoState } from '@/hooks/useGeolocation';
import MapSearch from './MapSearch';
import { toggleMapTheme, useMapTheme, type MapTheme } from '@/lib/mapTheme';
import HeatLayer from './HeatLayer';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import { LegendButton } from './MapOverlays';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { reverseGeocode } from '@/lib/geocode';
import { apiUrl } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { unarchivePin } from '@/controllers/pins';
import {
  Clock,
  Share2,
  Route,
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
import { isDefaultLocationPin, isPendingPin, getApprovalLabel, getApprovalClass, hasValidPinLocation } from '@/lib/pins';
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
  onFeedback?: (pinId: string, kind: 'still' | 'resolved') => void;
  showHeat?: boolean;
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

const TILE_LAYERS = {
  /** Claro: OpenStreetMap - boa visibilidade */
  light: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 19,
  },
  /** Escuro: o mesmo OpenStreetMap com cores invertidas (CSS), para mostrar o nome de todas as ruas.
   *  (O Esri Dark Gray só nomeia vias principais; CARTO exige chave de API.) */
  dark: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxNativeZoom: 19,
  },
};

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
        ${isPending ? `<div style="position:absolute;top:-6px;right:-6px;padding:1px 5px;border-radius:8px;font-size:9px;font-weight:700;background:#eab308;color:#1a1a1a;border:1.5px solid #1a1a1a;white-space:nowrap;">${pin.votes ? `+${pin.votes}` : '…'}</div>` : ''}
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
    const { html, size } = createPinHTML(pin, Math.floor(currentZoom));
    icon = L.divIcon({ className: 'custom-div-icon', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    iconCache.set(key, icon);
  }
  return icon;
}

function clusterIcon(cluster: { getChildCount: () => number }) {
  const n = cluster.getChildCount();
  const size = n < 10 ? 36 : n < 50 ? 42 : 50;
  return L.divIcon({
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:rgba(239,68,68,0.9);border:3px solid rgba(255,255,255,0.85);color:#fff;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.5);">${n}</div>`,
    className: 'pin-cluster',
    iconSize: [size, size],
  });
}

const PinMarker = React.memo(function PinMarker({
  pin, zoom, onClickRef,
}: { pin: Pin; zoom: number; onClickRef: React.MutableRefObject<(pin: Pin) => void> }) {
  const handlers = useMemo(
    () => ({ click: (e: L.LeafletMouseEvent) => { e.originalEvent.stopPropagation(); onClickRef.current(pin); } }),
    [pin, onClickRef],
  );
  return (
    <Marker
      position={[pin.location.lat, pin.location.lng]}
      icon={getOrCreateIcon(pin, zoom)}
      title={isDefaultLocationPin(pin) ? (pin.neighborhood ?? 'Bairro') : `${getPinConfig(pin.type).label}${isPendingPin(pin) ? ' (aguardando aprovação)' : ''}`}
      alt={getPinConfig(pin.type).label}
      keyboard
      zIndexOffset={isDefaultLocationPin(pin) ? 1000 : 0}
      eventHandlers={handlers}
    />
  );
});

const PinMarkers = React.memo(function PinMarkers({ pins, onPinClick }: { pins: Pin[]; onPinClick: (pin: Pin) => void }) {
  const map = useMap();
  const [currentZoom, setCurrentZoom] = useState(map.getZoom());
  const onClickRef = useRef(onPinClick);
  onClickRef.current = onPinClick;

  useEffect(() => {
    const handler = () => setCurrentZoom(map.getZoom());
    map.on('zoomend', handler);
    return () => { map.off('zoomend', handler); };
  }, [map]);

  const { regular, fixed } = useMemo(() => {
    const valid = pins.filter(hasValidPinLocation);
    return {
      regular: valid.filter((p) => !isDefaultLocationPin(p)),
      fixed: valid.filter(isDefaultLocationPin),
    };
  }, [pins]);

  return (
    <>
      <MarkerClusterGroup
        chunkedLoading
        maxClusterRadius={45}
        disableClusteringAtZoom={17}
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        iconCreateFunction={clusterIcon}
      >
        {regular.map((pin) => (
          <PinMarker key={pin.id} pin={pin} zoom={currentZoom} onClickRef={onClickRef} />
        ))}
      </MarkerClusterGroup>
      {fixed.map((pin) => (
        <PinMarker key={pin.id} pin={pin} zoom={currentZoom} onClickRef={onClickRef} />
      ))}
    </>
  );
});

// --- Reverse geocoding ---


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
  onFeedback,
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
  onFeedback?: (id: string, kind: 'still' | 'resolved') => void;
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
    if (!hasValidPinLocation(pin)) {
      setAddress(null);
      setIsLoadingAddress(false);
      return;
    }
    setIsLoadingAddress(true);
    let cancelled = false;
    reverseGeocode(pin.location.lat, pin.location.lng).then((result) => {
      if (cancelled) return;
      setAddress(result);
      setIsLoadingAddress(false);
    });
    return () => { cancelled = true; };
  }, [pin.id, pin.address, pin.location?.lat, pin.location?.lng, isDefault]);

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

  const dialogRef = useDialogA11y<HTMLDivElement>(onClose);

  return (
    <>
      <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={isDefault ? (pin.neighborhood ?? 'Marcador por bairro') : `Ocorrência: ${cfg.label}`}
          className={cn("relative w-full sm:w-[92%] sm:max-w-[420px] max-h-[85dvh] overflow-y-auto overscroll-contain custom-scrollbar rounded-t-2xl sm:rounded-2xl bg-[#121212] shadow-2xl border border-[#2a2a2a] animate-fadeIn pb-[env(safe-area-inset-bottom)]", isMobile && "mx-auto")}
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
                  {isDefault ? (pin.neighborhood ?? 'Marcador por bairro') : pin.crimeTypeLabel ? `${cfg.label} · ${pin.crimeTypeLabel.replace(/\s*\(Art\.[^)]*\)/, '')}` : cfg.label}
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
            <button onClick={onClose} aria-label="Fechar" className="h-11 w-11 shrink-0 rounded-full bg-[#2a2a2a] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#3a3a3a] transition-colors">
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
              ) : hasValidPinLocation(pin) ? (
                <span className="text-gray-500">{pin.location.lat.toFixed(6)}, {pin.location.lng.toFixed(6)}</span>
              ) : (
                <span className="text-gray-500">Localização indisponível</span>
              )}
            </div>

            {/* Description */}
            {(pin.description || (pin.rejectionReason && isModerator)) && (
            <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              {pin.description && <p className="text-sm text-gray-200 leading-relaxed">{pin.description}</p>}
              {pin.rejectionReason && isModerator && (
                <p className="text-xs text-red-400 mt-2 border-t border-[#2a2a2a] pt-2">
                  Motivo da rejeição: {pin.rejectionReason}
                </p>
              )}
            </div>
            )}

            {pin.archived && (
              <div className="p-3 rounded-lg bg-white/5 border border-white/15 text-xs text-gray-200 leading-relaxed space-y-2">
                <p>Arquivado: ninguém confirmou esta ocorrência há muito tempo, por isso ela saiu do mapa. Se ainda acontece, toque em "Ainda está aí".</p>
                {isModerator && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await unarchivePin(pin.id);
                        toast({ title: 'Restaurado ao mapa' });
                        onEntriesChanged?.();
                        onClose();
                      } catch {
                        toast({ title: 'Não foi possível restaurar', variant: 'destructive' });
                      }
                    }}
                    className="h-9 px-3 rounded-lg bg-white/10 text-white text-xs font-medium"
                  >
                    Restaurar ao mapa
                  </button>
                )}
              </div>
            )}

            {isPending && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-200 leading-relaxed">
                {isModerator
                  ? 'Aguardando aprovação. Visitantes veem só o pin, sem descrição e fotos.'
                  : 'Esta ocorrência já foi registrada e está aguardando aprovação. Se você também viu, toque em "Eu também vi" em vez de registrar de novo.'}
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
                  marker={pin}
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
                  <label htmlFor="pin-status" className="text-xs text-gray-400">Status</label>
                  <select
                    id="pin-status"
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

            {/* Voting — também em pendentes, para confirmar em vez de duplicar */}
            {!isDefault && (
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
                      "flex items-center gap-1.5 px-3 h-11 rounded-lg text-sm font-medium transition-colors",
                      pin.userVoted ? "bg-green-500/15 text-green-400" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    <ThumbsUp size={14} />
                    {pin.userVoted ? 'Confirmado' : isPending ? 'Eu também vi' : 'Confirmar'}
                  </button>
                </div>
              </div>
            )}

            {/* Citizens keep reports fresh: still there / already fixed */}
            {!isDefault && !isPending && pin.status !== 'resolved' && onFeedback && (
              <div className="p-3 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] space-y-2">
                <p className="text-sm text-gray-200 font-medium">Ainda está assim?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onFeedback(pin.id, 'still')}
                    aria-pressed={pin.userFeedback === 'still'}
                    className={cn('h-11 rounded-lg text-sm font-medium border', pin.userFeedback === 'still' ? 'bg-orange-500/20 border-orange-500 text-white' : 'bg-white/5 border-white/10 text-gray-200')}
                  >
                    Ainda está aí{pin.stillThereCount ? ` · ${pin.stillThereCount}` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => onFeedback(pin.id, 'resolved')}
                    aria-pressed={pin.userFeedback === 'resolved'}
                    className={cn('h-11 rounded-lg text-sm font-medium border', pin.userFeedback === 'resolved' ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-gray-200')}
                  >
                    Já foi resolvido{pin.resolvedReports ? ` · ${pin.resolvedReports}` : ''}
                  </button>
                </div>
                {(pin.resolvedReports ?? 0) >= 3 && (
                  <p className="text-xs text-emerald-300">Várias pessoas indicaram que foi resolvido — a moderação foi avisada.</p>
                )}
              </div>
            )}

            {!isDefault && <ShareButton pin={pin} />}

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
              {hasValidPinLocation(pin)
                ? `${pin.location.lat.toFixed(6)}, ${pin.location.lng.toFixed(6)}`
                : 'Coordenadas indisponíveis'}
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
  const { pos, accuracy } = useGeolocation();
  if (!pos) return null;
  return (
    <>
      {accuracy != null && accuracy < 3000 && (
        <Circle
          center={pos}
          radius={accuracy}
          interactive={false}
          pathOptions={{ color: '#4285F4', weight: 1, opacity: 0.4, fillColor: '#4285F4', fillOpacity: 0.12 }}
        />
      )}
      <CircleMarker center={pos} radius={7} interactive={false} pathOptions={{ color: '#fff', weight: 2.5, fillColor: '#4285F4', fillOpacity: 1 }} />
    </>
  );
}

// --- Main Map component ---


const THEME_ORDER: MapTheme[] = ['light', 'dark'];
const THEME_LABELS: Record<MapTheme, string> = {
  light: 'Claro',
  dark: 'Escuro',
};

const MapComponent = ({
  pins, onPinClick, onMapClick, onMapMove, onBoundsChange, selectedPinTypes, selectedPin, center, zoom,
  onVote, onFeedback, showHeat, onUpdatePin, onDeletePin, mapMode, onRegisterDefaultEntry, onBulkRegisterDefaultEntry, onDeleteDefaultLocation, onEditDefaultMarker, onAdminMovePin, onStartMovePin, movePinId, onEntriesChanged,
}: MapComponentProps) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const mapTheme = useMapTheme();
  const mapRef = useRef(null);
  const tileLayer = TILE_LAYERS[mapTheme];

  const cycleMapTheme = toggleMapTheme;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const filteredPins = useMemo(() => {
    const withLocation = pins.filter(hasValidPinLocation);
    if (!selectedPinTypes?.length) return withLocation;
    return withLocation.filter((p) => selectedPinTypes.includes(p.type));
  }, [pins, selectedPinTypes]);

  // In heat mode only neighborhood markers stay as pins; reports become the density layer.
  const heatOverlayPins = useMemo(() => filteredPins.filter(isDefaultLocationPin), [filteredPins]);

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
        attributionControl
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
          key={mapTheme}
          url={tileLayer.url}
          attribution={tileLayer.attribution}
          maxZoom={19}
          maxNativeZoom={tileLayer.maxNativeZoom}
          updateWhenIdle
          updateWhenZooming={false}
          keepBuffer={6}
          className="custom-tile-layer"
        />

        <MapEvents onMapClick={handleMapClick} onMapMove={onMapMove} onBoundsChange={onBoundsChange} />
        <UserLocationDot />
        {showHeat && <HeatLayer pins={filteredPins} />}
        <PinMarkers pins={showHeat ? heatOverlayPins : filteredPins} onPinClick={onPinClick} />
        <MapCenterUpdater center={effectiveCenter} zoom={effectiveZoom} />
        {!isMobile && <ZoomControl position="bottomright" />}
      </MapContainer>

      {/* Pin details */}
      {selectedPin && hasValidPinLocation(selectedPin) && (
        <PinDetailsModal
          pin={selectedPin}
          onClose={() => onPinClick(null)}
          onVote={onVote}
          onFeedback={onFeedback}
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
      {/* Phones: wide search bar next to the menu button (theme + legend live in the side menu). */}
      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] md:top-4 right-4 left-[4.25rem] md:left-auto z-[450] flex flex-col gap-2 items-stretch md:items-end">
        <MapSearch map={mapInstance} onReportAt={onMapClick} />
        <div className="hidden md:flex flex-col gap-2 items-end">
        <button
          onClick={cycleMapTheme}
          aria-label={`Tema do mapa: ${THEME_LABELS[mapTheme]}`}
          className="w-[44px] h-[44px] md:w-10 md:h-10 rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center justify-center text-white hover:bg-[#2a2a2a] transition-colors shadow-lg"
          title={`Tema do mapa: ${THEME_LABELS[mapTheme]}. Clique para alternar.`}
        >
          {mapTheme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <LegendButton />
        </div>
      </div>

      {/* Location button — automatically adjusts for mobile and desktop zooms */}
      <div className="absolute bottom-[calc(130px+env(safe-area-inset-bottom))] md:bottom-[196px] right-[16px] md:right-[24px] z-[400]">
        <LocateButton map={mapInstance} />
      </div>
    </div>
  );
};

export default MapComponent;

// --- "My location" button ---

function LocateButton({ map }: { map: L.Map | null }) {
  const geo = useGeolocation();
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const flyTo = (pos: [number, number], accuracy: number | null) => {
    if (!map) return;
    if (accuracy && accuracy > 150) {
      map.flyToBounds(L.latLng(pos).toBounds(accuracy * 2), { maxZoom: 17, duration: 0.8 });
    } else {
      map.flyTo(pos, 17, { duration: 0.8 });
    }
  };

  useEffect(() => {
    if (!waiting) return;
    if (geo.pos) {
      setWaiting(false);
      flyTo(geo.pos, geo.accuracy);
    } else if (geo.error) {
      setWaiting(false);
      if (geo.error === 'unavailable') setMessage('Não foi possível obter sua localização. Verifique se o GPS está ligado.');
    }
  }, [waiting, geo.pos, geo.error]);

  useEffect(() => {
    if (!waiting) return;
    const t = setTimeout(() => {
      setWaiting(false);
      setMessage('Não foi possível obter sua localização. Tente novamente.');
    }, 20000);
    return () => clearTimeout(t);
  }, [waiting]);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(t);
  }, [message]);

  const [asked, setAsked] = useState(false);
  useEffect(() => {
    if (!asked) return;
    if (geo.error === 'denied') setMessage('Permissão de localização negada. Ative nas configurações do navegador.');
    else if (geo.error === 'unsupported') setMessage('Seu navegador não suporta localização.');
  }, [geo.error, asked]);

  const onClick = () => {
    const { pos, accuracy, error } = getGeoState();
    setMessage(null);
    setAsked(true);
    if (error === 'denied') {
      setMessage('Permissão de localização negada. Ative nas configurações do navegador.');
    }
    if (pos) {
      flyTo(pos, accuracy);
      return;
    }
    if (error === 'unsupported') {
      setMessage('Seu navegador não suporta localização.');
      return;
    }
    if (error) retryGeolocation();
    setWaiting(true);
  };

  return (
    <div className="relative">
      {message && (
        <div className="absolute right-full mr-2 bottom-0 w-60 rounded-lg bg-[#1a1a1a]/95 border border-white/10 px-3 py-2 text-xs text-gray-200 shadow-lg">
          {message}
        </div>
      )}
      <button
        onClick={onClick}
        className={cn(
          'w-[44px] h-[44px] md:w-10 md:h-10 rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-[#2a2a2a] transition-colors shadow-lg',
          geo.pos ? 'text-blue-400' : geo.error ? 'text-red-400' : 'text-white',
        )}
        title="Minha localização"
        aria-label="Minha localização"
      >
        {waiting ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
      </button>
    </div>
  );
}

// --- Share an alert (native share sheet → WhatsApp → copy link) ---

function ShareButton({ pin }: { pin: Pin }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = new URL(apiUrl(`/share/pin/${pin.id}`), window.location.origin).href;
    const label = pin.crimeTypeLabel?.replace(/\s*\(Art\.[^)]*\)/, '') || getPinConfig(pin.type).label;
    const text = `⚠️ Alerta de ${label.toLowerCase()} no Map Safety${pin.address ? `: ${pin.address}` : ''}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Map Safety', text, url }); return; } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}
${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text}
${url}`)}`, '_blank', 'noopener');
    }
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      <button
        onClick={share}
        className="h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-2"
      >
        <Share2 size={15} /> {copied ? 'Link copiado!' : 'Compartilhar'}
      </button>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${pin.location.lat},${pin.location.lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium flex items-center justify-center gap-2"
      >
        <Route size={15} /> Como chegar
      </a>
    </div>
  );
}
