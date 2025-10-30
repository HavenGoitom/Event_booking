import crypto from 'crypto';
export function verifyArifpaySignature(rawBodyBuffer, signatureHeader, secret) {
  if (!rawBodyBuffer || !signatureHeader || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest();
  const safeEq = (a,b) => Buffer.isBuffer(a)&&Buffer.isBuffer(b)&&a.length===b.length && crypto.timingSafeEqual(a,b);
  try { if (safeEq(Buffer.from(signatureHeader,'base64'), expected)) return true; } catch(e){}
  try { if (safeEq(Buffer.from(signatureHeader,'hex'), expected)) return true; } catch(e){}
  try { if (signatureHeader===expected.toString('hex')) return true; } catch(e){}
  return false;
}
