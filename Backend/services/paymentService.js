// services/paymentService.mjs
import axios from 'axios';
import {
  GivenEventIdReturnMerchantId,
  ReturnTheTotalPriceOfTickets,
  GivenEmailSelectTheUser,
  GivenEventIdSelectAccountAndBankFromOrganiser,
  EventTableUpdate,
  ReturnTheNumOfTicketsAvailable,
  GivenEventIdUpdateTicketNum,
  GivenTransactionIdReturnEvent,
  CreateTransaction
} from '../DataBaseManipulation.js';

import { generateNonce, generateTransactionId, verifyWebhookSignature } from '../utils/cryptoUtils.js';

export async function initPayment(frontEndSentInfo) {
  // validation
  if (!frontEndSentInfo || !frontEndSentInfo.email || !frontEndSentInfo.items) {
    return { error: 'Invalid request body: missing email or items' };
  }

  // normalize items to array
  const itemsArr = Array.isArray(frontEndSentInfo.items) ? frontEndSentInfo.items : [frontEndSentInfo.items];

  // validate item fields
  for (const it of itemsArr) {
    if (!it.EventId || !it.TicketType || !it.TicketQuantity || !('price' in it)) {
      return { error: 'Invalid item shape: require EventId, TicketType, TicketQuantity and price' };
    }
  }

  // check availability
  for (const it of itemsArr) {
    const avail = await ReturnTheNumOfTicketsAvailable(it.EventId);
    const isVip = it.TicketType === 'vip';
    if (isVip && avail.AvailableTicketsVip < it.TicketQuantity) {
      return { error: `There is no available vip ticket for event ${it.EventId}` };
    }
    if (!isVip && avail.AvailableTicketsNormal < it.TicketQuantity) {
      return { error: `There is no normal ticket left for event ${it.EventId}` };
    }
  }

  const userInfo = await GivenEmailSelectTheUser({ user: true, organiser: false, Email: frontEndSentInfo.email });
  if (!userInfo) return { error: 'User not found for provided email' };

  const totalMoney = await ReturnTheTotalPriceOfTickets(itemsArr);
  const expireDate = new Date(Date.now() + 20 * 60 * 1000).toISOString();

  const firstEventId = itemsArr[0].EventId;
  const BeneficiaryInfo = await GivenEventIdSelectAccountAndBankFromOrganiser(firstEventId);
  const merchant_id = await GivenEventIdReturnMerchantId(firstEventId);
  const transactionId = generateTransactionId(userInfo.id, firstEventId, totalMoney);

  const payloadItems = itemsArr.map(it => ({
    name: it.name || `Ticket-${it.TicketType}`,
    price: Number(it.price),
    quantity: Number(it.TicketQuantity),
    eventId: it.EventId,
    ticketType: it.TicketType
  }));

  const payload = {
    merchant_id,
    cancelUrl: process.env.CANCEL_URL || 'https://yourapp/cancel',
    notifyUrl: process.env.NOTIFY_FULL_URL || (process.env.APP_BASE_URL ? `${process.env.APP_BASE_URL}${process.env.NOTIFY_PATH || '/api/payments/notify'}` : (process.env.NOTIFY_URL || 'https://yourapp/api/payments/notify')),
    successUrl: process.env.SUCCESS_URL || 'https://yourapp/success',
    errorUrl: process.env.ERROR_URL || 'https://yourapp/error',
    phone: userInfo.phone,
    email: frontEndSentInfo.email,
    nonce: generateNonce(),
    paymentMethods: ["TELEBIRR"],
    expireDate,
    items: payloadItems,
    lang: 'EN',
    beneficiaries: [
      {
        accountNumber: BeneficiaryInfo?.BankAccount,
        bank: BeneficiaryInfo?.Bank,
        amount: totalMoney
      }
    ],
    transactionId
  };

  // create pending transaction
  await CreateTransaction({
    transactionId,
    eventId: firstEventId,
    ticketType: itemsArr[0].TicketType,
    numberOfTicketsBought: itemsArr.reduce((s, it) => s + Number(it.TicketQuantity), 0),
    amount: totalMoney,
    userId: userInfo.id,
    merchantId: merchant_id,
    status: 'pending'
  });

  // call arifpay
  const responseObj = await axios.post(
    `${process.env.ARIFPAY_BASE_URL.replace(/\/+$/, '')}/checkout/session`,
    payload,
    {
      headers: {
        'x-arifpay-key': process.env.ARIFPAY_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    }
  );

  const sessionData = responseObj?.data?.data;
  if (!sessionData || !sessionData.sessionId || !sessionData.paymentUrl) {
    // optionally mark transaction failed
    await EventTableUpdate({ transactionId, status: 'failed' });
    return { error: 'Bad response from Arifpay', raw: responseObj?.data };
  }

  await EventTableUpdate({ transactionId, sessionId: sessionData.sessionId });

  return {
    checkoutUrl: sessionData.paymentUrl,
    sessionId: sessionData.sessionId,
    status: sessionData.status ?? 'created'
  };
}

export async function handleNotify(req) {
  // req.rawBody & req.body are provided by middlewares
  const headerSignature = req.headers['x-arifpay-signature'] || req.headers['x-signature'];
  const bodySignature = req.body && req.body.signature;
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));

  // verify signature
  const ok = verifyWebhookSignature(raw, process.env.ARIFPAY_WEBHOOK_SECRET, headerSignature, bodySignature);
  if (!ok) return { error: 'Invalid webhook signature', status: 400 };

  const { transactionId, status } = req.body || {};
  if (!transactionId || !status) return { error: 'Missing required fields', status: 400 };

  const txInfo = await GivenTransactionIdReturnEvent(transactionId);
  if (!txInfo) return { error: 'Transaction not found', status: 404 };

  if (txInfo.status === 'paid') {
    return { message: 'Already processed' };
  }

  if (String(status).toLowerCase().trim() === 'success') {
    const eventId = txInfo.eventId;
    const numberOfTicketsBought = txInfo.numberOfTicketsBought;
    const typeOfTicket = txInfo.ticketType;
    const isTicketVip = (typeOfTicket === 'vip');

    // update tickets and transaction; ideally do in a DB transaction
    await GivenEventIdUpdateTicketNum(eventId, numberOfTicketsBought, isTicketVip);
    await EventTableUpdate({ transactionId, status: 'paid', paidAt: new Date().toISOString() });

    return { message: 'OK' };
  } else {
    await EventTableUpdate({ transactionId, status: status.toLowerCase() });
    return { message: 'OK' };
  }
}
