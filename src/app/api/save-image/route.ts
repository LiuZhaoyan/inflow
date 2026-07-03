import { NextResponse } from 'next/server';
import { saveImageFromUrl } from '@/lib/media/image-storage';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/core/error-handler';

export async function POST(request: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/save-image';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const localUrl = await saveImageFromUrl(url, user.id);
    return NextResponse.json({ url: localUrl });
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
