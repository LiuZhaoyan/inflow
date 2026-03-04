import { NextResponse } from 'next/server';
import { generateTTS, fetchAudioUrl } from '@/lib/ttsService';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Failed to generate speech';
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

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
        }, user.id);
        return NextResponse.json({ url: publicUrl });
    } catch (error: unknown) {
        throw new Error(getErrorMessage(error));
    }

  } catch (error: unknown) {
    console.error('TTS Error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
}
