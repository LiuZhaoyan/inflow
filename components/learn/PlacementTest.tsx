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
                <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                        <GraduationCap className="text-blue-600" size={24} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Placement Test</h2>
                    <p className="text-sm text-gray-500 mt-2 mb-1">
                        We&apos;ll show you 5 sentences of increasing difficulty.
                    </p>
                    <p className="text-sm text-gray-500 mb-6">
                        For each one, tell us if you can understand it — this helps us set the right starting level.
                    </p>
                    {error && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">
                            {error}
                        </div>
                    )}
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={startTest}
                            className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            Start Test <ArrowRight size={16} />
                        </button>
                        <button
                            onClick={onSkip}
                            className="w-full px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
                <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
                    <Loader2 className="mx-auto animate-spin text-blue-600 mb-4" size={32} />
                    <p className="text-sm text-gray-500">
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
                <div className="w-full max-w-lg mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
                    {/* Progress */}
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Question {currentIndex + 1} of {sentences.length}
                        </span>
                        <span className="text-xs text-gray-400">
                            Difficulty: {sentence.level}/10
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="flex gap-1 mb-6">
                        {sentences.map((_, i) => (
                            <div
                                key={i}
                                className={`flex-1 h-1.5 rounded-full transition-colors ${
                                    i < currentIndex ? 'bg-blue-500' : i === currentIndex ? 'bg-blue-300' : 'bg-gray-200'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Sentence */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-6 mb-4 text-center">
                        <p className="text-xl font-medium text-gray-900 leading-relaxed">
                            {sentence.sentence}
                        </p>
                    </div>

                    {/* Show translation toggle */}
                    {!showTranslation ? (
                        <button
                            onClick={() => setShowTranslation(true)}
                            className="w-full text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors"
                        >
                            Show translation (peek)
                        </button>
                    ) : (
                        <div className="text-center text-sm text-gray-500 mb-4 bg-amber-50 border border-amber-100 rounded-lg p-2">
                            {sentence.translation}
                        </div>
                    )}

                    <p className="text-sm text-gray-500 text-center mb-4">
                        Can you understand this sentence?
                    </p>

                    {/* Answer buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleAnswer(false)}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all font-medium"
                        >
                            <XCircle size={18} /> Not yet
                        </button>
                        <button
                            onClick={() => handleAnswer(true)}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-medium"
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
                <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-gray-100 p-6 text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <GraduationCap className="text-green-600" size={28} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Assessment Complete!</h2>
                    <p className="text-sm text-gray-500 mt-2">Your starting level has been set to:</p>

                    <div className="mt-4 mb-2">
                        <span className="text-5xl font-extrabold text-blue-600">{resultLevel}</span>
                        <span className="text-lg text-gray-400 ml-1">/10</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">
                        {LEVEL_LABELS[resultLevel] ?? 'Intermediate'}
                    </p>
                    <p className="text-xs text-gray-400 mb-6">
                        This will automatically adjust as you learn.
                    </p>

                    <button
                        onClick={() => onComplete(resultLevel)}
                        className="w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                        Start Learning <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}
