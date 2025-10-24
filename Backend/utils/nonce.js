import crypto from 'crypto';

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateNonce() {
  return base64url(crypto.randomBytes(32));
}
