import axios from "axios";
import dotenv from "dotenv";
import crypto from "crypto";
dotenv.config();

const ARIFPAY_API_KEY = process.env.ARIFPAY_API_KEY;
const MERCHANT_ID = process.env.ARIFPAY_MERCHANT_ID;
const WEBHOOK_SECRET = process.env.ARIFPAY_WEBHOOK_SECRET;
const BASE_URL = "https://sandbox.arifpay.net/api/v1";

async function createPaymentSession() {
  console.log("🟡 Creating payment session...");
  try {
    const response = await axios.post(
      `${BASE_URL}/checkout/session`,
      {
        amount: 10, // 10 ETB test payment
        currency: "ETB",
        email: "testuser@example.com",
        phone: "0911000000",
        merchantId: MERCHANT_ID,
        successUrl: "https://example.com/success",
        cancelUrl: "https://example.com/cancel",
      },
      {
        headers: {
          Authorization: `Bearer ${ARIFPAY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = response.data.data;
    console.log("✅ Session created successfully!");
    console.log("Session ID:", data.sessionId);
    console.log("Checkout URL:", data.paymentUrl);
    return data.sessionId;
  } catch (err) {
    console.error("❌ Failed to create session:", err.response?.data || err.message);
    return null;
  }
}

async function verifyPayment(sessionId) {
  console.log("🟡 Verifying payment...");
  try {
    const response = await axios.get(`${BASE_URL}/checkout/session/${sessionId}`, {
      headers: {
        Authorization: `Bearer ${ARIFPAY_API_KEY}`,
      },
    });

    console.log("✅ Payment verification response:");
    console.log(response.data.data);
  } catch (err) {
    console.error("❌ Failed to verify:", err.response?.data || err.message);
  }
}

function simulateWebhook(sessionId) {
  console.log("🟡 Simulating webhook call...");
  const payload = JSON.stringify({
    sessionId,
    status: "SUCCESS",
    amount: 10,
    eventId: "demoEvent123",
    ticketType: "vip",
    quantity: 1,
    userEmail: "testuser@example.com",
  });

  const signature = crypto.createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  console.log("Send this via curl to your server webhook:");
  console.log(`curl -X POST http://localhost:3000/api/payments/notify \\
  -H "Content-Type: application/json" \\
  -H "x-arifpay-signature: ${signature}" \\
  -d '${payload}'`);
}

async function runTest() {
  const sessionId = await createPaymentSession();
  if (!sessionId) return;

  // Normally, user would pay on the checkout URL.
  // For now, we simulate webhook callback.
  simulateWebhook(sessionId);

  // You can verify after actual payment or after simulating
  // await verifyPayment(sessionId);
}

runTest();
