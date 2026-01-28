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

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            audio.onended = () => {
                setPlaying(false);
                URL.revokeObjectURL(url);
            };
            await audio.play();
        } catch (error) {
            console.error(error);
            setPlaying(false);
        }
    }, [playing]);

    return { playing, playAudio };
}
