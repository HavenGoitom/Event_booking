import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const BASE = process.env.ARIFPAY_BASE_URL;
const API_KEY = process.env.ARIFPAY_API_KEY;

export async function createCheckoutSession(payload) {
  const res = await axios.post(`${BASE}/checkout/session`, payload, {
    headers: {
      'x-arifpay-key': API_KEY,
      'Content-Type': 'application/json'
    },
    timeout: 20000
  });
  return res.data;
}

// other helpers like transfer, verify session, etc.
export async function verifySession(sessionId) {
  const res = await axios.get(`${BASE}/checkout/session/${sessionId}`, {
    headers: { 'x-arifpay-key': API_KEY }
  });
  return res.data;
}
