import { useEffect, useCallback } from 'react';
import { urlBase64ToUint8Array } from '@/lib/helpers';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { apiUrl } from '@/lib/api';
import { ApiError } from '@/lib/errors';

export function useNotifications() {
    const subscribeUser = useCallback(async () => {
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
                applicationServerKey: urlBase64ToUint8Array(public_key)
            });

            const subRes = await fetch(apiUrl('/api/notifications/subscribe'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(subscription.toJSON()),
            });
            if (!subRes.ok) {
                throw new ApiError('Falha ao registrar inscrição.', subRes.status);
            }

            toast({
                title: "Notificações ativadas",
                description: "Você receberá alertas novos e atualizações de status em tempo real.",
            });
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
            const message = err instanceof ApiError ? err.message : 'Não foi possível configurar as notificações.';
            toast({
                title: "Erro ao ativar",
                description: message,
                variant: "destructive"
            });
        }
    }, []);

    useEffect(() => {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                toast({
                    title: "Ativar notificações?",
                    description: "Receba alertas novos e atualizações de status próximos a você.",
                    action: (
                        <ToastAction altText="Ativar" onClick={() => {
                            Notification.requestPermission().then(permission => {
                                if (permission === 'granted') {
                                    subscribeUser();
                                }
                            });
                        }}>
                            Ativar
                        </ToastAction>
                    ),
                });
            } else if (Notification.permission === 'granted') {
                subscribeUser();
            }
        }
    }, [subscribeUser]);

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
