import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Resend
// ---------------------------------------------------------------------------

const mockSend = vi.fn().mockResolvedValue({ id: 'test-id' })

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend }
    },
  }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('email service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    mockSend.mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // -------------------------------------------------------------------------
  // sendCompetitorAlert
  // -------------------------------------------------------------------------

  describe('sendCompetitorAlert', () => {
    it('calls resend.emails.send with correct subject and recipient', async () => {
      process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' }
      const { sendCompetitorAlert } = await import('@/lib/email')

      const result = await sendCompetitorAlert('user@example.com', {
        brandName: 'MyBrand',
        competitor: 'RivalCo',
        llm: 'ChatGPT',
        query: 'meilleur logiciel RH',
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
      const call = mockSend.mock.calls[0][0]
      expect(call.to).toBe('user@example.com')
      expect(call.subject).toContain('RivalCo')
      expect(call.subject).toContain('ChatGPT')
      expect(call.html).toContain('MyBrand')
      expect(call.html).toContain('RivalCo')
    })

    it('returns { success: false } when RESEND_API_KEY is absent', async () => {
      process.env = { ...originalEnv, RESEND_API_KEY: undefined }
      delete process.env.RESEND_API_KEY

      const { sendCompetitorAlert } = await import('@/lib/email')

      const result = await sendCompetitorAlert('user@example.com', {
        brandName: 'MyBrand',
        competitor: 'RivalCo',
        llm: 'ChatGPT',
        query: 'test query',
      })

      expect(result.success).toBe(false)
      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // sendHealthCheck
  // -------------------------------------------------------------------------

  describe('sendHealthCheck', () => {
    it('calls resend.emails.send with correct subject', async () => {
      process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' }
      const { sendHealthCheck } = await import('@/lib/email')

      const result = await sendHealthCheck('user@example.com', {
        brandName: 'MyBrand',
        score: 75,
        variation: -5,
        topIssue: 'Score en baisse sur ChatGPT',
        action: 'Relancez un scan',
      })

      expect(result.success).toBe(true)
      expect(mockSend).toHaveBeenCalledOnce()
      const call = mockSend.mock.calls[0][0]
      expect(call.to).toBe('user@example.com')
      expect(call.subject).toContain('MyBrand')
      expect(call.subject).toContain('rapport hebdomadaire')
      expect(call.html).toContain('75')
      expect(call.html).toContain('-5')
    })

    it('returns { success: false } when RESEND_API_KEY is absent', async () => {
      process.env = { ...originalEnv, RESEND_API_KEY: undefined }
      delete process.env.RESEND_API_KEY

      const { sendHealthCheck } = await import('@/lib/email')

      const result = await sendHealthCheck('user@example.com', {
        brandName: 'MyBrand',
        score: 50,
        variation: 0,
        topIssue: 'test',
        action: 'test',
      })

      expect(result.success).toBe(false)
      expect(mockSend).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // sendMonthlyReport
  // -------------------------------------------------------------------------

  describe('sendMonthlyReport', () => {
    it('calls resend.emails.send with brand name in subject', async () => {
      process.env = { ...originalEnv, RESEND_API_KEY: 'test-key' }
      const { sendMonthlyReport } = await import('@/lib/email')

      const result = await sendMonthlyReport('user@example.com', {
        brandName: 'MyBrand',
        avgScore: 65,
        variation: 8,
        topQuery: 'meilleur CRM',
        worstQuery: 'logiciel comptabilité',
      })

      expect(result.success).toBe(true)
      const call = mockSend.mock.calls[0][0]
      expect(call.subject).toContain('Rapport mensuel')
      expect(call.subject).toContain('MyBrand')
      expect(call.html).toContain('65')
      expect(call.html).toContain('meilleur CRM')
    })
  })
})
