'use client';

import { TrendingDown, TrendingUp, Minus, ChevronUp, ChevronDown, Ellipsis } from 'lucide-react';
import { useState } from 'react';
import { useClickOutsideClose } from '@/hooks/useClickOutsideClose';
import { getLevelLabel } from '@/lib/domain/learn/difficulty-engine';

const STATE_COLORS: Record<string, string> = {
    struggling: 'paper-pill-soft text-[var(--accent-1)] bg-[rgba(147,51,234,0.1)]',
    learning: 'paper-pill-soft text-[var(--ink-1)] bg-[rgba(51,65,85,0.08)]',
    comfortable: 'paper-pill-soft text-[var(--success)] bg-[rgba(95,125,98,0.12)]',
    excellent: 'paper-pill-soft text-[var(--success)] bg-[rgba(95,125,98,0.18)]',
};

const STATE_LABELS: Record<string, string> = {
    struggling: 'Struggling',
    learning: 'Learning',
    comfortable: 'Comfortable',
    excellent: 'Flow',
};

const DIRECTION_LABELS = {
    decrease: 'Easier',
    maintain: 'Same',
    increase: 'Harder',
} as const;

interface DifficultyIndicatorProps {
    level: number;
    direction: 'decrease' | 'maintain' | 'increase';
    performance: string;
    onManualAdjust?: (level: number) => void;
    compact?: boolean;
}

export default function DifficultyIndicator({
    level,
    direction,
    performance,
    onManualAdjust,
    compact = false,
}: DifficultyIndicatorProps) {
    const [showAdjust, setShowAdjust] = useState(false);
    const menuRef = useClickOutsideClose(showAdjust, () => setShowAdjust(false));
    const label = getLevelLabel(level);
    const stateLabel = STATE_LABELS[performance] ?? STATE_LABELS.learning;
    const colorClass = STATE_COLORS[performance] ?? STATE_COLORS.learning;

    const DirectionIcon = direction === 'increase' ? TrendingUp : direction === 'decrease' ? TrendingDown : Minus;
    const directionColor = direction === 'increase' ? 'text-[var(--success)]' : direction === 'decrease' ? 'text-[var(--accent-1)]' : 'text-[var(--ink-3)]';
    const directionLabel = DIRECTION_LABELS[direction];

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowAdjust(prev => !prev)}
                className={compact
                    ? 'inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-[var(--ink-2)] transition-colors hover:bg-[rgba(255,255,255,0.45)]'
                    : `cursor-pointer inline-flex items-center gap-1.5 transition-colors ${colorClass}`}
                title={`${stateLabel}. Trend: ${directionLabel}. Click to adjust.`}
            >
                {compact ? <Ellipsis size={20} /> : <><span>{stateLabel}</span><DirectionIcon size={12} className={directionColor} /></>}
            </button>

            {showAdjust && onManualAdjust && (
                <div className="paper-popover absolute right-0 top-9 w-56 p-3 z-30">
                    <div className="text-xs text-[var(--ink-3)] mb-2">Adjust Challenge</div>
                    <div className="text-sm font-semibold text-[var(--ink-1)] mb-1">{stateLabel}</div>
                    <div className="text-[10px] text-[var(--ink-3)] mb-3">{label} - Trend {directionLabel}</div>

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
                                onManualAdjust(level + 1);
                                setShowAdjust(false);
                            }}
                            className="paper-btn-flat cursor-pointer flex-1 px-2 py-1.5 text-xs font-medium"
                        >
                            <ChevronUp size={12} /> Harder
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
