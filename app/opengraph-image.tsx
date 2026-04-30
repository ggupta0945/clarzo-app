import { ImageResponse } from 'next/og'

// Programmatic OG image (1200x630 — WhatsApp/X/LinkedIn standard). Renders at
// runtime via Edge with the brand wordmark + tagline. No asset file needed.

export const alt = 'Clarzo — Your AI money coach'
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
          fontFamily: '"Book Antiqua", Palatino, "Palatino Linotype", Georgia, serif',
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
              fontSize: 96,
              fontFamily: '"Book Antiqua", Palatino, "Palatino Linotype", Georgia, serif',
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: '#e4f0e8',
              marginBottom: 24,
            }}
          >
            Your AI money coach.
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#88b098',
              lineHeight: 1.3,
              maxWidth: 900,
            }}
          >
            Upload your portfolio. Get clear answers in plain English.
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
          app.clarzo.ai
        </div>
      </div>
    ),
    size,
  )
}
