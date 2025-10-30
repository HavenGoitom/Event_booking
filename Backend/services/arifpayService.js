// services/arifpayService.js
import axios from 'axios';

/**
 * Create a checkout session with Arifpay
 * @param {Object} payload - Payment payload including merchant info, items, user info, etc.
 * @returns {Object} response from Arifpay (checkoutUrl, sessionId, status)
 */
export async function createCheckoutSession(payload) {
  try {
    const response = await axios.post(
      `${process.env.ARIFPAY_BASE_URL}/checkout/session`,
      payload,
      {
        headers: {
          'x-arifpay-key': process.env.ARIFPAY_API_KEY,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      }
    );

    if (!response.data || !response.data.data) {
      throw new Error('Invalid response from Arifpay');
    }

    const data = response.data.data;

    return {
      checkoutUrl: data.paymentUrl,
      sessionId: data.sessionId,
      status: data.status,
    };
  } catch (error) {
    console.error('Error creating Arifpay checkout session:', error?.response?.data || error.message);
    throw error;
  }
}

/**
 * (Optional) You can add additional functions like verifyWebhook, refundPayment, etc.
 * Example:
 *
 * export async function verifyWebhook(signature, payload) {
 *   // Verify using HMAC SHA256 with process.env.ARIFPAY_WEBHOOK_SECRET
 * }
 */
