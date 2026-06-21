import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Map from '@/components/Map';
import ReportModal from '@/components/ReportModal';
import { DefaultLocationSetupModal } from '@/components/DefaultLocationSetupModal';
import { DefaultLocationEntryModal } from '@/components/DefaultLocationEntryModal';
import {
  Pin,
  CreatePinInput,
  MapBounds,
  PaginatedResponse,
  UpdatePinInput,
  DefaultLocationInput,
  DefaultLocationEntryInput,
} from '@/types';
import { toast } from '@/components/ui/use-toast';
import * as PinsController from '@/controllers/pins';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { isDefaultLocationPin } from '@/lib/pins';
import { ApiError } from '@/lib/errors';
import { LogIn, LogOut, Loader2, UserPlus, MapPin, FilePlus, ShieldCheck } from 'lucide-react';
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

function replaceDefaultLocationInCache(
  prev: PaginatedResponse<Pin> | undefined,
  marker: Pin,
): PaginatedResponse<Pin> {
  if (!prev) {
    return { items: [marker], total: 1, limit: 200, offset: 0 };
  }
  const withoutOld = prev.items.filter((p) => !isDefaultLocationPin(p));
  const hadDefault = prev.items.some(isDefaultLocationPin);
  return {
    ...prev,
    items: [marker, ...withoutOld],
    total: hadDefault ? prev.total : prev.total + 1,
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

  const pendingCount = pinStats?.pendingCount ?? 0;

  useQuery({
    queryKey: ['default-location'],
    queryFn: PinsController.fetchDefaultLocation,
    enabled: isAdmin,
    staleTime: 60_000,
  });

  const pins = pinsPage?.items ?? [];
  const total = pinsPage?.total ?? 0;
  const hasMore = pins.length < total;

  const defaultLocationPin = useMemo(() => pins.find(isDefaultLocationPin) ?? null, [pins]);

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
  const [entryModalOpen, setEntryModalOpen] = useState(false);

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
      queryClient.setQueryData<PaginatedResponse<Pin>>(['pins', boundsKeyStr], updater);
    },
    [queryClient, boundsKeyStr],
  );

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
      setSetupModalOpen(true);
      setMapMode('normal');
      return;
    }
    setNewPinLocation({ lat, lng });
    setReportModalOpen(true);
    updateUrl(lat, lng, zoom);
  }, [mapMode, zoom, updateUrl]);

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
      await PinsController.createPin(data);
      queryClient.invalidateQueries({ queryKey: ['moderation', 'pending'] });
      queryClient.invalidateQueries({ queryKey: ['pin-stats'] });
      toast({
        title: 'Enviado para revisão',
        description: 'Sua ocorrência será analisada pela equipe antes de aparecer no mapa.',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Tente novamente.';
      toast({ title: 'Erro ao enviar relatório', description: message, variant: 'destructive' });
    }
  }, [queryClient]);

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
      queryClient.setQueryData(['default-location'], isDefaultLocationPin(updated) ? updated : null);
      toast({ title: 'Pin atualizado', description: 'Alterações salvas com sucesso.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível atualizar o pin.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, queryClient]);

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

  const handleUpsertDefaultLocation = useCallback(async (data: DefaultLocationInput) => {
    try {
      const marker = await PinsController.upsertDefaultLocation(data);
      updatePinsCache((prev) => replaceDefaultLocationInCache(prev, marker));
      queryClient.setQueryData(['default-location'], marker);
      setSelectedPin(marker);
      toast({
        title: defaultLocationPin ? 'Marcador atualizado' : 'Marcador configurado',
        description: 'O ponto de ocorrências sem endereço foi salvo.',
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível salvar o marcador.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, queryClient, defaultLocationPin]);

  const handleAddDefaultLocationEntry = useCallback(async (data: DefaultLocationEntryInput) => {
    try {
      const marker = await PinsController.addDefaultLocationEntry(data);
      updatePinsCache((prev) => replaceDefaultLocationInCache(prev, marker));
      queryClient.setQueryData(['default-location'], marker);
      queryClient.invalidateQueries({ queryKey: ['default-location-entries'] });
      setSelectedPin(marker);
      toast({ title: 'Ocorrência registrada', description: 'Adicionada ao histórico do marcador padrão.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível registrar a ocorrência.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, queryClient]);

  const handleDeleteDefaultLocation = useCallback(async () => {
    try {
      await PinsController.deleteDefaultLocation();
      updatePinsCache((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.filter((p) => !isDefaultLocationPin(p)),
          total: Math.max(0, prev.total - 1),
        };
      });
      queryClient.setQueryData(['default-location'], null);
      queryClient.invalidateQueries({ queryKey: ['default-location-entries'] });
      setSelectedPin(null);
      toast({ title: 'Marcador removido', description: 'O marcador padrão foi excluído.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível remover o marcador.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
      throw err;
    }
  }, [updatePinsCache, queryClient]);

  const handleAdminMovePin = useCallback(async (pinId: string, lat: number, lng: number) => {
    try {
      const updated = await PinsController.adminMovePin(pinId, { location: { lat, lng } });
      updatePinsCache((prev) =>
        prev ? { ...prev, items: prev.items.map((p) => (p.id === pinId ? updated : p)) } : prev,
      );
      setSelectedPin(updated);
      setMapMode('normal');
      setMovePinId(null);
      toast({ title: 'Pin movido', description: 'Localização atualizada.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível mover o pin.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    }
  }, [updatePinsCache]);

  const handleStartMovePin = useCallback((pinId: string) => {
    setMovePinId(pinId);
    setMapMode('move-pin');
    toast({ title: 'Mover pin', description: 'Clique no mapa na nova posição.' });
  }, []);

  const handleEntriesChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['pins'] });
    queryClient.invalidateQueries({ queryKey: ['default-location'] });
  }, [queryClient]);

  const startPlaceDefaultMarker = useCallback(() => {
    setMapMode('place-default-marker');
    setSelectedPin(null);
    toast({
      title: 'Posicionar marcador',
      description: 'Clique no mapa no local desejado.',
    });
  }, []);

  const handleRegisterDefaultEntry = useCallback(() => {
    if (!defaultLocationPin) {
      toast({
        title: 'Marcador não configurado',
        description: 'Configure o marcador padrão antes de registrar ocorrências.',
        variant: 'destructive',
      });
      return;
    }
    setEntryModalOpen(true);
  }, [defaultLocationPin]);

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
        onEntriesChanged={handleEntriesChanged}
        onRegisterDefaultEntry={() => {
          setEntryModalOpen(true);
        }}
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
                    onClick={startPlaceDefaultMarker}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/10 transition-colors w-full"
                  >
                    <MapPin size={14} />
                    {defaultLocationPin ? 'Mover marcador padrão' : 'Configurar marcador padrão'}
                  </button>
                  <button
                    onClick={handleRegisterDefaultEntry}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-violet-300 hover:bg-violet-500/10 transition-colors w-full"
                  >
                    <FilePlus size={14} />
                    Registrar sem endereço
                  </button>
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
        onClose={() => { setSetupModalOpen(false); setSetupLocation(null); }}
        location={setupLocation}
        onSubmit={handleUpsertDefaultLocation}
        existingDescription={defaultLocationPin?.description}
        existingAddress={defaultLocationPin?.address}
        existingType={defaultLocationPin?.type}
      />

      <DefaultLocationEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSubmit={handleAddDefaultLocationEntry}
      />
    </div>
  );
}
