import { Lightbulb, Flame, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ControlButtonsProps {
    loading: boolean;
    understandCooldownActive: boolean;
    understandCooldownRemainingMs: number;
    hasQueuedUnderstand: boolean;
    auxCooldownActive: boolean;
    auxCooldownRemainingMs: number;
    hasQueuedAux: boolean;
    currentSentence: string;
    onExplain: () => void;
    onTranslate: () => void;
    onUnderstand: () => void;
}

export default function ControlButtons({
    loading,
    understandCooldownActive,
    understandCooldownRemainingMs,
    hasQueuedUnderstand,
    auxCooldownActive,
    auxCooldownRemainingMs,
    hasQueuedAux,
    currentSentence,
    onExplain,
    onTranslate,
    onUnderstand,
}: ControlButtonsProps) {
    const understandCooldownSeconds = (understandCooldownRemainingMs / 1000).toFixed(1);
    const auxCooldownSeconds = (auxCooldownRemainingMs / 1000).toFixed(1);

    return (
        <div className="space-y-2.5">
            {/* Supporting tools */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_1.35fr]">
                <motion.button
                    onClick={onExplain}
                    disabled={loading || auxCooldownActive || !currentSentence}
                    className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line-0)] bg-[var(--paper-note)] px-4 text-sm font-bold text-[var(--ink-1)] shadow-[0_2px_0_var(--line-0)] transition-colors hover:text-[var(--accent-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                    whileHover={{ y: -1, backgroundColor: 'var(--paper-1)' }}
                    whileTap={{ y: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                    <Lightbulb size={19} className="text-amber-500" />
                    <span>Explain</span>
                </motion.button>

                <motion.button
                    onClick={onTranslate}
                    disabled={loading || auxCooldownActive || !currentSentence}
                    className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-[var(--line-0)] bg-[var(--paper-note)] px-4 text-sm font-bold text-[var(--ink-1)] shadow-[0_2px_0_var(--line-0)] transition-colors hover:text-[var(--accent-1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                    whileHover={{ y: -1, backgroundColor: 'var(--paper-1)' }}
                    whileTap={{ y: 2 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                    <ArrowRightLeft size={19} className="text-teal-600" />
                    <span>Translate</span>
                </motion.button>

                {/* Primary action */}
                <motion.button
                    onClick={onUnderstand}
                    disabled={loading || understandCooldownActive || !currentSentence}
                    className="col-span-2 flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#5b21b6] bg-[var(--accent-1)] px-6 text-base font-extrabold text-white shadow-[0_4px_0_#5b21b6] transition-[filter,box-shadow] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-1"
                    whileHover={{ y: -1 }}
                    whileTap={{ y: 3 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                >
                    <Flame size={21} className="text-white/90" />
                    <span>Got it!</span>
                </motion.button>
            </div>

            {/* Cooldown messages — animated in/out */}
            <AnimatePresence>
                {auxCooldownActive && (
                    <motion.p
                        key="aux-cooldown"
                        className="text-xs text-[var(--ink-2)]"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                    >
                        Explain/Translate cooldown in {auxCooldownSeconds}s...
                        {hasQueuedAux ? ' Latest action queued.' : ''}
                    </motion.p>
                )}
                {understandCooldownActive && (
                    <motion.p
                        key="understand-cooldown"
                        className="text-xs text-[var(--ink-2)]"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18 }}
                    >
                        Next sentence in {understandCooldownSeconds}s...
                        {hasQueuedUnderstand ? ' Latest action queued.' : ''}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
