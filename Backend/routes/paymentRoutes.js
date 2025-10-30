import express from 'express';
import { authenticateToken} from '../middlewares/authMiddleware.js';
import { arifPayFunction } from '../controllers/checkoutController.js';
import { arifpayWebhookHandler } from '../controllers/webhookController.js';

const paymentRouter = express.Router();
paymentRouter.use(authenticateToken);

// payment routes

paymentRouter.post('/checkout', express.json(), arifPayFunction);
paymentRouter.post(process.env.WEBHOOK_ENDPOINT_PATH || '/webhooks/arifpay', express.raw({ type: 'application/json' }), arifpayWebhookHandler);



export default paymentRouter;
