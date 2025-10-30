import { prisma } from '../prismaClient.js';

export async function createTransaction({ transactionId, sessionId, eventId, ticketType, quantity, amount, email, status = 'PENDING' }) {
  return prisma.payment.create({ data: { transactionId, sessionId, eventId, ticketType, quantity, amount, email, status, createdAt: new Date() } });
}
export async function findPaymentBySession(sessionId) { return prisma.payment.findUnique({ where: { sessionId } }); }
export async function markPaymentProcessed(sessionId, updates = {}) { return prisma.payment.update({ where: { sessionId }, data: { status: 'PAID', ...updates } }); }
export async function decrementTicketsAtomic(tx, eventId, ticketType, quantity) {
  const updateData = ticketType === 'vip' ? { AvailableTicketsVip: { decrement: quantity } } : { AvailableTicketsNormal: { decrement: quantity } };
  return tx.event.update({ where: { id: eventId }, data: updateData });
}
