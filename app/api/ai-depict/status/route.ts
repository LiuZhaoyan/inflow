import { NextResponse } from 'next/server';

export async function GET() {
  const isEnabled = process.env.ENABLE_AI_DEPICT === 'true';
  return NextResponse.json({ enabled: isEnabled });
}
