import { ImageResponse } from 'next/og'

// Programmatic OG card for the public /ask page. Distinct from the root OG
// (which sells the product) — this one sells "ask anything for free."

export const alt = 'Ask Clarzo — Free AI financial assistant'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #040f0a 0%, #071a10 60%, #0c2418 100%)',
          display: 'flex',
          flexDirection: 'column',
          padding: 80,
          color: '#e4f0e8',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: '#34d399',
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: 32,
          }}
        >
          Clarzo
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontFamily: 'serif',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: '#e4f0e8',
              marginBottom: 24,
            }}
          >
            Ask anything about money.
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#88b098',
              lineHeight: 1.3,
              maxWidth: 900,
            }}
          >
            Free. No signup. Plain-English answers for Indian investors.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 24,
            color: '#88b098',
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 6, background: '#34d399' }} />
          app.clarzo.ai/ask
        </div>
      </div>
    ),
    size,
  )
}
