import { ImageResponse } from 'next/og'

// Programmatic favicon — Next.js generates the PNG at build time, no asset
// file needed. The "C" mark on the brand emerald reads cleanly at 32px.

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 22,
          background: '#040f0a',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#34d399',
          fontFamily: '"Book Antiqua", Palatino, "Palatino Linotype", Georgia, serif',
          fontWeight: 700,
          borderRadius: 6,
        }}
      >
        C
      </div>
    ),
    size,
  )
}
