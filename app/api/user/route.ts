import { NextResponse } from 'next/server';
import { getUserProfile, updateUserProfile, updateProgress } from '@/lib/db';
import { normalizeLanguageCode } from '@/lib/language';

function normalizeRequiredLanguage(input: string | undefined | null, fallback: string) {
  const normalized = normalizeLanguageCode(input || fallback);
  return normalized === 'auto' ? fallback : normalized;
}

export async function GET() {
  try {
    const profile = await getUserProfile();
    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get user profile failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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
    });

    await updateProgress({ targetLanguage: profile.targetLanguage });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Create user profile failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const current = await getUserProfile();
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
    });

    await updateProgress({ targetLanguage: profile.targetLanguage });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Update user profile failed:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
