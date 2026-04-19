import { createHash, randomBytes } from 'crypto'
import { prisma } from './db'

// API key format: ak_live_<32 hex chars>
// Display prefix: ak_live_xxxx (8 chars)
// DB stores only sha256 hash.

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const secret = randomBytes(24).toString('hex')
  const raw = `ak_live_${secret}`
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 12) // "ak_live_xxxx"
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export interface AuthedApiKey {
  userId: string
  apiKeyId: string
  scopes: string[]
}

/**
 * Validate an Authorization header and return the user + scopes.
 * Supports: `Authorization: Bearer ak_live_xxx` or `x-api-key: ak_live_xxx`.
 */
export async function authenticateApiRequest(req: Request): Promise<AuthedApiKey | null> {
  const auth = req.headers.get('authorization') ?? ''
  const xKey = req.headers.get('x-api-key') ?? ''

  let raw: string | null = null
  if (auth.toLowerCase().startsWith('bearer ')) raw = auth.slice(7).trim()
  else if (xKey) raw = xKey.trim()

  if (!raw || !raw.startsWith('ak_')) return null

  const hash = hashApiKey(raw)
  const row = await prisma.apiKey.findUnique({
    where: { keyHash: hash },
    select: {
      id: true,
      userId: true,
      scopes: true,
      active: true,
      expiresAt: true,
    },
  })

  if (!row || !row.active) return null
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null

  // Update lastUsedAt fire-and-forget
  void prisma.apiKey.update({
    where: { id: row.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {})

  let scopes: string[] = []
  try {
    scopes = JSON.parse(row.scopes)
  } catch {
    scopes = ['read']
  }

  return { userId: row.userId, apiKeyId: row.id, scopes }
}

export async function logApiUsage(opts: {
  userId: string
  apiKeyId: string | null
  endpoint: string
  method: string
  status: number
  latencyMs?: number
}): Promise<void> {
  try {
    await prisma.apiUsage.create({ data: opts })
  } catch (err) {
    console.error('[api-usage] log failed', err)
  }
}
