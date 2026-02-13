import { useEffect, useRef } from 'react';

/**
 * Hook for closing a menu/dropdown when clicking outside of it
 * @param isOpen - Whether the menu is currently open
 * @param onClose - Callback to close the menu
 * @returns ref to attach to the container element
 */
export function useClickOutsideClose(isOpen: boolean, onClose: () => void) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    return ref;
}
