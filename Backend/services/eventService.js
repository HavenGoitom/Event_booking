import { prisma } from "../prismaClient.js";

export async function getAvailableTickets(eventId) {
  return prisma.event.findUnique({
    where: { id: eventId },
    select: {
      AvailableTicketsVip: true,
      AvailableTicketsNormal: true
    }
  });
}

export async function decrementTicketsAtomic(eventId, isVip, quantity) {
  // Use a transaction to create payment record + decrement atomically
  return prisma.$transaction(async (tx) => {
    // Re-read availability for safety (optional)
    const e = await tx.event.findUnique({ where: { id: eventId } });
    if (!e) throw new Error('Event not found');

    if (isVip && e.AvailableTicketsVip < quantity) throw new Error('Not enough VIP tickets');
    if (!isVip && e.AvailableTicketsNormal < quantity) throw new Error('Not enough normal tickets');

    const update = isVip
      ? tx.event.update({ where: { id: eventId }, data: { AvailableTicketsVip: { decrement: quantity } } })
      : tx.event.update({ where: { id: eventId }, data: { AvailableTicketsNormal: { decrement: quantity } } });

    const [updatedEvent] = await Promise.all([update]);
    return updatedEvent;
  });
}

export async function findOrCreatePayment(sessionId, data) {
  // idempotency: try to find existing; if none create
  const existing = await prisma.payment.findUnique({ where: { sessionId } });
  if (existing) return existing;

  const payment = await prisma.payment.create({
    data: {
      sessionId,
      status: data.status,
      email: data.userEmail,
      eventId: data.eventId,
      amount: data.amount
    }
  });
  return payment;
}
