/**
 * Sanitize user-provided CSS (white-label customCss).
 * Blocks the common vectors for CSS-based data exfiltration / script execution:
 *  - url(...) — background-image + attribute-selector leak to external server
 *  - expression(...) — IE script execution
 *  - @import / @charset / @namespace — remote resource fetches
 *  - javascript:/vbscript:/data: URI schemes
 *  - behavior: (IE)
 *  - comments (can hide payloads across line breaks)
 *
 * Keeps the feature useful for safe visual tweaks (colors, spacing, fonts).
 */
export function sanitizeCss(css: string): string {
  let out = css
  out = out.replace(/\/\*[\s\S]*?\*\//g, '')
  out = out.replace(/url\s*\([^)]*\)/gi, 'url()')
  out = out.replace(/expression\s*\([^)]*\)/gi, '')
  out = out.replace(/@(import|charset|namespace)[^;]*;?/gi, '')
  out = out.replace(/(javascript|vbscript|data)\s*:/gi, 'removed:')
  out = out.replace(/behavior\s*:/gi, 'removed:')
  return out.trim()
}
