import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { and, eq, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { handleApiError } from '@/lib/core/error-handler';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const startTime = Date.now();
  const endpoint = 'POST /api/auth/register';
  let userId: string | undefined;
  try {
    const { email, password, username } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 },
      );
    }

    const trimmedEmail = email.toLowerCase().trim();

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 },
      );
    }

    const trimmedUsername = (username || '').trim();

    // Check if user already exists by email
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

    // Check username uniqueness (only if provided and non-empty)
    if (trimmedUsername) {
      const [existingUsername] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.username, trimmedUsername), ne(users.username, '')))
        .limit(1);

      if (existingUsername) {
        return NextResponse.json(
          { error: 'This username is already taken' },
          { status: 409 },
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const now = new Date();

    const [newUser] = await db.insert(users).values({
      id: uuidv4(),
      email: trimmedEmail,
      passwordHash,
      username: trimmedUsername,
      nativeLanguage: 'en',
      targetLanguage: 'ko',
      currentLanguageCode: 'ko',
      isOnboarded: false,
      createdAt: now,
      updatedAt: now,
    }).returning({ id: users.id, email: users.email });

    userId = newUser.id;

    return NextResponse.json(
      { message: 'Account created', userId: newUser.id },
      { status: 201 },
    );
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
