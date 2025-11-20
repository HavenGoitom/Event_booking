// utils/cryptoUtils.mjs
import crypto from 'crypto';

export function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateNonce() {
  const bytes = crypto.randomBytes(32);
  return base64url(bytes);
}

export function generateTransactionId(userId, eventId, amount) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rnd = crypto.randomBytes(6).toString('hex');
  return `TXN_${ts}_${userId || 'anon'}_${eventId}_${amount}_${rnd}`;
}

export function verifyWebhookSignature(rawBuffer, secret, headerSignature, bodySignature) {
  if (!secret) {
    console.warn('ARIFPAY_WEBHOOK_SECRET not configured; skipping verification (dev).');
    return true;
  }
  const expected = crypto.createHmac('sha256', secret).update(rawBuffer).digest('hex');
  if (headerSignature && expected === headerSignature) return true;
  if (bodySignature && expected === bodySignature) return true;
  return false;
}
