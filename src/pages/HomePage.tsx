import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Map from '@/components/Map';
import ReportModal from '@/components/ReportModal';
import { Pin, PinType, CreatePinInput } from '@/types';
import { toast } from '@/components/ui/use-toast';
import * as PinsController from '@/controllers/pins';
import { useNotifications } from '@/hooks/useNotifications';

const FALLBACK_CENTER: [number, number] = [-23.3343, -46.6953];

export default function HomePage() {
  const navigate = useNavigate();

  const { data: pins = [], isLoading: isLoadingPins, isError } = useQuery({
    queryKey: ['pins'],
    queryFn: () => PinsController.fetchPins(100), // Aumentado para 100 para pegar mais alertas recentes
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: true, // Importante para notificações com o app minimizado
  });

  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [center, setCenter] = useState<[number, number] | null>(null);
  const [zoom, setZoom] = useState(13);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [newPinLocation, setNewPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);

  // Ativa as notificações push
  useNotifications();

  useEffect(() => {
    if (isError) {
      toast({ title: 'Erro ao carregar pins', description: 'Não foi possível carregar os dados do mapa', variant: 'destructive' });
    }
  }, [isError]);

  const urlTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

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

    // Try high accuracy first (GPS)
    navigator.geolocation.getCurrentPosition(onSuccess, () => {
      // If high accuracy fails, try low accuracy (network/wifi)
      navigator.geolocation.getCurrentPosition(onSuccess, () => {
        if (resolved) return;
        resolved = true;
        setCenter(FALLBACK_CENTER);
        setIsLoadingLocation(false);
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 });

    // Safety timeout — don't block forever
    const safetyTimer = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      setCenter(FALLBACK_CENTER);
      setIsLoadingLocation(false);
    }, 15000);

    return () => clearTimeout(safetyTimer);
  }, []);

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

  const handleReportSubmit = useCallback(async (data: CreatePinInput) => {
    try {
      const newPin = await PinsController.createPin(data);
      if (newPin) {
        queryClient.setQueryData<Pin[]>(['pins'], (prev) => (prev ? [newPin, ...prev] : [newPin]));
        toast({ title: 'Relatório enviado', description: 'Seu relatório foi enviado com sucesso.' });
      }
    } catch {
      toast({ title: 'Erro ao enviar relatório', description: 'Tente novamente.', variant: 'destructive' });
    }
  }, [queryClient]);

  const handleVote = useCallback(async (pinId: string) => {
    try {
      const updated = await PinsController.voteOnPin(pinId);
      if (updated) {
        queryClient.setQueryData<Pin[]>(['pins'], (prev) =>
          prev ? prev.map((p) => (p.id === pinId ? updated : p)) : prev
        );
        setSelectedPin((prev) => (prev?.id === pinId ? updated : prev));
        toast({ title: 'Voto registrado', description: 'Obrigado por confirmar este problema.' });
      }
    } catch {
      toast({ title: 'Erro ao registrar voto', description: 'Tente novamente.', variant: 'destructive' });
    }
  }, [queryClient]);

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
        selectedPinTypes={null}
        selectedPin={selectedPin}
        center={center}
        zoom={zoom}
        onVote={handleVote}
      />

      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => { setReportModalOpen(false); setNewPinLocation(null); }}
        onSubmit={handleReportSubmit}
        location={newPinLocation}
      />
    </div>
  );
}
