'use client';

import { useRef, useState } from 'react';

export default function useCardFlip() {
  const [flippedIds, setFlippedIds] = useState<Set<string>>(new Set());
  const flipTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout> | null>>({});

  const toggleFlip = (id: string) => {
    setFlippedIds(prev => {
      const next = new Set(prev);
      const willFlipToBack = !next.has(id);
      if (willFlipToBack) {
        next.add(id);
        if (flipTimeoutsRef.current[id]) {
          clearTimeout(flipTimeoutsRef.current[id]!);
        }
        flipTimeoutsRef.current[id] = setTimeout(() => {
          setFlippedIds(current => {
            const reverted = new Set(current);
            reverted.delete(id);
            return reverted;
          });
          flipTimeoutsRef.current[id] = null;
        }, 2000);
      } else {
        next.delete(id);
        if (flipTimeoutsRef.current[id]) {
          clearTimeout(flipTimeoutsRef.current[id]!);
          flipTimeoutsRef.current[id] = null;
        }
      }
      return next;
    });
  };

  return { flippedIds, toggleFlip };
}
