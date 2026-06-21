import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Map from '@/components/Map';
import ReportModal from '@/components/ReportModal';
import { DefaultLocationSetupModal } from '@/components/DefaultLocationSetupModal';
import { DefaultLocationEntryModal } from '@/components/DefaultLocationEntryModal';
import { DefaultLocationBulkEntryModal } from '@/components/DefaultLocationBulkEntryModal';
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
import { isDefaultLocationPin } from '@/lib/pins';
import { ApiError } from '@/lib/errors';
import { LogIn, LogOut, Loader2, UserPlus, FilePlus, ShieldCheck, Layers } from 'lucide-react';
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

function upsertMarkerInCache(
  prev: PaginatedResponse<Pin> | undefined,
  marker: Pin,
): PaginatedResponse<Pin> {
  if (!prev) {
    return { items: [marker], total: 1, limit: 200, offset: 0 };
  }
  const idx = prev.items.findIndex((p) => p.id === marker.id);
  if (idx >= 0) {
    const items = [...prev.items];
    items[idx] = marker;
    return { ...prev, items };
  }
  return { ...prev, items: [marker, ...prev.items], total: prev.total + 1 };
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
  const { isAuthenticated, isAdmin, isModerator, isStaff, user, logout } = useAuth();

  const [bounds, setBounds] = useState<MapBounds>(DEFAULT_BOUNDS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const boundsKeyStr = useMemo(() => boundsKey(bounds), [bounds]);

  const { data: pinsPage, isLoading: isLoadingPins, isError } = useQuery({
    queryKey: ['pins', boundsKeyStr, isStaff],
    queryFn: () => PinsController.fetchPins({ ...bounds, limit: 200, offset: 0, auth: isStaff }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
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

  const pins = pinsPage?.items ?? [];
  const total = pinsPage?.total ?? 0;
  const hasMore = pins.length < total;

  const defaultMarkers = useMemo(() => {
    const fromPins = pins.filter(isDefaultLocationPin);
    if (!isAdmin || defaultLocations.length === 0) return fromPins;
    const byId = new Map<string, Pin>();
    defaultLocations.forEach((m) => byId.set(m.id, m));
    fromPins.forEach((m) => byId.set(m.id, m));
    return Array.from(byId.values()).sort((a, b) =>
      (a.neighborhood ?? '').localeCompare(b.neighborhood ?? '', 'pt-BR'),
    );
  }, [pins, defaultLocations, isAdmin]);

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(13);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  const [mapMode, setMapMode] = useState<'normal' | 'place-default-marker' | 'move-pin'>('normal');
  const [movePinId, setMovePinId] = useState<string | null>(null);
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupLocation, setSetupLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [editingMarker, setEditingMarker] = useState<Pin | null>(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [bulkEntryModalOpen, setBulkEntryModalOpen] = useState(false);
  const [entryMarkerId, setEntryMarkerId] = useState<string | null>(null);

  useNotifications();

  useEffect(() => {
    if (isError) {
      toast({ title: 'Erro ao carregar pins', description: 'Não foi possível carregar os dados do mapa', variant: 'destructive' });
    }
  }, [isError]);

  const urlTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsLoadingLocation(true);
    if (!('geolocation' in navigator)) {
      setCenter(FALLBACK_CENTER);
      setIsLoadingLocation(false);
      return;
    }

    let resolved = false;

    const onSuccess = ({ coords }: GeolocationPosition) => {
      if (resolved) return;
      resolved = true;
      setCenter([coords.latitude, coords.longitude]);
      setIsLoadingLocation(false);
    };

    navigator.geolocation.getCurrentPosition(onSuccess, () => {
      navigator.geolocation.getCurrentPosition(onSuccess, () => {
        if (resolved) return;
        resolved = true;
        setCenter(FALLBACK_CENTER);
        setIsLoadingLocation(false);
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });

    const safetyTimer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      setCenter(FALLBACK_CENTER);
      setIsLoadingLocation(false);
    }, 15000);

    return () => clearTimeout(safetyTimer);
  }, []);

  const updatePinsCache = useCallback(
    (updater: (prev: PaginatedResponse<Pin> | undefined) => PaginatedResponse<Pin> | undefined) => {
      queryClient.setQueryData<PaginatedResponse<Pin>>(['pins', boundsKeyStr, isStaff], updater);
    },
    [queryClient, boundsKeyStr, isStaff],
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
    if (pin) updateUrl(pin.location.lat, pin.location.lng, zoom);
  }, [zoom, updateUrl]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (mapMode === 'move-pin' && movePinId) return;
    if (mapMode === 'place-default-marker') {
      setSetupLocation({ lat, lng });
      setEditingMarker(null);
      setSetupModalOpen(true);
      setMapMode('normal');
      return;
    }
    setNewPinLocation({ lat, lng });
    setReportModalOpen(true);
    updateUrl(lat, lng, zoom);
  }, [mapMode, movePinId, zoom, updateUrl]);

  const handleMapMove = useCallback((newCenter: [number, number], newZoom: number) => {
    setCenter(newCenter);
    setZoom(newZoom);
    updateUrl(newCenter[0], newCenter[1], newZoom);
  }, [updateUrl]);

  const handleBoundsChange = useCallback((newBounds: MapBounds) => {
    setBounds(newBounds);
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const next = await PinsController.fetchPins({
        ...bounds,
        limit: 200,
        offset: pins.length,
        auth: isStaff,
      });
      updatePinsCache((prev) => {
        if (!prev) return next;
        return { ...next, items: [...prev.items, ...next.items] };
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível carregar mais alertas.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, bounds, pins.length, updatePinsCache, isStaff]);

  const handleReportSubmit = useCallback(async (data: CreatePinInput) => {
    try {
      await PinsController.createPin(data, isAuthenticated);
      queryClient.invalidateQueries({ queryKey: ['moderation', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['pin-stats'] });
      toast({
        title: 'Enviado para revisão',
        description: 'Aparecerá no mapa após aprovação.',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Tente novamente.';
      toast({ title: 'Erro ao enviar relatório', description: message, variant: 'destructive' });
    }
  }, [queryClient, isAuthenticated]);

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
      updatePinsCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((p) => p.id !== pinId),
          total: Math.max(0, prev.total - 1),
        };
      });
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
      updatePinsCache((prev) => upsertMarkerInCache(prev, marker));
      invalidateDefaultLocations();
      setSelectedPin(marker);
      toast({ title: 'Marcador criado', description: `Bairro ${data.neighborhood} configurado.` });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível criar o marcador.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, invalidateDefaultLocations]);

  const handleUpdateDefaultLocation = useCallback(async (id: string, data: UpdateDefaultLocationInput) => {
    try {
      const marker = await PinsController.updateDefaultLocation(id, data);
      updatePinsCache((prev) => upsertMarkerInCache(prev, marker));
      invalidateDefaultLocations();
      setSelectedPin((prev) => (prev?.id === id ? marker : prev));
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
      setSelectedPin((prev) => (prev?.id === markerId ? marker : prev));
      toast({ title: 'Ocorrência registrada', description: 'Adicionada ao histórico do bairro.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível registrar a ocorrência.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, invalidateDefaultLocations, queryClient]);

  const handleBulkAddDefaultLocationEntries = useCallback(async (
    markerId: string,
    entries: BulkDefaultLocationEntryItem[],
  ) => {
    try {
      const marker = await PinsController.addDefaultLocationEntriesBulk(markerId, { entries });
      updatePinsCache((prev) => upsertMarkerInCache(prev, marker));
      invalidateDefaultLocations();
      queryClient.invalidateQueries({ queryKey: ['default-location-entries', markerId] });
      setSelectedPin((prev) => (prev?.id === markerId ? marker : prev));
      const total = entries.reduce((sum, e) => sum + e.quantity, 0);
      toast({
        title: 'Cadastro em lote concluído',
        description: `${entries.length} tipo(s) registrado(s) · total ${total}.`,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível registrar as entradas.';
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
      setSelectedPin(updated);
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

  if (isLoadingLocation || !center || isLoadingPins) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#121212] fixed inset-0">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-300/30 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">{isLoadingPins ? 'Carregando dados do mapa...' : 'Obtendo sua localização...'}</p>
          <p className="text-gray-400 text-sm mt-2">{isLoadingLocation ? 'Permita o acesso à localização quando solicitado' : 'Aguarde um momento'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden fixed inset-0">
      <Map
        pins={pins}
        onPinClick={handlePinClick}
        onMapClick={handleMapClick}
        onMapMove={handleMapMove}
        onBoundsChange={handleBoundsChange}
        selectedPinTypes={null}
        selectedPin={selectedPin}
        center={center}
        zoom={zoom}
        onVote={handleVote}
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

      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 max-w-[240px]">
        <div className="rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 px-3 py-2 shadow-lg">
          <p className="text-xs text-gray-400">
            Mostrando <span className="text-white font-medium">{pins.length}</span> de{' '}
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
        </div>

        <div className="rounded-lg bg-[#1a1a1a]/90 backdrop-blur border border-white/10 shadow-lg overflow-hidden">
          {isAuthenticated ? (
            <>
              <div className="px-3 py-2 border-b border-white/10">
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                <p className="text-xs text-blue-400 capitalize">{user?.role}</p>
              </div>
              {isModerator && (
                <Link
                  to="/admin/moderation"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full relative"
                >
                  <ShieldCheck size={14} />
                  Moderação
                  {pendingCount > 0 && (
                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-yellow-500 text-[#1a1a1a] text-xs font-bold flex items-center justify-center">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </Link>
              )}
              {isAdmin && (
                <>
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
                  >
                    <UserPlus size={14} />
                    Usuários
                  </Link>
                  <button
                    onClick={() => openEntryModal()}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/10 transition-colors w-full"
                  >
                    <FilePlus size={14} />
                    Registrar sem endereço
                  </button>
                  <button
                    onClick={() => openBulkEntryModal()}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/10 transition-colors w-full"
                  >
                    <Layers size={14} />
                    Cadastro em lote
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
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
              >
                <LogOut size={14} />
                Sair
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className={cn("flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors")}
            >
              <LogIn size={14} />
              Entrar
            </Link>
          )}
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

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => { setReportModalOpen(false); setNewPinLocation(null); }}
        onSubmit={handleReportSubmit}
        location={newPinLocation}
      />

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
        onSubmit={handleBulkAddDefaultLocationEntries}
      />
    </div>
  );
}
