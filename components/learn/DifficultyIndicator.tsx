'use client';

import { TrendingDown, TrendingUp, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useClickOutsideClose } from '@/hooks/useClickOutsideClose';
import { LEVEL_LABELS } from '@/lib/difficultyEngine';

const LEVEL_COLORS: Record<string, string> = {
    struggling: 'text-orange-600 bg-orange-50 border-orange-200',
    learning: 'text-blue-600 bg-blue-50 border-blue-200',
    comfortable: 'text-green-600 bg-green-50 border-green-200',
    excellent: 'text-emerald-600 bg-emerald-50 border-emerald-200',
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
    const directionColor = direction === 'increase' ? 'text-green-500' : direction === 'decrease' ? 'text-orange-500' : 'text-gray-400';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setShowAdjust(prev => !prev)}
                className={`cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${colorClass}`}
                title={`Level ${level}/10 — ${label}. Click to adjust.`}
            >
                <span>Lv.{level}</span>
                <DirectionIcon size={12} className={directionColor} />
            </button>

            {showAdjust && onManualAdjust && (
                <div className="absolute right-0 top-9 w-56 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-30">
                    <div className="text-xs text-gray-500 mb-2">Adjust Difficulty</div>
                    <div className="text-sm font-semibold text-gray-800 mb-1">{label}</div>
                    <div className="text-[10px] text-gray-400 mb-3">Level {level}/10</div>

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
                                    i + 1 <= level ? 'bg-blue-500' : 'bg-gray-200'
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
                            className="cursor-pointer disabled:cursor-not-allowed flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-30 border border-gray-200"
                        >
                            <ChevronDown size={12} /> Easier
                        </button>
                        <button
                            onClick={() => {
                                onManualAdjust(Math.min(10, level + 1));
                                setShowAdjust(false);
                            }}
                            disabled={level >= 10}
                            className="cursor-pointer disabled:cursor-not-allowed flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-30 border border-gray-200"
                        >
                            <ChevronUp size={12} /> Harder
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
