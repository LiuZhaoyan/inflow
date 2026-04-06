import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const { email, password, username } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, trimmedEmail))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const [newUser] = await db.insert(users).values({
      id: uuidv4(),
      email: trimmedEmail,
      passwordHash,
      username: (username || '').trim(),
      nativeLanguage: 'en',
      targetLanguage: 'ko',
      currentLanguageCode: 'ko',
      isOnboarded: false,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: users.id, email: users.email });

    return NextResponse.json(
      { message: 'Account created', userId: newUser.id },
      { status: 201 },
    );
  } catch (error) {
    logger.error('Register error', {
      error: error instanceof Error ? error : new Error(String(error)),
      endpoint: 'POST /api/auth/register',
    });
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
