import { NextResponse } from 'next/server';
import { saveImageFromUrl } from '@/lib/media';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const localUrl = await saveImageFromUrl(url);
    return NextResponse.json({ url: localUrl });
  } catch (err: any) {
    console.error('save-image error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to save image' }, { status: 500 });
  }
}
