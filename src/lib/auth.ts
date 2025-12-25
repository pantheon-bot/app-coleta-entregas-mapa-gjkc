import { cookies } from 'next/headers';
import db from '@/lib/db';
import { randomBytes } from 'crypto';

const SESSION_COOKIE_NAME = 'session_id';
const SESSION_DURATION_DAYS = 30;

export interface SessionUser {
  id: number;
  phone: string;
  role: 'CLIENTE' | 'COLETOR';
  name: string | null;
}

/**
 * Generate a secure random session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a new session for a user
 */
export async function createSession(userId: number): Promise<string> {
  const sessionId = generateSessionId();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  await db
    .insertInto('sessions')
    .values({
      id: sessionId,
      user_id: userId,
      expires_at: expiresAt,
    })
    .execute();

  return sessionId;
}

/**
 * Set session cookie
 */
export async function setSessionCookie(sessionId: string) {
  const cookieStore = await cookies();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);

  cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Get current session user from cookie
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    return null;
  }

  // Find session and join with user
  const result = await db
    .selectFrom('sessions')
    .innerJoin('users', 'users.id', 'sessions.user_id')
    .select([
      'users.id',
      'users.phone',
      'users.role',
      'users.name',
    ])
    .where('sessions.id', '=', sessionId)
    .where('sessions.expires_at', '>', new Date())
    .executeTakeFirst();

  if (!result) {
    return null;
  }

  return result;
}

/**
 * Clear session cookie
 */
export async function clearSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionId) {
    // Delete from database
    await db
      .deleteFrom('sessions')
      .where('id', '=', sessionId)
      .execute();
  }

  // Clear cookie
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}
