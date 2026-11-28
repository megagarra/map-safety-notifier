import { useEffect, useCallback } from 'react';
import { urlBase64ToUint8Array } from '@/lib/helpers';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { apiUrl, getAccessToken } from '@/lib/api';
import { ApiError } from '@/lib/errors';

export function useNotifications(isStaff = false) {
  const subscribeUser = useCallback(async (withStaffToken = false, silent = false) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      const response = await fetch(apiUrl('/api/notifications/vapid-public-key'));
      if (!response.ok) {
        throw new ApiError('Não foi possível obter a chave VAPID.', response.status);
      }
      const { public_key } = await response.json();

      if (!public_key) {
        console.error('VAPID public key not found');
        return;
      }

      // Reaproveita a inscrição existente em vez de criar outra a cada carregamento
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      }));

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (withStaffToken) {
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const subRes = await fetch(apiUrl('/api/notifications/subscribe'), {
        method: 'POST',
        headers,
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!subRes.ok) {
        throw new ApiError('Falha ao registrar inscrição.', subRes.status);
      }
      // Keep the saved alert zone attached even if the browser rotated the subscription.
      const zone = loadAlertZone();
      if (zone) {
        fetch(apiUrl('/api/notifications/zone'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint, auth: subscription.toJSON().keys?.auth, ...zone }),
        }).catch(() => undefined);
      }

      if (silent) return;

      const body = withStaffToken
        ? 'Alertas de moderação e publicações no mapa.'
        : 'Alertas de pins aprovados e estatísticas atualizadas.';

      toast({ title: 'Notificações ativadas', description: body });
    } catch (err) {
      console.error('Failed to subscribe the user: ', err);
      if (silent) return;
      const message = err instanceof ApiError ? err.message : 'Não foi possível configurar as notificações.';
      toast({ title: 'Erro ao ativar', description: message, variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;

    const activate = (silent = false) => subscribeUser(isStaff, silent);

    if (Notification.permission === 'default') {
      toast({
        title: 'Ativar notificações?',
        description: isStaff
          ? 'Receba alertas quando entrar ocorrência na fila de moderação.'
          : 'Receba alertas de pins aprovados e estatísticas atualizadas.',
        action: (
          <ToastAction altText="Ativar" onClick={() => {
            Notification.requestPermission().then((permission) => {
              if (permission === 'granted') activate();
            });
          }}>
            Ativar
          </ToastAction>
        ),
      });
    } else if (Notification.permission === 'granted') {
      // Já autorizado: apenas sincroniza a inscrição, sem toast a cada visita
      activate(true);
    }
  }, [subscribeUser, isStaff]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'NAVIGATE') {
          window.location.href = event.data.url;
        }
      };
      navigator.serviceWorker.addEventListener('message', handleMessage);
      return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
    }
  }, []);
}

// --- Alert zone (receive push only near a point) ---

export type AlertZone = { lat: number; lng: number; radiusM: number } | null;
const ZONE_KEY = 'map-safety:alert-zone';

export function loadAlertZone(): AlertZone {
  try {
    const z = JSON.parse(localStorage.getItem(ZONE_KEY) || 'null');
    return z && Number.isFinite(z.lat) && Number.isFinite(z.radiusM) ? z : null;
  } catch {
    return null;
  }
}

/** Ensures push permission + subscription, then stores the zone on the server. Returns false if not possible. */
export async function saveAlertZone(zone: AlertZone): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    toast({ title: 'Não suportado', description: 'Este navegador não suporta notificações.', variant: 'destructive' });
    return false;
  }
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') {
      toast({ title: 'Notificações bloqueadas', description: 'Permita notificações no navegador para receber alertas.' });
      return false;
    }
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      const r = await fetch(apiUrl('/api/notifications/vapid-public-key'));
      const { public_key } = await r.json();
      sub = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(public_key) });
    }
    // Make sure the server knows this subscription (no-op for existing rows; never downgrades staff).
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const subRes = await fetch(apiUrl('/api/notifications/subscribe'), { method: 'POST', headers, body: JSON.stringify(sub.toJSON()) });
    if (!subRes.ok) throw new ApiError('Este navegador não pôde ser registrado para notificações.', subRes.status);
    const res = await fetch(apiUrl('/api/notifications/zone'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint, auth: sub.toJSON().keys?.auth, lat: zone?.lat ?? null, lng: zone?.lng ?? null, radiusM: zone?.radiusM ?? null }),
    });
    if (!res.ok) throw new ApiError('Falha ao salvar a área de alertas.', res.status);
    try {
      if (zone) localStorage.setItem(ZONE_KEY, JSON.stringify(zone));
      else localStorage.removeItem(ZONE_KEY);
    } catch { /* ignore */ }
    toast({
      title: 'Alertas atualizados',
      description: zone
        ? `Você receberá alertas num raio de ${zone.radiusM >= 1000 ? `${zone.radiusM / 1000} km` : `${zone.radiusM} m`} deste ponto.`
        : 'Você receberá alertas de toda a cidade.',
    });
    return true;
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Não foi possível salvar.';
    toast({ title: 'Erro', description: message, variant: 'destructive' });
    return false;
  }
}
