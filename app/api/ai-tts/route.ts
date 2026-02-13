import { NextResponse } from 'next/server';
import { generateTTS, fetchAudioUrl } from '@/lib/ttsService';

export async function POST(request: Request) {
  try {
    const { text, format: reqFormat='mp3', voiceId='audiobook_female_1', stream=false } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const format = typeof reqFormat === 'string' && ['mp3','pcm','flac'].includes(reqFormat.toLowerCase())
      ? (reqFormat.toLowerCase() as 'mp3'|'pcm'|'flac')
      : 'mp3';

    if (stream) {
      const url = await fetchAudioUrl(text, {
        voiceId,
        format,
        speed: 0.9
      });
      return NextResponse.json({ url });
    }

    try {
        const publicUrl = await generateTTS(text, {
            voiceId,
            format,
            speed: 0.9
        });
        return NextResponse.json({ url: publicUrl });
    } catch (e: any) {
        throw new Error(e.message || 'TTS generation failed');
    }

  } catch (error: any) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate speech' },
      { status: 500 }
    );
  }
}
