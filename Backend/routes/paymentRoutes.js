// routes/paymentRoutes.mjs
import express from 'express';
import { arifPayFunction, notifyHandler } from '../controllers/paymentController.js';

const router = express.Router();

// client initiates payment
router.post('/paymentProcess', arifPayFunction);

// webhook notify path — use env NOTIFY_PATH or this default
const notifyPath = process.env.NOTIFY_PATH || '/api/payments/notify';
router.post(notifyPath, notifyHandler);

export default router;
