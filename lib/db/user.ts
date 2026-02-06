import fs from 'fs/promises';
import path from 'path';
import { normalizeLanguageCode } from '@/lib/language';
import { DEFAULT_USER, type UserProfile } from '@/lib/types/user';

const USER_FILE = path.join(process.cwd(), 'data', 'user_profile.json');


function sanitizeProfile(input: Partial<UserProfile> | null | undefined): UserProfile {
  const now = Date.now();
  const base = input || {};
  const native = normalizeLanguageCode(base.nativeLanguage || DEFAULT_USER.nativeLanguage);
  const target = normalizeLanguageCode(base.targetLanguage || DEFAULT_USER.targetLanguage);
  const currentLanguage = normalizeLanguageCode(base.currentLanguageCode || base.targetLanguage || DEFAULT_USER.currentLanguageCode);

  return {
    id: base.id || DEFAULT_USER.id,
    username: typeof base.username === 'string' ? base.username.trim() : DEFAULT_USER.username,
    nativeLanguage: native === 'auto' ? DEFAULT_USER.nativeLanguage : native,
    targetLanguage: target === 'auto' ? DEFAULT_USER.targetLanguage : target,
    currentLanguageCode: currentLanguage === 'auto' ? (target === 'auto' ? DEFAULT_USER.currentLanguageCode : target) : currentLanguage,
    isOnboarded: typeof base.isOnboarded === 'boolean' ? base.isOnboarded : DEFAULT_USER.isOnboarded,
    createdAt: typeof base.createdAt === 'number' ? base.createdAt : now,
    updatedAt: typeof base.updatedAt === 'number' ? base.updatedAt : now,
  };
}

export async function initUserDb() {
  try {
    await fs.access(USER_FILE);
  } catch {
    const dataDir = path.dirname(USER_FILE);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(USER_FILE, JSON.stringify(DEFAULT_USER, null, 2), 'utf-8');
  }
}

export async function getUserProfile(): Promise<UserProfile> {
  await initUserDb();
  const data = await fs.readFile(USER_FILE, 'utf-8');
  try {
    const parsed = JSON.parse(data) as Partial<UserProfile>;
    return sanitizeProfile(parsed);
  } catch {
    return sanitizeProfile(DEFAULT_USER);
  }
}

export async function updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
  const current = await getUserProfile();
  const merged = sanitizeProfile({
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  });
  await fs.writeFile(USER_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}
