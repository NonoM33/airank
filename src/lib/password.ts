import bcrypt from 'bcryptjs'
import { prisma } from './db'

const BCRYPT_ROUNDS = 12

export function isBcryptHash(stored: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(stored)
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/**
 * Verify a plaintext password against a stored password.
 * - If the stored value is a bcrypt hash → bcrypt.compare.
 * - If legacy plaintext → strict equality, then lazily hash on the user row.
 */
export async function verifyAndMigratePassword(
  userId: string,
  stored: string,
  attempt: string
): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(attempt, stored)
  }
  // Legacy plaintext path
  if (stored !== attempt) return false
  try {
    const hashed = await hashPassword(attempt)
    await prisma.user.update({ where: { id: userId }, data: { password: hashed } })
  } catch (err) {
    console.error('[password] lazy migration failed', err)
  }
  return true
}
