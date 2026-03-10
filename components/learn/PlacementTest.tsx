'use client';

import { useState, useCallback } from 'react';
import { CheckCircle, XCircle, Loader2, ArrowRight, GraduationCap } from 'lucide-react';
import { LEVEL_LABELS } from '@/lib/difficultyEngine';

interface PlacementSentence {
    level: number;
    sentence: string;
    translation: string;
}

interface PlacementTestProps {
    languageCode: string;
    onComplete: (level: number) => void;
    onSkip: () => void;
}

export default function PlacementTest({ languageCode, onComplete, onSkip }: PlacementTestProps) {
    const [phase, setPhase] = useState<'intro' | 'loading' | 'testing' | 'submitting' | 'result'>('intro');
    const [sentences, setSentences] = useState<PlacementSentence[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Array<{ level: number; understood: boolean }>>([]);
    const [showTranslation, setShowTranslation] = useState(false);
    const [resultLevel, setResultLevel] = useState(3);
    const [error, setError] = useState<string | null>(null);

    const startTest = useCallback(async () => {
        setPhase('loading');
        setError(null);
        try {
            const res = await fetch('/api/placement-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'start', languageCode }),
            });
            if (!res.ok) throw new Error('Failed to start test');
            const data = await res.json();
            if (!data.sentences?.length) throw new Error('No sentences returned');
            setSentences(data.sentences);
            setCurrentIndex(0);
            setAnswers([]);
            setPhase('testing');
        } catch (err) {
            console.error(err);
            setError('Failed to generate test sentences. Try again.');
            setPhase('intro');
        }
    }, [languageCode]);

    const handleAnswer = useCallback(async (understood: boolean) => {
        const sentence = sentences[currentIndex];
        const newAnswers = [...answers, { level: sentence.level, understood }];
        setAnswers(newAnswers);
        setShowTranslation(false);

        if (currentIndex < sentences.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            // Submit all answers
            setPhase('submitting');
            try {
                const res = await fetch('/api/placement-test', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'answer', languageCode, answers: newAnswers }),
                });
                if (!res.ok) throw new Error('Failed to submit');
                const data = await res.json();
                setResultLevel(data.level);
                setPhase('result');
            } catch (err) {
                console.error(err);
                setError('Failed to submit answers. Try again.');
                setPhase('testing');
            }
        }
    }, [answers, currentIndex, languageCode, sentences]);

    // ── Intro ──
    if (phase === 'intro') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="paper-panel-flat w-full max-w-md mx-4 p-6 text-center">
                    <div className="paper-icon-well mx-auto w-12 h-12 rounded-full mb-4 text-[var(--accent-1)]">
                        <GraduationCap size={24} />
                    </div>
                    <h2 className="paper-title text-2xl">Placement Test</h2>
                    <p className="paper-subtitle text-sm mt-2 mb-1 mx-auto">
                        We&apos;ll show you 5 sentences of increasing difficulty.
                    </p>
                    <p className="paper-subtitle text-sm mb-6 mx-auto">
                        For each one, tell us if you can understand it — this helps us set the right starting level.
                    </p>
                    {error && (
                        <div className="paper-alert-soft-danger text-sm px-3 py-2 mb-4">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={startTest}
                            className="paper-btn-primary w-full"
                        >
                            Start Test <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={onSkip}
                            className="paper-btn-flat w-full text-sm"
                        >
                            Skip — start as beginner
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Loading ──
    if (phase === 'loading' || phase === 'submitting') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="paper-panel-flat w-full max-w-md mx-4 p-8 text-center">
                    <Loader2 className="mx-auto animate-spin text-[var(--accent-1)] mb-4" size={32} />
                    <p className="text-sm text-[var(--ink-2)]">
                        {phase === 'loading' ? 'Generating test sentences...' : 'Analyzing your results...'}
                    </p>
                </div>
            </div>
        );
    }

    // ── Testing ──
    if (phase === 'testing' && sentences.length > 0) {
        const sentence = sentences[currentIndex];
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="paper-panel-flat w-full max-w-lg mx-4 p-6">
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-[var(--ink-3)] uppercase tracking-wider">
                            Question {currentIndex + 1} of {sentences.length}
                        </span>
                        <span className="text-xs text-[var(--ink-3)]">
                            Difficulty: {sentence.level}/10
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex gap-1 mb-6">
                        {sentences.map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 h-1.5 rounded-full transition-colors ${
                                    i < currentIndex ? 'bg-[var(--accent-0)]' : i === currentIndex ? 'bg-[var(--accent-2)]' : 'bg-[var(--paper-2)]'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Sentence */}
                    <div className="paper-panel-soft p-6 mb-4 text-center">
                        <p className="text-xl font-medium text-[var(--ink-0)] leading-relaxed">
                            {sentence.sentence}
                        </p>
                    </div>

                    {/* Show translation toggle */}
                    {!showTranslation ? (
                        <button
                            onClick={() => setShowTranslation(true)}
                            className="w-full text-xs text-[var(--ink-3)] hover:text-[var(--ink-1)] mb-4 transition-colors"
                        >
                            Show translation (peek)
                        </button>
                    ) : (
                        <div className="paper-panel-soft text-center text-sm text-[var(--ink-2)] mb-4 p-2">
                            {sentence.translation}
                        </div>
                    )}

                    <p className="text-sm text-[var(--ink-2)] text-center mb-4">
                        Can you understand this sentence?
                    </p>

                    {/* Answer buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleAnswer(false)}
                            className="paper-btn-flat font-medium"
                        >
                            <XCircle size={18} /> Not yet
                        </button>
                        <button
                            onClick={() => handleAnswer(true)}
                            className="paper-btn-primary font-medium"
                        >
                            <CheckCircle size={18} /> I understand
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Result ──
    if (phase === 'result') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
                <div className="paper-panel-flat w-full max-w-md mx-4 p-6 text-center">
                    <div className="paper-icon-well mx-auto w-16 h-16 rounded-full mb-4 text-[var(--success)] bg-[rgba(95,125,98,0.14)]">
                        <GraduationCap size={28} />
                    </div>
                    <h2 className="paper-title text-2xl">Assessment Complete!</h2>
                    <p className="text-sm text-[var(--ink-2)] mt-2">Your starting level has been set to:</p>

                    <div className="mt-4 mb-2">
                        <span className="text-5xl font-extrabold text-[var(--accent-1)]">{resultLevel}</span>
                        <span className="text-lg text-[var(--ink-3)] ml-1">/10</span>
                    </div>
                    <p className="text-sm font-semibold text-[var(--ink-1)] mb-1">
                        {LEVEL_LABELS[resultLevel] ?? 'Intermediate'}
                    </p>
                    <p className="text-xs text-[var(--ink-3)] mb-6">
                        This will automatically adjust as you learn.
                    </p>

                    <button
                        onClick={() => onComplete(resultLevel)}
                        className="paper-btn-primary w-full"
                    >
                        Start Learning <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
