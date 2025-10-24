import crypto from 'crypto';

export function verifyArifpaySignature(rawBodyBuffer, headerSignature, webhookSecret) {
  if (!headerSignature || !webhookSecret) return false;
  // assume headerSignature and expected hmac are hex strings
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBodyBuffer).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(headerSignature, 'hex'), Buffer.from(expected, 'hex'));
  } catch (err) {
    // If length mismatch, timingSafeEqual throws - treat as invalid
    return false;
  }
}
