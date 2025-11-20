// controllers/paymentController.mjs
import { initPayment } from '../services/paymentService.js';
import { handleNotify } from '../services/paymentService.js';

export async function arifPayFunction(req, res) {
  try {
    const result = await initPayment(req.body);
    if (result?.error) {
      return res.status(400).json({ message: result.error });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error('arifPayFunction error:', err);
    return res.status(500).json({ message: err?.message || 'Internal server error' });
  }
}

export async function notifyHandler(req, res) {
  try {
    // req.rawBody will be available from rawBody middleware
    const result = await handleNotify(req);
    if (result?.error) {
      return res.status(result.status || 400).send(result.error);
    }
    return res.status(200).send(result.message || 'OK');
  } catch (err) {
    console.error('notifyHandler error:', err);
    return res.status(500).send('Server error');
  }
}
