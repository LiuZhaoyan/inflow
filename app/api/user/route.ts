import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getUserProfile, updateUserProfile, updateProgress } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';
import { handleApiError } from '@/lib/errorHandler';

function normalizeRequiredLanguage(input: string | undefined | null, fallback: string) {
  const normalized = normalizeLanguageCode(input || fallback);
  return normalized === 'auto' ? fallback : normalized;
}

export async function GET() {
  const startTime = Date.now();
  const endpoint = 'GET /api/user';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const profile = await getUserProfile(user.id);
    logger.info('User profile retrieved', { userId: user.id, endpoint: 'GET /api/user' });
    return NextResponse.json({ profile });
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

export async function POST(req: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/user';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const body = await req.json();
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const nativeLanguage = normalizeRequiredLanguage(body?.nativeLanguage, 'en');
    const targetLanguage = normalizeRequiredLanguage(body?.targetLanguage, 'ko');
    const currentLanguageCode = body?.currentLanguageCode
      ? normalizeRequiredLanguage(body.currentLanguageCode, targetLanguage)
      : targetLanguage;

    const profile = await updateUserProfile({
      username,
      nativeLanguage,
      targetLanguage,
      currentLanguageCode,
      isOnboarded: true,
    }, user.id);

    await updateProgress({ targetLanguage: profile.targetLanguage }, user.id);

    logger.info('User profile created', {
      userId: user.id,
      endpoint: 'POST /api/user',
      statusCode: 200,
    });

    return NextResponse.json({ profile });
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

export async function PUT(req: Request) {
  const startTime = Date.now();
  const endpoint = 'PUT /api/user';
  let userId: string | undefined;
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;
    userId = user.id;

    const body = await req.json();
    const current = await getUserProfile(user.id);
    if (!current) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const username = typeof body?.username === 'string' ? body.username.trim() : current.username;

    const nativeLanguage = body?.nativeLanguage
      ? normalizeRequiredLanguage(body.nativeLanguage, current.nativeLanguage)
      : current.nativeLanguage;

    const targetLanguage = body?.targetLanguage
      ? normalizeRequiredLanguage(body.targetLanguage, current.targetLanguage)
      : current.targetLanguage;

    const currentLanguageCode = body?.currentLanguageCode
      ? normalizeRequiredLanguage(body.currentLanguageCode, current.currentLanguageCode || current.targetLanguage)
      : (current.currentLanguageCode || targetLanguage);

    const profile = await updateUserProfile({
      username,
      nativeLanguage,
      targetLanguage,
      currentLanguageCode,
      isOnboarded: true,
    }, user.id);

    await updateProgress({ targetLanguage: profile.targetLanguage }, user.id);

    logger.info('User profile updated', {
      userId: user.id,
      endpoint: 'PUT /api/user',
      statusCode: 200,
    });

    return NextResponse.json({ profile });
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
