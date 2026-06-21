import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Map from '@/components/Map';
import ReportModal from '@/components/ReportModal';
import { Pin, PinType, CreatePinInput, MapBounds, PaginatedResponse, UpdatePinInput } from '@/types';
import { toast } from '@/components/ui/use-toast';
import * as PinsController from '@/controllers/pins';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';
import { ApiError } from '@/lib/errors';
import { LogIn, LogOut, Loader2, UserPlus } from 'lucide-react';
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

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, isAdmin, user, logout } = useAuth();

  const [bounds, setBounds] = useState<MapBounds>(DEFAULT_BOUNDS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const boundsKeyStr = useMemo(() => boundsKey(bounds), [bounds]);

  const { data: pinsPage, isLoading: isLoadingPins, isError } = useQuery({
    queryKey: ['pins', boundsKeyStr],
    queryFn: () => PinsController.fetchPins({ ...bounds, limit: 200, offset: 0 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true,
  });

  const pins = pinsPage?.items ?? [];
  const total = pinsPage?.total ?? 0;
  const hasMore = pins.length < total;

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(13);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

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
    setNewPinLocation({ lat, lng });
    setReportModalOpen(true);
    updateUrl(lat, lng, zoom);
  }, [zoom, updateUrl]);

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
      });
      updatePinsCache((prev) => {
        if (!prev) return next;
        return {
          ...next,
          items: [...prev.items, ...next.items],
        };
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Não foi possível carregar mais alertas.';
      toast({ title: 'Erro', description: message, variant: 'destructive' });
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, bounds, pins.length, updatePinsCache]);

  const handleReportSubmit = useCallback(async (data: CreatePinInput) => {
    try {
      const newPin = await PinsController.createPin(data);
      updatePinsCache((prev) => {
        if (!prev) return { items: [newPin], total: 1, limit: 200, offset: 0 };
        return { ...prev, items: [newPin, ...prev.items], total: prev.total + 1 };
      });
      toast({ title: 'Relatório enviado', description: 'Seu relatório foi enviado com sucesso.' });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Tente novamente.';
      toast({ title: 'Erro ao enviar relatório', description: message, variant: 'destructive' });
    }
  }, [updatePinsCache]);

  const handleVote = useCallback(async (pinId: string) => {
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
  }, [updatePinsCache]);

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
        onDeletePin={handleDeletePin}
      />

      {/* Auth + stats overlay */}
      <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 max-w-[220px]">
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
              {isAdmin && (
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 transition-colors w-full"
                >
                  <UserPlus size={14} />
                  Usuários
                </Link>
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
      </div>

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => { setReportModalOpen(false); setNewPinLocation(null); }}
        onSubmit={handleReportSubmit}
        location={newPinLocation}
      />
    </div>
  );
}
