import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/errorHandler';

export async function GET() {
  const startTime = Date.now();
  const endpoint = 'GET /api/ai-depict/status';
  let userId: string | undefined;
  try {
    const { errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const isEnabled = process.env.ENABLE_AI_DEPICT === 'true';
    return NextResponse.json({ enabled: isEnabled });
  } catch (error) {
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
