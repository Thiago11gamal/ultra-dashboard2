import { useEffect, useRef } from 'react';

const openModalStack = [];

export function useModalAccessibility(isOpen, onClose, modalRef) {
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!isOpen) return;

        const modalToken = Symbol('modal');
        openModalStack.push(modalToken);
        const previouslyFocused = document.activeElement;

        const getFocusableElements = () => {
            if (!modalRef?.current) return [];

            const elements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            return Array.from(elements).filter(el => {
                if (el.disabled || el.getAttribute('aria-hidden') === 'true') return false;
                return el.offsetParent !== null || el.getClientRects().length > 0;
            });
        };

        const focusFirstElement = () => {
            const focusable = getFocusableElements();

            if (focusable.length > 0) {
                focusable[0].focus();
            } else {
                modalRef.current?.focus();
            }
        };

        const timer = setTimeout(focusFirstElement, 50);

        const handleKeyDown = (event) => {
            if (openModalStack[openModalStack.length - 1] !== modalToken) {
                return;
            }

            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                if (typeof onCloseRef.current === 'function') onCloseRef.current();
                return;
            }

            if (event.key === 'Tab') {
                const focusable = getFocusableElements();

                if (focusable.length === 0) return;

                const firstElement = focusable[0];
                const lastElement = focusable[focusable.length - 1];

                if (event.shiftKey && document.activeElement === firstElement) {
                    event.preventDefault();
                    lastElement.focus();
                } else if (!event.shiftKey && document.activeElement === lastElement) {
                    event.preventDefault();
                    firstElement.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            const idx = openModalStack.lastIndexOf(modalToken);
            if (idx !== -1) openModalStack.splice(idx, 1);

            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, [isOpen, modalRef]);
}

