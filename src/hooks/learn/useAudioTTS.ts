import { useCallback, useState } from 'react';
import { logger } from '@/lib/core/logger';

export default function useAudioTTS() {
    const [playing, setPlaying] = useState(false);

    const requestTemporaryUrl = useCallback(async (text: string): Promise<string> => {
        const res = await fetch('/api/ai-tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, stream: true })
        });
        if (!res.ok) throw new Error('TTS failed');

        const data = await res.json();
        const url = data?.url;
        if (!url) throw new Error('TTS missing url');

        return url;
    }, []);

    const playFromUrl = useCallback((url: string) => {
        return new Promise<void>((resolve, reject) => {
            const audio = new Audio(url);

            const cleanup = () => {
                audio.onended = null;
                audio.onerror = null;
            };

            audio.onended = () => {
                cleanup();
                resolve();
            };

            audio.onerror = () => {
                cleanup();
                reject(new Error('Audio playback failed'));
            };

            audio.play().catch((error) => {
                cleanup();
                reject(error);
            });
        });
    }, []);

    const playAudio = useCallback(async (text: string) => {
        if (!text || playing) return;
        setPlaying(true);
        try {
            const firstUrl = await requestTemporaryUrl(text);

            try {
                await playFromUrl(firstUrl);
            } catch {
                const refreshedUrl = await requestTemporaryUrl(text);
                await playFromUrl(refreshedUrl);
            }
        } catch (error) {
            logger.error('useAudioTTS: Failed to play audio', error);
            alert('Audio URL expired. Please retry.');
        } finally {
            setPlaying(false);
        }
    }, [playing, playFromUrl, requestTemporaryUrl]);

    return { playing, playAudio };
}
