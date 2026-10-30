/**
 * ============================================================================
 * BROWSER NOTIFICATIONS UTILITY
 * ============================================================================
 * Gerencia notificações nativas do sistema operacional / navegador para o
 * término de ciclos de Foco e Pausa no Pomodoro.
 * Funciona mesmo quando a aba estiver em segundo plano (background).
 * ============================================================================
 */

export async function requestNotificationPermission() {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        return 'unsupported';
    }
    if (Notification.permission === 'granted') {
        return 'granted';
    }
    if (Notification.permission !== 'denied') {
        try {
            return await Notification.requestPermission();
        } catch (err) {
            console.warn('[Notifications] Falha ao solicitar permissão:', err);
            return Notification.permission;
        }
    }
    return Notification.permission;
}

export function isNotificationSupported() {
    return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
    if (!isNotificationSupported()) return 'unsupported';
    return Notification.permission;
}

export function sendPomodoroNotification(title, options = {}) {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return null;
    }

    try {
        const notif = new Notification(title, {
            body: options.body || '',
            icon: options.icon || '/icons/icon-192.png',
            badge: '/icons/icon-192.png',
            tag: options.tag || 'pomodoro-phase-alert',
            renotify: true,
            silent: options.silent || false
        });

        // Fechar automaticamente após 8 segundos para não poluir a Central de Ações
        setTimeout(() => {
            try {
                notif.close();
            } catch {
                /* ignore */
            }
        }, options.timeout || 8000);

        notif.onclick = () => {
            try {
                window.focus();
                notif.close();
            } catch {
                /* ignore */
            }
        };

        return notif;
    } catch (err) {
        console.warn('[Notifications] Erro ao disparar notificação nativa:', err);
        return null;
    }
}

