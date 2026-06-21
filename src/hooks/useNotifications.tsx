import { useEffect, useCallback } from 'react';
import { urlBase64ToUint8Array } from '@/lib/helpers';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { apiUrl, getAccessToken } from '@/lib/api';
import { ApiError } from '@/lib/errors';

export function useNotifications(isStaff = false) {
  const subscribeUser = useCallback(async (withStaffToken = false) => {
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

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });

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

      const body = withStaffToken
        ? 'Alertas de moderação e publicações no mapa.'
        : 'Alertas de pins aprovados e estatísticas atualizadas.';

      toast({ title: 'Notificações ativadas', description: body });
    } catch (err) {
      console.error('Failed to subscribe the user: ', err);
      const message = err instanceof ApiError ? err.message : 'Não foi possível configurar as notificações.';
      toast({ title: 'Erro ao ativar', description: message, variant: 'destructive' });
    }
  }, []);

  useEffect(() => {
    if (!('Notification' in window)) return;

    const activate = () => subscribeUser(isStaff);

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
      activate();
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
