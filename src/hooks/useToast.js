import { useCallback } from 'react';

export function useToast() {
    // Note: To implement a truly global toast without Context, 
    // it's better to store toast state in AppStore or use a dedicated pub/sub.
    // For now, this hook will dispatch custom events that a global <ToastContainer /> can listen to,
    // or return a simple alert fallback if the container isn't ready.

    const showToast = useCallback((message, type = 'info') => {
        // Dispatch a custom event so the App can render it globally
        const event = new CustomEvent('show-toast', {
            detail: { message, type }
        });
        window.dispatchEvent(event);
    }, []);

    return showToast;
}
