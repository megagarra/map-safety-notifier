import { useEffect, useCallback } from 'react';
import { urlBase64ToUint8Array } from '@/lib/helpers';
import { toast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function useNotifications() {
    const subscribeUser = useCallback(async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push messaging is not supported');
            return;
        }

        try {
            const registration = await navigator.serviceWorker.ready;

            // 1. Pegar a chave pública do backendaaaaa
            const response = await fetch(`${API_URL}/api/notifications/vapid-public-key`);
            const { public_key } = await response.json();

            if (!public_key) {
                console.error('VAPID public key not found');
                return;
            }

            // 2. Tentar inscrever
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(public_key)
            });

            console.log('User is subscribed:', subscription);

            // 3. Enviar para o backend
            await fetch(`${API_URL}/api/notifications/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription),
            });

            toast({
                title: "✅ Notificações Ativadas",
                description: "Você receberá alertas de segurança em tempo real.",
            });
        } catch (err) {
            console.error('Failed to subscribe the user: ', err);
            toast({
                title: "❌ Erro ao ativar",
                description: "Não foi possível configurar as notificações.",
                variant: "destructive"
            });
        }
    }, []);

    useEffect(() => {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                toast({
                    title: "🔔 Ativar notificações?",
                    description: "Receba alertas de novos riscos próximos a você.",
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
                // Se já tem permissão, tenta garantir que a inscrição está atualizada no backend
                subscribeUser();
            }
        }
    }, [subscribeUser]);

    // Listener para mensagens do Service Worker (Navegação via clique)
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
