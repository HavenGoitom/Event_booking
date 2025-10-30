import axios from 'axios';
import moment from 'moment';
import crypto from 'crypto';
import { createTransaction } from '../services/eventService.js';
import { prisma } from '../prismaClient.js';

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function generateNonce() {
  return base64url(crypto.randomBytes(32));
}
export function generateTransactionId(userId, eventId, amount) {
  return `TXN_${moment().format('YYYY-MM-DD_HH-mm-ss')}_${userId}_${eventId}_${amount}`;
}

async function ProperDataArrangement(FrontEndSentInfo) {
  const { email, items } = FrontEndSentInfo;
  if (!email || !items) throw new Error('Invalid front-end payload');

  const userInfo = await prisma.user.findUnique({ where: { email } });
  if (!userInfo) throw new Error('User not found');

  const event = await prisma.event.findUnique({ where: { id: items.EventId } });
  if (!event) throw new Error('Event not found');

  const isVip = items.TicketType === 'vip';
  const available = isVip ? event.AvailableTicketsVip : event.AvailableTicketsNormal;
  if (available < items.TicketQuantity) return isVip ? 'There is no available vip ticket' : 'There is no normal ticket left';

  const pricePerTicket = isVip ? event.priceVip : event.priceNormal;
  const totalMoney = pricePerTicket * items.TicketQuantity;
  const expireDate = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const beneficiary = { BankAccount: event.organiserBankAccount, Bank: event.organiserBank };
  const transactionId = generateTransactionId(userInfo.id, items.EventId, totalMoney);
  const merchant_id = event.merchantId || process.env.ARIFPAY_MERCHANT_ID;

  const payload = {
    merchant_id,
    cancelUrl: process.env.CANCEL_URL,
    notifyUrl: `${process.env.PUBLIC_BASE_URL}${process.env.WEBHOOK_ENDPOINT_PATH || '/webhooks/arifpay'}`,
    successUrl: process.env.SUCCESS_URL,
    errorUrl: process.env.ERROR_URL,
    phone: userInfo.phone,
    email,
    nonce: generateNonce(),
    paymentMethods: ['TELEBIRR'],
    expireDate,
    items,
    lang: 'EN',
    beneficiaries: [{ accountNumber: beneficiary.BankAccount, bank: beneficiary.Bank, amount: totalMoney }],
    transactionId
  };

  return { payload, items, transactionId, totalMoney, userInfo, merchant_id };
}

export async function arifPayFunction(req, res) {
  try {
    const properData = await ProperDataArrangement(req.body);
    if (typeof properData === 'string') return res.status(400).json({ message: properData });

    const { payload, items, transactionId, totalMoney, userInfo } = properData;
    const { EventId, TicketType, TicketQuantity } = items;

    const responseObj = await axios.post(`${process.env.ARIFPAY_BASE_URL}/checkout/session`, payload, {
      headers: { 'x-arifpay-key': process.env.ARIFPAY_API_KEY, 'Content-Type': 'application/json' },
      timeout: 20000
    });

    const sessionId = responseObj?.data?.data?.sessionId;
    const paymentUrl = responseObj?.data?.data?.paymentUrl;
    const status = responseObj?.data?.data?.status || 'CREATED';

    await createTransaction({ transactionId, sessionId, eventId: EventId, ticketType: TicketType, quantity: TicketQuantity, amount: totalMoney, email: userInfo.email, status });

    return res.status(200).json({ checkoutUrl: paymentUrl, sessionId, status });
  } catch (error) {
    console.error('Checkout error:', error?.response?.data || error?.message || error);
    return res.status(500).json({ error: error?.response?.data || error?.message || 'Something went wrong' });
  }
}
