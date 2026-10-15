"use client";

import { useEffect, useRef } from "react";

export default function useDismissibleMenu() {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.key !== "Escape" || !ref.current?.open || !(event.target instanceof Element) || event.target.closest("details[open]") !== ref.current) return;
      event.preventDefault();
      event.stopPropagation();
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  return ref;
}
