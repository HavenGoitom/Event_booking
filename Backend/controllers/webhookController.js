import { verifyArifpaySignature } from '../utils/verifySignature.js';
import { prisma } from '../prismaClient.js';
import { findPaymentBySession, createTransaction } from '../services/eventService.js';

const WEBHOOK_SECRET = process.env.ARIFPAY_WEBHOOK_SECRET;

export async function arifpayWebhookHandler(req, res) {
  try {
    const rawBodyBuffer = req.body;
    const signature = req.headers['x-arifpay-signature'] || req.headers['x-signature'];
    if (!verifyArifpaySignature(rawBodyBuffer, signature, WEBHOOK_SECRET)) return res.status(400).send('Invalid signature');

    const payload = JSON.parse(rawBodyBuffer.toString('utf8'));
    const { sessionId, status, eventId, ticketType, quantity, userEmail, amount, transactionId } = payload;
    if (!sessionId || !status) return res.status(400).send('Invalid payload');

    const existing = await findPaymentBySession(sessionId);
    if (existing && existing.status === 'PAID') return res.status(200).send('Already processed');

    if (status.toUpperCase() === 'SUCCESS' || status.toUpperCase() === 'PAID') {
      await prisma.$transaction(async (tx) => {
        if (!existing) await tx.payment.create({ data: { sessionId, transactionId, status: 'PAID', email: userEmail, eventId, ticketType, quantity, amount, createdAt: new Date() } });
        else await tx.payment.update({ where: { sessionId }, data: { status: 'PAID', transactionId: transactionId || existing.transactionId } });

        const decrementField = ticketType === 'vip' ? { AvailableTicketsVip: { decrement: quantity } } : { AvailableTicketsNormal: { decrement: quantity } };
        await tx.event.update({ where: { id: eventId }, data: decrementField });
      });
      return res.status(200).send('Webhook processed');
    }

    if (!existing) await createTransaction({ transactionId, sessionId, eventId, ticketType, quantity, amount, email: userEmail, status: status.toUpperCase() });
    else await prisma.payment.update({ where: { sessionId }, data: { status: status.toUpperCase() } });

    return res.status(200).send('Webhook received');
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).send('Server error');
  }
}
