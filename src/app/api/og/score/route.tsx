import { ImageResponse } from 'next/og'

export const runtime = 'edge'

function getScoreColor(score: number): string {
  if (score >= 75) return '#10B981' // green
  if (score >= 50) return '#F59E0B' // amber
  if (score >= 25) return '#F97316' // orange
  return '#EF4444'                  // red
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const brand = searchParams.get('brand') ?? 'Marque'
  const score = Math.min(100, Math.max(0, parseInt(searchParams.get('score') ?? '0', 10)))
  const label = searchParams.get('label') ?? 'Analysé'

  const scoreColor = getScoreColor(score)
  const progressWidth = Math.round((score / 100) * 960) // of 1040px usable width

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '1200px',
          height: '630px',
          background: '#0A0A0B',
          fontFamily: 'sans-serif',
          padding: '60px 80px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '40px' }}>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#6366F1',
              letterSpacing: '-0.5px',
            }}
          >
            AIRank.fr
          </div>
        </div>

        {/* Brand name */}
        <div
          style={{
            fontSize: '36px',
            color: '#A1A1AA',
            marginBottom: '20px',
          }}
        >
          {brand}
        </div>

        {/* Score */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '24px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '160px',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1,
            }}
          >
            {score}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '48px', color: '#71717A' }}>/100</div>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 700,
                color: scoreColor,
              }}
            >
              {label}
            </div>
          </div>
        </div>

        {/* Progress bar background */}
        <div
          style={{
            width: '1040px',
            height: '16px',
            background: '#27272A',
            borderRadius: '8px',
            marginBottom: '40px',
            overflow: 'hidden',
            display: 'flex',
          }}
        >
          <div
            style={{
              width: `${progressWidth}px`,
              height: '16px',
              background: scoreColor,
              borderRadius: '8px',
            }}
          />
        </div>

        {/* Footer text */}
        <div
          style={{
            fontSize: '24px',
            color: '#52525B',
            marginTop: 'auto',
          }}
        >
          Visibilité IA analysée sur ChatGPT, Claude, Perplexity, Gemini
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
