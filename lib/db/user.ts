import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { db } from './connection';
import { users } from './schema';
import { normalizeLanguageCode } from '@/lib/language';
import { DEFAULT_USER, type UserProfile } from '@/lib/types/user';

const LEGACY_SINGLE_USER_ID = DEFAULT_USER.id;
const LEGACY_SINGLE_USER_EMAIL = 'single-user@local';

type DbUser = typeof users.$inferSelect;

function toMillis(value: Date | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return Date.now();
}

function sanitizeLanguage(value: string | null | undefined, fallback: string): string {
  const normalized = normalizeLanguageCode(value || fallback);
  return normalized === 'auto' ? fallback : normalized;
}

function mapDbUserToProfile(user: DbUser): UserProfile {
  const nativeLanguage = sanitizeLanguage(user.nativeLanguage, DEFAULT_USER.nativeLanguage);
  const targetLanguage = sanitizeLanguage(user.targetLanguage, DEFAULT_USER.targetLanguage);
  const currentLanguageCode = sanitizeLanguage(
    user.currentLanguageCode || targetLanguage,
    targetLanguage,
  );

  return {
    id: user.id,
    username: typeof user.username === 'string' ? user.username.trim() : DEFAULT_USER.username,
    nativeLanguage,
    targetLanguage,
    currentLanguageCode,
    isOnboarded: Boolean(user.isOnboarded),
    createdAt: toMillis(user.createdAt),
    updatedAt: toMillis(user.updatedAt),
  };
}

function sanitizeProfile(input: Partial<UserProfile> | null | undefined): UserProfile {
  const now = Date.now();
  const base = input || {};
  const nativeLanguage = sanitizeLanguage(base.nativeLanguage, DEFAULT_USER.nativeLanguage);
  const targetLanguage = sanitizeLanguage(base.targetLanguage, DEFAULT_USER.targetLanguage);
  const currentLanguageCode = sanitizeLanguage(
    base.currentLanguageCode || targetLanguage,
    targetLanguage,
  );

  return {
    id: base.id || LEGACY_SINGLE_USER_ID,
    username: typeof base.username === 'string' ? base.username.trim() : DEFAULT_USER.username,
    nativeLanguage,
    targetLanguage,
    currentLanguageCode,
    isOnboarded: typeof base.isOnboarded === 'boolean' ? base.isOnboarded : DEFAULT_USER.isOnboarded,
    createdAt: typeof base.createdAt === 'number' ? base.createdAt : now,
    updatedAt: typeof base.updatedAt === 'number' ? base.updatedAt : now,
  };
}

function profileToDbInsert(profile: UserProfile) {
  return {
    id: profile.id,
    email: LEGACY_SINGLE_USER_EMAIL,
    passwordHash: '',
    username: profile.username,
    nativeLanguage: profile.nativeLanguage,
    targetLanguage: profile.targetLanguage,
    currentLanguageCode: profile.currentLanguageCode || profile.targetLanguage,
    isOnboarded: profile.isOnboarded,
    createdAt: new Date(profile.createdAt),
    updatedAt: new Date(profile.updatedAt),
  };
}

export async function initUserDb() {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, LEGACY_SINGLE_USER_ID))
    .limit(1);

  if (!existing) {
    const profile = sanitizeProfile(DEFAULT_USER);
    await db
      .insert(users)
      .values(profileToDbInsert(profile))
      .onConflictDoNothing({ target: users.email });
  }
}

export async function getUserById(userId: string): Promise<UserProfile | null> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!existing) return null;
  return mapDbUserToProfile(existing);
}

export async function getUserByEmail(email: string) {
  const trimmedEmail = email.toLowerCase().trim();
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.email, trimmedEmail))
    .limit(1);

  return existing || null;
}

export async function ensureUserExistsById(input: {
  id: string;
  email?: string;
  name?: string | null;
}) {
  const existing = await getUserById(input.id);
  if (existing) return existing;

  const now = new Date();
  const email = (input.email || `${input.id}@local.dev`).toLowerCase().trim();

  await db
    .insert(users)
    .values({
      id: input.id,
      email,
      passwordHash: '',
      username: (input.name || DEFAULT_USER.username || '').trim(),
      nativeLanguage: DEFAULT_USER.nativeLanguage,
      targetLanguage: DEFAULT_USER.targetLanguage,
      currentLanguageCode: DEFAULT_USER.currentLanguageCode || DEFAULT_USER.targetLanguage,
      isOnboarded: true,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: users.id });

  const created = await getUserById(input.id);
  if (created) return created;

  const byEmail = await getUserByEmail(email);
  return byEmail ? sanitizeProfile(mapDbUserToProfile(byEmail)) : null;
}

export async function createUser(input: {
  email: string;
  password: string;
  username?: string;
  nativeLanguage?: string;
  targetLanguage?: string;
  currentLanguageCode?: string;
}) {
  const now = new Date();
  const email = input.email.toLowerCase().trim();
  const targetLanguage = sanitizeLanguage(input.targetLanguage, DEFAULT_USER.targetLanguage);
  const currentLanguageCode = sanitizeLanguage(
    input.currentLanguageCode || targetLanguage,
    targetLanguage,
  );

  const passwordHash = await bcrypt.hash(input.password, 12);

  const [created] = await db
    .insert(users)
    .values({
      id: uuidv4(),
      email,
      passwordHash,
      username: (input.username || '').trim(),
      nativeLanguage: sanitizeLanguage(input.nativeLanguage, DEFAULT_USER.nativeLanguage),
      targetLanguage,
      currentLanguageCode,
      isOnboarded: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return mapDbUserToProfile(created);
}

export async function getUserProfile(): Promise<UserProfile>;
export async function getUserProfile(userId: string): Promise<UserProfile | null>;
export async function getUserProfile(userId: string = LEGACY_SINGLE_USER_ID): Promise<UserProfile | null> {
  await initUserDb();

  const existing = await getUserById(userId);
  if (existing) {
    return sanitizeProfile(existing);
  }

  if (userId === LEGACY_SINGLE_USER_ID) {
    const existingLegacyUser = await getUserByEmail(LEGACY_SINGLE_USER_EMAIL);
    if (existingLegacyUser) {
      return sanitizeProfile(mapDbUserToProfile(existingLegacyUser));
    }

    const fallback = sanitizeProfile(DEFAULT_USER);
    await db
      .insert(users)
      .values(profileToDbInsert(fallback))
      .onConflictDoNothing({ target: users.email });

    const created = await getUserById(LEGACY_SINGLE_USER_ID);
    if (created) return sanitizeProfile(created);

    const afterConflictLegacy = await getUserByEmail(LEGACY_SINGLE_USER_EMAIL);
    if (afterConflictLegacy) {
      return sanitizeProfile(mapDbUserToProfile(afterConflictLegacy));
    }

    return fallback;
  }

  return null;
}

export async function updateUserProfile(
  updates: Partial<UserProfile>,
  userId: string = LEGACY_SINGLE_USER_ID,
): Promise<UserProfile> {
  const current = await getUserProfile(userId);
  if (!current) {
    throw new Error(`User not found: ${userId}`);
  }

  const merged = sanitizeProfile({
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  });

  await db
    .update(users)
    .set({
      username: merged.username,
      nativeLanguage: merged.nativeLanguage,
      targetLanguage: merged.targetLanguage,
      currentLanguageCode: merged.currentLanguageCode || merged.targetLanguage,
      isOnboarded: merged.isOnboarded,
      updatedAt: new Date(merged.updatedAt),
    })
    .where(eq(users.id, merged.id));

  return merged;
}
