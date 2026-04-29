import Razorpay from 'razorpay'
import { createHmac, timingSafeEqual } from 'crypto'

let client: Razorpay | null = null

export function razorpayClient(): Razorpay {
  if (client) return client
  const key_id = process.env.RAZORPAY_KEY_ID
  const key_secret = process.env.RAZORPAY_KEY_SECRET
  if (!key_id || !key_secret) {
    throw new Error('RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing.')
  }
  client = new Razorpay({ key_id, key_secret })
  return client
}

// Razorpay signs every webhook with HMAC-SHA256(body, webhook_secret) and
// puts the hex digest in X-Razorpay-Signature. Compare in constant time so
// a timing oracle can't be used to recover the signature byte-by-byte.
export function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature) return false
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!secret) return false

  const expected = createHmac('sha256', secret).update(body).digest('hex')
  const expectedBuf = Buffer.from(expected, 'utf8')
  const sigBuf = Buffer.from(signature, 'utf8')
  if (expectedBuf.length !== sigBuf.length) return false
  return timingSafeEqual(expectedBuf, sigBuf)
}

export const RAZORPAY_PLAN_ID = process.env.RAZORPAY_PLAN_ID || ''
