import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/helpers';

export async function GET() {
  const { errorResponse } = await getAuthenticatedUser();
  if (errorResponse) return errorResponse;

  const isEnabled = process.env.ENABLE_AI_DEPICT === 'true';
  return NextResponse.json({ enabled: isEnabled });
}
