import { useCallback, useEffect, useRef, useState } from 'react';

const sanitizeSelection = (text: string) => {
    const cleaned = text
        .replace(/[\n\r]+/g, ' ')
        .replace(/^[\s\p{P}\p{S}]+|[\s\p{P}\p{S}]+$/gu, '')
        .trim();
    return cleaned;
};

export default function useSelectionPopover(options?: { languageCode?: string; contextSentence?: string }) {
    const sentenceRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [selectedText, setSelectedText] = useState('');
    const [selectionRect, setSelectionRect] = useState<{ top: number; left: number } | null>(null);
    const [isAddingVocab, setIsAddingVocab] = useState(false);
    const [addVocabError, setAddVocabError] = useState<string | null>(null);

    const clearSelectionUI = useCallback(() => {
        setSelectedText('');
        setSelectionRect(null);
        setAddVocabError(null);
    }, []);

    const handleSelectionEnd = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            clearSelectionUI();
            return;
        }

        const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
        if (!range) {
            clearSelectionUI();
            return;
        }

        const container = sentenceRef.current;
        if (!container || !container.contains(range.commonAncestorContainer)) {
            clearSelectionUI();
            return;
        }

        const text = sanitizeSelection(selection.toString());
        if (!text) {
            clearSelectionUI();
            return;
        }

        const rect = range.getBoundingClientRect();
        setSelectedText(text);
        setSelectionRect({
            top: rect.top + window.scrollY - 8,
            left: rect.left + window.scrollX + rect.width / 2,
        });
    }, [clearSelectionUI]);

    const addSelectionToVocabulary = useCallback(async () => {
        if (!selectedText || isAddingVocab) return;
        setIsAddingVocab(true);
        setAddVocabError(null);

        try {
            const res = await fetch('/api/vocabulary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    word: selectedText,
                    contextSentence: options?.contextSentence,
                    language: options?.languageCode,
                }),
            });

            if (!res.ok) {
                throw new Error('Failed to add word');
            }

            clearSelectionUI();
            const selection = window.getSelection();
            selection?.removeAllRanges();
        } catch (error) {
            console.error(error);
            setAddVocabError('Failed to add word');
        } finally {
            setIsAddingVocab(false);
        }
    }, [clearSelectionUI, isAddingVocab, selectedText]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!sentenceRef.current) return;
            if (popoverRef.current?.contains(event.target as Node)) return;
            if (!sentenceRef.current.contains(event.target as Node)) {
                clearSelectionUI();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [clearSelectionUI]);

    return {
        sentenceRef,
        popoverRef,
        selectedText,
        selectionRect,
        isAddingVocab,
        addVocabError,
        handleSelectionEnd,
        addSelectionToVocabulary,
        clearSelectionUI,
    };
}
