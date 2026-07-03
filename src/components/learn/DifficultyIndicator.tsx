'use client';

import { TrendingDown, TrendingUp, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useClickOutsideClose } from '@/hooks/useClickOutsideClose';
import { LEVEL_LABELS } from '@/lib/domain/learn/difficulty-engine';

const LEVEL_COLORS: Record<string, string> = {
    struggling: 'paper-pill-soft text-[var(--accent-1)] bg-[rgba(147,51,234,0.1)]',
    learning: 'paper-pill-soft text-[var(--ink-1)] bg-[rgba(51,65,85,0.08)]',
    comfortable: 'paper-pill-soft text-[var(--success)] bg-[rgba(95,125,98,0.12)]',
    excellent: 'paper-pill-soft text-[var(--success)] bg-[rgba(95,125,98,0.18)]',
};

interface DifficultyIndicatorProps {
    level: number;
    direction: 'decrease' | 'maintain' | 'increase';
    performance: string;
    onManualAdjust?: (level: number) => void;
}

export default function DifficultyIndicator({
    level,
    direction,
    performance,
    onManualAdjust,
}: DifficultyIndicatorProps) {
    const [showAdjust, setShowAdjust] = useState(false);
    const menuRef = useClickOutsideClose(showAdjust, () => setShowAdjust(false));
    const label = LEVEL_LABELS[Math.max(1, Math.min(10, level))] ?? 'Intermediate';
    const colorClass = LEVEL_COLORS[performance] ?? LEVEL_COLORS.learning;

    const DirectionIcon = direction === 'increase' ? TrendingUp : direction === 'decrease' ? TrendingDown : Minus;
    const directionColor = direction === 'increase' ? 'text-[var(--success)]' : direction === 'decrease' ? 'text-[var(--accent-1)]' : 'text-[var(--ink-3)]';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowAdjust(prev => !prev)}
                className={`cursor-pointer inline-flex items-center gap-1.5 transition-colors ${colorClass}`}
                title={`Level ${level}/10 — ${label}. Click to adjust.`}
            >
                <span>Lv.{level}</span>
                <DirectionIcon size={12} className={directionColor} />
            </button>

            {showAdjust && onManualAdjust && (
                <div className="paper-popover absolute right-0 top-9 w-56 p-3 z-30">
                    <div className="text-xs text-[var(--ink-3)] mb-2">Adjust Difficulty</div>
                    <div className="text-sm font-semibold text-[var(--ink-1)] mb-1">{label}</div>
                    <div className="text-[10px] text-[var(--ink-3)] mb-3">Level {level}/10</div>

                    {/* Level bar */}
                    <div className="flex items-center gap-1 mb-3">
                        {Array.from({ length: 10 }, (_, i) => (
                            <button
                                key={i}
                                onClick={() => {
                                    onManualAdjust(i + 1);
                                    setShowAdjust(false);
                                }}
                                className={`flex-1 h-2 rounded-full transition-all cursor-pointer hover:scale-y-150 ${
                                    i + 1 <= level ? 'bg-[var(--accent-0)]' : 'bg-[var(--paper-2)]'
                                }`}
                                title={`Set to level ${i + 1}`}
                            />
                        ))}
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                onManualAdjust(Math.max(1, level - 1));
                                setShowAdjust(false);
                            }}
                            disabled={level <= 1}
                            className="paper-btn-flat cursor-pointer disabled:cursor-not-allowed flex-1 px-2 py-1.5 text-xs font-medium"
                        >
                            <ChevronDown size={12} /> Easier
                        </button>
                        <button
                            onClick={() => {
                                onManualAdjust(Math.min(10, level + 1));
                                setShowAdjust(false);
                            }}
                            disabled={level >= 10}
                            className="paper-btn-flat cursor-pointer disabled:cursor-not-allowed flex-1 px-2 py-1.5 text-xs font-medium"
                        >
                            <ChevronUp size={12} /> Harder
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
