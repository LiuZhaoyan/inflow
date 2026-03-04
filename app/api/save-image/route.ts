import { NextResponse } from 'next/server';
import { saveImageFromUrl } from '@/lib/media';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Failed to save image';
}

export async function POST(request: Request) {
  try {
    const { user, errorResponse } = await getAuthenticatedUser();
    if (errorResponse) return errorResponse;

    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const localUrl = await saveImageFromUrl(url, user.id);
    return NextResponse.json({ url: localUrl });
  } catch (error: unknown) {
    console.error('save-image error:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
