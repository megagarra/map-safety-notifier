import { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import MapView from '@/components/Map';
import { rememberMyReport } from '@/lib/myReports';
import { AlertZonePicker } from '@/components/AlertZonePicker';
import { NearbyButton, NearbySheet, OfflineBanner, useOnline } from '@/components/NearbySheet';
import { FilterChips, FirstVisitHint, InstallBanner, loadFilters, saveFilters, useFirstVisitHint, useInstallPrompt, type MapFilters } from '@/components/MapOverlays';
import { useGeolocation } from '@/hooks/useGeolocation';
import { readUrlView, readSavedView, saveView } from '@/lib/mapView';
// Heavy, rarely-first-needed UI is code-split so the map paints sooner on slow phones.
const loadReportModal = () => import('@/components/ReportModal');
const ReportModal = lazy(loadReportModal);
const DefaultLocationSetupModal = lazy(() => import('@/components/DefaultLocationSetupModal').then((m) => ({ default: m.DefaultLocationSetupModal })));
const DefaultLocationEntryModal = lazy(() => import('@/components/DefaultLocationEntryModal').then((m) => ({ default: m.DefaultLocationEntryModal })));
const DefaultLocationBulkEntryModal = lazy(() => import('@/components/DefaultLocationBulkEntryModal').then((m) => ({ default: m.DefaultLocationBulkEntryModal })));
const MyReportsSheet = lazy(() => import('@/components/MyReportsSheet').then((m) => ({ default: m.MyReportsSheet })));
import { DefaultLocationsAdminSection } from '@/components/DefaultLocationsAdminSection';
import {
  Pin,
  CreatePinInput,
  MapBounds,
  PaginatedResponse,
  UpdatePinInput,
  CreateDefaultLocationInput,
  UpdateDefaultLocationInput,
  DefaultLocationEntryInput,
  BulkDefaultLocationEntryItem,
} from '@/types';
import { toast } from '@/components/ui/use-toast';
import * as PinsController from '@/controllers/pins';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { isDefaultLocationPin, mergePinUpdate, hasValidPinLocation } from '@/lib/pins';
import { ApiError } from '@/lib/errors';
import { LogIn, LogOut, Loader2, Menu, X, MapPinPlus, FileText, Info, UserPlus, FilePlus, ShieldCheck, Layers, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const FALLBACK_CENTER: [number, number] = [-23.3343, -46.6953];

const DEFAULT_BOUNDS: MapBounds = {
  lat_min: -23.45,
  lat_max: -23.18,
  lng_min: -46.82,
  lng_max: -46.48,
};

function boundsKey(bounds: MapBounds) {
  return `${bounds.lat_min},${bounds.lat_max},${bounds.lng_min},${bounds.lng_max}`;
}

type DatePreset = 'all' | '7d' | '30d' | '90d';
type PinFetchMode = 'bounds' | 'nearby';

function getDateFilter(preset: DatePreset) {
  if (preset === 'all') return {};
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return { reported_after: d.toISOString().slice(0, 10) };
}

function upsertMarkerInCache(
  prev: PaginatedResponse<Pin> | undefined,
  marker: Pin,
): PaginatedResponse<Pin> | undefined {
  if (!prev) return prev;
  const idx = prev.items.findIndex((p) => p.id === marker.id);
  if (idx >= 0) {
    const items = [...prev.items];
    items[idx] = mergePinUpdate(prev.items[idx], marker);
    return { ...prev, items };
  }
  return prev; // not in this cached page; a refetch will bring it if it belongs here
}

function removeMarkerFromCache(
  prev: PaginatedResponse<Pin> | undefined,
  markerId: string,
): PaginatedResponse<Pin> | undefined {
  if (!prev) return prev;
  const had = prev.items.some((p) => p.id === markerId);
  return {
    ...prev,
    items: prev.items.filter((p) => p.id !== markerId),
    total: had ? Math.max(0, prev.total - 1) : prev.total,
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isAdmin, isModerator, isStaff, user, logout, isLoading: authLoading } = useAuth();

  const [bounds, setBounds] = useState<MapBounds>(DEFAULT_BOUNDS);
  const [fetchMode, setFetchMode] = useState<PinFetchMode>('bounds');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  // Initial view: shared link (?lat&lng&z) > last saved view > fallback. Never block on GPS.
  const [initialView] = useState(() => (readUrlView(window.location.hash.split('?')[1] ?? '') ?? readUrlView(window.location.search)) ?? readSavedView());
  const [center, setCenter] = useState<[number, number]>(initialView?.center ?? FALLBACK_CENTER);
  const [zoom, setZoom] = useState(initialView?.zoom ?? 13);
  const userMovedRef = useRef(false);
  const dupeShownRef = useRef<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [myReportsOpen, setMyReportsOpen] = useState(false);
  // Mount the report form on first use (keeps its own draft), and prefetch its code when the browser is idle.
  const [reportModalUsed, setReportModalUsed] = useState(false);
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    const t = idle ? idle(() => { loadReportModal(); }) : window.setTimeout(() => { loadReportModal(); }, 3000);
    return () => { if (!idle) window.clearTimeout(t as number); };
  }, []);
  const online = useOnline();
  const geo = useGeolocation();
  // Page size for "Carregar mais", scoped to the current area/mode/period (resets when they change, without an extra fetch).
  const [pageState, setPageState] = useState<{ scope: string; limit: number }>({ scope: '', limit: 200 });
  const boundsKeyStr = useMemo(() => boundsKey(bounds), [bounds]);
  const pageScope = `${fetchMode}|${fetchMode === 'nearby' ? center.map((c) => c.toFixed(3)).join(',') : boundsKeyStr}|${datePreset}`;
  const pageLimit = pageState.scope === pageScope ? pageState.limit : 200;
  const dateFilter = useMemo(() => getDateFilter(datePreset), [datePreset]);

  const pinsQueryKey = useMemo(
    () =>
      fetchMode === 'nearby'
        ? (['pins', 'nearby', center[0].toFixed(3), center[1].toFixed(3), datePreset, isStaff, pageLimit] as const)
        : (['pins', 'bounds', boundsKeyStr, datePreset, isStaff, pageLimit] as const),
    [fetchMode, center, boundsKeyStr, datePreset, isStaff, pageLimit],
  );

  const { data: pinsPage, isFetching: isFetchingPins, isError } = useQuery({
    queryKey: pinsQueryKey,
    queryFn: () => {
      if (fetchMode === 'nearby') {
        return PinsController.fetchNearbyPins({
          lat: center[0],
          lng: center[1],
          radius_km: 5,
          limit: pageLimit,
          offset: 0,
          auth: isStaff,
          ...dateFilter,
        });
      }
      return PinsController.fetchPins({
        ...bounds,
        limit: pageLimit,
        offset: 0,
        auth: isStaff,
        ...dateFilter,
      });
    },
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

  const { data: pinStats } = useQuery({
    queryKey: ['pin-stats'],
    queryFn: PinsController.fetchPinStats,
    staleTime: 30_000,
    enabled: isModerator,
    refetchInterval: 60_000,
  });

  const { data: defaultLocations = [], isLoading: isLoadingDefaultLocations } = useQuery({
    queryKey: ['default-locations'],
    queryFn: PinsController.fetchDefaultLocations,
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const pendingCount = pinStats?.pendingCount ?? 0;

  const pins = useMemo(() => pinsPage?.items ?? [], [pinsPage]);
  const total = pinsPage?.total ?? 0;
  const hasMore = pins.length < total;
  const isLoadingMore = isFetchingPins && pageLimit > pins.length;
  // New area/mode/period starts again from the first page.

  const defaultMarkers = useMemo(() => {
    const fromPins = pins.filter(isDefaultLocationPin).filter(hasValidPinLocation);
    if (!isAdmin || defaultLocations.length === 0) return fromPins;
    const byId = new globalThis.Map<string, Pin>();
    defaultLocations.filter(hasValidPinLocation).forEach((m) => byId.set(m.id, m));
    fromPins.forEach((m) => byId.set(m.id, mergePinUpdate(byId.get(m.id), m)));
    return Array.from(byId.values()).sort((a, b) =>
      (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '', 'pt-BR'),
    );
  }, [pins, defaultLocations, isAdmin]);

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [filters, setFiltersState] = useState<MapFilters>(loadFilters);
  const setFilters = useCallback((f: MapFilters) => { setFiltersState(f); saveFilters(f); }, []);
  const hint = useFirstVisitHint();
  const installApp = useInstallPrompt();
  const activeFilterCount = filters.types.length + (filters.hideResolved ? 1 : 0) + (filters.onlyPending ? 1 : 0); // heat is a view mode, not a filter
  const visiblePins = useMemo(() => {
    if (!activeFilterCount) return pins;
    return pins.filter((p) => {
      if (isDefaultLocationPin(p)) return !filters.onlyPending;
      if (filters.types.length && !filters.types.includes(p.type)) return false;
      if (filters.hideResolved && p.status === 'resolved') return false;
      if (filters.onlyPending && p.approvalStatus !== 'pending') return false;
      return true;
    });
  }, [pins, filters, activeFilterCount]);

  // Deep link: #/?pin=<id> opens that report (shared via WhatsApp etc.). Waits for auth so staff can open pending pins.
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (authLoading || deepLinkDone.current) return;
    deepLinkDone.current = true;
    const qs = new URLSearchParams((window.location.hash.split('?')[1] ?? '') + '&' + window.location.search.slice(1));
    const id = qs.get('pin');
    // A real ?query (push notification links) was consumed at init — drop it so reloads don't jump back.
    if (window.location.search) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    }
    if (!id) return;
    PinsController.fetchPinById(id, isStaff).then((p) => {
      if (p && hasValidPinLocation(p)) {
        setSelectedPin(p);
        setCenter([p.location.lat, p.location.lng]);
        setZoom(17);
      } else {
        toast({ title: 'Alerta não encontrado', description: 'Ele pode ter sido removido.' });
      }
    }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  useEffect(() => { if (reportModalOpen) setReportModalUsed(true); }, [reportModalOpen]);
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [mapMode, setMapMode] = useState<'normal' | 'place-default-marker' | 'move-pin'>('normal');
  const [movePinId, setMovePinId] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupLocation, setSetupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [editingMarker, setEditingMarker] = useState<Pin | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [bulkEntryModalOpen, setBulkEntryModalOpen] = useState(false);
  const [entryMarkerId, setEntryMarkerId] = useState<string | null>(null);

  useNotifications(isStaff);

  useEffect(() => {
    if (isError) {
      toast({ title: 'Erro ao carregar pins', description: 'Não foi possível carregar os dados do mapa', variant: 'destructive' });
    }
  }, [isError]);

  const urlTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (urlTimeout.current) clearTimeout(urlTimeout.current); }, []);

  // First GPS fix: center on the user only if they didn't open a link/saved view or move the map.
  const centeredOnGpsRef = useRef(false);
  useEffect(() => {
    if (!geo.pos || centeredOnGpsRef.current) return;
    centeredOnGpsRef.current = true;
    if (initialView || userMovedRef.current) return;
    setCenter(geo.pos);
    setZoom(15);
  }, [geo.pos, initialView]);

  const updatePinsCache = useCallback(
    (updater: (prev: PaginatedResponse<Pin> | undefined) => PaginatedResponse<Pin> | undefined) => {
      queryClient.setQueriesData<PaginatedResponse<Pin>>({ queryKey: ['pins'] }, (prev) => (prev ? updater(prev) : prev));
    },
    [queryClient],
  );

  const invalidateDefaultLocations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['default-locations'] });
  }, [queryClient]);

  const updateUrl = useCallback((lat: number, lng: number, z: number) => {
    if (urlTimeout.current) clearTimeout(urlTimeout.current);
    urlTimeout.current = setTimeout(() => {
      navigate(`/?lat=${lat.toFixed(4)}&lng=${lng.toFixed(4)}&z=${z}`, { replace: true });
    }, 500);
  }, [navigate]);

  const handlePinClick = useCallback((pin: Pin | null) => {
    setSelectedPin(pin);
  }, []);

  const handleMapClick = useCallback((lat: number, lng: number, dupRadiusM?: number) => {
    setPanelOpen(false);
    if (hint.show) hint.dismiss();
    if (mapMode === 'move-pin' && movePinId) return;
    if (mapMode === 'place-default-marker') {
      setSetupLocation({ lat, lng });
      setEditingMarker(null);
      setSetupModalOpen(true);
      setMapMode('normal');
      return;
    }
    // Avoid duplicates: tapping on/next to an existing report opens it instead.
    const metersPerPx = (156543.03 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
    const radiusM = dupRadiusM ?? Math.max(20, 40 * metersPerPx);
    const nearby = visiblePins.find(
      (p) => !isDefaultLocationPin(p) && hasValidPinLocation(p) && p.approvalStatus !== 'rejected' &&
        Math.hypot((p.location.lat - lat) * 111_000, (p.location.lng - lng) * 111_000 * Math.cos((lat * Math.PI) / 180)) < radiusM,
    );
    if (nearby && nearby.id !== dupeShownRef.current) {
      dupeShownRef.current = nearby.id;
      setSelectedPin(nearby);
      toast({
        title: 'Já existe uma ocorrência aqui',
        description: 'Se for o mesmo problema, toque em "Eu também vi". Para registrar outra, toque de novo no mapa.',
      });
      return;
    }
    dupeShownRef.current = null;
    setNewPinLocation({ lat, lng });
    setReportModalOpen(true);
  }, [mapMode, movePinId, visiblePins, zoom, hint]);

  const handleMapMove = useCallback((newCenter: [number, number], newZoom: number) => {
    userMovedRef.current = true;
    setCenter(newCenter);
    setZoom(newZoom);
    saveView(newCenter, newZoom);
    updateUrl(newCenter[0], newCenter[1], newZoom);
  }, [updateUrl]);

  const handleBoundsChange = useCallback((newBounds: MapBounds) => {
    // Snap outward to a ~2 km grid so small pans hit the cache instead of refetching.
    const step = 0.02;
    const snapped: MapBounds = {
      lat_min: Math.floor(newBounds.lat_min / step) * step,
      lat_max: Math.ceil(newBounds.lat_max / step) * step,
      lng_min: Math.floor(newBounds.lng_min / step) * step,
      lng_max: Math.ceil(newBounds.lng_max / step) * step,
    };
    (Object.keys(snapped) as (keyof MapBounds)[]).forEach((k) => {
      snapped[k] = Number(snapped[k].toFixed(4));
    });
    setBounds((prev) => (boundsKey(prev) === boundsKey(snapped) ? prev : snapped));
  }, []);

  // "Carregar mais" grows the page size (part of the query key), so the 60s refetch keeps all loaded pins.
  const handleLoadMore = useCallback(() => {
    if (!hasMore) return;
    setPageState({ scope: pageScope, limit: Math.min(1000, pageLimit + 200) });
  }, [hasMore, pageScope, pageLimit]);

  const handleReportSubmit = useCallback(async (data: CreatePinInput) => {
    try {
      const created = await PinsController.createPin(data, isAuthenticated);
      rememberMyReport(created.id, created.reporterKey);
      queryClient.invalidateQueries({ queryKey: ['pins'] });
      queryClient.invalidateQueries({ queryKey: ['moderation', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['pin-stats'] });
      toast({
        title: 'Ocorrência enviada',
        description: 'Ela já aparece no mapa como "aguardando aprovação". Obrigado!',
      });
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Tente novamente.';
      toast({ title: 'Erro ao enviar relatório', description: message, variant: 'destructive' });
      return false;
    }
  }, [queryClient, isAuthenticated]);

  const handleFeedback = useCallback(async (pinId: string, kind: 'still' | 'resolved') => {
    try {
      const updated = await PinsController.sendPinFeedback(pinId, kind);
      updatePinsCache((prev) => (prev ? { ...prev, items: prev.items.map((p) => (p.id === pinId ? updated : p)) } : prev));
      setSelectedPin((prev) => (prev?.id === pinId ? updated : prev));
      toast({ title: 'Obrigado!', description: kind === 'resolved' ? 'Sua indicação ajuda a manter o mapa atualizado.' : 'Confirmado que o problema continua.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Tente novamente.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  }, [updatePinsCache]);

  const handleVote = useCallback(async (pinId: string) => {
    const pin = pins.find((p) => p.id === pinId);
    if (pin && isDefaultLocationPin(pin)) return;

    try {
      const updated = await PinsController.voteOnPin(pinId);
      updatePinsCache((prev) =>
        prev ? { ...prev, items: prev.items.map((p) => (p.id === pinId ? updated : p)) } : prev,
      );
      setSelectedPin((prev) => (prev?.id === pinId ? updated : prev));
      toast({ title: 'Voto registrado', description: 'Obrigado por confirmar este problema.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Tente novamente.';
      toast({ title: 'Erro ao registrar voto', description: message, variant: 'destructive' });
    }
  }, [updatePinsCache, pins]);

  const handleUpdatePin = useCallback(async (pinId: string, updates: UpdatePinInput) => {
    try {
      const updated = await PinsController.updatePin(pinId, updates);
      updatePinsCache((prev) =>
        prev ? { ...prev, items: prev.items.map((p) => (p.id === pinId ? updated : p)) } : prev,
      );
      setSelectedPin((prev) => (prev?.id === pinId ? updated : prev));
      toast({ title: 'Pin atualizado', description: 'Alterações salvas com sucesso.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível atualizar o pin.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache]);

  const handleDeletePin = useCallback(async (pinId: string) => {
    try {
      await PinsController.deletePin(pinId);
      updatePinsCache((prev) => removeMarkerFromCache(prev, pinId));
      setSelectedPin(null);
      toast({ title: 'Pin excluído', description: 'O alerta foi removido do mapa.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível excluir o pin.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache]);

  const handleCreateDefaultLocation = useCallback(async (data: CreateDefaultLocationInput) => {
    try {
      const marker = await PinsController.createDefaultLocation(data);
      queryClient.invalidateQueries({ queryKey: ['pins'] });
      invalidateDefaultLocations();
      setSelectedPin(hasValidPinLocation(marker) ? marker : null);
      toast({ title: 'Marcador criado', description: `Bairro ${data.neighborhood} configurado.` });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível criar o marcador.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [queryClient, invalidateDefaultLocations]);

  const handleUpdateDefaultLocation = useCallback(async (id: string, data: UpdateDefaultLocationInput) => {
    try {
      const marker = await PinsController.updateDefaultLocation(id, data);
      updatePinsCache((prev) => upsertMarkerInCache(prev, marker));
      invalidateDefaultLocations();
      setSelectedPin((prev) => (prev?.id === id ? mergePinUpdate(prev, marker) : prev));
      toast({ title: 'Marcador atualizado', description: 'Alterações salvas.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível atualizar o marcador.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, invalidateDefaultLocations]);

  const handleAddDefaultLocationEntry = useCallback(async (markerId: string, data: DefaultLocationEntryInput) => {
    try {
      const marker = await PinsController.addDefaultLocationEntry(markerId, {
        ...data,
        quantity: data.quantity ?? 1,
      });
      updatePinsCache((prev) => upsertMarkerInCache(prev, marker));
      invalidateDefaultLocations();
      queryClient.invalidateQueries({ queryKey: ['default-location-entries', markerId] });
      setSelectedPin((prev) => (prev?.id === markerId ? mergePinUpdate(prev, marker) : prev));
      toast({ title: 'Ocorrência registrada', description: 'Adicionada ao histórico do bairro.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível registrar a ocorrência.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, invalidateDefaultLocations, queryClient]);

  const handleReplaceDefaultLocationEntries = useCallback(async (
    markerId: string,
    entries: BulkDefaultLocationEntryItem[],
  ) => {
    try {
      const marker = await PinsController.replaceDefaultLocationEntriesBulk(markerId, { entries });
      updatePinsCache((prev) => upsertMarkerInCache(prev, marker));
      invalidateDefaultLocations();
      queryClient.invalidateQueries({ queryKey: ['default-location-entries', markerId] });
      queryClient.invalidateQueries({ queryKey: ['default-location', markerId] });
      setSelectedPin((prev) => (prev?.id === markerId ? mergePinUpdate(prev, marker) : prev));
      const total = entries.reduce((sum, e) => sum + e.quantity, 0);
      toast({
        title: 'Estatísticas substituídas',
        description: `${entries.length} tipo(s) · total ${total}.`,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível substituir as estatísticas.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, invalidateDefaultLocations, queryClient]);

  const handleDeleteDefaultLocation = useCallback(async (markerId: string) => {
    try {
      await PinsController.deleteDefaultLocation(markerId);
      updatePinsCache((prev) => removeMarkerFromCache(prev, markerId));
      invalidateDefaultLocations();
      queryClient.removeQueries({ queryKey: ['default-location-entries', markerId] });
      setSelectedPin(null);
      toast({ title: 'Marcador removido', description: 'O marcador do bairro foi excluído.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível remover o marcador.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, invalidateDefaultLocations, queryClient]);

  const handleAdminMovePin = useCallback(async (pinId: string, lat: number, lng: number) => {
    const pin = pins.find((p) => p.id === pinId) ?? defaultMarkers.find((p) => p.id === pinId);
    if (!pin) return;

    try {
      const updated = isDefaultLocationPin(pin)
        ? await PinsController.updateDefaultLocation(pinId, { location: { lat, lng } })
        : await PinsController.adminMovePin(pinId, { location: { lat, lng } });

      updatePinsCache((prev) =>
        prev ? { ...prev, items: prev.items.map((p) => (p.id === pinId ? updated : p)) } : prev,
      );
      if (isDefaultLocationPin(updated)) invalidateDefaultLocations();
      setSelectedPin((prev) => (prev?.id === pinId ? mergePinUpdate(prev, updated) : prev));
      setMapMode('normal');
      setMovePinId(null);
      toast({ title: 'Pin movido', description: 'Localização atualizada.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível mover o pin.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  }, [updatePinsCache, pins, defaultMarkers, invalidateDefaultLocations]);

  const handleStartMovePin = useCallback((pinId: string) => {
    setMovePinId(pinId);
    setMapMode('move-pin');
    toast({ title: 'Mover pin', description: 'Clique no mapa na nova posição.' });
  }, []);

  const handleEntriesChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pins'] });
    invalidateDefaultLocations();
  }, [queryClient, invalidateDefaultLocations]);

  const startPlaceDefaultMarker = useCallback(() => {
    setMapMode('place-default-marker');
    setSelectedPin(null);
    toast({ title: 'Novo marcador', description: 'Clique no mapa para posicionar o marcador do bairro.' });
  }, []);

  const openEntryModal = useCallback((markerId?: string | null) => {
    if (defaultMarkers.length === 0) {
      toast({
        title: 'Nenhum bairro configurado',
        description: 'Crie um marcador por bairro antes de registrar ocorrências.',
        variant: 'destructive',
      });
      return;
    }
    setEntryMarkerId(markerId ?? defaultMarkers[0]?.id ?? null);
    setEntryModalOpen(true);
  }, [defaultMarkers]);

  const openBulkEntryModal = useCallback((markerId?: string | null) => {
    if (defaultMarkers.length === 0) {
      toast({
        title: 'Nenhum bairro configurado',
        description: 'Crie um marcador por bairro antes do cadastro em lote.',
        variant: 'destructive',
      });
      return;
    }
    setEntryMarkerId(markerId ?? defaultMarkers[0]?.id ?? null);
    setBulkEntryModalOpen(true);
  }, [defaultMarkers]);

  const focusMarker = useCallback((marker: Pin) => {
    setCenter([marker.location.lat, marker.location.lng]);
    setZoom(15);
    setSelectedPin(marker);
    updateUrl(marker.location.lat, marker.location.lng, 15);
  }, [updateUrl]);

  const openEditMarker = useCallback((marker: Pin) => {
    setEditingMarker(marker);
    setSetupLocation(marker.location);
    setSetupModalOpen(true);
  }, []);

  const confirmDeleteMarker = useCallback((marker: Pin) => {
    const name = marker.neighborhood ?? 'este bairro';
    if (window.confirm(`Remover marcador de ${name}? Todas as entradas serão excluídas.`)) {
      handleDeleteDefaultLocation(marker.id);
    }
  }, [handleDeleteDefaultLocation]);

  return (
    <div className="h-screen w-full overflow-hidden fixed inset-0">
      {/* Filter chips — below the menu button on mobile, hidden while the menu is open */}
      <div className={cn('absolute z-[390] left-4 right-[4.5rem] top-[4.5rem] md:top-4 md:left-[272px] md:right-20', panelOpen && 'hidden md:block')}>
        <FilterChips value={filters} onChange={setFilters} />
      </div>

      {/* Report at my GPS position */}
      {mapMode === 'normal' && !reportModalOpen && !selectedPin && (
        <div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[420] flex items-center gap-2">
        <NearbyButton onClick={() => setNearbyOpen(true)} count={visiblePins.filter((p) => !isDefaultLocationPin(p)).length} />
        <button
          onClick={() => {
            if (!geo.pos) {
              toast({
                title: geo.error === 'denied' ? 'Localização bloqueada' : 'Buscando sua localização',
                description: geo.error === 'denied'
                  ? 'Ative a localização no navegador ou toque no mapa no local do problema.'
                  : 'Aguarde alguns segundos ou toque no mapa no local do problema.',
              });
              return;
            }
            if ((geo.accuracy ?? 0) > 150) {
              toast({ title: 'Localização imprecisa', description: `Precisão de ~${Math.round(geo.accuracy!)} m. Toque no mapa no local exato para mais precisão.` });
            }
            handleMapClick(geo.pos[0], geo.pos[1], Math.min(50, Math.max(20, geo.accuracy ?? 30)));
          }}
          className="h-12 px-5 rounded-full bg-red-600 whitespace-nowrap hover:bg-red-500 text-white font-semibold text-sm shadow-xl shadow-black/40 flex items-center gap-2"
        >
          <MapPinPlus size={18} /> Reportar aqui
        </button>
        </div>
      )}

      {nearbyOpen && (
        <NearbySheet
          pins={visiblePins}
          origin={geo.pos ?? center}
          originIsUser={!!geo.pos}
          onClose={() => setNearbyOpen(false)}
          onSelect={(p) => {
            setNearbyOpen(false);
            setSelectedPin(p);
            setCenter([p.location.lat, p.location.lng]);
            setZoom(17);
          }}
        />
      )}

      {myReportsOpen && (
        <Suspense fallback={null}>
        <MyReportsSheet
          onClose={() => setMyReportsOpen(false)}
          onOpen={(r) => {
            setMyReportsOpen(false);
            setCenter([r.lat, r.lng]);
            setZoom(17);
            PinsController.fetchPinById(r.id, isStaff).then((p) => p && setSelectedPin(p));
          }}
        />
        </Suspense>
      )}

      {!online && <OfflineBanner />}

      {hint.show && !reportModalOpen && !selectedPin && <FirstVisitHint onDismiss={hint.dismiss} />}
      {!hint.show && installApp.showBanner && !reportModalOpen && !selectedPin && (
        <InstallBanner onInstall={installApp.install} onDismiss={installApp.dismiss} />
      )}

      {isFetchingPins && (
        <div className="absolute bottom-[5.5rem] left-1/2 -translate-x-1/2 z-[900] pointer-events-none flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
          <Loader2 size={12} className="animate-spin" /> Carregando ocorrências...
        </div>
      )}
      <MapView
        pins={visiblePins}
        onPinClick={handlePinClick}
        onMapClick={handleMapClick}
        onMapMove={handleMapMove}
        onBoundsChange={handleBoundsChange}
        selectedPinTypes={null}
        selectedPin={selectedPin}
        center={center}
        zoom={zoom}
        onVote={handleVote}
        onFeedback={handleFeedback}
        showHeat={!!filters.heat}
        onUpdatePin={handleUpdatePin}
        onDeletePin={isAdmin ? handleDeletePin : undefined}
        mapMode={mapMode}
        movePinId={movePinId}
        onAdminMovePin={isAdmin ? handleAdminMovePin : undefined}
        onStartMovePin={isAdmin ? handleStartMovePin : undefined}
        onDeleteDefaultLocation={isAdmin ? handleDeleteDefaultLocation : undefined}
        onEditDefaultMarker={isAdmin ? openEditMarker : undefined}
        onEntriesChanged={handleEntriesChanged}
        onRegisterDefaultEntry={isAdmin ? openEntryModal : undefined}
        onBulkRegisterDefaultEntry={isAdmin ? openBulkEntryModal : undefined}
      />

      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 w-[240px] max-w-[calc(100vw-5.5rem)] max-h-[calc(100dvh-2rem)]">
        {/* Mobile: compact toggle so the panel doesn't cover the map */}
        <button
          onClick={() => setPanelOpen((o) => !o)}
          className="md:hidden self-start flex items-center gap-2 h-11 px-3 rounded-lg bg-[#1a1a1a]/95 backdrop-blur border border-white/10 text-white shadow-lg"
          aria-expanded={panelOpen}
          aria-label={panelOpen ? 'Fechar menu' : 'Abrir menu'}
        >
          {panelOpen ? <X size={18} /> : <Menu size={18} />}
          <span className="text-sm"><span className="font-semibold">{visiblePins.length}</span> alertas{activeFilterCount > 0 && <span className="text-gray-400"> · filtro</span>}</span>
          {isModerator && pendingCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-500 text-[#1a1a1a] text-xs font-bold flex items-center justify-center">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
        </button>
        <div className={cn('flex-col gap-2 overflow-y-auto overscroll-contain', panelOpen ? 'flex' : 'hidden md:flex')}>
        <div className="rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 px-3 py-2 shadow-lg">
          <p className="text-xs text-gray-400">
            Mostrando <span className="text-white font-medium">{visiblePins.length}</span> de{' '}
            <span className="text-white font-medium">{total}</span> alertas
          </p>
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="mt-2 w-full text-xs py-1.5 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
            >
              {isLoadingMore ? <Loader2 size={12} className="animate-spin" /> : null}
              Carregar mais
            </button>
          )}
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Carregar pins</p>
            <select
              aria-label="Carregar pins"
              value={fetchMode}
              onChange={(e) => setFetchMode(e.target.value as PinFetchMode)}
              className="w-full h-10 md:h-7 rounded text-sm md:text-[11px] bg-[#121212] border border-[#2a2a2a] text-gray-300 px-1"
            >
              <option value="bounds">Área visível</option>
              <option value="nearby">Próximos (5 km)</option>
            </select>
            <select
              aria-label="Período"
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              className="w-full h-10 md:h-7 rounded text-sm md:text-[11px] bg-[#121212] border border-[#2a2a2a] text-gray-300 px-1"
            >
              <option value="all">Todo período</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>
          <div className="-mx-3 mt-2"><AlertZonePicker gps={geo.pos} mapCenter={center} /></div>
        </div>

        <div className="rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 shadow-lg overflow-hidden">
          <button
            onClick={() => { setPanelOpen(false); setMyReportsOpen(true); }}
            className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full border-b border-white/10"
          >
            <FileText size={14} />
            Meus relatos
          </button>
          <Link
            to="/sobre"
            className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full border-b border-white/10"
          >
            <Info size={14} />
            Como funciona
          </Link>
          {isAuthenticated ? (
            <>
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                <p className="text-xs text-blue-400 capitalize">{user?.role}</p>
              </div>
              {isModerator && (
                <>
                  <Link
                    to="/admin/moderation"
                    className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full relative"
                  >
                    <ShieldCheck size={14} />
                    Moderação
                    {pendingCount > 0 && (
                      <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-500 text-[#1a1a1a] text-xs font-bold flex items-center justify-center">
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/admin/analytics"
                    className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
                  >
                    <BarChart3 size={14} />
                    Painel analítico
                  </Link>
                </>
              )}
              {isAdmin && (
                <>
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
                  >
                    <UserPlus size={14} />
                    Usuários
                  </Link>
                  <button
                    onClick={() => openEntryModal()}
                    className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-violet-300 hover:bg-violet-500/10 transition-colors w-full"
                  >
                    <FilePlus size={14} />
                    Registrar sem endereço
                  </button>
                  <button
                    onClick={() => openBulkEntryModal()}
                    className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-violet-300 hover:bg-violet-500/10 transition-colors w-full"
                  >
                    <Layers size={14} />
                    Substituir estatísticas
                  </button>
                  <DefaultLocationsAdminSection
                    markers={defaultMarkers}
                    isLoading={isLoadingDefaultLocations}
                    onFocus={focusMarker}
                    onEdit={openEditMarker}
                    onDelete={confirmDeleteMarker}
                    onCreateNew={startPlaceDefaultMarker}
                  />
                </>
              )}
              <button
                onClick={() => { logout(); toast({ title: 'Logout realizado' }); }}
                className="flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
              >
                <LogOut size={14} />
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={cn("flex items-center gap-2 px-3 py-2.5 md:py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors")}
            >
              <LogIn size={14} />
              Entrar
            </Link>
          )}
        </div>
        </div>

        {(mapMode === 'place-default-marker' || mapMode === 'move-pin') && (
          <button
            onClick={() => { setMapMode('normal'); setMovePinId(null); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#1a1a1a]/90 border border-white/10 text-gray-400 hover:text-white"
          >
            Cancelar
          </button>
        )}
      </div>

      <Suspense fallback={null}>
      {reportModalUsed && (
        <ReportModal
          isOpen={reportModalOpen}
          onClose={() => { setReportModalOpen(false); setNewPinLocation(null); }}
          onSubmit={handleReportSubmit}
          location={newPinLocation}
        />
      )}

      {isAdmin && (
      <>
      <DefaultLocationSetupModal
        isOpen={setupModalOpen}
        onClose={() => { setSetupModalOpen(false); setSetupLocation(null); setEditingMarker(null); }}
        location={setupLocation}
        marker={editingMarker}
        onCreate={handleCreateDefaultLocation}
        onUpdate={handleUpdateDefaultLocation}
      />

      <DefaultLocationEntryModal
        isOpen={entryModalOpen}
        onClose={() => { setEntryModalOpen(false); setEntryMarkerId(null); }}
        markers={defaultMarkers}
        initialMarkerId={entryMarkerId}
        onSubmit={handleAddDefaultLocationEntry}
      />

      <DefaultLocationBulkEntryModal
        isOpen={bulkEntryModalOpen}
        onClose={() => { setBulkEntryModalOpen(false); setEntryMarkerId(null); }}
        markers={defaultMarkers}
        initialMarkerId={entryMarkerId}
        onReplace={handleReplaceDefaultLocationEntries}
      />
      </>
      )}
      </Suspense>
    </div>
  );
}
