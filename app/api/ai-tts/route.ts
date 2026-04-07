import { NextResponse } from 'next/server';
import { requestTtsPersistent, requestTtsRealtime, requestTtsTemporaryUrl } from '@/lib/media/tts-service';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

function shouldUseRealtimeStream(): boolean {
  const flag = process.env.TTS_STREAM_BINARY_ENABLED;
  return flag === '1' || flag === 'true';
}

function getAudioContentType(format: 'mp3' | 'pcm' | 'flac'): string {
  if (format === 'pcm') return 'audio/wav';
  if (format === 'flac') return 'audio/flac';
  return 'audio/mpeg';
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/ai-tts';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { text, format: reqFormat, voiceId, stream=false } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const format = typeof reqFormat === 'string' && ['mp3','pcm','flac'].includes(reqFormat.toLowerCase())
      ? (reqFormat.toLowerCase() as 'mp3'|'pcm'|'flac')
      : 'mp3';

    if (stream) {
      if (shouldUseRealtimeStream()) {
        // B = optional via feature flag (env/user group)
        const buffer = await requestTtsRealtime(text, {
          voiceId,
          format,
          speed: 0.9,
        });

        return new NextResponse(new Uint8Array(buffer), {
          status: 200,
          headers: {
            'Content-Type': getAudioContentType(format),
            'Cache-Control': 'no-store',
          },
        });
      }

      // A = default MVP
      const url = await requestTtsTemporaryUrl(text, {
        voiceId,
        format,
        speed: 0.9
      });
      return NextResponse.json({ url });
    }

    try {
        const publicUrl = await requestTtsPersistent(text, {
            voiceId,
            format,
            speed: 0.9
        }, user.id);
        return NextResponse.json({ url: publicUrl });
    } catch (error: unknown) {
        throw error;
    }

  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    return handleApiError(error, {
      endpoint,
      userId,
      statusCode: 500,
      durationMs,
      originalError: error instanceof Error ? error : undefined,
    });
  }
}
