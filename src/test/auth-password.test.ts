import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'

// Mock prisma before importing auth
vi.mock('@/lib/db', () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
    },
  },
}))

import { verifyAndMigratePassword, hashPassword } from '@/lib/password'
import { prisma } from '@/lib/db'

describe('auth password hashing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hashPassword produces a bcrypt hash of the right shape', async () => {
    const h = await hashPassword('secret123')
    expect(h).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/)
    expect(await bcrypt.compare('secret123', h)).toBe(true)
    expect(await bcrypt.compare('wrong', h)).toBe(false)
  })

  it('verifies against a bcrypt hash (no migration)', async () => {
    const stored = await bcrypt.hash('hello', 12)
    const ok = await verifyAndMigratePassword('u1', stored, 'hello')
    expect(ok).toBe(true)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('rejects wrong password against bcrypt hash', async () => {
    const stored = await bcrypt.hash('hello', 12)
    expect(await verifyAndMigratePassword('u1', stored, 'nope')).toBe(false)
  })

  it('accepts legacy plaintext on first login AND migrates it', async () => {
    const ok = await verifyAndMigratePassword('u1', 'legacy-plain', 'legacy-plain')
    expect(ok).toBe(true)
    expect(prisma.user.update).toHaveBeenCalledTimes(1)
    const call = (prisma.user.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where.id).toBe('u1')
    expect(call.data.password).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/)
  })

  it('rejects legacy plaintext with wrong value and does not migrate', async () => {
    const ok = await verifyAndMigratePassword('u1', 'legacy-plain', 'wrong')
    expect(ok).toBe(false)
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('migration failure does not break successful login', async () => {
    ;(prisma.user.update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('DB offline'))
    const ok = await verifyAndMigratePassword('u1', 'plain', 'plain')
    expect(ok).toBe(true)
  })
})
