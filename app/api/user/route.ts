import { NextResponse } from 'next/server';
import { getUserProfile, updateUserProfile, updateProgress } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/language';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

function normalizeRequiredLanguage(input: string | undefined | null, fallback: string) {
  const normalized = normalizeLanguageCode(input || fallback);
  return normalized === 'auto' ? fallback : normalized;
}

export async function GET() {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const profile = await getUserProfile(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get user profile failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

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

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Create user profile failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

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

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Update user profile failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
