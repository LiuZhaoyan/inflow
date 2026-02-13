import { useCallback, useState } from 'react';

export default function useAudioTTS() {
    const [playing, setPlaying] = useState(false);

    const playAudio = useCallback(async (text: string) => {
        if (!text || playing) return;
        setPlaying(true);
        try {
            const res = await fetch('/api/ai-tts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, stream: true })
            });
            if (!res.ok) throw new Error('TTS failed');

            const data = await res.json();
            const url = data?.url;
            if (!url) throw new Error('TTS missing url');
            const audio = new Audio(url);
            audio.onended = () => {
                setPlaying(false);
            };
            audio.onerror = () => {
                setPlaying(false);
            };
            await audio.play();
        } catch (error) {
            console.error(error);
            setPlaying(false);
        }
    }, [playing]);

    return { playing, playAudio };
}
