import { createCheckoutSession } from '../services/arifpayService.js';
import { getAvailableTickets, decrementTicketsAtomic } from '../services/eventService.js';
import { generateNonce } from '../utils/nonce.js';

export async function createPayment(req, res) {
  try {
    const { email, items } = req.body;
    // validate input...
    const isVip = items.TicketType === 'vip';

    const available = await getAvailableTickets(items.EventId);
    if (isVip && available.AvailableTicketsVip < items.TicketQuantity) {
      return res.status(400).json({ message: 'No VIP tickets available' });
    }
    if (!isVip && available.AvailableTicketsNormal < items.TicketQuantity) {
      return res.status(400).json({ message: 'No normal tickets left' });
    }

    // Calculate total (call your DB/price logic)
    const total = 100; // placeholder, call your ReturnTheTotalPriceOfTickets(items)

    const payload = {
      cancelUrl: 'https://your-frontend/cancel',
      notifyUrl: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/notify`,
      successUrl: 'https://your-frontend/success',
      errorUrl: 'https://your-frontend/error',
      phone: '0911xxxxx', // get from user DB
      email,
      nonce: generateNonce(),
      paymentMethods: ["TELEBIRR"],
      expireDate: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
      items,
      lang: 'EN',
      beneficiaries: [
        { accountNumber: '12345', bank: 'BankName', amount: total }
      ]
    };

    const response = await createCheckoutSession(payload);
    return res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}
