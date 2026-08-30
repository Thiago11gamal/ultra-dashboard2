# src\hooks\useModalAccessibility.js

```js
import { useEffect } from 'react';

export function useModalAccessibility(isOpen, onClose, modalRef) {
    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement;

        const getFocusableElements = () => {
            if (!modalRef?.current) return [];

            const elements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );

            return Array.from(elements).filter(el => {
                return !el.disabled && el.offsetParent !== null;
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
            if (event.key === 'Escape') {
                event.stopPropagation();
                onClose?.();
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

            if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
                previouslyFocused.focus();
            }
        };
    }, [isOpen, onClose, modalRef]);
}


```
