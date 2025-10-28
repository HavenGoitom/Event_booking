import { verifyArifpaySignature } from '../utils/verifySignature.js';
import { prisma } from "../prismaClient.js";
import { decrementTicketsAtomic, findOrCreatePayment } from '../services/eventService.js';
import dotenv from 'dotenv';
dotenv.config();

const WEBHOOK_SECRET = process.env.ARIFPAY_WEBHOOK_SECRET;

export async function arifpayWebhookHandler(req, res) {
  try {
    const rawBodyBuffer = req.body; // will be Buffer because we used express.raw()
    const signature = req.headers['x-arifpay-signature'];

    if (!verifyArifpaySignature(rawBodyBuffer, signature, WEBHOOK_SECRET)) {
      console.error('Invalid webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const payload = JSON.parse(rawBodyBuffer.toString());
    const { sessionId, status, eventId, ticketType, quantity, userEmail, amount } = payload;

    if (!sessionId || !status) return res.status(400).send('Invalid payload');

    // Idempotency: if payment already processed, return 200
    const existing = await prisma.payment.findUnique({ where: { sessionId } });
    if (existing) {
      console.log(`Duplicate webhook for ${sessionId} - ignoring`);
      return res.status(200).send('Already processed');
    }

    if (status === 'SUCCESS') {
      // Create payment record and decrement tickets atomically
      await prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            sessionId,
            status,
            email: userEmail,
            eventId,
            amount,
            createdAt: new Date()
          }
        });

        const decrementField = ticketType === 'vip'
          ? { AvailableTicketsVip: { decrement: quantity } }
          : { AvailableTicketsNormal: { decrement: quantity } };

        await tx.event.update({
          where: { id: eventId },
          data: decrementField
        });
      });

      console.log(`Processed payment ${sessionId}`);
    }

    return res.status(200).send('Webhook received');
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).send('Server error');
  }
}
