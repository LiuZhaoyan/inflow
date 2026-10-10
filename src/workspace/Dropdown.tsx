"use client";

import { useEffect, useRef, type ReactNode } from "react";
import "./dropdown.css";

export type DropdownOption<T extends string = string> = { value: T; label: string; disabled?: boolean };

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly DropdownOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  direction?: "up" | "down";
  trigger?: ReactNode;
  title?: string;
};

export default function Dropdown<T extends string>({
  label, value, options, onChange, placeholder, className = "", disabled = false, direction = "down", trigger, title,
}: Props<T>) {
  const ref = useRef<HTMLDetailsElement>(null);
  const selected = options.find(option => option.value === value);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) ref.current.open = false;
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  return <details ref={ref} className={["inflow-dropdown", className].filter(Boolean).join(" ")} data-direction={direction} onKeyDown={event => { if (event.key === "Escape" && ref.current?.open) { event.preventDefault(); event.stopPropagation(); ref.current.open = false; ref.current.querySelector("summary")?.focus(); } }}>
    <summary aria-label={label} title={title} aria-disabled={disabled} onClick={event => { if (disabled) event.preventDefault(); }}>
      {trigger ?? <>
      <span className="inflow-dropdown-value">{selected?.label ?? placeholder ?? label}</span>
      <svg className="inflow-dropdown-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
      </>}
    </summary>
    <div className="inflow-dropdown-options" role="group" aria-label={label} onKeyDown={event => {
      const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); if (ref.current) ref.current.open = false; ref.current?.querySelector("summary")?.focus();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        buttons[(current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault(); buttons[event.key === "Home" ? 0 : buttons.length - 1]?.focus();
      }
    }}>
      {options.map(option => <button key={option.value} type="button" disabled={option.disabled || disabled} aria-current={option.value === value ? "true" : undefined} onClick={() => {
        onChange(option.value);
        if (ref.current) ref.current.open = false;
        ref.current?.querySelector("summary")?.focus();
      }}>{option.label}{option.value === value && <span className="inflow-dropdown-check" aria-hidden="true">✓</span>}</button>)}
    </div>
  </details>;
}
